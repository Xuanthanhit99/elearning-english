/**
 * Real local PostgreSQL + Redis integration, fault injected only in the
 * XpService Redis adapter. Never stop Redis and never touch production.
 * Run this suite alone: it temporarily creates an ACTIVE season.
 */
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { LearningSkill, XpSourceType } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { XpService } from '../src/modules/leaderboard/xp.service';
import { weeklyRedisKey } from '../src/modules/leaderboard/leaderboard.constants';

function safeLocalEnvironment() {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try {
    const db = new URL(process.env.DATABASE_URL || '');
    const redis = new URL(process.env.REDIS_URL || '');
    return db.hostname === '127.0.0.1' && db.port === '15432' &&
      db.pathname === '/beaconvie_xp_test' &&
      redis.hostname === '127.0.0.1' && redis.port === '16379' &&
      (redis.pathname === '' || redis.pathname === '/0');
  } catch { return false; }
}

(safeLocalEnvironment() ? describe : describe.skip)(
  'XP leaderboard — real local PostgreSQL and Redis', () => {
    let prisma: PrismaService;
    let redis: Redis;
    let userId: string;
    let seasonId: string;
    let redisKey: string;
    const tag = randomUUID();

    beforeAll(async () => {
      prisma = new PrismaService();
      await prisma.$connect();
      redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1 });
      await redis.ping();
      // This fixture must be the only active season, and must not overlap
      // with other suites. Refuse to modify any pre-existing season.
      const existing = await prisma.leaderboardSeason.count({ where: { isActive: true } });
      if (existing) throw new Error('STOP: existing active season in QA DB; do not modify it');
      const user = await prisma.user.create({
        data: {
          fullname: 'Local Redis integration fixture',
          email: `xp-redis-${tag}@__test-fixture__.invalid`,
          password: 'not-a-real-password-hash',
        },
      });
      userId = user.id;
      await prisma.userXpProfile.create({ data: { userId } });
      const season = await prisma.leaderboardSeason.create({
        data: {
          name: `Local XP Redis QA ${tag}`, periodType: 'WEEKLY',
          startsAt: new Date(Date.now() - 3600000),
          endsAt: new Date(Date.now() + 3600000),
          status: 'ACTIVE', isActive: true,
        },
      });
      seasonId = season.id;
    }, 20000);

    afterAll(async () => {
      try {
        if (prisma) {
          // Remove only keys belonging to this fixture's unique season.
          if (redis && seasonId) {
            const groups = await prisma.leaderboardGroup.findMany({
              where: { seasonId }, select: { id: true },
            });
            for (const group of groups) {
              await redis.del(weeklyRedisKey(seasonId, group.id));
            }
          }
          if (userId) await prisma.xpRedisOutbox.deleteMany({ where: { userId } });
          if (userId) await prisma.xpRedisProjectionRevision.deleteMany({ where: { userId } });
          if (seasonId) await prisma.leaderboardSeason.delete({ where: { id: seasonId } });
          if (userId) await prisma.user.delete({ where: { id: userId } });
        }
      } finally {
        if (redis) redis.disconnect();
        if (prisma) await prisma.$disconnect();
      }
    }, 20000);

    function award(suffix: string, redisAdapter: Redis = redis) {
      const xp = new XpService(prisma, redisAdapter, { emitGroupUpdated: jest.fn() } as any);
      return xp.awardXpWithSideEffects({
        userId, sourceType: XpSourceType.LESSON, sourceId: `qa-${suffix}`,
        baseXp: 20, bonusXp: 0,
        idempotencyKey: `local-redis:${tag}:${suffix}`,
        reason: 'Local PostgreSQL Redis QA fixture',
      }, async () => null);
    }

    async function entry() {
      return prisma.leaderboardEntry.findFirstOrThrow({
        where: { userId, group: { seasonId } },
      });
    }

    it('commits XP once and publishes matching absolute weekly score to real Redis', async () => {
      const result = await award('normal');
      expect(result.duplicated).toBe(false);
      const row = await entry();
      redisKey = weeklyRedisKey(seasonId, row.groupId);
      expect(row.periodXp).toBe(20);
      expect(await prisma.xpRedisOutbox.count({ where: { userId, projection: 'WEEKLY' } })).toBe(1);
      expect(await redis.zscore(redisKey, userId)).toBe('20');
      expect((await prisma.xpRedisProjectionRevision.findUniqueOrThrow({
        where: { redisKey_userId: { redisKey, userId } },
      })).revision).toBe(1);
      expect(await prisma.xpTransaction.count({
        where: { idempotencyKey: `local-redis:${tag}:normal` },
      })).toBe(1);
      expect((await award('normal')).duplicated).toBe(true);
      expect((await entry()).periodXp).toBe(20);
      expect((await prisma.xpRedisProjectionRevision.findUniqueOrThrow({
        where: { redisKey_userId: { redisKey, userId } },
      })).revision).toBe(1);
      expect(await redis.zscore(redisKey, userId)).toBe('20');
    });

    it('postcommit ZADD failure leaves DB committed, Redis stale and duplicate retry cannot repair it', async () => {
      const adapter = Object.create(redis) as Redis;
      // Override only ZADD; all read/other commands still use the real client.
      adapter.zadd = jest.fn().mockRejectedValueOnce(new Error('QA_INJECTED_ZADD_FAILURE')) as any;
      await expect(award('failed-zadd', adapter)).rejects.toThrow('QA_INJECTED_ZADD_FAILURE');
      const row = await entry();
      expect(row.periodXp).toBe(40);
      expect((await prisma.xpRedisProjectionRevision.findUniqueOrThrow({
        where: { redisKey_userId: { redisKey, userId } },
      })).revision).toBe(2);
      expect(await prisma.xpRedisOutbox.count({ where: { userId, projection: 'WEEKLY' } })).toBe(2);
      expect(await redis.zscore(redisKey, userId)).toBe('20');
      expect((await award('failed-zadd')).duplicated).toBe(true);
      expect((await entry()).periodXp).toBe(40);
      expect(await redis.zscore(redisKey, userId)).toBe('20');
      expect(await prisma.xpTransaction.count({
        where: { idempotencyKey: `local-redis:${tag}:failed-zadd` },
      })).toBe(1);
    });

    it('rolls back ledger, leaderboard and outbox when a transactional side effect fails', async () => {
      const key = `local-redis:${tag}:rollback`;
      const before = await entry();
      const service = new XpService(prisma, redis, { emitGroupUpdated: jest.fn() } as any);
      await expect(service.awardXpWithSideEffects({
        userId, sourceType: XpSourceType.LESSON, sourceId: 'qa-rollback',
        baseXp: 20, idempotencyKey: key,
      }, async () => { throw new Error('QA_TX_ROLLBACK'); }))
        .rejects.toThrow('QA_TX_ROLLBACK');
      expect(await prisma.xpTransaction.count({ where: { idempotencyKey: key } })).toBe(0);
      expect(await prisma.xpRedisOutbox.count({ where: { userId } })).toBe(2);
      expect((await entry()).periodXp).toBe(before.periodXp);
      expect((await prisma.xpRedisProjectionRevision.findUniqueOrThrow({
        where: { redisKey_userId: { redisKey, userId } },
      })).revision).toBe(2);
    });

    it('keeps score and revision from one repeatable-read snapshot during concurrent XP award', async () => {
      const row = await entry();
      const key = weeklyRedisKey(seasonId, row.groupId);
      const beforeRevision = await prisma.xpRedisProjectionRevision.findUniqueOrThrow({
        where: { redisKey_userId: { redisKey: key, userId } },
      });
      let releaseWriter!: () => void;
      let snapshotReady!: () => void;
      const writerGate = new Promise<void>((resolve) => { releaseWriter = resolve; });
      const snapshotGate = new Promise<void>((resolve) => { snapshotReady = resolve; });

      const reader = prisma.$transaction(async (tx) => {
        const revision = await tx.xpRedisProjectionRevision.findUniqueOrThrow({
          where: { redisKey_userId: { redisKey: key, userId } },
        });
        snapshotReady();
        await writerGate;
        const currentEntry = await tx.leaderboardEntry.findUniqueOrThrow({
          where: { id: row.id },
        });
        return { revision: revision.revision, score: currentEntry.periodXp };
      }, { isolationLevel: 'RepeatableRead', timeout: 15000 });

      try {
        await snapshotGate;
        const updated = await award('concurrent-snapshot');
        expect(updated.duplicated).toBe(false);
      } finally {
        releaseWriter();
      }
      const snapshot = await reader;
      expect(snapshot).toEqual({
        revision: beforeRevision.revision,
        score: row.periodXp,
      });
      const after = await entry();
      const latestRevision = await prisma.xpRedisProjectionRevision.findUniqueOrThrow({
        where: { redisKey_userId: { redisKey: key, userId } },
      });
      expect(after.periodXp).toBe(row.periodXp + 20);
      expect(latestRevision.revision).toBe(beforeRevision.revision + 1);
    });

    it('manual absolute-score reconciliation repairs real Redis without adding XP', async () => {
      const row = await entry();
      const before = await prisma.xpTransaction.count({ where: { userId } });
      await redis.zadd(redisKey, row.periodXp, userId);
      await redis.zadd(redisKey, row.periodXp, userId);
      expect(await redis.zscore(redisKey, userId)).toBe(String(row.periodXp));
      expect(await prisma.xpTransaction.count({ where: { userId } })).toBe(before);
    });
  },
);

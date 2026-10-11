/**
 * Real Projection + Coordinated Write E2E.
 * Guarded to the disposable local PostgreSQL and Redis endpoints only.
 * Does not activate or schedule a worker.
 */
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../src/prisma/prisma.service';
import { XpRedisProjectionService } from '../src/modules/leaderboard/xp-redis-projection.service';
import { XpRedisCoordinatedWriteService } from '../src/modules/leaderboard/xp-redis-coordinated-write.service';

function safeLocalEnvironment() {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try {
    const db = new URL(process.env.DATABASE_URL || '');
    const redisUrl = new URL(process.env.REDIS_URL || '');
    return db.hostname === '127.0.0.1' && db.port === '15432' &&
      db.pathname === '/beaconvie_xp_test' &&
      redisUrl.hostname === '127.0.0.1' && redisUrl.port === '16379' &&
      (redisUrl.pathname === '' || redisUrl.pathname === '/0');
  } catch { return false; }
}

(safeLocalEnvironment() ? describe : describe.skip)(
  'XP real projection + coordinated writer — disposable local PostgreSQL and Redis',
  () => {
    let db: PrismaService;
    let redis: Redis;
    let projection: XpRedisProjectionService;
    let writer: XpRedisCoordinatedWriteService;
    const tag = randomUUID();
    const userId = `qa-projection-${tag}`;
    const redisKey = `qa:xp:projection:${tag}`;
    const outboxIds: string[] = [];
    let seasonId = '';
    let groupId = '';
    let profileId = '';
    let transactionId = '';
    let secondTransactionId = '';

    beforeAll(async () => {
      db = new PrismaService();
      await db.$connect();
      redis = new Redis(process.env.REDIS_URL!, {
        lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null,
      });
      await redis.connect();
      await redis.ping();

      const user = await db.user.create({
        data: {
          fullname: 'XP projection E2E fixture',
          email: `xp-projection-${tag}@__test-fixture__.invalid`,
          password: 'not-a-real-password-hash',
        },
      });
      const profile = await db.userXpProfile.create({ data: { userId: user.id } });
      profileId = profile.id;

      const season = await db.leaderboardSeason.create({
        data: {
          name: `XP projection E2E ${tag}`,
          periodType: 'WEEKLY',
          startsAt: new Date(Date.now() - 60_000),
          endsAt: new Date(Date.now() + 3_600_000),
          status: 'ACTIVE',
          isActive: false,
        },
      });
      seasonId = season.id;
      const group = await db.leaderboardGroup.create({
        data: {
          seasonId,
          scope: 'GLOBAL',
          league: 'BRONZE',
          groupNumber: 1,
        },
      });
      groupId = group.id;
      await db.leaderboardEntry.create({
        data: { groupId, userId, xpProfileId: profileId, periodXp: 40 },
      });

      const transaction = await db.xpTransaction.create({
        data: {
          userId, xpProfileId: profileId, sourceType: 'LESSON',
          sourceId: `qa-projection-${tag}-1`, baseXp: 40, bonusXp: 0,
          finalXp: 40, idempotencyKey: `qa-projection:${tag}:1`,
          reason: 'Disposable projection fixture',
        },
      });
      transactionId = transaction.id;
      await db.xpRedisProjectionRevision.create({
        data: { redisKey, userId, revision: 1 },
      });
      const outbox = await db.xpRedisOutbox.create({
        data: {
          transactionId, projection: 'WEEKLY', redisKey, userId, seasonId, groupId,
          status: 'PROCESSING', attempts: 1,
          lockedUntil: new Date(Date.now() + 120_000),
        },
      });
      outboxIds.push(outbox.id);
      projection = new XpRedisProjectionService(db, redis);
      writer = new XpRedisCoordinatedWriteService(db, projection, redis);
    }, 20_000);

    afterAll(async () => {
      try {
        if (redis) {
          await redis.del(redisKey, `${redisKey}:versions`);
        }
        if (db) {
          if (outboxIds.length) {
            await db.xpRedisOutbox.deleteMany({ where: { id: { in: outboxIds } } });
          }
          await db.xpRedisProjectionRevision.deleteMany({ where: { redisKey, userId } });
          if (secondTransactionId) {
            await db.xpTransaction.deleteMany({ where: { id: { in: [transactionId, secondTransactionId] } } });
          } else if (transactionId) {
            await db.xpTransaction.deleteMany({ where: { id: transactionId } });
          }
          if (seasonId) await db.leaderboardSeason.delete({ where: { id: seasonId } });
          await db.user.deleteMany({ where: { id: userId } });
          await db.$disconnect();
        }
      } finally {
        if (redis) redis.disconnect();
      }
    }, 20_000);

    it('reads authoritative PostgreSQL score/revision and publishes matching Redis score/version', async () => {
      const pgEntry = await db.leaderboardEntry.findFirstOrThrow({
        where: { userId, groupId },
      });
      const pgRevision = await db.xpRedisProjectionRevision.findUniqueOrThrow({
        where: { redisKey_userId: { redisKey, userId } },
      });
      const snapshot = await projection.absoluteScore(outboxIds[0]);

      expect(snapshot).toEqual({
        redisKey, userId, score: pgEntry.periodXp, revision: pgRevision.revision,
      });
      expect(await writer.apply(outboxIds[0], 1)).toBe('APPLIED');
      expect(await redis.zscore(redisKey, userId)).toBe(String(pgEntry.periodXp));
      expect(await redis.hget(`${redisKey}:versions`, userId)).toBe(String(pgRevision.revision));
      expect((await db.xpRedisOutbox.findUniqueOrThrow({
        where: { id: outboxIds[0] },
      })).status).toBe('DONE');
      expect(await db.xpTransaction.count({ where: { userId } })).toBe(1);
    });

    it('applies a newer PostgreSQL revision when the authoritative score decreases; stale outbox cannot restore the old score', async () => {
      await db.leaderboardEntry.updateMany({
        where: { userId, groupId },
        data: { periodXp: 12 },
      });
      const transaction = await db.xpTransaction.create({
        data: {
          userId, xpProfileId: profileId, sourceType: 'ADMIN_ADJUSTMENT',
          sourceId: `qa-projection-${tag}-2`, baseXp: -28, bonusXp: 0,
          finalXp: -28, idempotencyKey: `qa-projection:${tag}:2`,
          reason: 'Disposable score decrease fixture',
        },
      });
      secondTransactionId = transaction.id;
      const revision = await db.xpRedisProjectionRevision.update({
        where: { redisKey_userId: { redisKey, userId } },
        data: { revision: { increment: 1 } },
      });
      const outbox = await db.xpRedisOutbox.create({
        data: {
          transactionId: secondTransactionId, projection: 'WEEKLY', redisKey,
          userId, seasonId, groupId, status: 'PROCESSING', attempts: 1,
          lockedUntil: new Date(Date.now() + 120_000),
        },
      });
      outboxIds.push(outbox.id);

      const latest = await projection.absoluteScore(outbox.id);
      expect(latest.score).toBe(12);
      expect(latest.revision).toBe(revision.revision);
      expect(await writer.apply(outbox.id, 1)).toBe('APPLIED');
      expect(await redis.zscore(redisKey, userId)).toBe('12');
      expect(await redis.hget(`${redisKey}:versions`, userId)).toBe(String(revision.revision));

      // Reprocessing an older outbox resolves the current authoritative snapshot,
      // so it cannot replay its historical score or increment XP again.
      const oldRow = await db.xpRedisOutbox.update({
        where: { id: outboxIds[0] },
        data: { status: 'PROCESSING', attempts: 2, lockedUntil: new Date(Date.now() + 120_000) },
      });
      expect(await writer.apply(oldRow.id, 2)).toBe('APPLIED');
      expect(await redis.zscore(redisKey, userId)).toBe('12');
      expect(Number(await redis.hget(`${redisKey}:versions`, userId))).toBe(revision.revision);
      expect(await db.xpTransaction.count({ where: { userId } })).toBe(2);
    });
  },
);

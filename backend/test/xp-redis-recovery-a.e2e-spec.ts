/**
 * Recovery A: real PostgreSQL + Redis, client connection outage and retry.
 * QA-only; never stops shared containers or enables a worker.
 */
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../src/prisma/prisma.service';
import { XpRedisProjectionService } from '../src/modules/leaderboard/xp-redis-projection.service';
import { XpRedisCoordinatedWriteService } from '../src/modules/leaderboard/xp-redis-coordinated-write.service';

function allowed() {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try {
    const pg = new URL(process.env.DATABASE_URL || '');
    const rd = new URL(process.env.REDIS_URL || '');
    return pg.hostname === '127.0.0.1' && pg.port === '15432' &&
      pg.pathname === '/beaconvie_xp_test' &&
      rd.hostname === '127.0.0.1' && rd.port === '16379' &&
      (rd.pathname === '' || rd.pathname === '/0');
  } catch { return false; }
}

(allowed() ? describe : describe.skip)('XP Recovery A — disposable PG/Redis outage and retry', () => {
  const tag = randomUUID();
  const key = `qa:xp:recovery-a:${tag}`;
  let db: PrismaService;
  let healthy: Redis;
  let broken: Redis;
  let userId = '';
  let seasonId = '';
  let transactionId = '';
  let outboxId = '';
  let groupId = '';
  let profileId = '';

  beforeAll(async () => {
    db = new PrismaService();
    await db.$connect();
    healthy = new Redis(process.env.REDIS_URL!, {
      lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null,
    });
    await healthy.connect();
    expect(await healthy.ping()).toBe('PONG');

    const user = await db.user.create({
      data: { fullname: 'Recovery A fixture',
        email: `xp-recovery-a-${tag}@__test-fixture__.invalid`,
        password: 'not-a-real-password-hash' },
    });
    userId = user.id;
    profileId = (await db.userXpProfile.create({ data: { userId } })).id;
    seasonId = (await db.leaderboardSeason.create({
      data: { name: `Recovery A ${tag}`, periodType: 'WEEKLY',
        startsAt: new Date(Date.now() - 60000),
        endsAt: new Date(Date.now() + 3600000),
        status: 'ACTIVE', isActive: false },
    })).id;
    groupId = (await db.leaderboardGroup.create({
      data: { seasonId, scope: 'GLOBAL', league: 'BRONZE', groupNumber: 1 },
    })).id;
    await db.leaderboardEntry.create({
      data: { groupId, userId, xpProfileId: profileId, periodXp: 40 },
    });
    transactionId = (await db.xpTransaction.create({
      data: { userId, xpProfileId: profileId, sourceType: 'LESSON',
        sourceId: `recovery-a-${tag}`, baseXp: 40, finalXp: 40,
        idempotencyKey: `recovery-a:${tag}`, reason: 'Disposable QA' },
    })).id;
    await db.xpRedisProjectionRevision.create({
      data: { redisKey: key, userId, revision: 1 },
    });
    outboxId = (await db.xpRedisOutbox.create({
      data: { transactionId, projection: 'WEEKLY', redisKey: key,
        userId, seasonId, groupId, status: 'PROCESSING',
        attempts: 1, lockedUntil: new Date(Date.now() + 120000) },
    })).id;
  }, 20000);

  afterAll(async () => {
    try {
      if (healthy) await healthy.del(key, `${key}:versions`);
      if (db) {
        if (outboxId) await db.xpRedisOutbox.deleteMany({ where: { id: outboxId } });
        if (userId) await db.xpRedisProjectionRevision.deleteMany({ where: { redisKey: key, userId } });
        if (transactionId) await db.xpTransaction.deleteMany({ where: { id: transactionId } });
        if (seasonId) await db.leaderboardSeason.delete({ where: { id: seasonId } });
        if (userId) await db.user.deleteMany({ where: { id: userId } });
        await db.$disconnect();
      }
    } finally {
      if (broken) broken.disconnect();
      if (healthy) healthy.disconnect();
    }
  }, 20000);

  it('does not commit DONE when the Redis connection is unavailable', async () => {
    // Closed loopback port simulates a failed Redis connection without stopping
    // the QA Redis container. It is NOT a server restart or mid-command timeout.
    broken = new Redis('redis://127.0.0.1:16380/0', {
      lazyConnect: true, maxRetriesPerRequest: 1,
      connectTimeout: 500, retryStrategy: () => null,
    });
    broken.on('error', () => undefined);
    const projection = new XpRedisProjectionService(db, broken);
    const writer = new XpRedisCoordinatedWriteService(db, projection, broken);
    await expect(writer.apply(outboxId, 1)).rejects.toThrow();
    const outbox = await db.xpRedisOutbox.findUniqueOrThrow({ where: { id: outboxId } });
    expect(outbox.status).toBe('PROCESSING');
    expect(outbox.attempts).toBe(1);
    expect(await db.xpTransaction.count({ where: { userId } })).toBe(1);
    expect(await db.leaderboardEntry.findFirstOrThrow({
      where: { groupId, userId },
    })).toMatchObject({ periodXp: 40 });
    expect(await healthy.zscore(key, userId)).toBeNull();
  }, 20000);

  it('retries the same outbox after Redis is available without duplicating XP', async () => {
    const projection = new XpRedisProjectionService(db, healthy);
    const writer = new XpRedisCoordinatedWriteService(db, projection, healthy);
    expect(await writer.apply(outboxId, 1)).toBe('APPLIED');
    expect(await healthy.zscore(key, userId)).toBe('40');
    expect(await healthy.hget(`${key}:versions`, userId)).toBe('1');
    expect((await db.xpRedisOutbox.findUniqueOrThrow({
      where: { id: outboxId },
    })).status).toBe('DONE');
    expect(await db.xpTransaction.count({ where: { userId } })).toBe(1);
    expect(await writer.apply(outboxId, 1)).toBe('STALE');
    expect(await healthy.zscore(key, userId)).toBe('40');
  }, 20000);
});

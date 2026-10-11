import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../src/prisma/prisma.service';
import { XpRedisOutboxClaimService } from '../src/modules/leaderboard/xp-redis-outbox-claim.service';
import { XpRedisCoordinatedWriteService } from '../src/modules/leaderboard/xp-redis-coordinated-write.service';
import { XpRedisProjectionService } from '../src/modules/leaderboard/xp-redis-projection.service';

const safe = (() => {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try {
    const db = new URL(process.env.DATABASE_URL || '');
    return db.hostname === '127.0.0.1' && db.port === '15432' &&
      db.pathname === '/beaconvie_xp_test';
  } catch { return false; }
})();

(safe ? describe : describe.skip)('XP coordinated Redis write — disposable PostgreSQL + Redis', () => {
  let db: PrismaService;
  let redis: Redis;
  let claim: XpRedisOutboxClaimService;
  let projection: XpRedisProjectionService;
  let writer: XpRedisCoordinatedWriteService;
  const tag = randomUUID();
  const key = `qa:xp:coordinated:${tag}`;
  const userId = `qa-coordinated-${tag}`;
  const ids: string[] = [];
  let score = 30;
  let revision = 1;

  beforeAll(async () => {
    db = new PrismaService();
    await db.$connect();
    redis = new Redis({ host: '127.0.0.1', port: 16379, lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null });
    await redis.connect();
    claim = new XpRedisOutboxClaimService(db);
    projection = new XpRedisProjectionService(db, redis);
    jest.spyOn(projection, 'absoluteScore').mockImplementation(async () => ({
      redisKey: key, userId, score, revision,
    }));
    writer = new XpRedisCoordinatedWriteService(db, projection, redis);
    await db.xpRedisProjectionRevision.create({ data: { redisKey: key, userId, revision: 1 } });
  });

  afterAll(async () => {
    if (db) {
      await db.xpRedisOutbox.deleteMany({ where: { id: { in: ids } } });
      await db.xpRedisProjectionRevision.deleteMany({ where: { redisKey: key, userId } });
      await db.$disconnect();
    }
    if (redis) {
      await redis.del(key, `${key}:versions`);
      redis.disconnect();
    }
  });

  async function job(status = 'PROCESSING', lockedUntil = new Date(Date.now() + 120000), attempts = 1) {
    const row = await db.xpRedisOutbox.create({ data: {
      transactionId: randomUUID(), projection: 'WEEKLY', redisKey: key,
      userId, status, lockedUntil, attempts,
    } });
    ids.push(row.id);
    return row;
  }

  beforeEach(async () => {
    score = 30;
    revision = 1;
    await db.xpRedisProjectionRevision.update({
      where: { redisKey_userId: { redisKey: key, userId } },
      data: { revision: 1 },
    });
    await redis.del(key, `${key}:versions`);
  });

  it('rejects expired worker A after worker B reclaims its lease', async () => {
    const row = await job('PROCESSING', new Date(Date.now() - 60000), 1);
    const reclaimed = (await claim.claim(100)).find(x => x.id === row.id);
    expect(reclaimed?.attempts).toBe(2);
    expect(await writer.apply(row.id, 1)).toBe('STALE');
    expect(await redis.zscore(key, userId)).toBeNull();
    expect(await writer.apply(row.id, 2)).toBe('APPLIED');
    expect(await redis.zscore(key, userId)).toBe('30');
  });

  it('only permits one worker to apply the same generation', async () => {
    const row = await job();
    const outcomes = await Promise.all([
      writer.apply(row.id, 1), writer.apply(row.id, 1),
    ]);
    expect(outcomes.sort()).toEqual(['APPLIED', 'STALE']);
    expect(await redis.zscore(key, userId)).toBe('30');
    expect((await db.xpRedisOutbox.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('DONE');
  });

  it('keeps outbox retryable if Redis command fails', async () => {
    const row = await job();
    const failedRedis = { eval: jest.fn().mockRejectedValue(new Error('QA_REDIS_DOWN')) } as unknown as Redis;
    const failing = new XpRedisCoordinatedWriteService(db, projection, failedRedis);
    await expect(failing.apply(row.id, 1)).rejects.toThrow('QA_REDIS_DOWN');
    expect((await db.xpRedisOutbox.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('PROCESSING');
    expect(await redis.zscore(key, userId)).toBeNull();
    expect(await writer.apply(row.id, 1)).toBe('APPLIED');
  });

  it('supersedes an old snapshot when PostgreSQL authoritative revision advanced', async () => {
    const row = await job();
    await db.xpRedisProjectionRevision.update({
      where: { redisKey_userId: { redisKey: key, userId } },
      data: { revision: 2 },
    });
    expect(await writer.apply(row.id, 1)).toBe('SUPERSEDED');
    expect(await redis.zscore(key, userId)).toBeNull();
    expect((await db.xpRedisOutbox.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('DONE');
  });
});

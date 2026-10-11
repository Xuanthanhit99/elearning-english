import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { writeVersionedXpScore } from '../src/modules/leaderboard/xp-redis-version-fence';

const safe = (() => {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try {
    const db = new URL(process.env.DATABASE_URL || '');
    const redis = new URL(process.env.REDIS_URL || '');
    return db.hostname === '127.0.0.1' && db.port === '15432' &&
      db.pathname === '/beaconvie_xp_test' &&
      redis.hostname === '127.0.0.1' && redis.port === '16379';
  } catch { return false; }
})();

(safe ? describe : describe.skip)('Redis absolute score version fence — disposable local Redis', () => {
  let redis: Redis;
  const key = `qa:xp:fence:${randomUUID()}`;
  const member = `qa-user:${randomUUID()}`;

  beforeAll(async () => {
    redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1 });
    await redis.ping();
  });
  afterAll(async () => {
    if (redis) {
      await redis.del(key, `${key}:versions`);
      redis.disconnect();
    }
  });

  it('rejects stale updates, allows a newer decrease, and ignores equal-version retries', async () => {
    expect(await writeVersionedXpScore(redis, key, member, 100, 1)).toBe(true);
    expect(await writeVersionedXpScore(redis, key, member, 20, 2)).toBe(true);
    expect(await writeVersionedXpScore(redis, key, member, 999, 1)).toBe(false);
    expect(await writeVersionedXpScore(redis, key, member, 888, 2)).toBe(false);
    expect(await redis.zscore(key, member)).toBe('20');
  });

  it('rejects invalid versions without changing Redis', async () => {
    await expect(writeVersionedXpScore(redis, key, member, 50, 0))
      .rejects.toThrow('INVALID_PROJECTION_VERSION');
    expect(await redis.zscore(key, member)).toBe('20');
  });

  it('documents that losing BOTH Redis keys requires PostgreSQL-authoritative rebuild', async () => {
    await redis.del(key, `${key}:versions`);
    // A stale revision can be accepted after Redis loses the version hash.
    // This test deliberately proves why rebuild coordination is mandatory.
    expect(await writeVersionedXpScore(redis, key, member, 999, 1)).toBe(true);
    expect(await redis.zscore(key, member)).toBe('999');
  });
});

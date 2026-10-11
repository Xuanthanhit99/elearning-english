import Redis from 'ioredis';

/**
 * Atomic Redis-side version fence. This is a QA building block, not an
 * authorization check against the PostgreSQL lease.
 *
 * Version must be a strictly increasing PostgreSQL-authoritative projection
 * revision, NOT an outbox attempt count or wall-clock timestamp.
 * The version hash must have the same lifecycle as the sorted set.
 */
export const XP_REDIS_VERSIONED_ZADD_LUA = `
local incoming = tonumber(ARGV[2])
if not incoming or incoming < 1 or incoming ~= math.floor(incoming) then
  return redis.error_reply('INVALID_PROJECTION_VERSION')
end
local current = tonumber(redis.call('HGET', KEYS[2], ARGV[1]) or '0')
if incoming < current then
  return 0
end
if incoming == current then
  -- Equal revision is an idempotent no-op; never increment the score.
  return 0
end
redis.call('ZADD', KEYS[1], ARGV[3], ARGV[1])
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
return 1
`;

export async function writeVersionedXpScore(
  redis: Redis,
  key: string,
  userId: string,
  score: number,
  version: number,
): Promise<boolean> {
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error('INVALID_PROJECTION_VERSION');
  }
  if (!Number.isSafeInteger(score)) {
    throw new Error('INVALID_PROJECTION_SCORE');
  }
  const applied = await redis.eval(
    XP_REDIS_VERSIONED_ZADD_LUA,
    2,
    key,
    `${key}:versions`,
    userId,
    String(version),
    String(score),
  );
  return applied === 1;
}

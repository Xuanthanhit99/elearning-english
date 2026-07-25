import Redis, { RedisOptions } from 'ioredis';

export function getRedisConnectionOptions(
  overrides: RedisOptions = {},
): RedisOptions {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (redisUrl) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
      ...overrides,
    };
  }

  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    ...overrides,
  };
}

export function createRedisClient(overrides: RedisOptions = {}) {
  return new Redis(getRedisConnectionOptions(overrides));
}

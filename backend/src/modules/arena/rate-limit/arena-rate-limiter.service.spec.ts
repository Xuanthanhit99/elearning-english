import { HttpException } from '@nestjs/common';
import { ArenaRateLimiterService } from './arena-rate-limiter.service';

jest.setTimeout(30000);

describe('ArenaRateLimiterService (real Redis)', () => {
  const env = { ...process.env };
  let first: ArenaRateLimiterService;
  let second: ArenaRateLimiterService;
  let prefix: string;

  beforeEach(async () => {
    prefix = `arena:rate-limit:test:${Date.now()}:${Math.random()}`;
    process.env.ARENA_RATE_LIMIT_ENABLED = 'true';
    process.env.ARENA_RATE_LIMIT_KEY_PREFIX = prefix;
    process.env.ARENA_QUEUE_JOIN_LIMIT = '2';
    process.env.ARENA_QUEUE_JOIN_WINDOW_SECONDS = '1';
    first = new ArenaRateLimiterService();
    second = new ArenaRateLimiterService();
  });

  afterEach(async () => {
    await first.cleanupTestKeys(prefix).catch(() => undefined);
    await first.onModuleDestroy();
    await second.onModuleDestroy();
    process.env = { ...env };
  });

  it('shares one user quota across two simulated app instances', async () => {
    await first.consume('user-a', 'queueJoin');
    await second.consume('user-a', 'queueJoin');

    await expect(second.consume('user-a', 'queueJoin')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('keeps different users isolated', async () => {
    await first.consume('user-a', 'queueJoin');
    await first.consume('user-a', 'queueJoin');

    await expect(second.consume('user-b', 'queueJoin')).resolves.toMatchObject({
      allowed: true,
    });
  });

  it('restores access after TTL expiry', async () => {
    await first.consume('user-a', 'queueJoin');
    await first.consume('user-a', 'queueJoin');
    await expect(first.consume('user-a', 'queueJoin')).rejects.toMatchObject({
      status: 429,
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));
    await expect(second.consume('user-a', 'queueJoin')).resolves.toMatchObject({
      allowed: true,
    });
  });

  it('does not charge internal retries', async () => {
    await first.consume('user-a', 'queueJoin', { internal: true });
    await first.consume('user-a', 'queueJoin', { internal: true });

    await expect(first.consume('user-a', 'queueJoin')).resolves.toMatchObject({
      allowed: true,
    });
  });

  it('does not allow arbitrary missing users to bypass the limiter', async () => {
    await expect(first.consume(undefined, 'queueJoin')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('returns a deterministic throttling error and cleans keys', async () => {
    await first.consume('user-a', 'queueJoin');
    await first.consume('user-a', 'queueJoin');

    try {
      await first.consume('user-a', 'queueJoin');
      throw new Error('expected throttle');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'ARENA_RATE_LIMITED',
      });
    }

    expect(await first.cleanupTestKeys(prefix)).toBeGreaterThan(0);
    await expect(first.consume('user-a', 'queueJoin')).resolves.toMatchObject({
      allowed: true,
    });
  });
});

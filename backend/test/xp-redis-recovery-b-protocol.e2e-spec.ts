/**
 * Recovery B pre-migration protocol proof, NOT Recovery B E2E.
 * Disposable local QA only. Uses PostgreSQL advisory locks to model
 * publication/finalization ordering; does not claim to test production writer.
 */
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

function allowed(): boolean {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try {
    const pg = new URL(process.env.DATABASE_URL || '');
    const rd = new URL(process.env.REDIS_URL || '');
    return pg.hostname === '127.0.0.1' && pg.port === '15432' &&
      pg.pathname === '/beaconvie_xp_test' && rd.hostname === '127.0.0.1' &&
      rd.port === '16379' && (rd.pathname === '' || rd.pathname === '/0');
  } catch { return false; }
}

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

(allowed() ? describe : describe.skip)('Recovery B — isolated protocol proof (NOT E2E)', () => {
  const tag = randomUUID();
  const redisKey = `qa:xp:protocol-b:${tag}`;
  // Unique, positive advisory lock IDs; never shared with application locks.
  const scopeLock = Math.floor(Math.random() * 1000000000) + 1000000000;
  const barrierLock = scopeLock + 1;
  let a: PrismaClient;
  let b: PrismaClient;
  let redis: Redis;

  beforeAll(async () => {
    a = new PrismaClient();
    b = new PrismaClient();
    await Promise.all([a.$connect(), b.$connect()]);
    redis = new Redis(process.env.REDIS_URL!, {
      lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null,
    });
    await redis.connect();
    expect(await redis.ping()).toBe('PONG');
  }, 20000);

  afterAll(async () => {
    try { if (redis) await redis.del(redisKey, `${redisKey}:versions`, `${redisKey}:epoch`); }
    finally {
      if (redis) redis.disconnect();
      if (a) await a.$disconnect();
      if (b) await b.$disconnect();
    }
  }, 20000);

  it('serializes the finalization barrier after an in-flight award transaction', async () => {
    const entered = deferred();
    const finishAward = deferred();
    const events: string[] = [];
    const award = a.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${barrierLock})`;
      events.push('award-locked');
      entered.release();
      await finishAward.promise;
      events.push('award-commit-requested');
    }, { timeout: 10000 });

    await entered.promise;
    const finalizer = b.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${barrierLock})`;
      events.push('finalizer-locked');
    }, { timeout: 10000 });

    // The finalizer is waiting on the same transactional barrier.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(events).toEqual(['award-locked']);
    finishAward.release();
    await Promise.all([award, finalizer]);
    expect(events).toEqual(['award-locked', 'award-commit-requested', 'finalizer-locked']);
  }, 15000);

  it('forces a scope epoch transition to wait for the preceding writer', async () => {
    const writerEntered = deferred();
    const releaseWriter = deferred();
    const events: string[] = [];
    const writer = a.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${scopeLock})`;
      events.push('writer-locked');
      writerEntered.release();
      await releaseWriter.promise;
      events.push('writer-finishing');
    }, { timeout: 10000 });
    await writerEntered.promise;
    const transition = b.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${scopeLock})`;
      events.push('transition-locked');
    }, { timeout: 10000 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(events).toEqual(['writer-locked']);
    releaseWriter.release();
    await Promise.all([writer, transition]);
    expect(events).toEqual(['writer-locked', 'writer-finishing', 'transition-locked']);
  }, 15000);

  it('fails closed when Redis epoch metadata is absent, including after score/version loss', async () => {
    const lua = `
      local installed = redis.call('GET', KEYS[3])
      if not installed or installed ~= ARGV[3] then
        return redis.error_reply('XP_EPOCH_MISSING_OR_MISMATCHED')
      end
      local old = tonumber(redis.call('HGET', KEYS[2], ARGV[1]) or '0')
      local incoming = tonumber(ARGV[2])
      if not incoming or incoming < 1 or incoming <= old then return 0 end
      redis.call('ZADD', KEYS[1], ARGV[4], ARGV[1])
      redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
      return 1
    `;
    const keys = [redisKey, `${redisKey}:versions`, `${redisKey}:epoch`];
    await redis.del(...keys);
    const write = (epoch: string) => redis.eval(lua, 3, ...keys, 'fixture-member', '1', epoch, '42');
    await expect(write('1')).rejects.toThrow('XP_EPOCH_MISSING_OR_MISMATCHED');
    await redis.set(keys[2], '2');
    await expect(write('1')).rejects.toThrow('XP_EPOCH_MISSING_OR_MISMATCHED');
    expect(await write('2')).toBe(1);
    expect(await redis.zscore(redisKey, 'fixture-member')).toBe('42');
    await redis.del(...keys);
    await expect(write('2')).rejects.toThrow('XP_EPOCH_MISSING_OR_MISMATCHED');
    expect(await redis.zscore(redisKey, 'fixture-member')).toBeNull();
  }, 10000);
});

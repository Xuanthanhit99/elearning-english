/**
 * Recovery B protocol proof phase 2: coordinator contention and failed PG
 * finalization. This is a pre-migration simulation, NOT Recovery B E2E.
 * Uses fixture-only Redis keys and PG transactional advisory locks.
 */
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

function allowed() {
  if (process.env.BEACONVIE_LOCAL_XP_TEST !== 'YES_I_USE_DISPOSABLE_DATA') return false;
  try {
    const pg = new URL(process.env.DATABASE_URL || '');
    const rd = new URL(process.env.REDIS_URL || '');
    return pg.hostname === '127.0.0.1' && pg.port === '15432' &&
      pg.pathname === '/beaconvie_xp_test' && rd.hostname === '127.0.0.1' &&
      rd.port === '16379' && (rd.pathname === '' || rd.pathname === '/0');
  } catch { return false; }
}
function signal() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}
(allowed() ? describe : describe.skip)('Recovery B — coordinator/rollback protocol proof (NOT E2E)', () => {
  const id = randomUUID();
  const key = `qa:xp:protocol-b-finalize:${id}`;
  const lockId = 1900000000 + Math.floor(Math.random() * 100000000);
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
    try { if (redis) await redis.del(key, `${key}:versions`, `${key}:epoch`); }
    finally {
      if (redis) redis.disconnect();
      await Promise.all([a?.$disconnect(), b?.$disconnect()]);
    }
  }, 20000);

  it('allows only one coordinator to hold the exclusive finalization lock at a time', async () => {
    const entered = signal();
    const releaseFirst = signal();
    const events: string[] = [];
    const first = a.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;
      events.push('first-entered');
      entered.release();
      await releaseFirst.promise;
      events.push('first-exiting');
    }, { timeout: 10000 });
    try {
      await entered.promise;
      const second = b.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ acquired: boolean }>>`
          SELECT pg_try_advisory_xact_lock(${lockId}) AS acquired
        `;
        events.push(rows[0].acquired ? 'second-acquired' : 'second-rejected');
        return rows[0].acquired;
      }, { timeout: 10000 });
      expect(await second).toBe(false);
      expect(events).toEqual(['first-entered', 'second-rejected']);
    } finally {
      releaseFirst.release();
      await first;
    }
    expect(events).toEqual(['first-entered', 'second-rejected', 'first-exiting']);
  }, 15000);

  it('does not mark PG READY when Redis publication succeeded but PG transaction rolls back', async () => {
    // Fixture row uses a temporary table inside one pinned transaction.
    await expect(a.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('CREATE TEMP TABLE xp_protocol_state (id text PRIMARY KEY, state text NOT NULL) ON COMMIT DROP');
      await tx.$executeRaw`INSERT INTO xp_protocol_state (id, state) VALUES (${id}, 'REBUILDING') ON CONFLICT (id) DO UPDATE SET state = 'REBUILDING'`;
      await redis.set(key, 'published-fixture');
      await tx.$executeRaw`UPDATE xp_protocol_state SET state = 'READY' WHERE id = ${id}`;
      throw new Error('SIMULATED_FINALIZATION_FAILURE');
    }, { timeout: 10000 })).rejects.toThrow('SIMULATED_FINALIZATION_FAILURE');

    expect(await redis.get(key)).toBe('published-fixture');
    // CREATE TEMP TABLE is transactional; after rollback the table is absent.\n    const tables = await a.$queryRaw<Array<{ present: string | null }>>\`\n      SELECT to_regclass('pg_temp.xp_protocol_state')::text AS present\n    \`;\n    expect(tables[0].present).toBeNull();
    // Safe retry must be modeled explicitly; never infer READY from Redis alone.
    expect(await redis.get(`${key}:epoch`)).toBeNull();
  }, 15000);
});

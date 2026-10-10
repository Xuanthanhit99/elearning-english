/**
 * Local-only PostgreSQL XP transaction tests.
 * Safety gate: explicitly opt in and refuse non-loopback DB hosts.
 * This exercises real XpService + Prisma; it does NOT replace HTTP-level
 * LearningPath authorization or Redis-outage acceptance tests.
 */
import { randomUUID } from 'crypto';
import { Prisma, XpSourceType } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { XpService } from '../src/modules/leaderboard/xp.service';

const url = process.env.DATABASE_URL;
const allowed = process.env.BEACONVIE_LOCAL_XP_TEST === 'YES_I_USE_DISPOSABLE_DATA';
const localHost = (() => {
  try {
    const u = new URL(url || '');
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname);
  } catch { return false; }
})();
const suite = allowed && localHost ? describe : describe.skip;

suite('XP transaction atomicity — disposable local PostgreSQL', () => {
  let prisma: PrismaService;
  let service: XpService;
  const users: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    // No active season fixture: the real service uses PostgreSQL but will
    // not emit Redis leaderboard updates in these two DB-focused cases.
    service = new XpService(prisma, {} as any, { emitGroupUpdated: jest.fn() } as any);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  });

  async function fixture() {
    const user = await prisma.user.create({
      data: {
        fullname: 'Local XP test fixture',
        email: `xp-local-${randomUUID()}@__test-fixture__.invalid`,
        password: 'not-a-real-password-hash',
      },
    });
    users.push(user.id);
    await prisma.userXpProfile.create({ data: { userId: user.id } });
    return user;
  }

  function award(userId: string, key: string, sideEffects: (tx: Prisma.TransactionClient) => Promise<unknown>) {
    return service.awardXpWithSideEffects({
      userId,
      sourceType: XpSourceType.LESSON,
      sourceId: key,
      baseXp: 20,
      bonusXp: 0,
      idempotencyKey: key,
      reason: 'Local atomicity fixture',
    }, sideEffects);
  }

  it('settles one XP transaction when two requests race on one key', async () => {
    const user = await fixture();
    const key = `local-xp:${randomUUID()}`;
    const results = await Promise.allSettled(
      Array.from({ length: 2 }, () => award(user.id, key, async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { fullname: 'XP settled once' } });
        return { updated: true };
      })),
    );
    // A serialization error is not a successful settlement, but the durable
    // invariant must hold even if one request exhausts its retry budget.
    const rows = await prisma.xpTransaction.findMany({ where: { idempotencyKey: key } });
    expect(rows).toHaveLength(1);
    expect(rows[0].finalXp).toBe(20);
    const profile = await prisma.userXpProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(profile.totalXp).toBe(20);
    expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
  });

  it('rolls back XP ledger and profile when transactional side effect fails', async () => {
    const user = await fixture();
    const key = `local-xp:${randomUUID()}`;
    await expect(award(user.id, key, async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { fullname: 'must roll back' } });
      throw new Error('injected transactional failure');
    })).rejects.toThrow('injected transactional failure');
    expect(await prisma.xpTransaction.count({ where: { idempotencyKey: key } })).toBe(0);
    const profile = await prisma.userXpProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(profile.totalXp).toBe(0);
    const persisted = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(persisted.fullname).toBe('Local XP test fixture');
  });
});

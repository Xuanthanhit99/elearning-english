import { randomUUID } from 'crypto';
import { PrismaClient, XpSourceType } from '@prisma/client';
import { XpService } from './xp.service';

jest.setTimeout(60000);

/** Real-Postgres XP reversal gate. Run ONLY against the isolated QA database. */
describe('XP reversal — real PostgreSQL', () => {
  let prisma: PrismaClient;
  let service: XpService;
  const users: string[] = [];

  beforeAll(async () => {
    const raw = process.env.DATABASE_URL;
    if (!raw) throw new Error('DATABASE_URL is required');
    const url = new URL(raw);
    if (url.hostname !== '127.0.0.1' || url.port !== '5434' ||
        url.pathname !== '/beaconvie_english_qa' || url.searchParams.get('schema') !== 'public') {
      throw new Error('Refusing to run XP integration tests outside isolated QA PostgreSQL');
    }
    prisma = new PrismaClient();
    await prisma.$connect();
    const redis = { zadd: jest.fn(), expire: jest.fn(), zincrby: jest.fn() };
    const gateway = { emitGroupUpdated: jest.fn() };
    service = new XpService(prisma as any, redis as any, gateway as any);
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      for (const userId of users) {
        await prisma.user.delete({ where: { id: userId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  async function fixture() {
    const id = randomUUID();
    const user = await prisma.user.create({
      data: { fullname: 'XP Reversal QA', email: `xp-reversal-${id}@example.invalid`, password: 'not-a-login' },
    });
    users.push(user.id);
    await prisma.userXpProfile.create({ data: { userId: user.id, optedOut: true } });
    const award = await service.awardXp({
      userId: user.id,
      sourceType: XpSourceType.ADMIN_ADJUSTMENT,
      baseXp: 100,
      idempotencyKey: `xp-qa-source:${id}`,
    });
    expect(award.duplicated).toBe(false);
    return { userId: user.id, sourceId: award.transaction.id };
  }

  async function snapshot(userId: string, sourceId: string) {
    const [user, profile, source, reversals] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.userXpProfile.findUniqueOrThrow({ where: { userId } }),
      prisma.xpTransaction.findUniqueOrThrow({ where: { id: sourceId } }),
      prisma.xpTransaction.findMany({ where: { idempotencyKey: `reverse:${sourceId}` } }),
    ]);
    return { xp: user.xp, totalXp: profile.totalXp, reversedAt: source.reversedAt, reversals };
  }

  it('reverses exactly once and records the compensating ledger', async () => {
    const { userId, sourceId } = await fixture();
    const result = await service.reverseTransaction(sourceId, 'qa reversal');
    expect(result.duplicated).toBe(false);
    const state = await snapshot(userId, sourceId);
    expect(state.xp).toBe(0);
    expect(state.totalXp).toBe(0);
    expect(state.reversedAt).toBeInstanceOf(Date);
    expect(state.reversals).toHaveLength(1);
    expect(state.reversals[0].finalXp).toBe(-100);
  });

  it('does not reverse an already reversed source twice', async () => {
    const { userId, sourceId } = await fixture();
    await service.reverseTransaction(sourceId, 'first');
    await expect(service.reverseTransaction(sourceId, 'second')).rejects.toThrow();
    const state = await snapshot(userId, sourceId);
    expect(state.reversals).toHaveLength(1);
    expect(state.totalXp).toBe(0);
  });

  it('allows only one compensation under concurrent reversal calls', async () => {
    const { userId, sourceId } = await fixture();
    const results = await Promise.allSettled([
      service.reverseTransaction(sourceId, 'race A'),
      service.reverseTransaction(sourceId, 'race B'),
    ]);
    expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
    const state = await snapshot(userId, sourceId);
    expect(state.reversals).toHaveLength(1);
    expect(state.reversals[0].finalXp).toBe(-100);
    expect(state.xp).toBe(0);
    expect(state.totalXp).toBe(0);
    expect(state.reversedAt).toBeInstanceOf(Date);
  });

  it('rolls back ledger, XP and reversal marker when transactional callback fails; then retries cleanly', async () => {
    const { userId, sourceId } = await fixture();
    await expect(service.awardXpWithSideEffects({
      userId,
      sourceType: XpSourceType.ADMIN_ADJUSTMENT,
      sourceId,
      baseXp: -100,
      idempotencyKey: `reverse:${sourceId}`,
      reason: 'injected rollback',
    }, async (tx) => {
      const marked = await tx.xpTransaction.updateMany({
        where: { id: sourceId, reversedAt: null },
        data: { reversedAt: new Date(), reversalReason: 'injected rollback' },
      });
      expect(marked.count).toBe(1);
      throw new Error('QA injected rollback');
    })).rejects.toThrow('QA injected rollback');
    const rolledBack = await snapshot(userId, sourceId);
    expect(rolledBack.xp).toBe(100);
    expect(rolledBack.totalXp).toBe(100);
    expect(rolledBack.reversedAt).toBeNull();
    expect(rolledBack.reversals).toHaveLength(0);

    await service.reverseTransaction(sourceId, 'retry after rollback');
    const recovered = await snapshot(userId, sourceId);
    expect(recovered.xp).toBe(0);
    expect(recovered.totalXp).toBe(0);
    expect(recovered.reversals).toHaveLength(1);
    expect(recovered.reversedAt).toBeInstanceOf(Date);
  });
});

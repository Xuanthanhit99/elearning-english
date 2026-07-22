// Test-only in-memory stand-in for `XpService`, backed by `FakePrisma`
// (see arena-fake-prisma.ts's own docblock on why a hand-rolled fake
// exists at all for these unit tests). Implements only the two methods
// `ArenaProgressionDispatcherService` actually calls
// (`awardXpWithSideEffects`, `awardXp`) with the same essential contract
// as the real `XpService`: idempotency-key pre-check, `sideEffects(tx)`
// invoked with the fake Prisma instance as `tx` (matching FakePrisma's own
// `$transaction(cb)` calling `cb(this)`), and an `XpTransaction` row
// created on success. Deliberately does NOT model the real XpService's
// Leaderboard-season/Redis/gateway side effects, daily limits, or P2034
// retry — those are the real `XpService`'s own, already-covered
// responsibility (`xp.service.spec.ts`,
// `xp-transaction-retry.util.spec.ts`), not something Arena's unit tests
// need to re-prove.
import { FakePrisma } from './arena-fake-prisma';

type AwardXpInput = {
  userId: string;
  sourceType: string;
  sourceId?: string;
  baseXp: number;
  bonusXp?: number;
  idempotencyKey: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export class FakeXpService {
  constructor(private readonly fake: FakePrisma) {}

  async awardXp(input: AwardXpInput) {
    const existing = await this.fake.xpTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return { duplicated: true, transaction: existing };

    const finalXp = input.baseXp + (input.bonusXp ?? 0);
    const transaction = await this.fake.xpTransaction.create({
      data: {
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        baseXp: input.baseXp,
        bonusXp: input.bonusXp ?? 0,
        finalXp,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
      },
    });
    return { duplicated: false, transaction };
  }

  async awardXpWithSideEffects<T>(
    input: AwardXpInput,
    sideEffects: (tx: FakePrisma) => Promise<T>,
  ) {
    const existing = await this.fake.xpTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return { duplicated: true, transaction: existing, sideEffectResult: null as T | null };
    }

    const finalXp = input.baseXp + (input.bonusXp ?? 0);
    const sideEffectResult = await sideEffects(this.fake);
    const transaction = await this.fake.xpTransaction.create({
      data: {
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        baseXp: input.baseXp,
        bonusXp: input.bonusXp ?? 0,
        finalXp,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
      },
    });
    return { duplicated: false, transaction, sideEffectResult };
  }

  async reverseTransaction(transactionId: string, reason: string) {
    const source = await this.fake.xpTransaction.findUnique({ where: { id: transactionId } });
    if (!source) throw new Error('XP transaction not found');
    const result = await this.awardXp({
      userId: source.userId,
      sourceType: 'ADMIN_ADJUSTMENT',
      sourceId: source.id,
      baseXp: -source.finalXp,
      idempotencyKey: `reverse:${source.id}`,
      reason,
    });
    source.reversedAt = new Date();
    source.reversalReason = reason;
    return result;
  }
}

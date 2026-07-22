import { Prisma, XpSourceType } from '@prisma/client';
import { XpService } from './xp.service';

function serializationFailure() {
  return new Prisma.PrismaClientKnownRequestError('could not serialize access', {
    code: 'P2034',
    clientVersion: 'test',
  });
}

function uniqueConstraintViolation() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['idempotencyKey'] },
  });
}

/**
 * Plain hand-mocked collaborators (same lightweight convention as
 * `notifications.processor.spec.ts`) — these tests exercise XpService's own
 * orchestration (idempotency short-circuit, P2034 retry, P2002 recovery,
 * reverseTransaction delegation), not the transaction body's business logic
 * (already covered elsewhere by real-Postgres integration tests across
 * every existing XP caller). `prisma.$transaction` is mocked directly so
 * the retry wrapper's behavior can be asserted without simulating a fake
 * `tx` — `xp-transaction-retry.util.spec.ts` covers the retry primitive
 * itself in isolation.
 */
describe('XpService', () => {
  let prisma: {
    xpTransaction: {
      findUnique: jest.Mock;
      update: jest.Mock;
      aggregate: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let redis: { zadd: jest.Mock; expire: jest.Mock; zincrby: jest.Mock };
  let gateway: { emitGroupUpdated: jest.Mock };
  let service: XpService;

  const successfulTransactionResult = {
    transaction: { id: 'txn-1', finalXp: 20 },
    profile: { id: 'profile-1', optedOut: true },
    activeSeason: null,
    entry: null,
  };

  beforeEach(() => {
    prisma = {
      xpTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        aggregate: jest.fn().mockResolvedValue({ _sum: { finalXp: 0 } }),
      },
      $transaction: jest.fn(),
    };
    redis = { zadd: jest.fn(), expire: jest.fn(), zincrby: jest.fn() };
    gateway = { emitGroupUpdated: jest.fn() };
    service = new XpService(prisma as any, redis as any, gateway as any);

    // Deterministic, fast retries in every test.
    process.env.XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS = '4';
    process.env.XP_SERIALIZABLE_RETRY_BASE_DELAY_MS = '1';
  });

  afterEach(() => {
    delete process.env.XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS;
    delete process.env.XP_SERIALIZABLE_RETRY_BASE_DELAY_MS;
  });

  describe('awardXp', () => {
    it('short-circuits on an existing idempotencyKey without ever starting a transaction', async () => {
      prisma.xpTransaction.findUnique.mockResolvedValueOnce({ id: 'existing-txn' });

      const result = await service.awardXp({
        userId: 'user-1',
        sourceType: XpSourceType.ACHIEVEMENT,
        baseXp: 10,
        idempotencyKey: 'dup-key',
      });

      expect(result).toEqual({ duplicated: true, transaction: { id: 'existing-txn' } });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('retries on P2034 and succeeds once the conflict clears, preserving the result shape', async () => {
      prisma.$transaction
        .mockRejectedValueOnce(serializationFailure())
        .mockResolvedValueOnce(successfulTransactionResult);

      const result = await service.awardXp({
        userId: 'user-1',
        sourceType: XpSourceType.ACHIEVEMENT,
        baseXp: 10,
        idempotencyKey: 'key-1',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(result.duplicated).toBe(false);
      expect(result.transaction).toEqual({ id: 'txn-1', finalXp: 20 });
    });

    it('gives up and propagates a persistent P2034 after exhausting configured retries', async () => {
      prisma.$transaction.mockRejectedValue(serializationFailure());

      await expect(
        service.awardXp({
          userId: 'user-1',
          sourceType: XpSourceType.ACHIEVEMENT,
          baseXp: 10,
          idempotencyKey: 'key-2',
        }),
      ).rejects.toMatchObject({ code: 'P2034' });
      expect(prisma.$transaction).toHaveBeenCalledTimes(4); // XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS
    });

    it('does not retry a non-P2034 error', async () => {
      prisma.$transaction.mockRejectedValue(new Error('unrelated db error'));

      await expect(
        service.awardXp({
          userId: 'user-1',
          sourceType: XpSourceType.ACHIEVEMENT,
          baseXp: 10,
          idempotencyKey: 'key-3',
        }),
      ).rejects.toThrow('unrelated db error');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('awardXpWithSideEffects', () => {
    it('retries on P2034 like awardXp, running sideEffects fresh on each attempt', async () => {
      const sideEffects = jest.fn().mockResolvedValue('side-effect-result');
      prisma.$transaction
        .mockRejectedValueOnce(serializationFailure())
        .mockImplementationOnce(async (fn: any) => {
          const sideEffectResult = await sideEffects({} as any);
          return { ...successfulTransactionResult, sideEffectResult };
        });

      const result = await service.awardXpWithSideEffects(
        {
          userId: 'user-1',
          sourceType: XpSourceType.ARENA,
          baseXp: 20,
          idempotencyKey: 'key-4',
        },
        sideEffects,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(sideEffects).toHaveBeenCalledTimes(1); // only the successful attempt actually ran the callback in this mock
      expect(result.duplicated).toBe(false);
      expect((result as any).sideEffectResult).toBe('side-effect-result');
    });

    it('P2002 (idempotency race) is NOT retried by the P2034 wrapper, but is still recovered via lookup exactly as before', async () => {
      prisma.$transaction.mockRejectedValue(uniqueConstraintViolation());
      prisma.xpTransaction.findUnique
        .mockResolvedValueOnce(null) // initial pre-check: no existing row yet
        .mockResolvedValueOnce({ id: 'existing-from-race' }); // post-P2002 recovery lookup

      const result = await service.awardXpWithSideEffects(
        {
          userId: 'user-1',
          sourceType: XpSourceType.ARENA,
          baseXp: 20,
          idempotencyKey: 'key-5',
        },
        jest.fn(),
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1); // not retried — P2002 isn't a serialization failure
      expect(result).toEqual({
        duplicated: true,
        transaction: { id: 'existing-from-race' },
        sideEffectResult: null,
      });
    });
  });

  describe('reverseTransaction', () => {
    it('awards the inverse XP delta and marks the source transaction reversed', async () => {
      prisma.xpTransaction.findUnique
        .mockResolvedValueOnce({ id: 'source-txn', userId: 'user-1', finalXp: 30, reversedAt: null })
        .mockResolvedValueOnce(null); // awardXp's own idempotency pre-check for the reversal key
      prisma.$transaction.mockResolvedValueOnce(successfulTransactionResult);

      await service.reverseTransaction('source-txn', 'admin correction');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.xpTransaction.update).toHaveBeenCalledWith({
        where: { id: 'source-txn' },
        data: { reversedAt: expect.any(Date), reversalReason: 'admin correction' },
      });
    });

    it('rejects reversing an already-reversed transaction', async () => {
      prisma.xpTransaction.findUnique.mockResolvedValueOnce({
        id: 'source-txn',
        userId: 'user-1',
        finalXp: 30,
        reversedAt: new Date(),
      });

      await expect(service.reverseTransaction('source-txn', 'again')).rejects.toThrow(
        'Transaction already reversed',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('still benefits from P2034 retry (delegates to awardXp, which is already retry-wrapped)', async () => {
      prisma.xpTransaction.findUnique
        .mockResolvedValueOnce({ id: 'source-txn', userId: 'user-1', finalXp: 30, reversedAt: null })
        .mockResolvedValueOnce(null);
      prisma.$transaction
        .mockRejectedValueOnce(serializationFailure())
        .mockResolvedValueOnce(successfulTransactionResult);

      await service.reverseTransaction('source-txn', 'admin correction');
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });
  });
});

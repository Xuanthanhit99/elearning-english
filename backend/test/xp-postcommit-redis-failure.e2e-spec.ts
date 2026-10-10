/**
 * Fault-injection contract test: DB transaction resolves, Redis zadd fails.
 * Uses mocked Prisma/Redis for deterministic error semantics; this is NOT
 * evidence of real Redis recovery or Postgres consistency.
 */
import { XpSourceType } from '@prisma/client';
import { XpService } from '../src/modules/leaderboard/xp.service';

describe('XP Redis post-commit failure contract', () => {
  it('currently propagates Redis error after transaction commit', async () => {
    const prisma = {
      xpTransaction: { findUnique: jest.fn().mockResolvedValue(null) },
      xpTransactionAggregate: {},
      userXpProfile: { findUnique: jest.fn() },
      $transaction: jest.fn().mockResolvedValue({
        transaction: { id: 'tx-1', finalXp: 20 },
        profile: { optedOut: false },
        activeSeason: { id: 'season-1' },
        entry: { id: 'entry-1', groupId: 'group-1', periodXp: 20 },
        sideEffectResult: null,
      }),
    };
    // Override daily limit only: transaction result is a committed fixture.
    const redis = { zadd: jest.fn().mockRejectedValue(new Error('REDIS_DOWN')), expire: jest.fn(), zincrby: jest.fn() };
    const gateway = { emitGroupUpdated: jest.fn() };
    const xp = new XpService(prisma as any, redis as any, gateway as any);
    jest.spyOn(xp as any, 'assertDailyLimit').mockResolvedValue(undefined);

    await expect(xp.awardXpWithSideEffects({
      userId: 'fixture-user', sourceType: XpSourceType.LESSON,
      sourceId: 'fixture-lesson', baseXp: 20, bonusXp: 0,
      idempotencyKey: 'learning:LESSON_COMPLETED:fixture-user:fixture-lesson',
    }, async () => null)).rejects.toThrow('REDIS_DOWN');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(redis.zadd).toHaveBeenCalledTimes(1);
    expect(gateway.emitGroupUpdated).not.toHaveBeenCalled();
  });
});

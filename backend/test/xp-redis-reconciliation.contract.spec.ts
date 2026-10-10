/**
 * Characterization only: XpService post-commit failure and reconciliation math.
 * Prisma transaction/Redis are deterministic doubles, NOT a real PostgreSQL/
 * Redis integration test and NOT evidence that a production recovery job exists.
 */
import { XpSourceType } from '@prisma/client';
import { XpService } from '../src/modules/leaderboard/xp.service';
import { skillRedisKey, weeklyRedisKey } from '../src/modules/leaderboard/leaderboard.constants';

describe('XP post-commit Redis failure and reconciliation contracts', () => {
  const userId = 'local-qa-user';
  const seasonId = 'local-qa-season';
  const groupId = 'local-qa-group';
  const key = 'local-qa-xp-key';
  const weeklyKey = weeklyRedisKey(seasonId, groupId);
  const skillKeyPattern = /^leaderboard:skill:READING:/;
  const input = {
    userId, sourceType: XpSourceType.LESSON, sourceId: 'local-qa-lesson',
    skill: 'READING' as any, baseXp: 20, bonusXp: 0, idempotencyKey: key,
  };

  function setup() {
    const scores = new Map<string, Map<string, number>>();
    const getScore = (redisKey: string, member: string) =>
      scores.get(redisKey)?.get(member) ?? null;
    const putScore = (redisKey: string, member: string, score: number) => {
      if (!scores.has(redisKey)) scores.set(redisKey, new Map());
      scores.get(redisKey)!.set(member, score);
    };
    const redis = {
      zadd: jest.fn(async (redisKey: string, score: number, member: string) => {
        putScore(redisKey, member, Number(score));
        return 1;
      }),
      expire: jest.fn(async () => 1),
      zincrby: jest.fn(async (redisKey: string, delta: number, member: string) => {
        const updated = (getScore(redisKey, member) ?? 0) + Number(delta);
        putScore(redisKey, member, updated);
        return String(updated);
      }),
      zscore: jest.fn(async (redisKey: string, member: string) => {
        const value = getScore(redisKey, member);
        return value === null ? null : String(value);
      }),
    };
    const transaction = { id: 'committed-ledger', finalXp: 20 };
    let committed = false;
    const prisma = {
      xpTransaction: {
        findUnique: jest.fn(async () => committed ? transaction : null),
      },
      $transaction: jest.fn(async () => {
        committed = true;
        return {
          transaction, profile: { optedOut: false },
          activeSeason: { id: seasonId },
          entry: { id: 'db-entry', groupId, periodXp: 20 },
          sideEffectResult: null,
        };
      }),
    };
    const gateway = { emitGroupUpdated: jest.fn() };
    const xp = new XpService(prisma as any, redis as any, gateway as any);
    jest.spyOn(xp as any, 'assertDailyLimit').mockResolvedValue(undefined);
    const award = () => xp.awardXpWithSideEffects(input, async () => null);
    return { redis, prisma, award, getScore, putScore, scores, gateway, isCommitted: () => committed };
  }

  it('ZADD failure after commit: ledger survives; duplicate request cannot repair missing weekly score', async () => {
    const f = setup();
    f.redis.zadd.mockRejectedValueOnce(new Error('LOCAL_QA_REDIS_ZADD_DOWN'));
    await expect(f.award()).rejects.toThrow('LOCAL_QA_REDIS_ZADD_DOWN');
    expect(f.isCommitted()).toBe(true);
    expect(f.getScore(weeklyKey, userId)).toBeNull();
    const again = await f.award();
    expect(again.duplicated).toBe(true);
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(f.redis.zadd).toHaveBeenCalledTimes(1);
    expect(f.getScore(weeklyKey, userId)).toBeNull();
  });

  it('ZINCRBY failure after weekly ZADD: retry skips missing skill score', async () => {
    const f = setup();
    f.redis.zincrby.mockRejectedValueOnce(new Error('LOCAL_QA_SKILL_DOWN'));
    await expect(f.award()).rejects.toThrow('LOCAL_QA_SKILL_DOWN');
    expect(f.getScore(weeklyKey, userId)).toBe(20);
    expect([...f.scores.keys()].filter(k => skillKeyPattern.test(k))).toHaveLength(0);
    expect((await f.award()).duplicated).toBe(true);
    expect(f.redis.zincrby).toHaveBeenCalledTimes(1);
  });

  it('replaying ZINCRBY twice doubles skill score; absolute ZADD stays idempotent', async () => {
    const f = setup();
    await f.redis.zincrby('local-qa-skill', 20, userId);
    await f.redis.zincrby('local-qa-skill', 20, userId);
    expect(f.getScore('local-qa-skill', userId)).toBe(40);
    await f.redis.zadd(weeklyKey, 20, userId);
    await f.redis.zadd(weeklyKey, 20, userId);
    expect(f.getScore(weeklyKey, userId)).toBe(20);
  });

  it('absolute DB-derived weekly score can repair a stale Redis member repeatedly', async () => {
    const f = setup();
    f.putScore(weeklyKey, userId, 5);
    const dbEntry = { userId, periodXp: 20 }; // fixture standing in for a DB read
    await f.redis.zadd(weeklyKey, dbEntry.periodXp, dbEntry.userId);
    await f.redis.zadd(weeklyKey, dbEntry.periodXp, dbEntry.userId);
    expect(f.getScore(weeklyKey, userId)).toBe(20);
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('skill reconciliation must aggregate matching XP ledger by period, not replay increments', () => {
    const f = setup();
    const ledger = [
      { userId, skill: 'READING', finalXp: 20, earnedAt: new Date('2026-10-05T12:00:00Z') },
      { userId, skill: 'READING', finalXp: 15, earnedAt: new Date('2026-10-06T12:00:00Z') },
      { userId, skill: 'WRITING', finalXp: 25, earnedAt: new Date('2026-10-06T12:00:00Z') },
    ];
    const from = new Date('2026-10-05T00:00:00Z');
    const until = new Date('2026-10-12T00:00:00Z');
    const total = ledger.filter(t => t.userId === userId && t.skill === 'READING' &&
      t.earnedAt >= from && t.earnedAt < until).reduce((n, t) => n + t.finalXp, 0);
    const redisKey = skillRedisKey('READING', '2026-W41');
    await f.redis.zadd(redisKey, total, userId);
    await f.redis.zadd(redisKey, total, userId);
    expect(f.getScore(redisKey, userId)).toBe(35);
  });
});

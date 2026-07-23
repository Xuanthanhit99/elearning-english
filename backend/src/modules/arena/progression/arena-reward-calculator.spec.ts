import { calculateArenaMatchReward, ArenaRewardCalculatorInput } from './arena-reward-calculator';

const fullCapability = { grantsXp: true, grantsGold: true, grantsArenaPoints: true };
const noRewardCapability = { grantsXp: false, grantsGold: false, grantsArenaPoints: false };

function baseInput(overrides: Partial<ArenaRewardCalculatorInput> = {}): ArenaRewardCalculatorInput {
  return {
    outcome: 'WIN',
    correct: 5,
    wrong: 0,
    maxCombo: 0,
    winStreakAfter: 0,
    isFirstWinToday: false,
    isFirstMatchToday: false,
    mmrDelta: 20,
    capability: fullCapability,
    ...overrides,
  };
}

describe('calculateArenaMatchReward (pure, deterministic)', () => {
  it('is deterministic — identical input always produces identical output', () => {
    const input = baseInput();
    const a = calculateArenaMatchReward(input);
    const b = calculateArenaMatchReward(input);
    expect(a).toEqual(b);
  });

  it('grants more base XP for a WIN than a LOSS, and DRAW sits between them', () => {
    const win = calculateArenaMatchReward(baseInput({ outcome: 'WIN' }));
    const loss = calculateArenaMatchReward(baseInput({ outcome: 'LOSS', mmrDelta: -20 }));
    const draw = calculateArenaMatchReward(baseInput({ outcome: 'DRAW', mmrDelta: 0 }));
    expect(win.winLossXp).toBeGreaterThan(draw.winLossXp);
    expect(draw.winLossXp).toBeGreaterThan(loss.winLossXp);
  });

  it('grants a higher accuracy bonus at >=90% than at >=70%, and none below 70%', () => {
    const high = calculateArenaMatchReward(baseInput({ correct: 10, wrong: 0 })); // 100%
    const mid = calculateArenaMatchReward(baseInput({ correct: 7, wrong: 3 })); // 70%
    const low = calculateArenaMatchReward(baseInput({ correct: 5, wrong: 5 })); // 50%
    expect(high.accuracyBonusXp).toBeGreaterThan(mid.accuracyBonusXp);
    expect(mid.accuracyBonusXp).toBeGreaterThan(0);
    expect(low.accuracyBonusXp).toBe(0);
  });

  it('treats zero attempted questions as zero accuracy bonus (no division by zero)', () => {
    const reward = calculateArenaMatchReward(baseInput({ correct: 0, wrong: 0 }));
    expect(reward.accuracyBonusXp).toBe(0);
    expect(Number.isFinite(reward.totalXp)).toBe(true);
  });

  it('grants an increasing combo bonus at higher combo tiers', () => {
    const noCombo = calculateArenaMatchReward(baseInput({ maxCombo: 1 }));
    const smallCombo = calculateArenaMatchReward(baseInput({ maxCombo: 3 }));
    const bigCombo = calculateArenaMatchReward(baseInput({ maxCombo: 8 }));
    expect(noCombo.comboBonusXp).toBe(0);
    expect(bigCombo.comboBonusXp).toBeGreaterThan(smallCombo.comboBonusXp);
  });

  it('only grants the first-win bonus on a WIN with isFirstWinToday true', () => {
    const firstWin = calculateArenaMatchReward(baseInput({ outcome: 'WIN', isFirstWinToday: true }));
    const laterWin = calculateArenaMatchReward(baseInput({ outcome: 'WIN', isFirstWinToday: false }));
    const firstLoss = calculateArenaMatchReward(
      baseInput({ outcome: 'LOSS', mmrDelta: -20, isFirstWinToday: true }),
    );
    expect(firstWin.firstWinBonusXp).toBeGreaterThan(0);
    expect(laterWin.firstWinBonusXp).toBe(0);
    expect(firstLoss.firstWinBonusXp).toBe(0); // a LOSS is never a "win" regardless of the flag
  });

  it('only grants the daily bonus once per day, driven by isFirstMatchToday', () => {
    const first = calculateArenaMatchReward(baseInput({ isFirstMatchToday: true }));
    const second = calculateArenaMatchReward(baseInput({ isFirstMatchToday: false }));
    expect(first.dailyBonusXp).toBeGreaterThan(0);
    expect(second.dailyBonusXp).toBe(0);
  });

  it('applies a win-streak multiplier only on WIN, scaling with streak length', () => {
    const noStreak = calculateArenaMatchReward(baseInput({ outcome: 'WIN', winStreakAfter: 1 }));
    const midStreak = calculateArenaMatchReward(baseInput({ outcome: 'WIN', winStreakAfter: 5 }));
    const bigStreak = calculateArenaMatchReward(baseInput({ outcome: 'WIN', winStreakAfter: 10 }));
    const lossWithStreak = calculateArenaMatchReward(
      baseInput({ outcome: 'LOSS', mmrDelta: -20, winStreakAfter: 0 }),
    );
    expect(noStreak.streakBonusXp).toBe(0);
    expect(midStreak.streakBonusXp).toBeGreaterThan(0);
    expect(bigStreak.streakBonusXp).toBeGreaterThan(midStreak.streakBonusXp);
    expect(lossWithStreak.streakBonusXp).toBe(0);
  });

  it('caps totalXp at the configured per-match ceiling even with every bonus stacked', () => {
    const reward = calculateArenaMatchReward(
      baseInput({
        outcome: 'WIN',
        correct: 20,
        wrong: 0,
        maxCombo: 20,
        winStreakAfter: 15,
        isFirstWinToday: true,
        isFirstMatchToday: true,
      }),
    );
    expect(reward.totalXp).toBeLessThanOrEqual(150); // ARENA_REWARD_MAX_XP_PER_MATCH default
  });

  it('never returns a negative totalXp', () => {
    const reward = calculateArenaMatchReward(baseInput({ outcome: 'LOSS', mmrDelta: -20, correct: 0, wrong: 5 }));
    expect(reward.totalXp).toBeGreaterThanOrEqual(0);
  });

  it('produces a reasonBreakdown entry for every bonus that actually applied', () => {
    const reward = calculateArenaMatchReward(
      baseInput({ outcome: 'WIN', correct: 10, wrong: 0, maxCombo: 8, isFirstWinToday: true, isFirstMatchToday: true, winStreakAfter: 10 }),
    );
    expect(reward.reasonBreakdown).toEqual(
      expect.arrayContaining(['win', 'accuracy>=90%', 'combo x8', 'first win of the day', 'daily bonus']),
    );
  });

  it('grants zero XP but keeps gold/arenaPoints when the mode capability has grantsXp:false (FRIEND_CHALLENGE-style)', () => {
    const reward = calculateArenaMatchReward(
      baseInput({ capability: { grantsXp: false, grantsGold: true, grantsArenaPoints: false } }),
    );
    expect(reward.totalXp).toBe(0);
    expect(reward.baseXp).toBe(0);
    expect(reward.gold).toBeGreaterThan(0);
    expect(reward.arenaPoints).toBe(0);
    expect(reward.reasonBreakdown).toContain('mode does not grant XP');
  });

  it('grants nothing at all for an unsupported mode with every capability flag false', () => {
    const reward = calculateArenaMatchReward(baseInput({ capability: noRewardCapability }));
    expect(reward.totalXp).toBe(0);
    expect(reward.gold).toBe(0);
    expect(reward.arenaPoints).toBe(0);
  });

  it('mirrors arenaPoints to mmrDelta 1:1, floored at +6 for a WIN', () => {
    const smallWin = calculateArenaMatchReward(baseInput({ outcome: 'WIN', mmrDelta: 2 }));
    expect(smallWin.arenaPoints).toBe(6);

    const bigWin = calculateArenaMatchReward(baseInput({ outcome: 'WIN', mmrDelta: 25 }));
    expect(bigWin.arenaPoints).toBe(25);

    const loss = calculateArenaMatchReward(baseInput({ outcome: 'LOSS', mmrDelta: -18 }));
    expect(loss.arenaPoints).toBe(-18);
  });

  it('never trusts client input — every field is treated as already server-derived (purity check: same object reference in, unmodified)', () => {
    const input = baseInput();
    const snapshot = JSON.parse(JSON.stringify(input));
    calculateArenaMatchReward(input);
    expect(input).toEqual(snapshot);
  });
});

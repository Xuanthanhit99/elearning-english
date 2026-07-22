import { ArenaBattleEngineService } from './arena-battle-engine.service';

describe('ArenaBattleEngineService', () => {
  const engine = new ArenaBattleEngineService();
  const windowMs = 15000;

  function outcome(overrides: Partial<Parameters<typeof engine.calculateAnswerOutcome>[0]> = {}) {
    const questionActivatedAt = new Date('2026-01-01T00:00:00.000Z');
    return engine.calculateAnswerOutcome({
      basePoints: 10,
      isCorrect: true,
      isLate: false,
      comboBefore: 0,
      questionActivatedAt,
      answeredAt: questionActivatedAt,
      windowMs,
      powerUpMultiplierBasisPoints: 10000,
      ...overrides,
    });
  }

  it('awards zero score and resets combo on a wrong answer', () => {
    const result = outcome({ isCorrect: false });
    expect(result.finalScore).toBe(0);
    expect(result.comboAfter).toBe(0);
  });

  it('awards zero score and resets combo on a late answer even if otherwise correct', () => {
    const result = outcome({ isLate: true });
    expect(result.finalScore).toBe(0);
    expect(result.comboAfter).toBe(0);
  });

  it('first correct answer (combo 0->1) gets no combo bonus', () => {
    const result = outcome({ comboBefore: 0 });
    expect(result.comboAfter).toBe(1);
    expect(result.comboMultiplierBasisPoints).toBe(10000);
  });

  it('applies combo multiplier tiers as combo climbs', () => {
    expect(outcome({ comboBefore: 1 }).comboMultiplierBasisPoints).toBe(11000); // -> combo 2
    expect(outcome({ comboBefore: 3 }).comboMultiplierBasisPoints).toBe(12500); // -> combo 4
    expect(outcome({ comboBefore: 5 }).comboMultiplierBasisPoints).toBe(15000); // -> combo 6
    expect(outcome({ comboBefore: 7 }).comboMultiplierBasisPoints).toBe(20000); // -> combo 8
    expect(outcome({ comboBefore: 20 }).comboMultiplierBasisPoints).toBe(20000); // caps out
  });

  it('grants the maximum speed bonus for an instant answer', () => {
    const activatedAt = new Date('2026-01-01T00:00:00.000Z');
    const result = outcome({ questionActivatedAt: activatedAt, answeredAt: activatedAt });
    expect(result.speedBonusBasisPoints).toBe(3000);
  });

  it('grants no speed bonus for an answer submitted at the very end of the window', () => {
    const activatedAt = new Date('2026-01-01T00:00:00.000Z');
    const answeredAt = new Date(activatedAt.getTime() + windowMs);
    const result = outcome({ questionActivatedAt: activatedAt, answeredAt });
    expect(result.speedBonusBasisPoints).toBe(0);
  });

  it('clamps a negative elapsed time (answered "before" activation) to zero elapsed, not a negative bonus', () => {
    const activatedAt = new Date('2026-01-01T00:00:10.000Z');
    const answeredAt = new Date('2026-01-01T00:00:00.000Z'); // before activation
    const result = outcome({ questionActivatedAt: activatedAt, answeredAt });
    expect(result.speedBonusBasisPoints).toBe(3000); // treated as instant, not penalized
  });

  it('never derives score from a client-suppliable field — only server timestamps feed the formula', () => {
    // calculateAnswerOutcome's input type has no room for a client-asserted
    // "responseTimeMs" — this test documents that guarantee by construction:
    // the two Date inputs are the only timing signal, and both are meant to
    // be stamped server-side by the caller.
    const result = outcome();
    expect(result.finalScore).toBeGreaterThan(0);
  });

  it('multiplies combo x speed x power-up bonuses together, then applies the cap', () => {
    const activatedAt = new Date('2026-01-01T00:00:00.000Z');
    const result = engine.calculateAnswerOutcome({
      basePoints: 10,
      isCorrect: true,
      isLate: false,
      comboBefore: 7, // -> combo 8, x2.0
      questionActivatedAt: activatedAt,
      answeredAt: activatedAt, // instant, +30%
      windowMs,
      powerUpMultiplierBasisPoints: 20000, // DOUBLE_SCORE, x2
    });
    // Uncapped would be 2.0 * 1.3 * 2.0 = 5.2x -> 52 points; capped at 3.0x (default) -> 30.
    expect(result.finalMultiplierBasisPoints).toBe(30000);
    expect(result.finalScore).toBe(30);
  });

  it('is a pure function — same input always yields the same output', () => {
    const a = outcome({ comboBefore: 3 });
    const b = outcome({ comboBefore: 3 });
    expect(a).toEqual(b);
  });
});

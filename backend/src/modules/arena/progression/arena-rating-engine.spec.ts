import {
  applyEloDelta,
  calculateEloDelta,
  expectedScore,
  resolveArenaTier,
  resolveArenaKFactor,
  resolveArenaPlacementTransition,
  resolveArenaPlacementStatus,
  getArenaPlacementMatchesTotal,
  ARENA_TIER_THRESHOLDS,
  resolveArenaDisplayedTierTransition,
  resolveArenaPeak,
  resolveArenaRatingLifecycleStage,
  resolveArenaDecayStatus,
  applyArenaRatingDecay,
} from './arena-rating-engine';

describe('arena-rating-engine (pure functions)', () => {
  describe('expectedScore', () => {
    it('returns 0.5 for two equally-rated players', () => {
      expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 5);
    });

    it('returns a higher expected score for the stronger player', () => {
      expect(expectedScore(1800, 1500)).toBeGreaterThan(0.5);
      expect(expectedScore(1500, 1800)).toBeLessThan(0.5);
    });

    it('is symmetric (P(a beats b) + P(b beats a) = 1)', () => {
      const a = expectedScore(1650, 1400);
      const b = expectedScore(1400, 1650);
      expect(a + b).toBeCloseTo(1, 5);
    });
  });

  describe('calculateEloDelta', () => {
    it('is deterministic for the same inputs', () => {
      const a = calculateEloDelta(1500, 1500, 'WIN', 40);
      const b = calculateEloDelta(1500, 1500, 'WIN', 40);
      expect(a).toBe(b);
    });

    it('matches the pre-F1 formula for an even WIN (round(40 * 0.5) = 20)', () => {
      expect(calculateEloDelta(1500, 1500, 'WIN', 40)).toBe(20);
    });

    it('matches the pre-F1 formula for an even LOSS (round(40 * -0.5) = -20)', () => {
      expect(calculateEloDelta(1500, 1500, 'LOSS', 40)).toBe(-20);
    });

    it('floors a WIN delta at +6 even against a much stronger opponent', () => {
      const delta = calculateEloDelta(1000, 2000, 'WIN', 40);
      expect(delta).toBeGreaterThanOrEqual(6);
    });

    it('ceilings a LOSS delta at -4 even against a much weaker opponent', () => {
      const delta = calculateEloDelta(2000, 1000, 'LOSS', 40);
      expect(delta).toBeLessThanOrEqual(-4);
    });

    it('gives the underdog a larger WIN delta than the favorite', () => {
      const underdogWin = calculateEloDelta(1400, 1600, 'WIN', 40);
      const favoriteWin = calculateEloDelta(1600, 1400, 'WIN', 40);
      expect(underdogWin).toBeGreaterThan(favoriteWin);
    });

    it('allows a DRAW to be mildly positive for the underdog and mildly negative for the favorite', () => {
      const underdogDraw = calculateEloDelta(1400, 1600, 'DRAW', 40);
      const favoriteDraw = calculateEloDelta(1600, 1400, 'DRAW', 40);
      expect(underdogDraw).toBeGreaterThan(0);
      expect(favoriteDraw).toBeLessThan(0);
    });

    it('scales linearly with the K-factor for a fixed matchup', () => {
      const k40 = calculateEloDelta(1500, 1500, 'WIN', 40);
      const k80 = calculateEloDelta(1500, 1500, 'WIN', 80);
      expect(k80).toBe(k40 * 2);
    });
  });

  describe('applyEloDelta', () => {
    it('adds the delta normally', () => {
      expect(applyEloDelta(1500, 20)).toBe(1520);
      expect(applyEloDelta(1500, -20)).toBe(1480);
    });

    it('never lets mmr fall below the floor (100), regardless of delta size', () => {
      expect(applyEloDelta(105, -50)).toBe(100);
      expect(applyEloDelta(100, -1000)).toBe(100);
    });
  });

  describe('resolveArenaTier', () => {
    it('resolves every documented threshold boundary to the expected tier', () => {
      expect(resolveArenaTier(0)).toBe('BRONZE');
      expect(resolveArenaTier(1199)).toBe('BRONZE');
      expect(resolveArenaTier(1200)).toBe('SILVER');
      expect(resolveArenaTier(1399)).toBe('SILVER');
      expect(resolveArenaTier(1400)).toBe('GOLD');
      expect(resolveArenaTier(1599)).toBe('GOLD');
      expect(resolveArenaTier(1600)).toBe('PLATINUM');
      expect(resolveArenaTier(1799)).toBe('PLATINUM');
      expect(resolveArenaTier(1800)).toBe('DIAMOND');
      expect(resolveArenaTier(1999)).toBe('DIAMOND');
      expect(resolveArenaTier(2000)).toBe('MASTER');
      expect(resolveArenaTier(2199)).toBe('MASTER');
      expect(resolveArenaTier(2200)).toBe('LEGEND');
      expect(resolveArenaTier(9999)).toBe('LEGEND');
    });

    it('never returns a tier outside the registered enum values', () => {
      const validTiers = new Set(ARENA_TIER_THRESHOLDS.map((t) => t.tier));
      for (const mmr of [-100, 0, 500, 1500, 3000]) {
        expect(validTiers.has(resolveArenaTier(mmr))).toBe(true);
      }
    });
  });

  describe('resolveArenaKFactor (Phase F2.1/F2.2)', () => {
    it('returns the placement K when placementMatchesRemaining > 0', () => {
      const k = resolveArenaKFactor({ placementMatchesRemaining: 5, placementK: 80, establishedK: 40 });
      expect(k).toBe(80);
    });

    it('still returns the placement K when placementMatchesRemaining = 1 (the last placement match)', () => {
      const k = resolveArenaKFactor({ placementMatchesRemaining: 1, placementK: 80, establishedK: 40 });
      expect(k).toBe(80);
    });

    it('returns the provisional K immediately after placement until 25 rated matches have completed', () => {
      expect(resolveArenaKFactor({ placementMatchesRemaining: 0, ratedMatchCount: 5, provisionalK: 60, establishedK: 40 })).toBe(60);
      expect(resolveArenaKFactor({ placementMatchesRemaining: 0, ratedMatchCount: 24, provisionalK: 60, establishedK: 40 })).toBe(60);
    });

    it('returns the established K from the 26th rated match onward', () => {
      expect(resolveArenaKFactor({ placementMatchesRemaining: 0, ratedMatchCount: 25, provisionalK: 60, establishedK: 40 })).toBe(40);
    });

    it('returns the provisional K when placementMatchesRemaining = 0 and no rated count is provided', () => {
      const k = resolveArenaKFactor({ placementMatchesRemaining: 0, placementK: 80, establishedK: 40 });
      expect(k).toBe(60);
    });

    it('uses the configured placement K value passed in, not a hardcoded 80', () => {
      const k = resolveArenaKFactor({ placementMatchesRemaining: 3, placementK: 99, establishedK: 40 });
      expect(k).toBe(99);
    });

    it('established behavior remains available once the lifecycle is established', () => {
      const k = resolveArenaKFactor({ placementMatchesRemaining: 0, ratedMatchCount: 25, establishedK: 40 });
      expect(k).toBe(40);
    });

    it('treats invalid/negative/NaN placementMatchesRemaining as "no placement remaining" rather than throwing', () => {
      expect(resolveArenaKFactor({ placementMatchesRemaining: -1, ratedMatchCount: 25, placementK: 80, establishedK: 40 })).toBe(40);
      expect(resolveArenaKFactor({ placementMatchesRemaining: NaN, ratedMatchCount: 25, placementK: 80, establishedK: 40 })).toBe(40);
    });

    it('falls back to the real env-backed getters when placementK/establishedK are omitted', () => {
      const originalPlacement = process.env.ARENA_K_PLACEMENT;
      const originalEstablished = process.env.ARENA_RATING_K_FACTOR;
      process.env.ARENA_K_PLACEMENT = '77';
      process.env.ARENA_RATING_K_FACTOR = '33';
      try {
        expect(resolveArenaKFactor({ placementMatchesRemaining: 2 })).toBe(77);
        expect(resolveArenaKFactor({ placementMatchesRemaining: 0, ratedMatchCount: 25 })).toBe(33);
      } finally {
        if (originalPlacement === undefined) delete process.env.ARENA_K_PLACEMENT;
        else process.env.ARENA_K_PLACEMENT = originalPlacement;
        if (originalEstablished === undefined) delete process.env.ARENA_RATING_K_FACTOR;
        else process.env.ARENA_RATING_K_FACTOR = originalEstablished;
      }
    });
  });

  describe('Phase F2.2/F2.3 lifecycle and tier helpers', () => {
    it('tracks peak MMR and peak tier without lowering them on losses', () => {
      expect(resolveArenaPeak({ previousPeakMmr: 1500, currentMmr: 1810 })).toEqual({
        peakMmr: 1810,
        peakTier: 'DIAMOND',
      });
      expect(resolveArenaPeak({ previousPeakMmr: 1810, currentMmr: 1700 })).toEqual({
        peakMmr: 1810,
        peakTier: 'DIAMOND',
      });
    });

    it('resolves the lifecycle bands at the exact dispatcher boundary', () => {
      expect(resolveArenaRatingLifecycleStage({ placementMatchesRemaining: 1, ratedMatchCount: 24 })).toBe('PLACEMENT');
      expect(resolveArenaRatingLifecycleStage({ placementMatchesRemaining: 0, ratedMatchCount: 24 })).toBe('PROVISIONAL');
      expect(resolveArenaRatingLifecycleStage({ placementMatchesRemaining: 0, ratedMatchCount: 25 })).toBe('ESTABLISHED');
    });

    it('protects a demotion at the buffer edge and demotes one point outside it', () => {
      expect(resolveArenaDisplayedTierTransition({ previousTier: 'DIAMOND', nextMmr: 1775, demotionBuffer: 25 })).toBe('DIAMOND');
      expect(resolveArenaDisplayedTierTransition({ previousTier: 'DIAMOND', nextMmr: 1774, demotionBuffer: 25 })).toBe('PLATINUM');
    });

    it('promotes immediately when the new rating crosses a higher threshold', () => {
      expect(resolveArenaDisplayedTierTransition({ previousTier: 'PLATINUM', nextMmr: 1800, demotionBuffer: 25 })).toBe('DIAMOND');
    });
  });

  describe('Phase F2.4 decay helpers', () => {
    const now = new Date('2026-07-23T00:00:00.000Z');

    it('is disabled by default and does not report eligibility', () => {
      const status = resolveArenaDecayStatus({
        tier: 'DIAMOND',
        placementMatchesRemaining: 0,
        lastMatchAt: new Date('2026-07-01T00:00:00.000Z'),
        now,
        enabled: false,
      });
      expect(status.decayEligible).toBe(false);
    });

    it('protects placement and low-tier profiles', () => {
      expect(
        resolveArenaDecayStatus({
          tier: 'DIAMOND',
          placementMatchesRemaining: 1,
          lastMatchAt: new Date('2026-07-01T00:00:00.000Z'),
          now,
          enabled: true,
        }).decayEligible,
      ).toBe(false);
      expect(
        resolveArenaDecayStatus({
          tier: 'PLATINUM',
          placementMatchesRemaining: 0,
          lastMatchAt: new Date('2026-07-01T00:00:00.000Z'),
          now,
          enabled: true,
        }).decayEligible,
      ).toBe(false);
    });

    it('applies the decay amount without lowering peak data or bypassing the demotion buffer', () => {
      expect(applyArenaRatingDecay({ currentMmr: 1800, currentTier: 'DIAMOND', amount: 15, demotionBuffer: 25 })).toEqual({
        nextMmr: 1785,
        nextTier: 'DIAMOND',
        mmrDelta: -15,
      });
    });
  });

  describe('getArenaPlacementMatchesTotal (Phase F2.1 configuration)', () => {
    const ENV_KEY = 'ARENA_PLACEMENT_MATCHES';
    let original: string | undefined;

    beforeEach(() => {
      original = process.env[ENV_KEY];
    });

    afterEach(() => {
      if (original === undefined) delete process.env[ENV_KEY];
      else process.env[ENV_KEY] = original;
    });

    it('defaults to 5 (matching the ArenaProfile schema default) when unset', () => {
      delete process.env[ENV_KEY];
      expect(getArenaPlacementMatchesTotal()).toBe(5);
    });

    it('never returns NaN or a non-positive value even under a malformed env var', () => {
      process.env[ENV_KEY] = 'not-a-number';
      expect(getArenaPlacementMatchesTotal()).toBe(5);
      process.env[ENV_KEY] = '-5';
      expect(getArenaPlacementMatchesTotal()).toBe(5);
      process.env[ENV_KEY] = '0';
      expect(getArenaPlacementMatchesTotal()).toBe(5);
    });

    it('accepts a value that matches the schema default (5) explicitly set', () => {
      process.env[ENV_KEY] = '5';
      expect(getArenaPlacementMatchesTotal()).toBe(5);
    });

    it('throws a clear, actionable error when configured to disagree with the schema default', () => {
      process.env[ENV_KEY] = '10';
      expect(() => getArenaPlacementMatchesTotal()).toThrow(/does not match the ArenaProfile/);
    });
  });

  describe('resolveArenaPlacementTransition (Phase F2.1 counter math)', () => {
    it('decrements by exactly one on a rated match with a meaningful attempt', () => {
      const result = resolveArenaPlacementTransition({
        previousPlacementMatchesRemaining: 5,
        affectsElo: true,
        meaningfulAttempt: true,
      });
      expect(result.shouldConsumeSlot).toBe(true);
      expect(result.nextPlacementMatchesRemaining).toBe(4);
      expect(result.placementCompleted).toBe(false);
    });

    it('reports placementCompleted only on the exact 1 -> 0 transition', () => {
      const result = resolveArenaPlacementTransition({
        previousPlacementMatchesRemaining: 1,
        affectsElo: true,
        meaningfulAttempt: true,
      });
      expect(result.nextPlacementMatchesRemaining).toBe(0);
      expect(result.placementCompleted).toBe(true);
    });

    it('never decrements below 0 (floors), and never reports completed again once already at 0', () => {
      const result = resolveArenaPlacementTransition({
        previousPlacementMatchesRemaining: 0,
        affectsElo: true,
        meaningfulAttempt: true,
      });
      expect(result.shouldConsumeSlot).toBe(false);
      expect(result.nextPlacementMatchesRemaining).toBe(0);
      expect(result.placementCompleted).toBe(false);
    });

    it('does not consume a slot when the mode does not affect ELO (e.g. FRIEND_CHALLENGE)', () => {
      const result = resolveArenaPlacementTransition({
        previousPlacementMatchesRemaining: 3,
        affectsElo: false,
        meaningfulAttempt: true,
      });
      expect(result.shouldConsumeSlot).toBe(false);
      expect(result.nextPlacementMatchesRemaining).toBe(3);
      expect(result.placementCompleted).toBe(false);
    });

    it('does not consume a slot on a zero-effort match even if the mode is rated (F2.1 zero-effort exemption)', () => {
      const result = resolveArenaPlacementTransition({
        previousPlacementMatchesRemaining: 3,
        affectsElo: true,
        meaningfulAttempt: false,
      });
      expect(result.shouldConsumeSlot).toBe(false);
      expect(result.nextPlacementMatchesRemaining).toBe(3);
    });

    it('requires both affectsElo AND meaningfulAttempt to consume a slot', () => {
      expect(
        resolveArenaPlacementTransition({
          previousPlacementMatchesRemaining: 3,
          affectsElo: false,
          meaningfulAttempt: false,
        }).shouldConsumeSlot,
      ).toBe(false);
    });

    it('treats a negative/NaN previousPlacementMatchesRemaining as 0 rather than throwing or going negative', () => {
      const result = resolveArenaPlacementTransition({
        previousPlacementMatchesRemaining: -3,
        affectsElo: true,
        meaningfulAttempt: true,
      });
      expect(result.nextPlacementMatchesRemaining).toBe(0);
      expect(result.shouldConsumeSlot).toBe(false);
    });
  });

  describe('resolveArenaPlacementStatus (Phase F2.1 API clamping)', () => {
    it('computes isInPlacement/completed correctly for a mid-placement profile', () => {
      const status = resolveArenaPlacementStatus(3, 5);
      expect(status).toEqual({
        placementMatchesRemaining: 3,
        placementMatchesTotal: 5,
        placementMatchesCompleted: 2,
        isInPlacement: true,
      });
    });

    it('reports isInPlacement:false once remaining reaches 0', () => {
      const status = resolveArenaPlacementStatus(0, 5);
      expect(status.isInPlacement).toBe(false);
      expect(status.placementMatchesCompleted).toBe(5);
    });

    it('clamps a corrupt negative remaining value to 0 instead of a negative completed count', () => {
      const status = resolveArenaPlacementStatus(-2, 5);
      expect(status.placementMatchesRemaining).toBe(0);
      expect(status.placementMatchesCompleted).toBe(5);
      expect(status.isInPlacement).toBe(false);
    });

    it('clamps a corrupt over-total remaining value down to the total', () => {
      const status = resolveArenaPlacementStatus(99, 5);
      expect(status.placementMatchesRemaining).toBe(5);
      expect(status.placementMatchesCompleted).toBe(0);
    });

    it('defaults placementMatchesTotal to the real getArenaPlacementMatchesTotal() getter when omitted', () => {
      const status = resolveArenaPlacementStatus(5);
      expect(status.placementMatchesTotal).toBe(5);
    });
  });
});

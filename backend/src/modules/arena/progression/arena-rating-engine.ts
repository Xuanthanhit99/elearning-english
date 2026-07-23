import { ArenaTier } from '@prisma/client';

export type ArenaMatchOutcome = 'WIN' | 'LOSS' | 'DRAW';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function envNonNegativeInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

/**
 * Established-band K-factor — unchanged name/default from F1 (backward
 * compatible with any deployment that already sets this var; see
 * docs/arena-phase-f2-design.md F2.0.2 Refinement 2, which explicitly
 * rejected renaming it when the placement bands were added).
 */
export const getArenaKFactor = () => envInt('ARENA_RATING_K_FACTOR', 40);

/** Placement-band K-factor (Phase F2.1) — new env var, does not replace `ARENA_RATING_K_FACTOR`. */
export const getArenaPlacementKFactor = () => envInt('ARENA_K_PLACEMENT', 80);

export const getArenaProvisionalKFactor = () => envInt('ARENA_K_PROVISIONAL', 60);
export const getArenaDemotionBuffer = () => envNonNegativeInt('ARENA_DEMOTION_BUFFER', 25);
export const getArenaDecayEnabled = () => envBool('ARENA_DECAY_ENABLED', false);
export const getArenaDecayInactivityDays = () => envInt('ARENA_DECAY_INACTIVITY_DAYS', 14);
export const getArenaDecayAmount = () => envInt('ARENA_DECAY_AMOUNT', 15);

/**
 * Phase F2.1: total placement matches, matching `ArenaProfile
 * .placementMatchesRemaining`'s Prisma schema default (5). The schema
 * default cannot itself read an env var, so it is hardcoded at the DB
 * layer for migration safety (per docs/arena-phase-f2-design.md Part 2's
 * preferred rule) — this getter exists to name/document/test that value,
 * not to let it drift independently of the schema. Deliberately throws
 * rather than silently using a different number: a value here that
 * disagreed with the schema default would mean brand-new profiles (schema
 * default) and this getter's callers (env-configured value) disagree on
 * how many placement matches exist, corrupting `isInPlacement`/
 * `placementMatchesTotal` math for some subset of accounts. Changing the
 * placement count for real requires a coordinated schema-default change +
 * backfill migration, not just this env var — see
 * docs/arena-phase-f2-1-placement-implementation-report.md.
 */
const ARENA_PLACEMENT_MATCHES_SCHEMA_DEFAULT = 5;
export function getArenaPlacementMatchesTotal(): number {
  const raw = Number(process.env.ARENA_PLACEMENT_MATCHES);
  const value = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : ARENA_PLACEMENT_MATCHES_SCHEMA_DEFAULT;
  if (value !== ARENA_PLACEMENT_MATCHES_SCHEMA_DEFAULT) {
    throw new Error(
      `ARENA_PLACEMENT_MATCHES=${value} does not match the ArenaProfile.placementMatchesRemaining schema default (${ARENA_PLACEMENT_MATCHES_SCHEMA_DEFAULT}). Changing the placement match count requires a coordinated migration/backfill for existing profiles, not just this env var.`,
    );
  }
  return value;
}

/**
 * Pure K-factor selection (Phase F2.1) — placement band while
 * `placementMatchesRemaining > 0`, established band (today's F1 flat
 * value, unchanged) otherwise. The provisional (post-placement) band is
 * deliberately NOT implemented here — out of F2.1 scope per
 * docs/arena-phase-f2-design.md's F2.1 objectives; `establishedK` is
 * returned for every post-placement match, exactly matching F1's existing
 * behavior with zero regression. Accepting the two K values as parameters
 * (rather than calling the env getters internally) keeps this a true pure
 * function for unit testing and keeps eligibility/config concerns
 * (invalid `placementMatchesRemaining`, env parsing) fully separated from
 * the selection logic itself.
 */
export function resolveArenaKFactor(input: {
  placementMatchesRemaining: number;
  ratedMatchCount?: number;
  placementK?: number;
  provisionalK?: number;
  establishedK?: number;
}): number {
  const placementK = input.placementK ?? getArenaPlacementKFactor();
  const provisionalK = input.provisionalK ?? getArenaProvisionalKFactor();
  const establishedK = input.establishedK ?? getArenaKFactor();
  const remaining =
    Number.isFinite(input.placementMatchesRemaining) && input.placementMatchesRemaining > 0
      ? input.placementMatchesRemaining
      : 0;
  if (remaining > 0) return placementK;

  const ratedMatchCount =
    Number.isFinite(input.ratedMatchCount) && input.ratedMatchCount! > 0
      ? Math.floor(input.ratedMatchCount!)
      : 0;
  return ratedMatchCount < 25 ? provisionalK : establishedK;
}

export type ArenaPlacementTransition = {
  /** Whether this match's write path should decrement the counter at all. */
  shouldConsumeSlot: boolean;
  /** Floored at 0, mirroring the DB column's own non-negative invariant. */
  nextPlacementMatchesRemaining: number;
  /** True only on the exact transition previousRemaining>0 -> nextRemaining=0. */
  placementCompleted: boolean;
};

/**
 * Pure placement-counter transition (Phase F2.1) — see
 * docs/arena-phase-f2-design.md Part 6 (zero-effort exemption) and Part 5
 * (decrement invariants: exactly once, floored at 0, gated on
 * affectsElo). `meaningfulAttempt` must already be computed by the caller
 * from persisted `ArenaParticipant.correct`/`wrong` — this function never
 * reads or trusts anything client-supplied, it only combines already-
 * derived booleans/counters.
 */
export function resolveArenaPlacementTransition(input: {
  previousPlacementMatchesRemaining: number;
  affectsElo: boolean;
  meaningfulAttempt: boolean;
}): ArenaPlacementTransition {
  const previousRemaining =
    Number.isFinite(input.previousPlacementMatchesRemaining) && input.previousPlacementMatchesRemaining > 0
      ? input.previousPlacementMatchesRemaining
      : 0;
  const shouldConsumeSlot = input.affectsElo && input.meaningfulAttempt && previousRemaining > 0;
  const nextPlacementMatchesRemaining = shouldConsumeSlot ? Math.max(0, previousRemaining - 1) : previousRemaining;
  const placementCompleted = shouldConsumeSlot && nextPlacementMatchesRemaining === 0;
  return { shouldConsumeSlot, nextPlacementMatchesRemaining, placementCompleted };
}

export type ArenaPlacementStatus = {
  placementMatchesRemaining: number;
  placementMatchesTotal: number;
  placementMatchesCompleted: number;
  isInPlacement: boolean;
};

/**
 * Pure, defensive clamping for the API-facing placement status (Phase
 * F2.1 Part 3) — never lets a corrupt/negative/over-total stored value
 * surface as a negative "completed" count or a remaining count above the
 * configured total.
 */
export function resolveArenaPlacementStatus(
  placementMatchesRemainingRaw: number,
  placementMatchesTotal: number = getArenaPlacementMatchesTotal(),
): ArenaPlacementStatus {
  const placementMatchesRemaining = Math.min(
    placementMatchesTotal,
    Math.max(0, placementMatchesRemainingRaw ?? 0),
  );
  const placementMatchesCompleted = Math.max(0, placementMatchesTotal - placementMatchesRemaining);
  return {
    placementMatchesRemaining,
    placementMatchesTotal,
    placementMatchesCompleted,
    isInPlacement: placementMatchesRemaining > 0,
  };
}

const MIN_MMR = 100;

/**
 * Server-authoritative, pure Arena rating engine — extracted from
 * `ArenaService.eloDelta()`/`expectedScore()` (Phase A) with identical
 * WIN/LOSS behavior (bit-for-bit: same formula, same floor/ceiling, same
 * default K=40), plus DRAW support that no caller exercises yet (the game
 * has no tie outcome today — `finalizeMatch` always resolves ties to team
 * A) but which the engine itself must handle correctly for future team
 * modes without redesign.
 */
export function expectedScore(playerMmr: number, opponentMmr: number): number {
  return 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
}

function outcomeScore(outcome: ArenaMatchOutcome): number {
  if (outcome === 'WIN') return 1;
  if (outcome === 'LOSS') return 0;
  return 0.5;
}

/**
 * Integer-safe. WIN is floored at +6, LOSS is ceilinged at -4 (matches the
 * pre-F1 `eloDelta` exactly — a win/loss against a much stronger/weaker
 * opponent should never round down to a "did nothing" delta). DRAW has no
 * floor/ceiling: a draw against a stronger opponent should be able to be
 * mildly positive, and vice versa, same as chess-style ELO draw handling.
 */
export function calculateEloDelta(
  playerMmr: number,
  opponentMmr: number,
  outcome: ArenaMatchOutcome,
  kFactor: number = getArenaKFactor(),
): number {
  const raw = Math.round(
    kFactor * (outcomeScore(outcome) - expectedScore(playerMmr, opponentMmr)),
  );
  if (outcome === 'WIN') return Math.max(6, raw);
  if (outcome === 'LOSS') return Math.min(-4, raw);
  return raw;
}

/** Never lets a rating fall below MIN_MMR, regardless of how large a loss streak's cumulative delta is. */
export function applyEloDelta(currentMmr: number, delta: number): number {
  return Math.max(MIN_MMR, currentMmr + delta);
}

/**
 * Threshold-based (absolute mmr), deliberately separate from the
 * Leaderboard module's rank-position-based `resolveZone()` — see
 * docs/arena-phase-f-design.md Part 11 F0.5-4/comparison table. Ordered
 * highest-first so the first matching threshold wins.
 */
export const ARENA_TIER_THRESHOLDS: ReadonlyArray<{ tier: ArenaTier; minMmr: number }> = [
  { tier: 'LEGEND', minMmr: 2200 },
  { tier: 'MASTER', minMmr: 2000 },
  { tier: 'DIAMOND', minMmr: 1800 },
  { tier: 'PLATINUM', minMmr: 1600 },
  { tier: 'GOLD', minMmr: 1400 },
  { tier: 'SILVER', minMmr: 1200 },
  { tier: 'BRONZE', minMmr: 0 },
];

export function resolveArenaTier(mmr: number): ArenaTier {
  const match = ARENA_TIER_THRESHOLDS.find((entry) => mmr >= entry.minMmr);
  return match ? match.tier : 'BRONZE';
}

export function arenaTierRank(tier: ArenaTier | string): number {
  const index = ARENA_TIER_THRESHOLDS.findIndex((entry) => entry.tier === tier);
  return index === -1 ? 0 : ARENA_TIER_THRESHOLDS.length - 1 - index;
}

export function getArenaTierFloor(tier: ArenaTier): number {
  return ARENA_TIER_THRESHOLDS.find((entry) => entry.tier === tier)?.minMmr ?? 0;
}

export function resolveArenaDisplayedTierTransition(input: {
  previousTier: ArenaTier;
  nextMmr: number;
  demotionBuffer?: number;
}): ArenaTier {
  const resolvedTier = resolveArenaTier(input.nextMmr);
  if (arenaTierRank(resolvedTier) >= arenaTierRank(input.previousTier)) {
    return resolvedTier;
  }

  const floor = getArenaTierFloor(input.previousTier);
  const buffer = Math.max(0, input.demotionBuffer ?? getArenaDemotionBuffer());
  return input.nextMmr >= floor - buffer ? input.previousTier : resolvedTier;
}

export function resolveArenaPeak(input: {
  previousPeakMmr: number;
  currentMmr: number;
}): { peakMmr: number; peakTier: ArenaTier } {
  const peakMmr = Math.max(input.previousPeakMmr ?? 1500, input.currentMmr);
  return { peakMmr, peakTier: resolveArenaTier(peakMmr) };
}

export type ArenaRatingLifecycleStage = 'PLACEMENT' | 'PROVISIONAL' | 'ESTABLISHED';

export function resolveArenaRatingLifecycleStage(input: {
  placementMatchesRemaining: number;
  ratedMatchCount: number;
}): ArenaRatingLifecycleStage {
  if (input.placementMatchesRemaining > 0) return 'PLACEMENT';
  return input.ratedMatchCount < 25 ? 'PROVISIONAL' : 'ESTABLISHED';
}

export function getArenaDecayMinTier(): ArenaTier {
  const raw = process.env.ARENA_DECAY_MIN_TIER as ArenaTier | undefined;
  return raw && ARENA_TIER_THRESHOLDS.some((entry) => entry.tier === raw) ? raw : 'DIAMOND';
}

export function resolveArenaDecayStatus(input: {
  tier: ArenaTier;
  placementMatchesRemaining: number;
  lastMatchAt: Date | null;
  lastRatingDecayAt?: Date | null;
  now?: Date;
  enabled?: boolean;
  inactivityDays?: number;
  minTier?: ArenaTier;
}): { decayEligible: boolean; decayProtectedUntil: Date | null; decayDaysRemaining: number } {
  const now = input.now ?? new Date();
  const enabled = input.enabled ?? getArenaDecayEnabled();
  const inactivityDays = input.inactivityDays ?? getArenaDecayInactivityDays();
  const minTier = input.minTier ?? getArenaDecayMinTier();
  const anchor =
    input.lastMatchAt && input.lastRatingDecayAt
      ? input.lastMatchAt > input.lastRatingDecayAt
        ? input.lastMatchAt
        : input.lastRatingDecayAt
      : input.lastMatchAt ?? input.lastRatingDecayAt ?? null;
  const decayProtectedUntil = anchor
    ? new Date(anchor.getTime() + inactivityDays * 24 * 60 * 60 * 1000)
    : null;
  const decayDaysRemaining = decayProtectedUntil
    ? Math.max(0, Math.ceil((decayProtectedUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : 0;
  const decayEligible =
    enabled &&
    input.placementMatchesRemaining <= 0 &&
    arenaTierRank(input.tier) >= arenaTierRank(minTier) &&
    Boolean(decayProtectedUntil) &&
    decayProtectedUntil!.getTime() <= now.getTime();

  return { decayEligible, decayProtectedUntil, decayDaysRemaining };
}

export function applyArenaRatingDecay(input: {
  currentMmr: number;
  currentTier: ArenaTier;
  amount?: number;
  demotionBuffer?: number;
}): { nextMmr: number; nextTier: ArenaTier; mmrDelta: number } {
  const amount = input.amount ?? getArenaDecayAmount();
  const nextMmr = applyEloDelta(input.currentMmr, -amount);
  const nextTier = resolveArenaDisplayedTierTransition({
    previousTier: input.currentTier,
    nextMmr,
    demotionBuffer: input.demotionBuffer,
  });
  return { nextMmr, nextTier, mmrDelta: nextMmr - input.currentMmr };
}

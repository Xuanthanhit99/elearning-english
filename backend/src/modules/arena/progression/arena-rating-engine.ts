import { ArenaTier } from '@prisma/client';

export type ArenaMatchOutcome = 'WIN' | 'LOSS' | 'DRAW';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Flat K-factor for F1 — placement matches (variable K-factor) are explicitly deferred to F2, not partially implemented here. */
export const getArenaKFactor = () => envInt('ARENA_RATING_K_FACTOR', 40);

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

import { ArenaMatchOutcome } from './arena-rating-engine';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

const BASE_XP = envInt('ARENA_REWARD_BASE_XP', 10);
const WIN_XP = envInt('ARENA_REWARD_WIN_XP', 20);
const LOSS_XP = envInt('ARENA_REWARD_LOSS_XP', 8);
const DRAW_XP = envInt('ARENA_REWARD_DRAW_XP', 14);
const FIRST_WIN_BONUS_XP = envInt('ARENA_REWARD_FIRST_WIN_BONUS_XP', 15);
const DAILY_BONUS_XP = envInt('ARENA_REWARD_DAILY_BONUS_XP', 10);
/** Per-match ceiling — independent of XpService's own daily-limit/absolute clamp; this guards against a single pathological match (e.g. malformed combo/streak input) producing an outsized award. */
const MAX_XP_PER_MATCH = envInt('ARENA_REWARD_MAX_XP_PER_MATCH', 150);

const WIN_GOLD = envInt('ARENA_REWARD_WIN_GOLD', 20);
const LOSS_GOLD = envInt('ARENA_REWARD_LOSS_GOLD', 6);
const DRAW_GOLD = envInt('ARENA_REWARD_DRAW_GOLD', 12);

export type ArenaRewardCalculatorInput = {
  outcome: ArenaMatchOutcome;
  /** Correct answers, as persisted on ArenaParticipant — never client-supplied. */
  correct: number;
  /** Wrong answers, as persisted on ArenaParticipant. */
  wrong: number;
  /** Peak combo this match, from ArenaParticipantBattleState.maxCombo (0/absent for non-battle modes). */
  maxCombo: number;
  /** ArenaProfile.winStreak AFTER this match is recorded (0 if this match was a loss). */
  winStreakAfter: number;
  /** Whether this is the user's first WIN of the calendar day (server-computed from ArenaProfile.lastFirstWinBonusAt). */
  isFirstWinToday: boolean;
  /** Whether this is the user's first Arena match of the calendar day (server-computed from ArenaProfile.lastDailyBonusAt). */
  isFirstMatchToday: boolean;
  /** mmrDelta as computed by the rating engine for this participant — reused here, not recomputed, so Arena Points always tracks rating 1:1 when granted. */
  mmrDelta: number;
  capability: {
    grantsXp: boolean;
    grantsGold: boolean;
    grantsArenaPoints: boolean;
  };
};

export type ArenaRewardBreakdown = {
  baseXp: number;
  winLossXp: number;
  accuracyBonusXp: number;
  comboBonusXp: number;
  firstWinBonusXp: number;
  dailyBonusXp: number;
  streakBonusXp: number;
  totalXp: number;
  gold: number;
  arenaPoints: number;
  reasonBreakdown: string[];
};

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function accuracyMultiplier(correct: number, wrong: number): { multiplier: number; label: string | null } {
  const total = safeCount(correct) + safeCount(wrong);
  if (total === 0) return { multiplier: 0, label: null };
  const accuracy = safeCount(correct) / total;
  if (accuracy >= 0.9) return { multiplier: 0.3, label: 'accuracy>=90%' };
  if (accuracy >= 0.7) return { multiplier: 0.15, label: 'accuracy>=70%' };
  return { multiplier: 0, label: null };
}

function comboBonus(maxCombo: number): { bonus: number; label: string | null } {
  const combo = safeCount(maxCombo);
  if (combo >= 8) return { bonus: 10, label: `combo x${combo}` };
  if (combo >= 5) return { bonus: 5, label: `combo x${combo}` };
  if (combo >= 3) return { bonus: 2, label: `combo x${combo}` };
  return { bonus: 0, label: null };
}

/** Same bands as the pre-existing `ArenaService.getStreakFoodMultiplier`, reused here for XP so streak rewards feel consistent across currencies. */
function streakMultiplier(winStreakAfter: number): { multiplier: number; label: string | null } {
  const streak = safeCount(winStreakAfter);
  if (streak >= 10) return { multiplier: 1.5, label: `win streak x${streak} (1.5x)` };
  if (streak >= 5) return { multiplier: 1.3, label: `win streak x${streak} (1.3x)` };
  if (streak >= 3) return { multiplier: 1.1, label: `win streak x${streak} (1.1x)` };
  return { multiplier: 1, label: null };
}

/**
 * Pure, deterministic, side-effect-free. Every input is expected to already
 * be server-derived/persisted (see field docs above) — this function never
 * reads the database and never trusts a client-supplied value; it is the
 * caller's responsibility (`ArenaProgressionDispatcherService`) to source
 * every field from persisted match/profile data.
 */
export function calculateArenaMatchReward(input: ArenaRewardCalculatorInput): ArenaRewardBreakdown {
  const reasonBreakdown: string[] = [input.outcome === 'WIN' ? 'win' : input.outcome === 'LOSS' ? 'loss' : 'draw'];

  if (!input.capability.grantsXp) {
    return {
      baseXp: 0,
      winLossXp: 0,
      accuracyBonusXp: 0,
      comboBonusXp: 0,
      firstWinBonusXp: 0,
      dailyBonusXp: 0,
      streakBonusXp: 0,
      totalXp: 0,
      gold: input.capability.grantsGold ? goldForOutcome(input.outcome) : 0,
      arenaPoints: input.capability.grantsArenaPoints ? arenaPointsForOutcome(input) : 0,
      reasonBreakdown: [...reasonBreakdown, 'mode does not grant XP'],
    };
  }

  const baseXp = BASE_XP;
  const winLossXp = input.outcome === 'WIN' ? WIN_XP : input.outcome === 'LOSS' ? LOSS_XP : DRAW_XP;

  const accuracy = accuracyMultiplier(input.correct, input.wrong);
  const accuracyBonusXp = Math.round((baseXp + winLossXp) * accuracy.multiplier);
  if (accuracy.label) reasonBreakdown.push(accuracy.label);

  const combo = comboBonus(input.maxCombo);
  const comboBonusXp = combo.bonus;
  if (combo.label) reasonBreakdown.push(combo.label);

  const firstWinBonusXp = input.outcome === 'WIN' && input.isFirstWinToday ? FIRST_WIN_BONUS_XP : 0;
  if (firstWinBonusXp > 0) reasonBreakdown.push('first win of the day');

  const dailyBonusXp = input.isFirstMatchToday ? DAILY_BONUS_XP : 0;
  if (dailyBonusXp > 0) reasonBreakdown.push('daily bonus');

  const preStreakSubtotal = baseXp + winLossXp + accuracyBonusXp + comboBonusXp + firstWinBonusXp + dailyBonusXp;

  const streak = input.outcome === 'WIN' ? streakMultiplier(input.winStreakAfter) : { multiplier: 1, label: null };
  const streakBonusXp = Math.round(preStreakSubtotal * (streak.multiplier - 1));
  if (streak.label) reasonBreakdown.push(streak.label);

  const totalXp = Math.min(MAX_XP_PER_MATCH, Math.max(0, preStreakSubtotal + streakBonusXp));

  return {
    baseXp,
    winLossXp,
    accuracyBonusXp,
    comboBonusXp,
    firstWinBonusXp,
    dailyBonusXp,
    streakBonusXp,
    totalXp,
    gold: input.capability.grantsGold ? goldForOutcome(input.outcome) : 0,
    arenaPoints: input.capability.grantsArenaPoints ? arenaPointsForOutcome(input) : 0,
    reasonBreakdown,
  };
}

function goldForOutcome(outcome: ArenaMatchOutcome): number {
  if (outcome === 'WIN') return WIN_GOLD;
  if (outcome === 'LOSS') return LOSS_GOLD;
  return DRAW_GOLD;
}

/** Arena Points delta always mirrors the rating engine's mmrDelta 1:1 (floored at +6 for a win, same as the pre-F1 `arenaDelta` formula) — never an independently-invented number. */
function arenaPointsForOutcome(input: Pick<ArenaRewardCalculatorInput, 'outcome' | 'mmrDelta'>): number {
  return input.outcome === 'WIN' ? Math.max(6, input.mmrDelta) : input.mmrDelta;
}

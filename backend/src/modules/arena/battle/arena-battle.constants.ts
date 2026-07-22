export const ARENA_BATTLE_SOLO_MODE = 'SOLO_1V1';

const ARENA_COMBO_MULTIPLIER_TABLE: Array<{ minCombo: number; multiplierBasisPoints: number }> = [
  { minCombo: 8, multiplierBasisPoints: 20000 },
  { minCombo: 6, multiplierBasisPoints: 15000 },
  { minCombo: 4, multiplierBasisPoints: 12500 },
  { minCombo: 2, multiplierBasisPoints: 11000 },
  { minCombo: 0, multiplierBasisPoints: 10000 },
];

export function comboMultiplierBasisPoints(combo: number): number {
  for (const tier of ARENA_COMBO_MULTIPLIER_TABLE) {
    if (combo >= tier.minCombo) return tier.multiplierBasisPoints;
  }
  return 10000;
}

/** 0-25% of the window: +30%, 25-50%: +20%, 50-75%: +10%, 75-100%: +0%. */
export function speedBonusBasisPoints(elapsedMs: number, windowMs: number): number {
  if (windowMs <= 0) return 0;
  const ratio = elapsedMs / windowMs;
  if (ratio < 0.25) return 3000;
  if (ratio < 0.5) return 2000;
  if (ratio < 0.75) return 1000;
  return 0;
}

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export const getArenaQuestionWindowMs = () => envInt('ARENA_QUESTION_WINDOW_MS', 15000);
export const getArenaMaxScoreMultiplierBp = () => envInt('ARENA_MAX_SCORE_MULTIPLIER_BP', 30000);
export const getArenaPowerUpCooldownMs = () => envInt('ARENA_POWER_UP_COOLDOWN_MS', 3000);
export const getArenaFreezeDurationMs = () => envInt('ARENA_FREEZE_DURATION_MS', 2500);
export const getArenaFreezeMinResponseMs = () => envInt('ARENA_FREEZE_MIN_RESPONSE_MS', 1500);
export const getArenaTimeBoostMs = () => envInt('ARENA_TIME_BOOST_MS', 5000);
export const getArenaMaxTimeBoostMs = () => envInt('ARENA_MAX_TIME_BOOST_MS', 8000);
export const isArenaPowerUpsEnabled = () => process.env.ARENA_POWER_UPS_ENABLED !== 'false';

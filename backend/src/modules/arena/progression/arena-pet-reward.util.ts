/**
 * Pre-F1 pet/food reward — extracted unchanged from the original
 * `ArenaService.getStreakFoodMultiplier`/`finalizeMatch` inline formula so
 * this pre-existing behavior (feeding the pet on Arena match results)
 * keeps working identically after reward application moved out of
 * `finalizeMatch`'s transaction. Not part of the new XP/gold/Arena-Points
 * reward calculator (`arena-reward-calculator.ts`) since it was never part
 * of that system and Part 5 of the Phase F1 spec doesn't ask for it.
 */
export function getStreakFoodMultiplier(streak: number): number {
  if (streak >= 10) return 1.5;
  if (streak >= 5) return 1.3;
  if (streak >= 3) return 1.1;
  return 1;
}

export function calculateArenaPetReward(input: { won: boolean; winStreakAfter: number }): {
  foodDelta: number;
  petXp: number;
} {
  const foodMultiplier = input.won ? getStreakFoodMultiplier(input.winStreakAfter) : 0.35;
  const foodDelta = Math.round((input.won ? 40 : 12) * foodMultiplier);
  const petXp = input.won ? 20 : 8;
  return { foodDelta, petXp };
}

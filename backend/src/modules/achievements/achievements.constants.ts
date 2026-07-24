export const ACHIEVEMENT_QUEUE = 'achievement-processing';

export enum AchievementJobName {
  PROCESS_EVENT = 'achievement:process-event',
}

export const ACHIEVEMENT_DOMAIN_EVENT = 'achievement.unlocked';

/**
 * Cache-aside for the per-user achievement summary (total/unlocked/claimable/
 * claimed counts + XP/coins earned) — the one genuinely repeated, non-trivial
 * aggregation in this module (4 parallel queries). Mirrors the Analytics
 * module's cache key/TTL convention (`analytics-cache.constants.ts`). `list()`
 * itself is left uncached: its queries are already simple indexed reads
 * (confirmed — not a session-table scan) and it's parameterized by
 * category/rarity/status/cursor filters, which would fragment the cache key
 * space for little benefit; summary() is the one unparameterized, reusable
 * value worth caching.
 */
export const ACHIEVEMENT_SUMMARY_CACHE_TTL_SECONDS = 5 * 60;
export const achievementSummaryCacheKey = (userId: string) =>
  `achievements:summary:${userId}`;

/**
 * Cache keys/TTLs for the new Analytics + AI Coach reads. Kept local to this
 * module (rather than added to the shared content-cache `CacheKeys`) since
 * these are per-user computed summaries, not shared lesson content — a
 * different cache shape/lifecycle than what `content-cache.service.ts` is
 * designed for. Reuses the same underlying Redis connection via
 * `RedisCacheService` (common/cache), not a new cache layer.
 */
export const AnalyticsCacheTtl = {
  /** Skill radar recomputation is a handful of session-table reads — cheap, short TTL. */
  RADAR_SECONDS: 5 * 60,
  /** Weakness detection scans full progress history — a bit heavier, cache slightly longer. */
  WEAKNESSES_SECONDS: 10 * 60,
  /** Metrics bundle (accuracy/completion/duration/etc.) — same cost class as radar. */
  METRICS_SECONDS: 5 * 60,
  /** AI Coach calls Gemini — cache aggressively (cost + latency guard), recomputed at most a few times/day per goal. */
  COACH_SECONDS: 6 * 60 * 60,
} as const;

export const AnalyticsCacheKeys = {
  radar: (userId: string) => `analytics:radar:${userId}`,
  weaknesses: (userId: string) => `analytics:weaknesses:${userId}`,
  metrics: (userId: string, rangeKey: string) =>
    `analytics:metrics:${userId}:${rangeKey}`,
  coach: (userId: string, goal: string, dayKey: string) =>
    `analytics:coach:${userId}:${goal}:${dayKey}`,
};

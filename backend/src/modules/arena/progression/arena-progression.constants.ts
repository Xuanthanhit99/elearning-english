/**
 * Achievement-catalog `eventType` matching strings (SCREAMING_SNAKE_CASE) —
 * distinct from the EventEmitter2 event *names* in
 * `../realtime/arena-domain-event.ts` (dot-case) and from
 * `NotificationEventType` enum values. See
 * docs/arena-progression-sequence.md §4 for the full naming-convention
 * rationale. These are free-text strings matched against
 * `Achievement.eventType` catalog rows — not an enum on the Prisma side,
 * consistent with every other domain's achievement wiring
 * (`VOCABULARY_COMPLETED`, `MISSION_CLAIMED`, etc.).
 */
export const ARENA_ACHIEVEMENT_EVENT_TYPE = {
  MATCH_COMPLETED: 'ARENA_MATCH_COMPLETED',
  MATCH_WON: 'ARENA_MATCH_WON',
  RATING_CHANGED: 'ARENA_RATING_CHANGED',
  PROMOTED: 'ARENA_PROMOTED',
  REWARD_APPLIED: 'ARENA_REWARD_APPLIED',
} as const;

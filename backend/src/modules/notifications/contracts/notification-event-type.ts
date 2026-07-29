export enum NotificationEventType {
  DAILY_REMINDER = 'DAILY_REMINDER',
  LEARNING_COMPLETED = 'LEARNING_COMPLETED',
  MISSION_COMPLETED = 'MISSION_COMPLETED',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  LEADERBOARD_REWARD_GRANTED = 'LEADERBOARD_REWARD_GRANTED',
  FRIEND_ACTIVITY = 'FRIEND_ACTIVITY',
  CLUB_ACTIVITY = 'CLUB_ACTIVITY',
  COMMUNITY_ACTIVITY = 'COMMUNITY_ACTIVITY',
  AI_FEEDBACK_READY = 'AI_FEEDBACK_READY',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
  // Phase F1 — Arena progression. Deliberately its own enum value even
  // though it shares its name with the Achievement `eventType` string of
  // the same real-world event ("user got promoted") — the two live in
  // different tables/fields and are never compared to each other; see
  // docs/arena-progression-sequence.md §4 on why these naming layers must
  // not be assumed interchangeable despite sometimes sharing a name.
  ARENA_PROMOTED = 'ARENA_PROMOTED',
  ARENA_TIER_DEMOTED = 'ARENA_TIER_DEMOTED',
  // Phase F2.1 — fired at most once per account (lifetime placement).
  ARENA_PLACEMENT_COMPLETED = 'ARENA_PLACEMENT_COMPLETED',
  ARENA_RATING_DECAYED = 'ARENA_RATING_DECAYED',

  // Document Library — community upload pipeline + admin moderation +
  // Gemini generation lifecycle. No dedicated preference column exists
  // yet (same situation as the Arena events above) so these are
  // registered as ALWAYS_ENABLED in notification-preference.registry.ts
  // rather than adding a new UserSettings migration for this pass.
  DOCUMENT_UPLOAD_RECEIVED = 'DOCUMENT_UPLOAD_RECEIVED',
  DOCUMENT_PROCESSING_FAILED = 'DOCUMENT_PROCESSING_FAILED',
  DOCUMENT_PENDING_REVIEW = 'DOCUMENT_PENDING_REVIEW',
  DOCUMENT_CHANGES_REQUESTED = 'DOCUMENT_CHANGES_REQUESTED',
  DOCUMENT_APPROVED = 'DOCUMENT_APPROVED',
  DOCUMENT_PUBLISHED = 'DOCUMENT_PUBLISHED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  DOCUMENT_HIDDEN = 'DOCUMENT_HIDDEN',
  DOCUMENT_REMOVED = 'DOCUMENT_REMOVED',
  DOCUMENT_REPORT_RESOLVED = 'DOCUMENT_REPORT_RESOLVED',
  DOCUMENT_GENERATION_COMPLETED = 'DOCUMENT_GENERATION_COMPLETED',
  DOCUMENT_GENERATION_FAILED = 'DOCUMENT_GENERATION_FAILED',
}

export enum NotificationEventPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export const NOTIFICATION_DOMAIN_EVENT = 'notification.domain';

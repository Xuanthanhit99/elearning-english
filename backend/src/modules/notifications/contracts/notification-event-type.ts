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
}

export enum NotificationEventPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export const NOTIFICATION_DOMAIN_EVENT = 'notification.domain';

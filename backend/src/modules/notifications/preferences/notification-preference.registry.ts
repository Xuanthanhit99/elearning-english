import { NotificationEventType } from '../contracts/notification-event-type';
import {
  NotificationEventPreferencePolicy,
  NotificationPreferenceKey,
  NotificationPreferenceRule,
} from './notification-preference.types';

export class NotificationPreferencePolicyError extends Error {
  constructor(
    readonly code: 'UNSUPPORTED_EVENT',
    message: string,
  ) {
    super(message);
  }
}

export const NOTIFICATION_PREFERENCE_RULES = [
  {
    preferenceKey: NotificationPreferenceKey.DAILY_REMINDER_ENABLED,
    eventTypes: [NotificationEventType.DAILY_REMINDER],
    controlsInAppPersistence: true,
    defaultEnabled: true,
    description: 'Daily learning reminders.',
  },
  {
    preferenceKey: NotificationPreferenceKey.MISSION_REMINDER,
    eventTypes: [NotificationEventType.MISSION_COMPLETED],
    controlsInAppPersistence: true,
    defaultEnabled: true,
    description: 'Mission and goal notifications.',
  },
  {
    preferenceKey: NotificationPreferenceKey.ACHIEVEMENT_NOTIFICATION,
    eventTypes: [NotificationEventType.ACHIEVEMENT_UNLOCKED],
    controlsInAppPersistence: true,
    defaultEnabled: true,
    description: 'Achievement unlock notifications.',
  },
  {
    preferenceKey: NotificationPreferenceKey.FRIEND_ACTIVITY,
    eventTypes: [
      NotificationEventType.FRIEND_ACTIVITY,
      NotificationEventType.COMMUNITY_ACTIVITY,
    ],
    controlsInAppPersistence: true,
    defaultEnabled: false,
    description: 'Friend and community social activity notifications.',
  },
  {
    preferenceKey: NotificationPreferenceKey.CLUB_NOTIFICATION,
    eventTypes: [NotificationEventType.CLUB_ACTIVITY],
    controlsInAppPersistence: true,
    defaultEnabled: true,
    description: 'Club and group activity notifications.',
  },
  {
    preferenceKey: NotificationPreferenceKey.LEADERBOARD_NOTIFICATION,
    eventTypes: [NotificationEventType.LEADERBOARD_REWARD_GRANTED],
    controlsInAppPersistence: true,
    defaultEnabled: true,
    description: 'Leaderboard reward and season notifications.',
  },
  {
    preferenceKey: NotificationPreferenceKey.AI_FEEDBACK_NOTIFICATION,
    eventTypes: [NotificationEventType.AI_FEEDBACK_READY],
    controlsInAppPersistence: true,
    defaultEnabled: true,
    description: 'AI feedback completion notifications.',
  },
  {
    preferenceKey: NotificationPreferenceKey.EMAIL_NOTIFICATION,
    eventTypes: [],
    controlsInAppPersistence: false,
    defaultEnabled: false,
    description: 'Future email delivery channel.',
  },
  {
    preferenceKey: NotificationPreferenceKey.PUSH_NOTIFICATION,
    eventTypes: [],
    controlsInAppPersistence: false,
    defaultEnabled: true,
    description: 'Future push delivery channel.',
  },
] as const satisfies readonly NotificationPreferenceRule[];

const ALWAYS_ENABLED_EVENT_TYPES = new Map<NotificationEventType, string>([
  [
    NotificationEventType.LEARNING_COMPLETED,
    'Learning completion notifications are system learning progress records in Stage 7A.3.',
  ],
  [
    NotificationEventType.SYSTEM_NOTIFICATION,
    'System notifications are required in-app notifications.',
  ],
  // Phase F2.1 fix: neither ARENA_PROMOTED (F1) nor ARENA_PLACEMENT_COMPLETED
  // (F2.1) were registered anywhere in this policy — any event type absent
  // from both NOTIFICATION_PREFERENCE_RULES and this map makes
  // getNotificationPreferencePolicy() throw UNSUPPORTED_EVENT, which
  // NotificationsProcessor.createFromEvent surfaces as a failed job,
  // silently never creating a Notification row. This means Arena
  // promotion notifications have never actually worked end-to-end since
  // F1 shipped — no existing test asserted a real `Notification` row for
  // either type, only that the event/job was published/enqueued. A
  // dedicated preference key (e.g. `arenaNotification`) is the more
  // correct long-term fix but requires a new `UserSettings` column — a
  // schema change explicitly out of scope for F2.1 (see
  // docs/arena-phase-f2-1-placement-implementation-report.md). Registering
  // both as always-enabled here is the scoped, non-schema-touching fix;
  // revisit with a real preference toggle in a later phase if product
  // wants users to be able to mute these specifically.
  [
    NotificationEventType.ARENA_PROMOTED,
    'Arena tier promotion is a rare, high-value moment; no dedicated preference column exists yet (see F2.1 report).',
  ],
  [
    NotificationEventType.ARENA_TIER_DEMOTED,
    'Arena tier demotion uses the existing Arena progression notification path; no dedicated preference column exists yet.',
  ],
  [
    NotificationEventType.ARENA_PLACEMENT_COMPLETED,
    'Arena placement completion fires at most once per account; no dedicated preference column exists yet (see F2.1 report).',
  ],
  [
    NotificationEventType.ARENA_RATING_DECAYED,
    'Arena rating decay is an infrequent account-status notification; no dedicated preference column exists yet.',
  ],
]);

export const NOTIFICATION_PREFERENCE_KEYS = NOTIFICATION_PREFERENCE_RULES.map(
  (rule) => rule.preferenceKey,
);

export function getNotificationPreferencePolicy(
  eventType: NotificationEventType,
): NotificationEventPreferencePolicy {
  const rule = NOTIFICATION_PREFERENCE_RULES.find((item) =>
    (item.eventTypes as readonly NotificationEventType[]).includes(eventType),
  );

  if (rule) {
    return { kind: 'PREFERENCE', rule };
  }

  const alwaysEnabledReason = ALWAYS_ENABLED_EVENT_TYPES.get(eventType);

  if (alwaysEnabledReason) {
    return { kind: 'ALWAYS_ENABLED', reason: alwaysEnabledReason };
  }

  throw new NotificationPreferencePolicyError(
    'UNSUPPORTED_EVENT',
    `Unsupported notification event type: ${eventType}`,
  );
}

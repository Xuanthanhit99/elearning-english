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

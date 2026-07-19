import { NotificationEventType } from '../contracts/notification-event-type';

export enum NotificationPreferenceKey {
  DAILY_REMINDER_ENABLED = 'dailyReminderEnabled',
  MISSION_REMINDER = 'missionReminder',
  ACHIEVEMENT_NOTIFICATION = 'showAchievements',
  FRIEND_ACTIVITY = 'friendActivity',
  CLUB_NOTIFICATION = 'clubNotification',
  LEADERBOARD_NOTIFICATION = 'leaderboardNotification',
  AI_FEEDBACK_NOTIFICATION = 'aiFeedbackNotification',
  EMAIL_NOTIFICATION = 'emailNotification',
  PUSH_NOTIFICATION = 'pushNotification',
}

export type NotificationPreferenceDecisionSource =
  | 'USER_SETTING'
  | 'DEFAULT'
  | 'SYSTEM_REQUIRED'
  | 'CHANNEL_ONLY';

export type NotificationPreferenceRule = {
  preferenceKey: NotificationPreferenceKey;
  eventTypes: readonly NotificationEventType[];
  controlsInAppPersistence: boolean;
  defaultEnabled: boolean;
  description: string;
};

export type NotificationEventPreferencePolicy =
  | {
      kind: 'PREFERENCE';
      rule: NotificationPreferenceRule;
    }
  | {
      kind: 'ALWAYS_ENABLED';
      reason: string;
    };

export type NotificationPreferenceDecision = {
  enabled: boolean;
  preferenceKey: NotificationPreferenceKey | null;
  source: NotificationPreferenceDecisionSource;
  controlsInAppPersistence: boolean;
  reason: string;
};

export const NOTIFICATIONS_QUEUE = 'notifications';

export enum NotificationJobName {
  CREATE = 'notification:create',
  CREATE_FROM_EVENT = 'notification:create-from-event',
  DAILY_REMINDERS = 'notification:daily-reminders',
  WEEKLY_GOALS = 'notification:weekly-goals',
  USER_DAILY_REMINDER = 'notification:user-daily-reminder',
  CLEANUP = 'notification:cleanup',
}

export const userDailyReminderJobId = (userId: string) =>
  `notifications:daily-reminder:${userId}`;

export const NOTIFICATION_CLEANUP_BATCH_SIZE = 500;
export const NOTIFICATION_READ_RETENTION_DAYS = 90;
export const NOTIFICATION_ARCHIVED_RETENTION_DAYS = 30;
export const NOTIFICATION_EXPIRED_RETENTION_DAYS = 7;

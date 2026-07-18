export const NOTIFICATIONS_QUEUE = 'notifications';

export enum NotificationJobName {
  CREATE = 'notification:create',
  DAILY_REMINDERS = 'notification:daily-reminders',
  WEEKLY_GOALS = 'notification:weekly-goals',
  USER_DAILY_REMINDER = 'notification:user-daily-reminder',
}

export const userDailyReminderJobId = (userId: string) =>
  `notifications:daily-reminder:${userId}`;

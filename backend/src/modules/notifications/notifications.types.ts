export type NotificationType =
  | 'MISSION'
  | 'ACHIEVEMENT'
  | 'LEARNING_REMINDER'
  | 'DAILY_GOAL'
  | 'WEEKLY_GOAL'
  | 'LEARNING_PATH'
  | 'COMMUNITY'
  | 'SYSTEM';

export type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  href?: string;
};


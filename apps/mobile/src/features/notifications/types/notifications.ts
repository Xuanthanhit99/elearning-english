export type NotificationType =
  | 'MISSION'
  | 'ACHIEVEMENT'
  | 'LEARNING_REMINDER'
  | 'DAILY_GOAL'
  | 'WEEKLY_GOAL'
  | 'LEARNING_PATH'
  | 'COMMUNITY'
  | 'SYSTEM';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  href: string;
  eventType?: string | null;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | string;
  isRead: boolean;
  read: boolean;
  readAt?: string | null;
  archivedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
    hasMore: boolean;
  };
};

export type NotificationPreferences = {
  dailyReminderEnabled?: boolean;
  dailyReminderTime?: string | null;
  missionReminder?: boolean;
  friendActivity?: boolean;
  clubNotification?: boolean;
  leaderboardNotification?: boolean;
  aiFeedbackNotification?: boolean;
  emailNotification?: boolean;
  pushNotification?: boolean;
};

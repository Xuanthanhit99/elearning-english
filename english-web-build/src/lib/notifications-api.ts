import { api } from "@/src/lib/axios";

export type NotificationType =
  | "MISSION"
  | "ACHIEVEMENT"
  | "LEARNING_REMINDER"
  | "DAILY_GOAL"
  | "WEEKLY_GOAL"
  | "LEARNING_PATH"
  | "COMMUNITY"
  | "SYSTEM";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  href: string;
  eventType?: string | null;
  priority?: "LOW" | "NORMAL" | "HIGH" | string;
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

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const res = await api.get<NotificationsResponse>("/notifications", { params });
  return res.data;
}

export async function getUnreadNotificationCount() {
  const res = await api.get<{ unreadCount: number }>("/notifications/unread-count");
  return res.data.unreadCount;
}

export async function markNotificationRead(id: string) {
  const res = await api.patch<NotificationItem>(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await api.patch<{ count: number }>("/notifications/read-all");
  return res.data;
}

export async function archiveNotification(id: string) {
  const res = await api.patch<{ archived: boolean; id: string }>(
    `/notifications/${id}/archive`,
  );
  return res.data;
}

export const deleteNotification = archiveNotification;

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
  isRead: boolean;
  read: boolean;
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
  const res = await api.post<NotificationItem>("/notifications/read", { id });
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await api.post<{ count: number }>("/notifications/read-all");
  return res.data;
}

export async function deleteNotification(id: string) {
  const res = await api.delete<{ deleted: boolean; id: string }>(`/notifications/${id}`);
  return res.data;
}


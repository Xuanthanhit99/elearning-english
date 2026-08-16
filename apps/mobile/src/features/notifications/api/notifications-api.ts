import { authenticatedApiClient } from '../../../services/api/client';
import type {
  NotificationItem,
  NotificationPreferences,
  NotificationsResponse,
} from '../types/notifications';

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const response = await authenticatedApiClient.get<NotificationsResponse>('/notifications', {
    params,
  });
  return response.data;
}

export async function getUnreadNotificationCount() {
  const response = await authenticatedApiClient.get<{ unreadCount: number }>(
    '/notifications/unread-count',
  );
  return response.data.unreadCount;
}

export async function markNotificationRead(id: string) {
  const response = await authenticatedApiClient.patch<NotificationItem>(
    `/notifications/${encodeURIComponent(id)}/read`,
  );
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await authenticatedApiClient.patch<{ count: number }>(
    '/notifications/read-all',
  );
  return response.data;
}

export async function archiveNotification(id: string) {
  const response = await authenticatedApiClient.patch<{ archived: boolean; id: string }>(
    `/notifications/${encodeURIComponent(id)}/archive`,
  );
  return response.data;
}

export async function getNotificationPreferences() {
  const response = await authenticatedApiClient.get<NotificationPreferences>(
    '/settings/notifications',
  );
  return response.data;
}

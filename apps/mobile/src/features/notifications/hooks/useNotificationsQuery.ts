import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getNotificationPreferences,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications-api';
import { notificationKeys } from '../query-keys';
import type { NotificationItem, NotificationsResponse } from '../types/notifications';

export function useNotificationsQuery(unreadOnly = false) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: ({ pageParam }) => getNotifications({ page: pageParam, limit: 20, unreadOnly }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined),
  });
}

export function useUnreadNotificationCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadNotificationCount,
  });
}

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: getNotificationPreferences,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    retry: false,
    onSuccess: (notification) => {
      const wasUnread = isNotificationUnreadInCache(queryClient, notification.id);
      upsertNotificationInLists(queryClient, notification);
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), (old) =>
        old === undefined || !wasUnread ? old : Math.max(0, old - 1),
      );
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    retry: false,
    onSuccess: () => {
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), 0);
      queryClient.setQueriesData<InfiniteData<NotificationsResponse>>(
        { queryKey: notificationKeys.lists() },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.map((item) => ({ ...item, isRead: true, read: true })),
                  meta: { ...page.meta, unreadCount: 0 },
                })),
              }
            : old,
      );
      void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

export function mergeRealtimeNotification(
  queryClient: ReturnType<typeof useQueryClient>,
  notification: NotificationItem,
) {
  const inserted = upsertNotificationInLists(queryClient, notification);
  if (inserted && !notification.isRead) {
    queryClient.setQueryData<number>(notificationKeys.unreadCount(), (old) =>
      old === undefined ? 1 : old + 1,
    );
  }
}

export function removeArchivedNotification(
  queryClient: ReturnType<typeof useQueryClient>,
  notification: NotificationItem,
) {
  queryClient.setQueriesData<InfiniteData<NotificationsResponse>>(
    { queryKey: notificationKeys.lists() },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => item.id !== notification.id),
        })),
      };
    },
  );
  if (!notification.isRead) {
    queryClient.setQueryData<number>(notificationKeys.unreadCount(), (old) =>
      old === undefined ? old : Math.max(0, old - 1),
    );
  }
}

function upsertNotificationInLists(
  queryClient: ReturnType<typeof useQueryClient>,
  notification: NotificationItem,
) {
  let inserted = false;
  queryClient.setQueriesData<InfiniteData<NotificationsResponse>>(
    { queryKey: notificationKeys.lists() },
    (old) => {
      if (!old) return old;

      const exists = old.pages.some((page) =>
        page.items.some((item) => item.id === notification.id),
      );
      inserted = !exists;

      const pages = old.pages.map((page, index) => {
        const items = page.items.map((item) => (item.id === notification.id ? notification : item));
        if (index === 0 && !exists) {
          items.unshift(notification);
        }
        return {
          ...page,
          items: dedupeById(items).sort(sortByNewest),
        };
      });

      return { ...old, pages };
    },
  );
  return inserted;
}

function isNotificationUnreadInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  notificationId: string,
) {
  const lists = queryClient.getQueriesData<InfiniteData<NotificationsResponse>>({
    queryKey: notificationKeys.lists(),
  });

  return lists.some(([, data]) =>
    data?.pages.some((page) =>
      page.items.some((item) => item.id === notificationId && !item.isRead),
    ),
  );
}

function dedupeById(items: NotificationItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function sortByNewest(a: NotificationItem, b: NotificationItem) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id);
}

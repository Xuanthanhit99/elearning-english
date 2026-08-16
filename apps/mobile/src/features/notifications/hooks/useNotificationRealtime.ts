import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { socketNamespaces } from '../../../services/socket/namespaces';
import { getAuthenticatedSocket } from '../../../services/socket/socket-manager';
import { notificationKeys } from '../query-keys';
import type { NotificationItem } from '../types/notifications';
import {
  mergeRealtimeNotification,
  removeArchivedNotification,
} from './useNotificationsQuery';

export function useNotificationRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    void getAuthenticatedSocket(socketNamespaces.notifications).then((socket) => {
      if (!active || !socket) return;

      const onCreated = (item: NotificationItem) => {
        mergeRealtimeNotification(queryClient, item);
      };
      const onUpdated = (item: NotificationItem) => {
        mergeRealtimeNotification(queryClient, item);
        void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      };
      const onArchived = (item: NotificationItem) => {
        removeArchivedNotification(queryClient, item);
      };
      const onUnreadCount = ({ unreadCount }: { unreadCount: number }) => {
        queryClient.setQueryData(notificationKeys.unreadCount(), unreadCount);
      };
      const onConnected = () => {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      };

      socket.on('notification:connected', onConnected);
      socket.on('notification:created', onCreated);
      socket.on('notification:updated', onUpdated);
      socket.on('notification:archived', onArchived);
      socket.on('notification:unread-count', onUnreadCount);
      socket.on('notification:unauthorized', onConnected);

      cleanup = () => {
        socket.off('notification:connected', onConnected);
        socket.off('notification:created', onCreated);
        socket.off('notification:updated', onUpdated);
        socket.off('notification:archived', onArchived);
        socket.off('notification:unread-count', onUnreadCount);
        socket.off('notification:unauthorized', onConnected);
      };
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [queryClient]);
}

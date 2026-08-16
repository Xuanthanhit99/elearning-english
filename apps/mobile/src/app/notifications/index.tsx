import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppText } from '../../components/ui/AppText';
import {
  NotificationListItem,
  NotificationSkeleton,
  NotificationStateCard,
} from '../../features/notifications/components/NotificationComponents';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadNotificationCountQuery,
} from '../../features/notifications/hooks/useNotificationsQuery';
import { notificationKeys } from '../../features/notifications/query-keys';
import type { NotificationItem } from '../../features/notifications/types/notifications';
import { resolveNotificationRoute } from '../../features/notifications/utils/notification-routing';
import { colors, spacing } from '../../theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationsQuery = useNotificationsQuery();
  const unreadQuery = useUnreadNotificationCountQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const [refreshing, setRefreshing] = useState(false);

  const items = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notificationsQuery.data],
  );
  const unreadCount = unreadQuery.data ?? notificationsQuery.data?.pages[0]?.meta.unreadCount ?? 0;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        notificationsQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [notificationsQuery, queryClient]);

  const openNotification = useCallback(
    async (notification: NotificationItem) => {
      if (!notification.isRead) {
        await markReadMutation.mutateAsync(notification.id).catch(() => undefined);
      }

      const route = resolveNotificationRoute(notification);
      if (route) {
        router.push(route);
      }
    },
    [markReadMutation, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <NotificationListItem notification={item} onPress={() => void openNotification(item)} />
    ),
    [openNotification],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lai"
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <AppText variant="title">Thong bao</AppText>
          <AppText color={colors.textMuted}>
            {unreadCount > 0 ? `${unreadCount} thong bao chua doc` : 'Tat ca da duoc doc'}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Danh dau tat ca da doc"
          disabled={unreadCount === 0 || markAllReadMutation.isPending}
          onPress={() => void markAllReadMutation.mutateAsync()}
          style={({ pressed }) => [
            styles.iconButton,
            unreadCount === 0 ? styles.iconButtonDisabled : null,
            pressed ? styles.iconButtonPressed : null,
          ]}
        >
          <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {notificationsQuery.isLoading ? (
        <View style={styles.content}>
          <NotificationSkeleton />
        </View>
      ) : notificationsQuery.error && items.length === 0 ? (
        <View style={styles.content}>
          <NotificationStateCard
            title="Khong the tai thong bao"
            body="Hay thu lai sau it phut."
            action={<AppButton onPress={() => void refresh()}>Thu lai</AppButton>}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, items.length === 0 ? styles.emptyList : null]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) {
              void notificationsQuery.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <NotificationStateCard
              title="Chua co thong bao"
              body="Khi co hoat dong moi, chung se xuat hien o day."
            />
          }
          ListFooterComponent={
            notificationsQuery.isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonPressed: {
    opacity: 0.72,
  },
  iconButtonDisabled: {
    opacity: 0.38,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: spacing.xl,
  },
  listContent: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: spacing.md,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../theme';
import type { NotificationItem } from '../types/notifications';
import {
  notificationAccessibilityLabel,
  resolveNotificationPresentation,
} from '../utils/notification-presentation';

type NotificationListItemProps = {
  notification: NotificationItem;
  onPress: () => void;
};

export function NotificationListItem({ notification, onPress }: NotificationListItemProps) {
  const presentation = resolveNotificationPresentation(notification);
  const timeLabel = formatRelativeTime(notification.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={notificationAccessibilityLabel(notification)}
      accessibilityState={{ selected: !notification.isRead }}
      onPress={onPress}
      style={({ pressed }) => [styles.itemPressable, pressed ? styles.pressed : null]}
    >
      <AppCard style={[styles.item, !notification.isRead ? styles.unreadItem : null]}>
        <View style={[styles.iconBubble, { backgroundColor: `${presentation.color}18` }]}>
          <Ionicons name={presentation.icon} size={22} color={presentation.color} />
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemHeader}>
            <AppText
              variant="small"
              style={[styles.itemTitle, !notification.isRead ? styles.unreadText : null]}
            >
              {notification.title}
            </AppText>
            {!notification.isRead ? <View style={styles.unreadDot} /> : null}
          </View>
          {notification.message ? (
            <AppText variant="small" color={colors.textMuted}>
              {notification.message}
            </AppText>
          ) : null}
          <View style={styles.metaRow}>
            <AppText variant="caption" color={colors.textMuted}>
              {presentation.label}
            </AppText>
            <View style={styles.metaDot} />
            <AppText variant="caption" color={colors.textMuted}>
              {timeLabel}
            </AppText>
          </View>
        </View>
      </AppCard>
    </Pressable>
  );
}

export function NotificationSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: 5 }).map((_, index) => (
        <AppCard key={index} style={styles.skeletonItem}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, styles.skeletonTitle]} />
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, styles.skeletonMeta]} />
          </View>
        </AppCard>
      ))}
    </View>
  );
}

export function NotificationStateCard({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <AppCard style={styles.stateCard}>
      <Ionicons name="notifications-outline" size={28} color={colors.primary} />
      <View style={styles.stateText}>
        <AppText variant="heading">{title}</AppText>
        {body ? <AppText color={colors.textMuted}>{body}</AppText> : null}
      </View>
      {action}
    </AppCard>
  );
}

function formatRelativeTime(value: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const diffMs = Date.now() - time;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));
  if (diffMinutes < 1) return 'Vua xong';
  if (diffMinutes < 60) return `${diffMinutes} phut truoc`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} gio truoc`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngay truoc`;
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit' }).format(new Date(value));
}

const styles = StyleSheet.create({
  itemPressable: {
    minHeight: 72,
  },
  pressed: {
    opacity: 0.76,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  unreadItem: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    gap: spacing.xs,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemTitle: {
    flex: 1,
  },
  unreadText: {
    fontWeight: '900',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  skeletonWrap: {
    gap: spacing.md,
  },
  skeletonItem: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
  },
  skeletonLines: {
    flex: 1,
    gap: spacing.sm,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceSoft,
  },
  skeletonTitle: {
    width: '78%',
  },
  skeletonMeta: {
    width: '38%',
  },
  stateCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  stateText: {
    alignItems: 'center',
    gap: spacing.xs,
  },
});

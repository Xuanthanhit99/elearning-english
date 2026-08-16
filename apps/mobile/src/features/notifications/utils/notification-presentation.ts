import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '../../../theme';
import type { NotificationItem, NotificationType } from '../types/notifications';

type IconName = ComponentProps<typeof Ionicons>['name'];

const presentationByType: Record<NotificationType, { icon: IconName; color: string; label: string }> = {
  MISSION: { icon: 'flag-outline', color: colors.violet, label: 'Nhiem vu' },
  ACHIEVEMENT: { icon: 'trophy-outline', color: colors.gold, label: 'Thanh tich' },
  LEARNING_REMINDER: { icon: 'alarm-outline', color: colors.primary, label: 'Nhac hoc' },
  DAILY_GOAL: { icon: 'sunny-outline', color: colors.rose, label: 'Muc tieu ngay' },
  WEEKLY_GOAL: { icon: 'calendar-outline', color: colors.mint, label: 'Muc tieu tuan' },
  LEARNING_PATH: { icon: 'map-outline', color: colors.cyan, label: 'Lo trinh' },
  COMMUNITY: { icon: 'people-outline', color: colors.primary, label: 'Cong dong' },
  SYSTEM: { icon: 'notifications-outline', color: colors.textMuted, label: 'He thong' },
};

export function resolveNotificationPresentation(notification: NotificationItem) {
  return presentationByType[notification.type] ?? presentationByType.SYSTEM;
}

export function notificationAccessibilityLabel(notification: NotificationItem) {
  const state = notification.isRead ? 'da doc' : 'chua doc';
  return `${notification.title}. ${notification.message}. ${state}.`;
}

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../theme';
import type { DashboardLesson, DashboardSkillProgress, DashboardWeekActivity, LeaderboardMe } from '../types';
import { clampPercent } from '../utils/dashboard-utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function DashboardSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeletonBlock, styles.skeletonHero]} />
      <View style={styles.statsGrid}>
        <View style={[styles.skeletonBlock, styles.skeletonStat]} />
        <View style={[styles.skeletonBlock, styles.skeletonStat]} />
        <View style={[styles.skeletonBlock, styles.skeletonStat]} />
      </View>
      <View style={[styles.skeletonBlock, styles.skeletonCard]} />
      <View style={[styles.skeletonBlock, styles.skeletonCard]} />
    </View>
  );
}

export function DashboardNotice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <AppCard style={styles.notice}>
      <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
      <View style={styles.noticeText}>
        <AppText variant="heading">{title}</AppText>
        <AppText color={colors.textMuted}>{body}</AppText>
        {action}
      </View>
    </AppCard>
  );
}

export function StatPill({
  icon,
  label,
  value,
  tone = colors.primary,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.iconBubble, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} size={20} color={tone} />
      </View>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

export function DailyGoalCard({
  studyMinutes,
  targetStudyMinutes,
  progress,
  isCompleted,
}: {
  studyMinutes: number;
  targetStudyMinutes: number;
  progress: number;
  isCompleted: boolean;
}) {
  const safeProgress = clampPercent(progress);

  return (
    <AppCard>
      <View style={styles.cardHeader}>
        <View>
          <AppText variant="heading">Mục tiêu hôm nay</AppText>
          <AppText color={colors.textMuted}>
            {studyMinutes}/{targetStudyMinutes} phút học
          </AppText>
        </View>
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'timer-outline'}
          size={26}
          color={isCompleted ? colors.success : colors.primary}
        />
      </View>
      <ProgressBar value={safeProgress} />
      <AppText variant="caption" color={colors.textMuted}>
        {isCompleted ? 'Đã hoàn thành mục tiêu ngày.' : `${safeProgress}% mục tiêu đã hoàn thành.`}
      </AppText>
    </AppCard>
  );
}

export function ContinueLearningCard({
  lesson,
  onPress,
}: {
  lesson: DashboardLesson;
  onPress: () => void;
}) {
  const progress = clampPercent(lesson.progressPercent);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <AppCard style={[styles.lessonCard, pressed ? styles.pressedCard : null]}>
          <View style={styles.cardHeader}>
            <View style={styles.lessonTitle}>
              <AppText variant="caption" color={colors.primary}>
                Tiếp tục học
              </AppText>
              <AppText variant="heading">{lesson.title}</AppText>
              {lesson.subtitle ? <AppText color={colors.textMuted}>{lesson.subtitle}</AppText> : null}
            </View>
            <Ionicons name="play-circle" size={34} color={colors.primary} />
          </View>
          {progress > 0 ? <ProgressBar value={progress} /> : null}
          <AppText variant="caption" color={colors.textMuted}>
            {progress > 0 ? `${progress}% đã hoàn thành` : lesson.estimatedMinutes ? `${lesson.estimatedMinutes} phút` : 'Sẵn sàng bắt đầu'}
          </AppText>
        </AppCard>
      )}
    </Pressable>
  );
}

export function SkillModuleCard({
  item,
  onPress,
}: {
  item: DashboardSkillProgress;
  onPress: () => void;
}) {
  const progress = clampPercent(item.percent);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.moduleCard, pressed ? styles.pressedCard : null]}>
      <View style={styles.moduleHeader}>
        <Ionicons name={moduleIcon(item.key)} size={21} color={colors.primary} />
        <AppText variant="small">{item.label}</AppText>
      </View>
      <AppText variant="heading">{progress}%</AppText>
      <ProgressBar value={progress} />
      {item.level ? (
        <AppText variant="caption" color={colors.textMuted}>
          Trình độ {item.level}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function WeeklyActivityCard({ items }: { items: DashboardWeekActivity[] }) {
  const maxValue = Math.max(...items.map((item) => Math.max(item.xp, item.minutes)), 1);

  return (
    <AppCard>
      <View style={styles.cardHeader}>
        <View>
          <AppText variant="heading">Tuần này</AppText>
          <AppText color={colors.textMuted}>XP và phút học theo ngày</AppText>
        </View>
        <Ionicons name="bar-chart-outline" size={24} color={colors.primary} />
      </View>
      <View style={styles.weekBars}>
        {items.map((item) => {
          const height = Math.max(12, Math.round((Math.max(item.xp, item.minutes) / maxValue) * 92));

          return (
            <View key={item.date} style={styles.weekItem}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height }]} />
              </View>
              <AppText variant="caption" color={colors.textMuted}>
                {item.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </AppCard>
  );
}

export function LeaderboardCard({ data, onPress }: { data: LeaderboardMe; onPress?: () => void }) {
  if (!data?.current) return null;
  const current = data.current;

  return (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress}>
      {({ pressed }) => (
        <AppCard style={pressed ? styles.pressedCard : null}>
          <View style={styles.cardHeader}>
            <View>
              <AppText variant="heading">Bảng xếp hạng</AppText>
              <AppText color={colors.textMuted}>{current.season?.name ?? 'Mùa hiện tại'}</AppText>
            </View>
            <Ionicons name="trophy-outline" size={26} color={colors.gold} />
          </View>
          <View style={styles.leaderboardRow}>
            <View>
              <AppText variant="caption" color={colors.textMuted}>
                Thứ hạng
              </AppText>
              <AppText variant="title">#{current.rank ?? '-'}</AppText>
            </View>
            <View>
              <AppText variant="caption" color={colors.textMuted}>
                XP mùa này
              </AppText>
              <AppText variant="heading">{current.periodXp}</AppText>
            </View>
          </View>
          {onPress ? (
            <AppText variant="caption" color={colors.primary}>
              Open full leaderboard
            </AppText>
          ) : null}
        </AppCard>
      )}
    </Pressable>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clampPercent(value)}%` }]} />
    </View>
  );
}

function moduleIcon(key: string): IconName {
  switch (key) {
    case 'VOCABULARY':
      return 'albums-outline';
    case 'GRAMMAR':
      return 'checkmark-done-outline';
    case 'READING':
      return 'document-text-outline';
    case 'LISTENING':
      return 'headset-outline';
    case 'WRITING':
      return 'create-outline';
    default:
      return 'school-outline';
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  skeletonBlock: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonHero: {
    minHeight: 190,
  },
  skeletonStat: {
    flex: 1,
    minHeight: 112,
  },
  skeletonCard: {
    minHeight: 170,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  noticeText: {
    flex: 1,
    gap: spacing.sm,
  },
  statPill: {
    flex: 1,
    minHeight: 116,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  iconBubble: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  lessonCard: {
    gap: spacing.sm,
  },
  pressedCard: {
    opacity: 0.78,
  },
  lessonTitle: {
    flex: 1,
    gap: spacing.xs,
  },
  moduleCard: {
    width: '48%',
    minHeight: 144,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weekBars: {
    minHeight: 132,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  weekItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  barTrack: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  barFill: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.mint,
  },
  leaderboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
});

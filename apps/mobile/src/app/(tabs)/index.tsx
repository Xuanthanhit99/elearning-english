import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import {
  ContinueLearningCard,
  DailyGoalCard,
  DashboardNotice,
  DashboardSkeleton,
  LeaderboardCard,
  SkillModuleCard,
  StatPill,
  WeeklyActivityCard,
} from '../../features/dashboard/components/DashboardCards';
import {
  useDashboardQuery,
  useLeaderboardMeQuery,
} from '../../features/dashboard/hooks/useDashboardQuery';
import { dashboardKeys } from '../../features/dashboard/query-keys';
import {
  firstName,
  getGreeting,
  selectPrimaryLesson,
  selectSkillModules,
  toTabRoute,
} from '../../features/dashboard/utils/dashboard-utils';
import { useUnreadNotificationCountQuery } from '../../features/notifications/hooks/useNotificationsQuery';
import { useAuthStore } from '../../stores/auth-store';
import { colors, spacing } from '../../theme';

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const { data, error, isLoading, isFetching, refetch } = useDashboardQuery();
  const { data: unreadNotifications } = useUnreadNotificationCountQuery();
  const showLeaderboard = data?.widgetVisibility?.leaderboard !== false;
  const { data: leaderboardMe } = useLeaderboardMeQuery(Boolean(data && showLeaderboard));
  const [refreshing, setRefreshing] = useState(false);

  const primaryLesson = useMemo(() => selectPrimaryLesson(data), [data]);
  const skillModules = useMemo(() => selectSkillModules(data), [data]);
  const weeklyActivity = data?.weeklyActivity?.length ? data.weeklyActivity : data?.week?.dailySeries;
  const displayName = data?.user.fullname ?? authUser?.fullname;
  const greeting = `${getGreeting()}, ${firstName(displayName)}`;

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.leaderboardMe() }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refetch]);

  if (isLoading && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <DashboardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshDashboard} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          <DashboardNotice
            title="Chưa tải được dashboard"
            body="Kéo xuống để thử lại hoặc kiểm tra kết nối API."
            action={<AppButton onPress={() => void refreshDashboard()}>Thử lại</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (isFetching && Boolean(data))}
            onRefresh={refreshDashboard}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <AppText variant="caption" color={colors.primary}>
              BeaconVie
            </AppText>
            <AppText variant="title">{greeting}</AppText>
            <AppText color={colors.textMuted}>
              {data?.preferences?.learningGoal ?? data?.user.learningGoal ?? 'Học tiếng Anh mỗi ngày'}
            </AppText>
          </View>
          <View style={styles.levelBadge}>
            <Ionicons name="school-outline" size={18} color={colors.primary} />
            <AppText variant="caption" color={colors.primary}>
              {data?.user.englishLevel ?? data?.preferences?.currentLevel ?? 'Level'}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadNotifications && unreadNotifications > 0
                ? `Thong bao, ${unreadNotifications} chua doc`
                : 'Thong bao'
            }
            onPress={() => router.push('/notifications')}
            style={({ pressed }) => [styles.notificationButton, pressed ? styles.notificationButtonPressed : null]}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            {unreadNotifications && unreadNotifications > 0 ? (
              <View style={styles.notificationBadge}>
                <AppText variant="caption" color={colors.white} style={styles.notificationBadgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        </View>

        {data ? (
          <View style={styles.statsGrid}>
            <StatPill
              icon="flash-outline"
              label="XP hôm nay"
              value={String(data.xp.today)}
              tone={colors.gold}
            />
            <StatPill
              icon="flame-outline"
              label="ngày streak"
              value={String(data.currentStreak)}
              tone={colors.rose}
            />
            <StatPill
              icon="time-outline"
              label="phút học"
              value={String(data.today?.studyMinutes ?? data.analytics?.summary?.studyTimeMinutes ?? '-')}
              tone={colors.mint}
            />
          </View>
        ) : null}

        <DashboardNotice
          title="BeaconVie Companion"
          body="Hoi Miu ve bai hoc, muc tieu hom nay hoac goi y hoc nhanh."
          action={<AppButton onPress={() => router.push('/companion')}>Mo Companion</AppButton>}
        />

        <DashboardNotice
          title="Arena"
          body="Find a ranked match and answer live questions from the server."
          action={<AppButton onPress={() => router.push('/arena')}>Open Arena</AppButton>}
        />

        {data && !data.user.englishLevel && !data.learningPath?.overallLevel ? (
          <DashboardNotice
            title="Kiem tra trinh do"
            body="BeaconVie se dung ket qua de de xuat lo trinh hoc phu hop."
            action={<AppButton onPress={() => router.push('/placement')}>Mo Placement</AppButton>}
          />
        ) : data?.learningPath ? (
          <DashboardNotice
            title="Lo trinh cua ban"
            body={`${data.learningPath.overallLevel ?? data.learningPath.source ?? 'Learning Path'} | ${data.learningPath.progressPercent ?? 0}%`}
            action={<AppButton onPress={() => router.push('/learning/path')}>Xem lo trinh</AppButton>}
          />
        ) : null}

        {primaryLesson ? (
          <ContinueLearningCard
            lesson={primaryLesson}
            onPress={() => router.push(toTabRoute(primaryLesson.href))}
          />
        ) : (
          <DashboardNotice
            title="Sẵn sàng bắt đầu"
            body="Chưa có bài học đang mở từ backend. Vào tab Học tập để chọn nội dung đầu tiên."
            action={<AppButton onPress={() => router.push('/(tabs)/learn')}>Mở Học tập</AppButton>}
          />
        )}

        {data?.today && data.today.targetStudyMinutes > 0 ? (
          <DailyGoalCard
            studyMinutes={data.today.studyMinutes}
            targetStudyMinutes={data.today.targetStudyMinutes}
            progress={data.today.dailyGoalProgress}
            isCompleted={data.today.isGoalCompleted}
          />
        ) : null}

        {skillModules.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="heading">Kỹ năng</AppText>
              <AppText color={colors.textMuted}>Tiến độ thật từ backend</AppText>
            </View>
            <View style={styles.modulesGrid}>
              {skillModules.map((item) => (
                <SkillModuleCard
                  key={item.key}
                  item={item}
                  onPress={() => router.push(toTabRoute(item.href))}
                />
              ))}
            </View>
          </View>
        ) : null}

        {weeklyActivity?.length ? <WeeklyActivityCard items={weeklyActivity} /> : null}

        {showLeaderboard && leaderboardMe ? (
          <LeaderboardCard data={leaderboardMe} onPress={() => router.push('/leaderboard')} />
        ) : null}

        {data?.todayMissions?.summary ? (
          <AppCard>
            <View style={styles.cardHeader}>
              <View>
                <AppText variant="heading">Nhiệm vụ hôm nay</AppText>
                <AppText color={colors.textMuted}>
                  {data.todayMissions.summary.completed}/{data.todayMissions.summary.total} hoàn thành
                </AppText>
              </View>
              <Ionicons name="flag-outline" size={24} color={colors.primary} />
            </View>
          </AppCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  heroText: {
    flex: 1,
    gap: spacing.sm,
  },
  levelBadge: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
  },
  notificationButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
  },
  notificationButtonPressed: {
    opacity: 0.72,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.rose,
    paddingHorizontal: 5,
  },
  notificationBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});

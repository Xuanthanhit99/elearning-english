import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { DashboardNotice, StatPill } from '../../features/dashboard/components/DashboardCards';
import { useDashboardQuery } from '../../features/dashboard/hooks/useDashboardQuery';
import {
  useAchievementOverviewQuery,
  useProfileQuery,
} from '../../features/profile/hooks/useProfileQuery';
import { initials } from '../../features/profile/utils/profile-utils';
import { colors, spacing } from '../../theme';

export default function ProfileScreen() {
  const router = useRouter();
  const profileQuery = useProfileQuery();
  const dashboardQuery = useDashboardQuery();
  const achievementsQuery = useAchievementOverviewQuery();
  const profile = profileQuery.data;
  const dashboard = dashboardQuery.data;
  const refreshing = profileQuery.isRefetching || dashboardQuery.isRefetching;

  const refresh = async () => {
    await Promise.all([profileQuery.refetch(), dashboardQuery.refetch(), achievementsQuery.refetch()]);
  };

  if (profileQuery.isLoading && !profile) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.skeleton, styles.heroSkeleton]} />
          <View style={styles.statsGrid}>
            <View style={[styles.skeleton, styles.statSkeleton]} />
            <View style={[styles.skeleton, styles.statSkeleton]} />
            <View style={[styles.skeleton, styles.statSkeleton]} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (profileQuery.error && !profile) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        >
          <DashboardNotice
            title="Could not load profile"
            body="Pull down to retry or check the API connection."
            action={<AppButton onPress={() => void refresh()}>Retry</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const level = dashboard?.xp.level ?? profile?.level ?? null;
  const xp = dashboard?.xp.total ?? profile?.xp ?? 0;
  const streak = dashboard?.currentStreak ?? 0;
  const achievements = achievementsQuery.data?.recent ?? [];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <AppCard style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
              ) : (
                <AppText variant="title" color={colors.white}>
                  {initials(profile?.fullname)}
                </AppText>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
            >
              <Ionicons name="settings-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.details}>
            <AppText variant="title">{profile?.fullname ?? 'BeaconVie learner'}</AppText>
            <AppText color={colors.textMuted}>{profile?.email}</AppText>
            {profile?.username ? (
              <AppText variant="caption" color={colors.primary}>
                @{profile.username}
              </AppText>
            ) : null}
            {profile?.bio || profile?.goal ? (
              <AppText color={colors.textSecondary}>{profile.bio ?? profile.goal}</AppText>
            ) : null}
          </View>
          <View style={styles.actions}>
            <AppButton onPress={() => router.push('/profile/edit')}>Edit profile</AppButton>
          </View>
        </AppCard>

        <View style={styles.statsGrid}>
          <StatPill icon="flash-outline" label="total XP" value={String(xp)} tone={colors.gold} />
          <StatPill icon="trophy-outline" label="level" value={level ? String(level) : '-'} />
          <StatPill icon="flame-outline" label="day streak" value={String(streak)} tone={colors.rose} />
        </View>

        <AppCard style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View>
              <AppText variant="heading">Learning summary</AppText>
              <AppText color={colors.textMuted}>Real progress from Dashboard</AppText>
            </View>
            <Ionicons name="school-outline" size={24} color={colors.primary} />
          </View>
          <SummaryLine label="Current level" value={dashboard?.learningPath?.overallLevel ?? profile?.englishLevel ?? '-'} />
          <SummaryLine label="Learning goal" value={dashboard?.preferences?.learningGoal ?? profile?.learningGoal ?? profile?.goal ?? '-'} />
          <SummaryLine label="Completed lessons" value={String(dashboard?.analytics?.summary?.completedLessons ?? dashboard?.today?.completedLessons ?? '-')} />
          <SummaryLine label="Study minutes" value={String(dashboard?.analytics?.summary?.studyTimeMinutes ?? dashboard?.week?.studyMinutes ?? '-')} />
        </AppCard>

        <AppCard style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View>
              <AppText variant="heading">Achievements</AppText>
              <AppText color={colors.textMuted}>Loaded when the backend provides them</AppText>
            </View>
            <Ionicons name="medal-outline" size={24} color={colors.gold} />
          </View>
          {achievements.length ? (
            achievements.slice(0, 4).map((item) => (
              <View key={item.key ?? item.id ?? item.title} style={styles.achievementRow}>
                <AppText variant="small">{item.title}</AppText>
                {item.description ? (
                  <AppText variant="caption" color={colors.textMuted}>
                    {item.description}
                  </AppText>
                ) : null}
              </View>
            ))
          ) : (
            <AppText color={colors.textMuted}>No achievement summary available yet.</AppText>
          )}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <AppText color={colors.textMuted}>{label}</AppText>
      <AppText variant="small">{value}</AppText>
    </View>
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
  skeleton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    backgroundColor: colors.surfaceSoft,
  },
  heroSkeleton: {
    minHeight: 260,
  },
  statSkeleton: {
    flex: 1,
    minHeight: 116,
  },
  hero: {
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 94,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 47,
    backgroundColor: colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.72,
  },
  details: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionCard: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLine: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
  },
  achievementRow: {
    gap: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
});

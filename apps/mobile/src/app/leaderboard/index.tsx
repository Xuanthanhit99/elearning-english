import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { useLeaderboardQuery } from '../../features/leaderboard/hooks/useLeaderboardQuery';
import { useLeaderboardRealtime } from '../../features/leaderboard/hooks/useLeaderboardRealtime';
import type { LeaderboardEntry, LeaderboardTab } from '../../features/leaderboard/types/leaderboard';
import { colors, radius, spacing } from '../../theme';

const TABS: { key: LeaderboardTab; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'friends', label: 'Friends' },
];

export default function LeaderboardScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<LeaderboardTab>('weekly');
  const query = useLeaderboardQuery(tab);
  const firstPage = query.data?.pages[0];
  const entries = useMemo(
    () => query.data?.pages.flatMap((page) => page.entries) ?? [],
    [query.data],
  );

  useLeaderboardRealtime(firstPage?.groupId);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(item) => `${item.rank}-${item.user.id}`}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.primary} />
              </Pressable>
              <View style={styles.titleBlock}>
                <AppText variant="caption" color={colors.primary}>
                  BeaconVie
                </AppText>
                <AppText variant="title">Leaderboard</AppText>
              </View>
            </View>

            <View style={styles.tabs}>
              {TABS.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={() => setTab(item.key)}
                  style={[styles.tab, tab === item.key ? styles.activeTab : null]}
                >
                  <AppText
                    variant="small"
                    color={tab === item.key ? colors.white : colors.textSecondary}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppCard style={styles.summaryCard}>
              <View>
                <AppText variant="caption" color={colors.textMuted}>
                  Your rank
                </AppText>
                <AppText variant="title">#{firstPage?.currentUser?.rank ?? '-'}</AppText>
              </View>
              <View style={styles.summaryRight}>
                <AppText variant="caption" color={colors.textMuted}>
                  XP
                </AppText>
                <AppText variant="heading">
                  {firstPage?.currentUser?.periodXp ?? 0}
                </AppText>
                {firstPage?.league ? (
                  <AppText variant="caption" color={colors.primary}>
                    {firstPage.league}
                  </AppText>
                ) : null}
              </View>
            </AppCard>
          </View>
        }
        renderItem={({ item }) => <LeaderboardRow entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <AppCard style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={32} color={colors.gold} />
            <AppText variant="heading">
              {query.isLoading ? 'Loading ranks...' : 'No ranks yet'}
            </AppText>
            <AppText color={colors.textMuted}>
              Earn XP from lessons and refresh this board.
            </AppText>
          </AppCard>
        }
        ListFooterComponent={
          query.hasNextPage ? (
            <AppButton
              disabled={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </AppButton>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const name = entry.user.displayName ?? entry.user.username ?? 'Learner';
  const xp = entry.periodXp ?? entry.xp ?? 0;

  return (
    <AppCard style={[styles.rowCard, entry.isCurrentUser ? styles.currentRow : null]}>
      <View style={styles.rankBadge}>
        <AppText variant="heading" color={entry.rank <= 3 ? colors.gold : colors.primary}>
          #{entry.rank}
        </AppText>
      </View>
      <View style={styles.rowBody}>
        <AppText variant="heading">{name}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {entry.user.cefrLevel ?? 'Level'} {entry.user.streak ? `| ${entry.user.streak} day streak` : ''}
        </AppText>
      </View>
      <View style={styles.xpBlock}>
        <AppText variant="heading">{xp}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          XP
        </AppText>
      </View>
    </AppCard>
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
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  headerStack: {
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.72,
  },
  titleBlock: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  separator: {
    height: spacing.sm,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  currentRow: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  rankBadge: {
    width: 58,
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
  xpBlock: {
    alignItems: 'flex-end',
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});

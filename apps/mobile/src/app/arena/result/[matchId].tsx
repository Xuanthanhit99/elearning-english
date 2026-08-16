import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import {
  useArenaRoomQuery,
  useRetryArenaRoomMutation,
} from '../../../features/arena/hooks/useArenaQuery';
import { arenaKeys } from '../../../features/arena/query-keys';
import { dashboardKeys } from '../../../features/dashboard/query-keys';
import { leaderboardKeys } from '../../../features/leaderboard/query-keys';
import { useAuthStore } from '../../../stores/auth-store';
import { colors, radius, spacing } from '../../../theme';

export default function ArenaResultScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const userId = useAuthStore((state) => state.user?.id);
  const roomQuery = useArenaRoomQuery(matchId);
  const retryMutation = useRetryArenaRoomMutation(matchId ?? '');
  const room = roomQuery.data;
  const match = room?.activeMatch ?? room?.matches?.[0] ?? null;
  const result = match?.result;
  const winnerUserId = result?.winnerUserId ?? result?.winnerId;
  const winner = room?.participants.find(
    (participant) => participant.userId === winnerUserId || participant.id === winnerUserId,
  );
  const myParticipant = room?.participants.find((participant) => participant.userId === userId);

  useEffect(() => {
    if (room?.status !== 'FINISHED') return;
    void queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.home() });
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.leaderboardMe() });
    void queryClient.invalidateQueries({ queryKey: arenaKeys.lobby() });
    void queryClient.invalidateQueries({ queryKey: arenaKeys.season() });
  }, [queryClient, room?.status]);

  const retry = async () => {
    if (!matchId) return;
    const nextRoom = await retryMutation.mutateAsync();
    router.replace({ pathname: '/arena/match/[matchId]', params: { matchId: nextRoom.id } });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={roomQuery.isRefetching}
            onRefresh={() => void roomQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AppCard style={styles.heroCard}>
          <Ionicons name="trophy-outline" size={38} color={colors.gold} />
          <AppText variant="caption" color={colors.primary}>
            Arena result
          </AppText>
          <AppText variant="title">
            {winner ? `${displayName(winner)} wins` : room?.status === 'FINISHED' ? 'Match finished' : 'Result pending'}
          </AppText>
          <AppText color={colors.textMuted}>
            {result?.reason ?? result?.status ?? 'Final outcome is read from the server.'}
          </AppText>
        </AppCard>

        <AppCard style={styles.scoreCard}>
          <AppText variant="heading">Scoreboard</AppText>
          {room?.participants.map((participant) => (
            <View
              key={participant.id}
              style={[
                styles.scoreRow,
                participant.userId === userId ? styles.myScoreRow : null,
                participant.userId === winnerUserId || participant.id === winnerUserId
                  ? styles.winnerRow
                  : null,
              ]}
            >
              <View style={styles.flex}>
                <AppText variant="small">{displayName(participant)}</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {participant.correct ?? 0} correct | {participant.wrong ?? 0} wrong
                </AppText>
              </View>
              <AppText variant="heading">{participant.score ?? 0}</AppText>
            </View>
          ))}
        </AppCard>

        <AppCard style={styles.progressCard}>
          <AppText variant="heading">Your progression</AppText>
          <ProgressLine label="Score" value={String(myParticipant?.score ?? 0)} />
          <ProgressLine label="Correct" value={String(myParticipant?.correct ?? 0)} />
          <ProgressLine label="Wrong" value={String(myParticipant?.wrong ?? 0)} />
          {match?.progression ? (
            <AppText color={colors.textMuted}>Progression data received from server.</AppText>
          ) : null}
        </AppCard>

        <View style={styles.actions}>
          <AppButton disabled={retryMutation.isPending || !matchId} onPress={() => void retry()}>
            Retry
          </AppButton>
          <AppButton onPress={() => router.replace('/arena')} style={styles.secondaryButton}>
            Arena lobby
          </AppButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ParticipantLike = {
  userId: string;
  user?: {
    fullname?: string | null;
    username?: string | null;
  } | null;
};

function displayName(participant: ParticipantLike) {
  return participant.user?.fullname ?? participant.user?.username ?? 'Player';
}

function ProgressLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.progressLine}>
      <AppText color={colors.textMuted}>{label}</AppText>
      <AppText variant="heading">{value}</AppText>
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
  heroCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreCard: {
    gap: spacing.md,
  },
  scoreRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  myScoreRow: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  winnerRow: {
    backgroundColor: '#fff8e8',
  },
  flex: {
    flex: 1,
    gap: spacing.xs,
  },
  progressCard: {
    gap: spacing.md,
  },
  progressLine: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  secondaryButton: {
    backgroundColor: colors.textSecondary,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import {
  useArenaLobbyQuery,
  useArenaSeasonQuery,
  useJoinArenaQueueMutation,
  useJoinArenaRoomMutation,
  useLeaveArenaQueueMutation,
} from '../../features/arena/hooks/useArenaQuery';
import type { ArenaQueueInput, ArenaRoom, ArenaTeamFormat } from '../../features/arena/types/arena';
import { colors, radius, spacing } from '../../theme';

const TEAM_FORMATS: { key: ArenaTeamFormat; label: string }[] = [
  { key: 'SOLO_1V1', label: '1v1' },
  { key: 'TEAM_2V2', label: '2v2' },
  { key: 'TEAM_3V3', label: '3v3' },
];

const DEFAULT_QUEUE: ArenaQueueInput = {
  mode: 'RANKED',
  teamFormat: 'SOLO_1V1',
  skill: 'Mixed',
  difficulty: 'Mixed',
  topic: 'Conversation',
};

export default function ArenaScreen() {
  const router = useRouter();
  const lobby = useArenaLobbyQuery();
  const season = useArenaSeasonQuery();
  const joinQueue = useJoinArenaQueueMutation();
  const leaveQueue = useLeaveArenaQueueMutation();
  const joinRoom = useJoinArenaRoomMutation();
  const [queueInput, setQueueInput] = useState<ArenaQueueInput>(DEFAULT_QUEUE);
  const [queued, setQueued] = useState(false);

  const refreshing = lobby.isRefetching || season.isRefetching;
  const activeRoom = lobby.data?.myActiveRoom;

  const refresh = async () => {
    await Promise.all([lobby.refetch(), season.refetch()]);
  };

  const openRoom = (roomId: string) => {
    router.push({ pathname: '/arena/match/[matchId]', params: { matchId: roomId } } as Href);
  };

  const startQueue = async () => {
    try {
      const result = await joinQueue.mutateAsync(queueInput);
      const room = result.room ?? result.match;
      const roomId = room?.id ?? result.roomId;
      if (roomId) {
        setQueued(false);
        openRoom(roomId);
        return;
      }
      setQueued(Boolean(result.queued ?? true));
    } catch (error) {
      Alert.alert('Arena', error instanceof Error ? error.message : 'Could not join queue.');
    }
  };

  const cancelQueue = async () => {
    try {
      await leaveQueue.mutateAsync();
      setQueued(false);
    } catch (error) {
      Alert.alert('Arena', error instanceof Error ? error.message : 'Could not leave queue.');
    }
  };

  const joinPublicRoom = async (roomId: string) => {
    try {
      const room = await joinRoom.mutateAsync(roomId);
      openRoom(room.id);
    } catch (error) {
      Alert.alert('Arena', error instanceof Error ? error.message : 'Could not join room.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
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
            <AppText variant="title">Arena</AppText>
          </View>
        </View>

        <AppCard style={styles.profileCard}>
          <View>
            <AppText variant="caption" color={colors.textMuted}>
              Ranked season
            </AppText>
            <AppText variant="heading">{season.data?.name ?? 'Current season'}</AppText>
            <AppText color={colors.textMuted}>
              {season.data?.status ?? 'Season status from server'}
            </AppText>
          </View>
          <View style={styles.statGrid}>
            <Stat label="MMR" value={String(lobby.data?.profile?.mmr ?? '-')} />
            <Stat label="Tier" value={lobby.data?.profile?.tier ?? '-'} />
            <Stat label="Win rate" value={formatPercent(lobby.data?.profile?.winRate)} />
            <Stat label="Placement" value={lobby.data?.profile?.placementStatus ?? '-'} />
          </View>
        </AppCard>

        {activeRoom ? (
          <AppCard style={styles.activeRoomCard}>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <AppText variant="heading">Active match</AppText>
                <AppText color={colors.textMuted}>{activeRoom.name}</AppText>
              </View>
              <Ionicons name="flash-outline" size={24} color={colors.gold} />
            </View>
            <AppButton onPress={() => openRoom(activeRoom.id)}>Return to match</AppButton>
          </AppCard>
        ) : null}

        <AppCard style={styles.queueCard}>
          <View style={styles.cardHeader}>
            <View style={styles.flex}>
              <AppText variant="heading">Ranked matchmaking</AppText>
              <AppText color={colors.textMuted}>
                Server handles matching, scoring, and rating.
              </AppText>
            </View>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.optionRow}>
            {TEAM_FORMATS.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                onPress={() => setQueueInput((old) => ({ ...old, teamFormat: item.key }))}
                style={[styles.option, queueInput.teamFormat === item.key ? styles.activeOption : null]}
              >
                <AppText
                  variant="small"
                  color={queueInput.teamFormat === item.key ? colors.white : colors.textSecondary}
                >
                  {item.label}
                </AppText>
              </Pressable>
            ))}
          </View>
          {queued ? (
            <AppButton disabled={leaveQueue.isPending} onPress={() => void cancelQueue()}>
              Cancel queue
            </AppButton>
          ) : (
            <AppButton disabled={joinQueue.isPending} onPress={() => void startQueue()}>
              {joinQueue.isPending ? 'Joining...' : 'Find match'}
            </AppButton>
          )}
        </AppCard>

        <View style={styles.section}>
          <AppText variant="heading">Public rooms</AppText>
          {lobby.data?.rooms?.length ? (
            lobby.data.rooms.map((room) => (
              <RoomCard key={room.id} room={room} onJoin={() => void joinPublicRoom(room.id)} />
            ))
          ) : (
            <AppCard style={styles.emptyCard}>
              <Ionicons name="people-outline" size={30} color={colors.primary} />
              <AppText variant="heading">
                {lobby.isLoading ? 'Loading rooms...' : 'No public rooms waiting'}
              </AppText>
              <AppText color={colors.textMuted}>
                Matchmaking is the fastest way into Arena right now.
              </AppText>
            </AppCard>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoomCard({ room, onJoin }: { room: ArenaRoom; onJoin: () => void }) {
  return (
    <AppCard style={styles.roomCard}>
      <View style={styles.flex}>
        <AppText variant="heading">{room.name}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {room.status} | {room.teamFormat ?? room.gameMode ?? 'Arena'} | {room.participants.length}/{room.maxPlayers ?? '-'}
        </AppText>
      </View>
      <AppButton onPress={onJoin} style={styles.smallButton}>
        Join
      </AppButton>
    </AppCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

function formatPercent(value?: number) {
  if (typeof value !== 'number') return '-';
  return `${Math.round(value * 100)}%`;
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
  profileCard: {
    gap: spacing.lg,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    minWidth: '47%',
    minHeight: 78,
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  activeRoomCard: {
    gap: spacing.md,
  },
  queueCard: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
    gap: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  section: {
    gap: spacing.md,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  smallButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});

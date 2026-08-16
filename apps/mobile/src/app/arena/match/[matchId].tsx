import Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useMemo, useState } from 'react';
import { Alert, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import {
  useArenaRoomQuery,
  useLeaveArenaRoomMutation,
  useSetArenaReadyMutation,
  useSubmitArenaAnswerMutation,
} from '../../../features/arena/hooks/useArenaQuery';
import { useArenaRoomRealtime } from '../../../features/arena/hooks/useArenaRealtime';
import type { ArenaAnswer, ArenaQuestion, ArenaRoomParticipant } from '../../../features/arena/types/arena';
import { useAuthStore } from '../../../stores/auth-store';
import { colors, radius, spacing } from '../../../theme';

export default function ArenaMatchScreen() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const userId = useAuthStore((state) => state.user?.id);
  const roomQuery = useArenaRoomQuery(matchId);
  const room = roomQuery.data;
  const readyMutation = useSetArenaReadyMutation(matchId ?? '');
  const leaveMutation = useLeaveArenaRoomMutation(matchId ?? '');
  const answerMutation = useSubmitArenaAnswerMutation(matchId ?? '');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useArenaRoomRealtime(matchId);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && matchId) {
        void roomQuery.refetch();
      }
    });

    return () => subscription.remove();
  }, [matchId, roomQuery]);

  const myParticipant = useMemo(
    () => room?.participants.find((participant) => participant.userId === userId),
    [room?.participants, userId],
  );
  const match = room?.activeMatch ?? room?.matches?.[0] ?? null;
  const currentQuestion = useMemo(
    () => selectCurrentQuestion(match?.questions ?? [], match?.answers ?? [], userId, match?.activeQuestionOrder),
    [match?.activeQuestionOrder, match?.answers, match?.questions, userId],
  );
  const myAnswer = useMemo(
    () =>
      currentQuestion
        ? match?.answers?.find(
            (answer) => answer.questionId === currentQuestion.id && answer.userId === userId,
          )
        : undefined,
    [currentQuestion, match?.answers, userId],
  );
  const canAnswer = room?.status === 'PLAYING' && currentQuestion && !myAnswer;

  const submitAnswer = async (answer: string) => {
    if (!matchId || !currentQuestion || !canAnswer) return;
    setSelectedAnswer(answer);
    try {
      await answerMutation.mutateAsync({ questionId: currentQuestion.id, answer });
    } catch (error) {
      Alert.alert('Arena', error instanceof Error ? error.message : 'Could not submit answer.');
    }
  };

  const leaveRoom = async () => {
    if (!matchId) return;
    try {
      await leaveMutation.mutateAsync();
      router.replace('/arena');
    } catch (error) {
      Alert.alert('Arena', error instanceof Error ? error.message : 'Could not leave room.');
    }
  };

  const openResult = () => {
    if (!matchId) return;
    router.push({ pathname: '/arena/result/[matchId]', params: { matchId } } as Href);
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
              Arena match
            </AppText>
            <AppText variant="title">{room?.name ?? 'Loading...'}</AppText>
          </View>
        </View>

        <AppCard style={styles.statusCard}>
          <View style={styles.cardHeader}>
            <View>
              <AppText variant="caption" color={colors.textMuted}>
                Status
              </AppText>
              <AppText variant="heading">{room?.status ?? 'Loading'}</AppText>
            </View>
            <View style={styles.rightText}>
              <AppText variant="caption" color={colors.textMuted}>
                Players
              </AppText>
              <AppText variant="heading">
                {room?.participants.length ?? 0}/{room?.maxPlayers ?? '-'}
              </AppText>
            </View>
          </View>
          {room?.status === 'WAITING' || room?.status === 'PREPARING' ? (
            <AppButton
              disabled={readyMutation.isPending || !matchId}
              onPress={() => void readyMutation.mutateAsync(!myParticipant?.ready)}
            >
              {myParticipant?.ready ? 'Not ready' : 'Ready'}
            </AppButton>
          ) : null}
          {room?.status === 'FINISHED' ? <AppButton onPress={openResult}>View result</AppButton> : null}
        </AppCard>

        <AppCard style={styles.participantsCard}>
          <AppText variant="heading">Players</AppText>
          {room?.participants.map((participant) => (
            <ParticipantRow key={participant.id} participant={participant} isMe={participant.userId === userId} />
          ))}
        </AppCard>

        {currentQuestion ? (
          <AppCard style={styles.questionCard}>
            <View style={styles.cardHeader}>
              <AppText variant="caption" color={colors.primary}>
                Question {currentQuestion.order ?? ''}
              </AppText>
              {match?.questionDeadlineAt ? (
                <AppText variant="caption" color={colors.textMuted}>
                  Ends {formatTime(match.questionDeadlineAt)}
                </AppText>
              ) : null}
            </View>
            <AppText variant="heading">
              {currentQuestion.prompt ?? currentQuestion.question ?? 'Question'}
            </AppText>
            <View style={styles.answers}>
              {(currentQuestion.options?.length ? currentQuestion.options : ['A', 'B', 'C', 'D']).map((option) => {
                const locked = !canAnswer || answerMutation.isPending;
                const selected = selectedAnswer === option || myAnswer?.answer === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    disabled={locked}
                    onPress={() => void submitAnswer(option)}
                    style={[
                      styles.answerButton,
                      selected ? styles.selectedAnswer : null,
                      locked ? styles.lockedAnswer : null,
                    ]}
                  >
                    <AppText variant="small" color={selected ? colors.white : colors.text}>
                      {option}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {myAnswer ? (
              <View style={styles.feedback}>
                <AppText variant="heading" color={isCorrect(myAnswer) ? colors.success : colors.danger}>
                  {isCorrect(myAnswer) ? 'Correct' : 'Submitted'}
                </AppText>
                {currentQuestion.answer ? (
                  <AppText color={colors.textMuted}>Server answer: {currentQuestion.answer}</AppText>
                ) : null}
                {currentQuestion.explanation ? (
                  <AppText color={colors.textMuted}>{currentQuestion.explanation}</AppText>
                ) : null}
              </View>
            ) : null}
          </AppCard>
        ) : (
          <AppCard style={styles.emptyCard}>
            <Ionicons name="hourglass-outline" size={30} color={colors.primary} />
            <AppText variant="heading">Waiting for server question</AppText>
            <AppText color={colors.textMuted}>
              The match snapshot will update when Arena starts or advances.
            </AppText>
          </AppCard>
        )}

        <AppButton disabled={leaveMutation.isPending || !matchId} onPress={() => void leaveRoom()}>
          Leave room
        </AppButton>
      </ScrollView>
    </SafeAreaView>
  );
}

function ParticipantRow({
  participant,
  isMe,
}: {
  participant: ArenaRoomParticipant;
  isMe: boolean;
}) {
  const name = participant.user?.fullname ?? participant.user?.username ?? (isMe ? 'You' : 'Player');
  return (
    <View style={styles.participantRow}>
      <View style={styles.flex}>
        <AppText variant="small">{name}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {participant.ready ? 'Ready' : 'Not ready'}
        </AppText>
      </View>
      <AppText variant="heading">{participant.score ?? 0}</AppText>
    </View>
  );
}

function selectCurrentQuestion(
  questions: ArenaQuestion[],
  answers: ArenaAnswer[],
  userId?: string,
  activeOrder?: number | null,
) {
  const sorted = [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (activeOrder) {
    return sorted.find((question) => question.order === activeOrder) ?? sorted[0];
  }
  const answered = new Set(
    answers.filter((answer) => answer.userId === userId).map((answer) => answer.questionId),
  );
  return sorted.find((question) => !answered.has(question.id)) ?? sorted[0];
}

function isCorrect(answer: ArenaAnswer) {
  return Boolean(answer.isCorrect ?? answer.correct);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  statusCard: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rightText: {
    alignItems: 'flex-end',
  },
  participantsCard: {
    gap: spacing.md,
  },
  participantRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  flex: {
    flex: 1,
    gap: spacing.xs,
  },
  questionCard: {
    gap: spacing.md,
  },
  answers: {
    gap: spacing.sm,
  },
  answerButton: {
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  selectedAnswer: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  lockedAnswer: {
    opacity: 0.72,
  },
  feedback: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});

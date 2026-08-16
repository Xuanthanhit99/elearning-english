import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  ListeningAudioPlayer,
  ListeningQuestionRenderer,
  ListeningSkeleton,
  ListeningStateCard,
  ListeningTranscript,
} from '../../../features/listening/components/ListeningComponents';
import { useListeningAudio } from '../../../features/listening/hooks/useListeningAudio';
import {
  useFinishListeningSessionMutation,
  useListeningPracticeQuery,
  useSkipListeningQuestionMutation,
  useSubmitListeningAnswerMutation,
} from '../../../features/listening/hooks/useListeningQueries';
import type { ListeningOptionLabel, ListeningPractice } from '../../../features/listening/types/listening';
import { getFirstIncompleteQuestionIndex, getQuestionTimeSpent } from '../../../features/listening/utils/listening-utils';
import { colors, spacing } from '../../../theme';

export default function ListeningQuestionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sessionId?: string;
    level?: string;
    topic?: string;
    limit?: string;
  }>();
  const sessionId = params.sessionId;
  const practiceInput = useMemo(
    () => ({
      level: params.level,
      topic: params.topic,
      limit: params.limit ? Number(params.limit) : undefined,
    }),
    [params.level, params.limit, params.topic],
  );
  const practiceQuery = useListeningPracticeQuery(sessionId, practiceInput);
  const submitAnswer = useSubmitListeningAnswerMutation(sessionId);
  const skipQuestion = useSkipListeningQuestionMutation(sessionId);
  const finishSession = useFinishListeningSessionMutation(sessionId);
  const [practiceState, setPracticeState] = useState<ListeningPractice | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<ListeningOptionLabel | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!practiceQuery.data) return;
    setPracticeState(practiceQuery.data);
    setActiveIndex(getFirstIncompleteQuestionIndex(practiceQuery.data.questions));
  }, [practiceQuery.data]);

  const practice = practiceState ?? practiceQuery.data;
  const currentQuestion = practice?.questions[activeIndex];
  const audio = useListeningAudio(currentQuestion?.audioUrl);

  useEffect(() => {
    setSelectedAnswer(currentQuestion?.selectedAnswer ?? null);
    setQuestionStartedAt(Date.now());
    setError(null);
  }, [currentQuestion?.id, currentQuestion?.selectedAnswer]);

  function patchQuestion(questionId: string, patch: Partial<NonNullable<typeof currentQuestion>>, progress?: ListeningPractice['progress']) {
    setPracticeState((current) => {
      if (!current) return current;
      return {
        ...current,
        progress: progress ?? current.progress,
        questions: current.questions.map((question) => (question.id === questionId ? { ...question, ...patch } : question)),
      };
    });
  }

  async function submitCurrent() {
    if (!practice || !currentQuestion || !selectedAnswer || submitAnswer.isPending || skipQuestion.isPending) return;
    setError(null);

    try {
      const response = await submitAnswer.mutateAsync({
        questionId: currentQuestion.id,
        selectedAnswer,
        timeSpent: getQuestionTimeSpent(questionStartedAt),
        listenedCount: audio.playCount,
      });

      patchQuestion(
        currentQuestion.id,
        {
          answered: true,
          selectedAnswer,
          isCorrect: response.isCorrect,
          correctAnswer: response.correctAnswer,
          explanation: response.explanation,
          transcript: response.transcript ?? currentQuestion.transcript,
        },
        response.progress,
      );
    } catch {
      setError('Chua luu duoc dap an. Lua chon van duoc giu lai de thu lai.');
    }
  }

  async function skipCurrent() {
    if (!practice || !currentQuestion || currentQuestion.answered || skipQuestion.isPending || submitAnswer.isPending) return;
    setError(null);

    try {
      const response = await skipQuestion.mutateAsync({
        questionId: currentQuestion.id,
        timeSpent: getQuestionTimeSpent(questionStartedAt),
        listenedCount: audio.playCount,
      });
      patchQuestion(
        currentQuestion.id,
        {
          answered: true,
          isSkipped: true,
          selectedAnswer: null,
        },
        response.progress,
      );
    } catch {
      setError('Chua bo qua duoc cau hoi. Hay thu lai.');
    }
  }

  async function nextOrFinish() {
    if (!practice || !currentQuestion || finishSession.isPending) return;

    if (!currentQuestion.answered) {
      await submitCurrent();
      return;
    }

    if (activeIndex + 1 < practice.questions.length) {
      setActiveIndex((index) => index + 1);
      return;
    }

    try {
      const response = await finishSession.mutateAsync();
      router.replace({
        pathname: '/learning/listening/result',
        params: { sessionId: response.sessionId },
      });
    } catch {
      setError('Chua ket thuc duoc bai Listening. Ket qua chi duoc xac nhan sau khi backend chap nhan.');
    }
  }

  if (practiceQuery.isLoading && !practice) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ListeningSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (practiceQuery.error || !practice || !currentQuestion || !sessionId) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ListeningStateCard
            title="Khong the tai cau hoi"
            body="Phien Listening chua san sang hoac da hoan thanh."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/listening')}>Ve Listening</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const busy = submitAnswer.isPending || skipQuestion.isPending || finishSession.isPending;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={colors.primary}>
              {activeIndex + 1}/{practice.questions.length}
            </AppText>
            <AppText variant="heading">{practice.topic}</AppText>
          </View>
          <AppText variant="heading" color={colors.primary}>
            {practice.progress.percent}%
          </AppText>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${practice.progress.percent}%` }]} />
        </View>

        <ListeningAudioPlayer audio={audio} disabled={busy} />

        <ListeningQuestionRenderer
          disabled={busy}
          onSelect={setSelectedAnswer}
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
        />

        {currentQuestion.answered ? (
          <ListeningTranscript transcript={currentQuestion.transcript} unlocked={Boolean(currentQuestion.transcript)} />
        ) : (
          <ListeningTranscript transcript={null} unlocked={false} />
        )}

        {error ? <ListeningStateCard title="Chua dong bo duoc" body={error} icon="alert-circle-outline" /> : null}

        {busy ? (
          <View style={styles.saving}>
            <ActivityIndicator color={colors.primary} />
            <AppText color={colors.textMuted}>{finishSession.isPending ? 'Dang ket thuc...' : 'Dang luu...'}</AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <AppButton disabled={busy || currentQuestion.answered} onPress={() => void skipCurrent()}>
            Bo qua
          </AppButton>
          <AppButton disabled={busy || (!selectedAnswer && !currentQuestion.answered)} onPress={() => void nextOrFinish()}>
            {currentQuestion.answered
              ? activeIndex + 1 < practice.questions.length
                ? 'Cau tiep theo'
                : 'Hoan thanh'
              : 'Nop dap an'}
          </AppButton>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  saving: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
});

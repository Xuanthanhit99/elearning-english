import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  ReadingQuestionCard,
  ReadingSkeleton,
  ReadingStateCard,
} from '../../../features/reading/components/ReadingComponents';
import {
  useAnswerReadingQuestionMutation,
  useReadingLessonQuery,
  useSubmitReadingSessionMutation,
} from '../../../features/reading/hooks/useReadingQueries';
import { countAnswers } from '../../../features/reading/utils/reading-utils';
import { colors, spacing } from '../../../theme';

export default function ReadingQuestionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ readingId?: string; sessionId?: string }>();
  const readingId = params.readingId;
  const sessionId = params.sessionId;
  const lessonQuery = useReadingLessonQuery(readingId);
  const answerQuestion = useAnswerReadingQuestionMutation(sessionId, readingId);
  const submitSession = useSubmitReadingSessionMutation(sessionId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const lesson = lessonQuery.data;
  const questions = lesson?.questions ?? [];
  const currentQuestion = questions[activeIndex];
  const mergedAnswers = useMemo(() => {
    const existing = Object.fromEntries(
      questions.filter((question) => question.selected).map((question) => [question.id, question.selected as string]),
    );
    return { ...existing, ...answers };
  }, [answers, questions]);
  const progressPercent = questions.length ? Math.round(((activeIndex + 1) / questions.length) * 100) : 0;
  const allAnswered = questions.length > 0 && countAnswers(mergedAnswers) === questions.length;

  async function selectAnswer(answer: string) {
    if (!currentQuestion || !sessionId || answerQuestion.isPending || submitSession.isPending) return;

    setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }));
    setSaveError(null);

    try {
      await answerQuestion.mutateAsync({
        questionId: currentQuestion.id,
        selected: answer,
      });
    } catch {
      setSaveError('Cau tra loi van con tren man hinh, nhung chua luu duoc. Hay chon lai hoac thu lai.');
    }
  }

  async function continueOrSubmit() {
    if (!sessionId || submitSession.isPending || answerQuestion.isPending) return;
    setSaveError(null);

    if (activeIndex + 1 < questions.length) {
      setActiveIndex((index) => index + 1);
      return;
    }

    if (!allAnswered) return;

    try {
      const result = await submitSession.mutateAsync();
      router.replace({
        pathname: '/learning/reading/result',
        params: { sessionId: result.sessionId },
      });
    } catch {
      setSaveError('Chua nop duoc bai Reading. Cau tra loi da chon van duoc giu lai de thu lai.');
    }
  }

  if (lessonQuery.isLoading && !lesson) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ReadingSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (lessonQuery.error || !lesson || !currentQuestion || !sessionId) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ReadingStateCard
            title="Khong the tai cau hoi"
            body="Phien Reading hoac cau hoi chua san sang. Hay quay lai bai doc."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/reading')}>Ve Reading</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const selected = mergedAnswers[currentQuestion.id];
  const isLast = activeIndex + 1 >= questions.length;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={colors.primary}>
              {activeIndex + 1}/{questions.length}
            </AppText>
            <AppText variant="heading">{lesson.article.title}</AppText>
          </View>
          <AppText variant="heading" color={colors.primary}>
            {progressPercent}%
          </AppText>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <ReadingQuestionCard
          answer={selected}
          disabled={answerQuestion.isPending || submitSession.isPending}
          onSelect={(answer) => void selectAnswer(answer)}
          question={currentQuestion}
          total={questions.length}
        />

        {saveError ? <ReadingStateCard title="Chua luu duoc" body={saveError} icon="alert-circle-outline" /> : null}

        {answerQuestion.isPending || submitSession.isPending ? (
          <View style={styles.saving}>
            <ActivityIndicator color={colors.primary} />
            <AppText color={colors.textMuted}>{submitSession.isPending ? 'Dang nop bai...' : 'Dang luu cau tra loi...'}</AppText>
          </View>
        ) : null}

        <AppButton
          disabled={!selected || answerQuestion.isPending || submitSession.isPending || (isLast && !allAnswered)}
          onPress={() => void continueOrSubmit()}
        >
          {isLast ? 'Nop bai Reading' : 'Tiep tuc'}
        </AppButton>
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
});

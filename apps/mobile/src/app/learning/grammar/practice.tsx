import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  GrammarSkeleton,
  GrammarStateCard,
  MultipleChoiceQuestion,
} from '../../../features/grammar/components/GrammarComponents';
import {
  useGrammarLessonQuery,
  useSubmitGrammarLessonMutation,
} from '../../../features/grammar/hooks/useGrammarQueries';
import type { SubmitGrammarResult } from '../../../features/grammar/types/grammar';
import { answeredCount } from '../../../features/grammar/utils/grammar-utils';
import { colors, spacing } from '../../../theme';

export default function GrammarPracticeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lessonId?: string }>();
  const lessonId = params.lessonId;
  const lessonQuery = useGrammarLessonQuery(lessonId);
  const submitLesson = useSubmitGrammarLessonMutation(lessonId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitGrammarResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lesson = lessonQuery.data;
  const questions = lesson?.questions ?? [];
  const currentQuestion = questions[activeIndex];
  const resultForCurrent = result?.results.find((item) => item.questionId === currentQuestion?.id);
  const progressPercent = questions.length ? Math.round(((activeIndex + 1) / questions.length) * 100) : 0;
  const canSubmit = useMemo(
    () => questions.length > 0 && answeredCount(answers) === questions.length,
    [answers, questions.length],
  );

  function selectAnswer(answer: string) {
    if (!currentQuestion || result || submitLesson.isPending) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }));
    setSubmitError(null);
  }

  async function submitAllAnswers() {
    if (!lessonId || !lesson || submitLesson.isPending || !canSubmit) return;
    setSubmitError(null);

    try {
      const response = await submitLesson.mutateAsync(
        lesson.questions.map((question) => ({
          questionId: question.id,
          answer: answers[question.id],
        })),
      );
      setResult(response);
      setActiveIndex(0);
    } catch {
      setSubmitError('Chưa thể lưu câu trả lời. Hãy thử lại.');
    }
  }

  function continueAfterFeedback() {
    if (!result) {
      setActiveIndex((index) => Math.min(index + 1, questions.length - 1));
      return;
    }

    if (activeIndex + 1 < questions.length) {
      setActiveIndex((index) => index + 1);
      return;
    }

    router.replace({
      pathname: '/learning/grammar/result',
      params: {
        score: String(result.score),
        correct: String(result.correct),
        total: String(result.total),
        alreadyCompleted: String(result.alreadyCompleted),
      },
    });
  }

  if (lessonQuery.isLoading && !lesson) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <GrammarSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (lessonQuery.error || !lesson || !currentQuestion) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <GrammarStateCard
            title="Không thể tải bài tập"
            body="Bài học này chưa có câu hỏi hoặc chưa tải được từ backend."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/grammar')}>Về Ngữ pháp</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const selected = answers[currentQuestion.id];
  const isLastBeforeSubmit = activeIndex + 1 >= questions.length;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={colors.primary}>
              {activeIndex + 1}/{questions.length}
            </AppText>
            <AppText variant="heading">{lesson.subtitle}</AppText>
          </View>
          <AppText variant="heading" color={colors.primary}>
            {progressPercent}%
          </AppText>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <MultipleChoiceQuestion
          answer={selected}
          disabled={submitLesson.isPending}
          index={activeIndex}
          onSelect={selectAnswer}
          question={currentQuestion}
          result={resultForCurrent}
          total={questions.length}
        />

        {submitError ? <GrammarStateCard title="Chưa lưu được" body={submitError} icon="alert-circle-outline" /> : null}

        {submitLesson.isPending ? (
          <View style={styles.saving}>
            <ActivityIndicator color={colors.primary} />
            <AppText color={colors.textMuted}>Đang chấm bài...</AppText>
          </View>
        ) : null}

        {!result ? (
          isLastBeforeSubmit ? (
            <AppButton disabled={!canSubmit || submitLesson.isPending} onPress={() => void submitAllAnswers()}>
              Nộp bài tập
            </AppButton>
          ) : (
            <AppButton disabled={!selected} onPress={continueAfterFeedback}>
              Tiếp tục
            </AppButton>
          )
        ) : (
          <AppButton onPress={continueAfterFeedback}>
            {activeIndex + 1 < questions.length ? 'Xem câu tiếp theo' : 'Xem kết quả'}
          </AppButton>
        )}
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

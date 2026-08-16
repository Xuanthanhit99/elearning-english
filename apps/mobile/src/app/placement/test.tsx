import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppText } from '../../components/ui/AppText';
import {
  ListeningPlacementQuestion,
  ObjectivePlacementQuestion,
  PlacementProgressHeader,
  PlacementSkeleton,
  PlacementStateCard,
  SpeakingPlacementQuestion,
  WritingPlacementQuestion,
} from '../../features/placement/components/PlacementComponents';
import {
  useAnswerPlacementMutation,
  usePlacementSessionQuery,
  useSkipPlacementQuestionMutation,
  useSkipPlacementSpeakingMutation,
  useSubmitPlacementSpeakingMutation,
  useSubmitPlacementWritingMutation,
} from '../../features/placement/hooks/usePlacementQueries';
import { countPlacementWords, isObjectivePlacementQuestion } from '../../features/placement/utils/placement-utils';
import { colors, spacing } from '../../theme';

export default function PlacementTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const sessionQuery = usePlacementSessionQuery(sessionId);
  const answerMutation = useAnswerPlacementMutation(sessionId);
  const skipMutation = useSkipPlacementQuestionMutation(sessionId);
  const writingMutation = useSubmitPlacementWritingMutation(sessionId);
  const speakingMutation = useSubmitPlacementSpeakingMutation(sessionId);
  const skipSpeakingMutation = useSkipPlacementSpeakingMutation(sessionId);
  const data = sessionQuery.data;
  const question = data?.currentQuestion ?? null;
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [writingContent, setWritingContent] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startedAtRef = useRef(Date.now());

  const pending =
    answerMutation.isPending ||
    skipMutation.isPending ||
    writingMutation.isPending ||
    speakingMutation.isPending ||
    skipSpeakingMutation.isPending;

  useEffect(() => {
    setSelectedAnswer(question?.selectedAnswer ?? null);
    setWritingContent(question?.selectedAnswer ?? '');
    setSubmitError(null);
    startedAtRef.current = Date.now();
  }, [question?.id, question?.selectedAnswer]);

  useEffect(() => {
    if (!data?.session.isCompleted || !sessionId) return;
    router.replace({ pathname: '/placement/processing', params: { testId: sessionId } });
  }, [data?.session.isCompleted, router, sessionId]);

  const spentSeconds = useMemo(() => Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)), [question?.id, pending]);

  async function refreshAfterSpecialSubmit() {
    await sessionQuery.refetch();
  }

  async function submitObjective() {
    if (!question || !selectedAnswer) {
      setSubmitError('Hay chon cau tra loi truoc khi tiep tuc.');
      return;
    }
    setSubmitError(null);
    await answerMutation.mutateAsync({ questionId: question.id, answer: selectedAnswer, spentSeconds });
  }

  async function skipObjective() {
    if (!question) return;
    setSubmitError(null);
    await skipMutation.mutateAsync({ questionId: question.id, spentSeconds });
  }

  async function submitWriting() {
    if (!question) return;
    if (countPlacementWords(writingContent) < 20) {
      setSubmitError('Bai viet can it nhat 20 tu.');
      return;
    }
    setSubmitError(null);
    await writingMutation.mutateAsync({ questionId: question.id, content: writingContent, spentSeconds });
    await refreshAfterSpecialSubmit();
  }

  async function submitSpeaking(uri: string) {
    if (!question) return;
    setSubmitError(null);
    await speakingMutation.mutateAsync({ questionId: question.id, audioUri: uri, spentSeconds });
    await refreshAfterSpecialSubmit();
  }

  async function skipSpeaking(action: 'SKIPPED' | 'DEFERRED') {
    if (!question) return;
    setSubmitError(null);
    await skipSpeakingMutation.mutateAsync({ questionId: question.id, action, spentSeconds });
    await refreshAfterSpecialSubmit();
  }

  if (sessionQuery.isLoading && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PlacementSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (sessionQuery.error || !data || !sessionId) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PlacementStateCard
            title="Khong the tai cau hoi"
            body="Phien Placement khong san sang hoac khong thuoc tai khoan nay."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/placement')}>Ve Placement</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PlacementStateCard
            title="Da hoan thanh cau hoi"
            body="Backend dang chuan bi buoc xu ly ket qua."
            icon="checkmark-circle-outline"
            action={<AppButton onPress={() => router.replace({ pathname: '/placement/processing', params: { testId: sessionId } })}>Xu ly ket qua</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PlacementProgressHeader question={question} />

        {question.type === 'LISTENING' ? (
          <ListeningPlacementQuestion disabled={pending} onChange={setSelectedAnswer} question={question} selected={selectedAnswer} />
        ) : isObjectivePlacementQuestion(question.type) ? (
          <ObjectivePlacementQuestion disabled={pending} onChange={setSelectedAnswer} question={question} selected={selectedAnswer} />
        ) : question.type === 'WRITING' ? (
          <WritingPlacementQuestion content={writingContent} disabled={pending} onChange={setWritingContent} question={question} />
        ) : question.type === 'SPEAKING' ? (
          <SpeakingPlacementQuestion
            disabled={pending}
            error={submitError}
            onDefer={() => void skipSpeaking('DEFERRED')}
            onSkip={() => void skipSpeaking('SKIPPED')}
            onSubmit={(uri) => void submitSpeaking(uri)}
            question={question}
          />
        ) : (
          <PlacementStateCard title="Dang cau hoi chua ho tro" body={question.type} icon="alert-circle-outline" />
        )}

        {submitError && question.type !== 'SPEAKING' ? (
          <PlacementStateCard title="Chua luu duoc" body={submitError} icon="alert-circle-outline" />
        ) : null}
        {(answerMutation.error || skipMutation.error || writingMutation.error || speakingMutation.error || skipSpeakingMutation.error) ? (
          <PlacementStateCard
            title="Chua the luu cau tra loi"
            body="Cau hoi van giu nguyen. Hay thu lai khi ket noi on dinh."
            icon="alert-circle-outline"
          />
        ) : null}

        {pending ? (
          <View style={styles.saving}>
            <ActivityIndicator color={colors.primary} />
            <AppText color={colors.textMuted}>Dang luu len backend...</AppText>
          </View>
        ) : null}

        {question.type === 'WRITING' ? (
          <AppButton disabled={pending} onPress={() => void submitWriting()}>
            Gui bai viet
          </AppButton>
        ) : isObjectivePlacementQuestion(question.type) ? (
          <View style={styles.buttonRow}>
            <AppButton disabled={pending || !selectedAnswer} onPress={() => void submitObjective()}>
              Tiep tuc
            </AppButton>
            <AppButton disabled={pending} onPress={() => void skipObjective()}>
              Bo qua
            </AppButton>
          </View>
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
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  saving: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});

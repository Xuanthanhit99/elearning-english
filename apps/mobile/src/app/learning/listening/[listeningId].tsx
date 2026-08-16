import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  ListeningAudioPlayer,
  ListeningSkeleton,
  ListeningStateCard,
  ListeningTranscript,
} from '../../../features/listening/components/ListeningComponents';
import { useListeningAudio } from '../../../features/listening/hooks/useListeningAudio';
import { useListeningPracticeQuery } from '../../../features/listening/hooks/useListeningQueries';
import { getFirstIncompleteQuestionIndex } from '../../../features/listening/utils/listening-utils';
import { colors, spacing } from '../../../theme';

export default function ListeningActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    listeningId?: string;
    level?: string;
    topic?: string;
    limit?: string;
  }>();
  const practiceInput = useMemo(
    () => ({
      level: params.level,
      topic: params.topic,
      limit: params.limit ? Number(params.limit) : undefined,
    }),
    [params.level, params.limit, params.topic],
  );
  const practiceQuery = useListeningPracticeQuery(params.listeningId, practiceInput);
  const practice = practiceQuery.data;
  const firstQuestionIndex = useMemo(() => getFirstIncompleteQuestionIndex(practice?.questions ?? []), [practice?.questions]);
  const firstQuestion = practice?.questions[firstQuestionIndex] ?? practice?.questions[0];
  const audio = useListeningAudio(firstQuestion?.audioUrl);

  function openQuestions() {
    if (!practice) return;
    router.push({
      pathname: '/learning/listening/questions',
      params: {
        sessionId: practice.sessionId,
        level: practice.level,
        topic: practice.topic,
        limit: String(practice.totalQuestions),
      },
    });
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

  if (practiceQuery.error || !practice || !firstQuestion) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ListeningStateCard
            title="Khong the mo bai nghe"
            body="Backend chua tra ve phien Listening hoac audio cho bai nay."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/listening')}>Ve Listening</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={colors.primary}>
              {practice.level} · {practice.topic}
            </AppText>
            <AppText variant="title">Bai Listening</AppText>
          </View>
          <AppText variant="heading" color={colors.primary}>
            {practice.totalQuestions} cau
          </AppText>
        </View>

        <ListeningAudioPlayer audio={audio} />

        {practiceQuery.isFetching ? (
          <View style={styles.saving}>
            <ActivityIndicator color={colors.primary} />
            <AppText color={colors.textMuted}>Dang dong bo phien nghe...</AppText>
          </View>
        ) : null}

        <ListeningStateCard
          title="Nghe ky truoc khi tra loi"
          body="Audio va cau hoi duoc backend tao cho phien nay. Transcript van bi khoa cho den khi ban tra loi hoac bo qua cau nghe."
          icon="ear-outline"
        />

        <ListeningTranscript transcript={firstQuestion.transcript} unlocked={Boolean(firstQuestion.answered && firstQuestion.transcript)} />

        <AppButton disabled={!firstQuestion.audioUrl} onPress={openQuestions}>
          Bat dau cau hoi
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
  saving: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});

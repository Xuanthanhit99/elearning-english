import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  WritingPromptCard,
  WritingSkeleton,
  WritingStateCard,
} from '../../../features/writing/components/WritingComponents';
import {
  useStartWritingLessonMutation,
  useWritingSessionQuery,
} from '../../../features/writing/hooks/useWritingQueries';
import { colors, spacing } from '../../../theme';

export default function WritingTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId?: string }>();
  const taskId = params.taskId;
  const startLesson = useStartWritingLessonMutation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionQuery = useWritingSessionQuery(sessionId);

  useEffect(() => {
    if (!taskId || sessionId || startLesson.isPending) return;

    startLesson
      .mutateAsync(taskId)
      .then((result) => setSessionId(result.sessionId))
      .catch(() => undefined);
  }, [sessionId, startLesson, taskId]);

  const data = sessionQuery.data;

  useEffect(() => {
    if (data?.session.isSubmitted && sessionId) {
      router.replace({
        pathname: '/learning/writing/result',
        params: { sessionId },
      });
    }
  }, [data?.session.isSubmitted, router, sessionId]);

  if ((startLesson.isPending || sessionQuery.isLoading) && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <WritingSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (startLesson.error || sessionQuery.error || !data || !sessionId) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <WritingStateCard
            title="Khong the mo de bai"
            body="Backend chua tra ve phien Writing cho bai nay."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/writing')}>Ve Writing</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WritingPromptCard data={data} />

        {sessionQuery.isFetching ? (
          <View style={styles.saving}>
            <ActivityIndicator color={colors.primary} />
            <AppText color={colors.textMuted}>Dang dong bo de bai...</AppText>
          </View>
        ) : null}

        <WritingStateCard
          title={data.session.content ? 'Ban nhap da san sang' : 'San sang viet'}
          body="Bai viet se duoc luu nhap tren server va luu tam tren thiet bi de tranh mat noi dung."
          icon="shield-checkmark-outline"
        />

        <AppButton
          onPress={() =>
            router.push({
              pathname: '/learning/writing/editor',
              params: { sessionId },
            })
          }
        >
          {data.session.content ? 'Tiep tuc bai viet' : 'Bat dau viet'}
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
  saving: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});

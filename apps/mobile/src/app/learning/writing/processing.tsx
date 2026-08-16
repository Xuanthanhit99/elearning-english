import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import {
  WritingProcessingState,
  WritingSkeleton,
  WritingStateCard,
} from '../../../features/writing/components/WritingComponents';
import {
  useRetryWritingProcessingMutation,
  useWritingStatusQuery,
} from '../../../features/writing/hooks/useWritingQueries';
import { colors, spacing } from '../../../theme';

export default function WritingProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const statusQuery = useWritingStatusQuery(sessionId);
  const retryProcessing = useRetryWritingProcessingMutation(sessionId);
  const status = statusQuery.data;

  useEffect(() => {
    if (status?.status === 'COMPLETED' || status?.resultUrl) {
      router.replace({
        pathname: '/learning/writing/result',
        params: { sessionId },
      });
    }
  }, [router, sessionId, status?.resultUrl, status?.status]);

  if (statusQuery.isLoading && !status) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <WritingSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WritingProcessingState status={status} />

        {statusQuery.error && !status ? (
          <WritingStateCard
            title="Chua tai duoc trang thai"
            body="Backend se tiep tuc cham bai. Ban co the thu tai lai trang thai."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => void statusQuery.refetch()}>Tai lai</AppButton>}
          />
        ) : null}

        {status?.status === 'FAILED' ? (
          <WritingStateCard
            title="Khong the cham bai luc nay"
            body="Chi thu cham lai khi backend bao trang thai retryable."
            icon="alert-circle-outline"
            action={
              status.retryable ? (
                <AppButton disabled={retryProcessing.isPending} onPress={() => void retryProcessing.mutateAsync()}>
                  Thu cham lai
                </AppButton>
              ) : undefined
            }
          />
        ) : null}

        <AppButton onPress={() => router.replace('/learning/writing')}>Ve Writing</AppButton>
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
});

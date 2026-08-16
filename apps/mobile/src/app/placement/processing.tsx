import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import {
  PlacementProcessingCard,
  PlacementSkeleton,
  PlacementStateCard,
} from '../../features/placement/components/PlacementComponents';
import {
  usePlacementProcessingQuery,
  useStartPlacementProcessingMutation,
} from '../../features/placement/hooks/usePlacementQueries';
import { colors, spacing } from '../../theme';

export default function PlacementProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ testId?: string }>();
  const testId = params.testId;
  const startProcessing = useStartPlacementProcessingMutation(testId);
  const processingQuery = usePlacementProcessingQuery(testId);
  const snapshot = processingQuery.data;

  useEffect(() => {
    if (!testId || startProcessing.isPending || snapshot) return;
    void startProcessing.mutateAsync();
  }, [snapshot, startProcessing, testId]);

  useEffect(() => {
    if (snapshot?.status !== 'COMPLETED' || !testId) return;
    router.replace({ pathname: '/placement/result', params: { testId } });
  }, [router, snapshot?.status, testId]);

  if ((processingQuery.isLoading || startProcessing.isPending) && !snapshot) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PlacementSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PlacementProcessingCard snapshot={snapshot} />
        {processingQuery.error && !snapshot ? (
          <PlacementStateCard
            title="Chua tai duoc trang thai"
            body="Backend se tiep tuc xu ly neu job da duoc tao."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => void processingQuery.refetch()}>Tai lai</AppButton>}
          />
        ) : null}
        {snapshot?.status === 'FAILED' ? (
          <PlacementStateCard
            title="Xu ly that bai"
            body={snapshot.errorMessage ?? 'Backend bao xu ly Placement that bai.'}
            icon="alert-circle-outline"
          />
        ) : null}
        <AppButton onPress={() => router.replace('/placement')}>Ve Placement</AppButton>
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

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import {
  PlacementResultCard,
  PlacementSkeleton,
  PlacementSkillBreakdown,
  PlacementStateCard,
} from '../../features/placement/components/PlacementComponents';
import {
  useGeneratePlacementResultMutation,
  usePlacementResultQuery,
} from '../../features/placement/hooks/usePlacementQueries';
import { colors, spacing } from '../../theme';

export default function PlacementResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ testId?: string }>();
  const testId = params.testId;
  const resultQuery = usePlacementResultQuery(testId);
  const generateResult = useGeneratePlacementResultMutation(testId);
  const result = resultQuery.data;

  useEffect(() => {
    if (!testId || result || generateResult.isPending || resultQuery.isFetching) return;
    void generateResult.mutateAsync().catch(() => undefined);
  }, [generateResult, result, resultQuery.isFetching, testId]);

  if ((resultQuery.isLoading || generateResult.isPending) && !result) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PlacementSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if ((resultQuery.error || generateResult.error) && !result) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PlacementStateCard
            title="Chua the tai ket qua"
            body="Ket qua chi co sau khi backend hoan thanh xu ly."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/placement')}>Ve Placement</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {result ? (
          <>
            <PlacementResultCard result={result} />
            <PlacementSkillBreakdown result={result} />
            <PlacementStateCard
              title="Lo trinh da san sang"
              body="Mo Learning Path de hoc theo de xuat backend vua tao."
              icon="map-outline"
              action={<AppButton onPress={() => router.replace('/learning/path')}>Xem lo trinh cua toi</AppButton>}
            />
          </>
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
});

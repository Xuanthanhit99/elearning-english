import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import {
  WritingBreakdown,
  WritingCorrections,
  WritingEssayReview,
  WritingFeedback,
  WritingResultSummary,
  WritingSkeleton,
  WritingStateCard,
} from '../../../features/writing/components/WritingComponents';
import { useWritingResultQuery } from '../../../features/writing/hooks/useWritingQueries';
import { colors, spacing } from '../../../theme';

export default function WritingResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const resultQuery = useWritingResultQuery(params.sessionId);
  const result = resultQuery.data;

  if (resultQuery.isLoading && !result) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <WritingSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (resultQuery.error || !result) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <WritingStateCard
            title="Khong the tai ket qua"
            body="Ket qua chi co sau khi backend hoan thanh cham bai."
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
        <WritingResultSummary result={result} />
        <WritingBreakdown result={result} />
        <WritingFeedback result={result} />
        <WritingEssayReview result={result} />
        <WritingCorrections result={result} />
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

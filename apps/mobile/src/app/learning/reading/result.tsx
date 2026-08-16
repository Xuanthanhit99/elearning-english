import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  ReadingResultSummary,
  ReadingReviewQuestion,
  ReadingSkeleton,
  ReadingStateCard,
} from '../../../features/reading/components/ReadingComponents';
import { useReadingResultQuery } from '../../../features/reading/hooks/useReadingQueries';
import { colors, spacing } from '../../../theme';

export default function ReadingResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const resultQuery = useReadingResultQuery(sessionId);
  const result = resultQuery.data;

  if (resultQuery.isLoading && !result) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <ReadingSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (resultQuery.error || !result) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <ReadingStateCard
            title="Khong the tai ket qua"
            body="Backend chua tra ve ket qua cho phien Reading nay."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/reading')}>Ve Reading</AppButton>}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <FlatList
        data={result.questions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View>
              <AppText variant="caption" color={colors.primary}>
                Reading result
              </AppText>
              <AppText variant="title">{result.summary.articleTitle}</AppText>
            </View>
            <ReadingResultSummary result={result} />
            <View style={styles.actions}>
              <AppButton onPress={() => router.replace('/learning/reading')}>Ve Reading</AppButton>
            </View>
            <AppText variant="heading">Xem lai cau hoi</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.questionWrap}>
            <ReadingReviewQuestion question={item} />
          </View>
        )}
      />
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
  headerStack: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
  questionWrap: {
    marginBottom: spacing.md,
  },
});

import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  ListeningResultSummary,
  ListeningReviewQuestion,
  ListeningSkeleton,
  ListeningStateCard,
} from '../../../features/listening/components/ListeningComponents';
import { useListeningResultQuery } from '../../../features/listening/hooks/useListeningQueries';
import { colors, spacing } from '../../../theme';

export default function ListeningResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const resultQuery = useListeningResultQuery(params.sessionId);
  const result = resultQuery.data;

  if (resultQuery.isLoading && !result) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <ListeningSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (resultQuery.error || !result) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <ListeningStateCard
            title="Khong the tai ket qua"
            body="Ket qua Listening chi co sau khi backend xac nhan hoan thanh."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/listening')}>Ve Listening</AppButton>}
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
                Listening result
              </AppText>
              <AppText variant="title">{result.summary.topic ?? 'Listening'}</AppText>
              <AppText color={colors.textMuted}>{result.summary.level}</AppText>
            </View>
            <ListeningResultSummary result={result} />
            {result.feedback.strengths.length || result.feedback.improvements.length ? (
              <ListeningStateCard
                title="Goi y on tap"
                body={[...result.feedback.strengths, ...result.feedback.improvements].join(' ')}
                icon="bulb-outline"
              />
            ) : null}
            <View style={styles.actions}>
              <AppButton onPress={() => router.replace('/learning/listening')}>Ve Listening</AppButton>
            </View>
            <AppText variant="heading">Xem lai cau hoi</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.questionWrap}>
            <ListeningReviewQuestion question={item} />
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

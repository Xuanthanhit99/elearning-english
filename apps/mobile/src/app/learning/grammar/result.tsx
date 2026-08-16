import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GrammarResultSummary } from '../../../features/grammar/components/GrammarComponents';
import { colors, spacing } from '../../../theme';

export default function GrammarResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    score?: string;
    correct?: string;
    total?: string;
    alreadyCompleted?: string;
  }>();

  const score = Number(params.score ?? 0);
  const correct = Number(params.correct ?? 0);
  const total = Number(params.total ?? 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GrammarResultSummary
          result={{
            score: Number.isFinite(score) ? score : 0,
            correct: Number.isFinite(correct) ? correct : 0,
            total: Number.isFinite(total) ? total : 0,
            alreadyCompleted: params.alreadyCompleted === 'true',
          }}
          onLearn={() => router.replace('/(tabs)/learn')}
          onHome={() => router.replace('/(tabs)')}
        />
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
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['4xl'],
  },
});

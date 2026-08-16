import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResultSummary } from '../../../features/vocabulary/components/VocabularyComponents';
import { colors, spacing } from '../../../theme';

export default function VocabularyResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ learned?: string; total?: string }>();
  const learned = Number(params.learned ?? 0);
  const total = Number(params.total ?? 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ResultSummary
          learned={Number.isFinite(learned) ? learned : 0}
          total={Number.isFinite(total) ? total : 0}
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

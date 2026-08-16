import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import {
  LearningPathSkeleton,
  LearningPathStateCard,
} from '../../../features/learning-path/components/LearningPathComponents';
import { useResumeLearningPathLessonQuery } from '../../../features/learning-path/hooks/useLearningPathQueries';
import { colors, spacing } from '../../../theme';

export default function LearningPathStepScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ stepId?: string; title?: string }>();
  const lessonQuery = useResumeLearningPathLessonQuery(params.stepId);
  const lesson = lessonQuery.data?.lesson;

  if (lessonQuery.isLoading && !lesson) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LearningPathSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {lessonQuery.error || !lesson ? (
          <LearningPathStateCard
            title="Chua the mo step"
            body="Backend khong tra ve lesson nay trong lo trinh hien tai."
            action={<AppButton onPress={() => router.replace('/learning/path')}>Ve lo trinh</AppButton>}
          />
        ) : (
          <LearningPathStateCard
            title={lesson.title}
            body="Lesson nay thuoc Learning Path dang duoc backend quan ly. Neu no khong map vao module mobile hien co, ban co the quay lai lo trinh de chon step khac."
            action={<AppButton onPress={() => router.replace('/learning/path')}>Ve lo trinh</AppButton>}
          />
        )}
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

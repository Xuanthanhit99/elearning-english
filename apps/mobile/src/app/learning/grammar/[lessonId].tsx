import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  GrammarSkeleton,
  GrammarStateCard,
  LessonContent,
} from '../../../features/grammar/components/GrammarComponents';
import {
  useCompleteGrammarLessonMutation,
  useGrammarLessonQuery,
} from '../../../features/grammar/hooks/useGrammarQueries';
import { lessonHasExercises } from '../../../features/grammar/utils/grammar-utils';
import { colors, spacing } from '../../../theme';

export default function GrammarLessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lessonId?: string }>();
  const lessonId = params.lessonId;
  const lessonQuery = useGrammarLessonQuery(lessonId);
  const completeLesson = useCompleteGrammarLessonMutation(lessonId);
  const lesson = lessonQuery.data;

  async function completeTheoryLesson() {
    if (!lessonId || completeLesson.isPending) return;

    const result = await completeLesson.mutateAsync();
    router.replace({
      pathname: '/learning/grammar/result',
      params: {
        score: String(result.progress?.score ?? 100),
        correct: '0',
        total: '0',
        alreadyCompleted: String(result.alreadyCompleted),
      },
    });
  }

  if (lessonQuery.isLoading && !lesson) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <GrammarSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (lessonQuery.error || !lesson) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <GrammarStateCard
            title="Không thể tải bài học"
            body="Không thể tải bài học Ngữ pháp từ backend."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/grammar')}>Về Ngữ pháp</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText variant="caption" color={colors.primary}>
              {lesson.topic?.category?.title ?? 'Ngữ pháp'}
            </AppText>
            <AppText variant="title">{lesson.title}</AppText>
            <AppText color={colors.textMuted}>{lesson.subtitle}</AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="reader-outline" size={24} color={colors.primary} />
          </View>
        </View>

        <View style={styles.metaRow}>
          <AppText variant="caption" color={colors.textMuted}>
            {lesson.duration}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {lesson.level}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            +{lesson.rewardXp} XP
          </AppText>
        </View>

        <LessonContent lesson={lesson} />

        {lessonHasExercises(lesson) ? (
          <AppButton
            onPress={() =>
              router.push({
                pathname: '/learning/grammar/practice',
                params: { lessonId: lesson.id },
              })
            }
          >
            Luyện tập
          </AppButton>
        ) : (
          <AppButton disabled={completeLesson.isPending} onPress={() => void completeTheoryLesson()}>
            {completeLesson.isPending ? 'Đang hoàn thành...' : 'Hoàn thành bài học'}
          </AppButton>
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
  header: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  flex: {
    flex: 1,
    gap: spacing.sm,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});

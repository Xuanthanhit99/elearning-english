import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  FoundationSkillList,
  LearningPathJourney,
  LearningPathPhaseList,
  LearningPathSkeleton,
  LearningPathStateCard,
  LearningPathSummary,
} from '../../../features/learning-path/components/LearningPathComponents';
import {
  useLearningPathQuery,
  useStartLearningPathLessonMutation,
} from '../../../features/learning-path/hooks/useLearningPathQueries';
import { resolveLearningPathRoute } from '../../../features/learning-path/utils/learning-path-route';
import type { LearningPathLesson, LearningPathStartingLesson } from '../../../features/learning-path/types/learning-path';
import { colors, spacing } from '../../../theme';

export default function LearningPathScreen() {
  const router = useRouter();
  const pathQuery = useLearningPathQuery();
  const startLesson = useStartLearningPathLessonMutation();
  const data = pathQuery.data;

  function openStep(step: LearningPathLesson | NonNullable<LearningPathStartingLesson>) {
    const route = resolveLearningPathRoute(step);
    if (route) {
      router.push(route);
    }
  }

  async function openPathLesson(lesson: LearningPathLesson) {
    if (lesson.status === 'AVAILABLE') {
      await startLesson.mutateAsync(lesson.id);
    }
    openStep(lesson);
  }

  if (pathQuery.isLoading && !data) {
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
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={colors.primary}>
              Learning Path
            </AppText>
            <AppText variant="title">Lo trinh hoc tap</AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="map-outline" size={24} color={colors.primary} />
          </View>
        </View>

        {pathQuery.error && !data ? (
          <LearningPathStateCard
            title="Chua the tai lo trinh"
            body="Khong the tai lo trinh hoc tap tu backend."
            action={<AppButton onPress={() => void pathQuery.refetch()}>Thu lai</AppButton>}
          />
        ) : null}

        {data ? (
          <>
            <LearningPathSummary data={data} />
            {data.source === 'DEFAULT_FOUNDATION' ? (
              <FoundationSkillList data={data} onPress={openStep} />
            ) : (
              <>
                <LearningPathPhaseList data={data} />
                <LearningPathJourney data={data} onPressLesson={(lesson) => void openPathLesson(lesson)} />
              </>
            )}
            {data.nextLesson ? (
              <LearningPathStateCard
                title="Bai tiep theo"
                body={data.nextLesson.title}
                action={<AppButton onPress={() => openStep(data.nextLesson as NonNullable<typeof data.nextLesson>)}>Mo bai tiep theo</AppButton>}
              />
            ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
});

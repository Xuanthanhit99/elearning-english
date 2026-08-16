import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../theme';
import { skillLabel } from '../../placement/utils/placement-utils';
import type { LearningPathData, LearningPathLesson, LearningPathStartingLesson } from '../types/learning-path';
import { pathStatusLabel } from '../utils/learning-path-route';

export function LearningPathSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeleton, { minHeight: 150 }]} />
      <View style={[styles.skeleton, { minHeight: 360 }]} />
    </View>
  );
}

export function LearningPathStateCard({
  action,
  body,
  title,
}: {
  action?: ReactNode;
  body: string;
  title: string;
}) {
  return (
    <AppCard style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons name="map-outline" size={24} color={colors.primary} />
      </View>
      <View style={styles.stateBody}>
        <AppText variant="heading">{title}</AppText>
        <AppText color={colors.textMuted}>{body}</AppText>
        {action}
      </View>
    </AppCard>
  );
}

export function LearningPathSummary({ data }: { data: LearningPathData }) {
  return (
    <AppCard style={styles.stack}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.primary}>
            {data.source === 'PLACEMENT' ? 'Placement path' : 'Foundation path'}
          </AppText>
          <AppText variant="title">Lo trinh cua ban</AppText>
        </View>
        {data.overallLevel ? (
          <AppText variant="title" color={colors.primary}>
            {data.overallLevel}
          </AppText>
        ) : null}
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, data.progressPercent))}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {data.completedLessons}/{data.totalLessons} lessons | {data.progressPercent}%
      </AppText>
    </AppCard>
  );
}

export function FoundationSkillList({
  data,
  onPress,
}: {
  data: LearningPathData;
  onPress: (lesson: NonNullable<LearningPathStartingLesson>) => void;
}) {
  return (
    <View style={styles.stack}>
      {data.skills.map((item) => {
        const lesson = item.startingLesson ?? null;
        return (
          <AppCard key={item.skill} style={styles.stack}>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <AppText variant="heading">{skillLabel(item.skill)}</AppText>
                <AppText color={colors.textMuted}>{lesson?.title ?? 'Chua co bai phu hop'}</AppText>
              </View>
              <AppText variant="small" color={colors.primary}>
                {item.level ?? item.assessedLevel ?? '--'}
              </AppText>
            </View>
            {lesson ? <AppButton onPress={() => onPress(lesson)}>Mo bai hoc</AppButton> : null}
          </AppCard>
        );
      })}
    </View>
  );
}

export function LearningPathJourney({
  data,
  onPressLesson,
}: {
  data: LearningPathData;
  onPressLesson: (lesson: LearningPathLesson) => void;
}) {
  const lessons = data.courses.flatMap((course) =>
    course.lessons.map((lesson) => ({
      ...lesson,
      courseTitle: course.title,
    })),
  );

  if (!lessons.length) {
    return (
      <LearningPathStateCard
        title="Chua co lesson trong lo trinh"
        body="Backend da tra ve lo trinh nhung chua gan lesson mobile co the mo truc tiep."
      />
    );
  }

  return (
    <View style={styles.stack}>
      {lessons.map((lesson, index) => (
        <Pressable
          accessibilityLabel={`${lesson.title}, ${pathStatusLabel(lesson.status)}`}
          accessibilityRole="button"
          disabled={lesson.status === 'LOCKED'}
          key={lesson.id}
          onPress={() => onPressLesson(lesson)}
          style={({ pressed }) => [styles.stepCard, pressed ? styles.pressed : null, lesson.status === 'LOCKED' ? styles.locked : null]}
        >
          <View style={styles.stepRail}>
            <View style={[styles.stepDot, lesson.status === 'COMPLETED' ? styles.stepDone : lesson.status === 'IN_PROGRESS' ? styles.stepActive : null]}>
              <AppText variant="caption" color={lesson.status === 'LOCKED' ? colors.textMuted : colors.white}>
                {lesson.status === 'COMPLETED' ? '✓' : String(index + 1)}
              </AppText>
            </View>
            {index < lessons.length - 1 ? <View style={styles.stepLine} /> : null}
          </View>
          <View style={styles.flex}>
            <AppText variant="heading">{lesson.title}</AppText>
            <AppText color={colors.textMuted}>{lesson.courseTitle}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {lesson.sectionTitle} | {pathStatusLabel(lesson.status)}
            </AppText>
          </View>
          <Ionicons name={lesson.status === 'LOCKED' ? 'lock-closed-outline' : 'chevron-forward'} size={22} color={colors.primary} />
        </Pressable>
      ))}
    </View>
  );
}

export function LearningPathPhaseList({ data }: { data: LearningPathData }) {
  if (!data.phases.length) return null;

  return (
    <AppCard style={styles.stack}>
      <AppText variant="heading">Phases</AppText>
      {data.phases.map((phase) => (
        <View key={phase.id} style={styles.phaseRow}>
          <AppText variant="small">{phase.phase}. {phase.title}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {phase.targetLevel ?? 'Target'} | {phase.weeksMin}-{phase.weeksMax} weeks
          </AppText>
        </View>
      ))}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  skeleton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
  },
  stateCard: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stateIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  stateBody: {
    flex: 1,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  stepCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  locked: {
    opacity: 0.58,
  },
  pressed: {
    opacity: 0.78,
  },
  stepRail: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  stepDot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.textMuted,
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepDone: {
    backgroundColor: colors.success,
  },
  stepLine: {
    flex: 1,
    width: 2,
    marginTop: spacing.xs,
    backgroundColor: colors.border,
  },
  phaseRow: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});

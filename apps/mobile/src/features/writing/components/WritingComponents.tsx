import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing, typography } from '../../../theme';
import type {
  WritingHomeResponse,
  WritingProcessingStatus,
  WritingRecommendation,
  WritingResultResponse,
  WritingSessionResponse,
} from '../types/writing';
import { clampWritingScore, countWritingWords, normalizeStringArray } from '../utils/writing-utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function WritingSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeleton, { minHeight: 150 }]} />
      <View style={[styles.skeleton, { minHeight: 110 }]} />
      <View style={[styles.skeleton, { minHeight: 260 }]} />
    </View>
  );
}

export function WritingStateCard({
  action,
  body,
  icon = 'create-outline',
  title,
}: {
  action?: ReactNode;
  body: string;
  icon?: IconName;
  title: string;
}) {
  return (
    <AppCard style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.stateBody}>
        <AppText variant="heading">{title}</AppText>
        <AppText color={colors.textMuted}>{body}</AppText>
        {action}
      </View>
    </AppCard>
  );
}

export function WritingProgressCard({ data }: { data: WritingHomeResponse }) {
  return (
    <AppCard>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">Tien do Writing</AppText>
          <AppText color={colors.textMuted}>
            {data.stats.essaysWritten} bai | muc tieu hom nay {data.dailyGoal.current}/{data.dailyGoal.target} phut
          </AppText>
        </View>
        <AppText variant="heading" color={colors.primary}>
          {data.stats.avgScore}%
        </AppText>
      </View>
      <View style={styles.metaRow}>
        <Tag text={`${data.stats.dayStreak} ngay`} />
        <Tag text={`${data.stats.xpToday ?? 0} XP hom nay`} />
        <Tag text={`${data.progress?.total ?? 0} ket qua`} />
      </View>
    </AppCard>
  );
}

export function WritingTaskCard({ onPress, task }: { onPress: () => void; task: WritingRecommendation }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.taskCard, pressed ? styles.pressed : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{task.title}</AppText>
          <AppText color={colors.textMuted}>{task.category}</AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </View>
      <View style={styles.metaRow}>
        <Tag text={task.level} />
        <Tag text={task.type} />
      </View>
    </Pressable>
  );
}

export function WritingRecentCard({
  onPress,
  session,
}: {
  onPress: () => void;
  session: WritingHomeResponse['recentHistory'][number];
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.recentCard, pressed ? styles.pressed : null]}>
      <View style={styles.flex}>
        <AppText variant="small">{session.title}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {session.level} | {session.type}
        </AppText>
      </View>
      <AppText variant="heading" color={colors.primary}>
        {session.score}%
      </AppText>
    </Pressable>
  );
}

export function WritingPromptCard({ data }: { data: WritingSessionResponse }) {
  return (
    <AppCard style={styles.stack}>
      <AppText variant="caption" color={colors.primary}>
        {data.lesson.level} | {data.lesson.type}
      </AppText>
      <AppText variant="title">{data.lesson.title}</AppText>
      {data.lesson.description ? <AppText color={colors.textMuted}>{data.lesson.description}</AppText> : null}
      <View style={styles.promptBox}>
        <AppText variant="small">{data.lesson.prompt}</AppText>
      </View>
      <View style={styles.metaRow}>
        <Tag text={`${data.lesson.minWords}-${data.lesson.maxWords} words`} />
        <Tag text={`${data.lesson.duration} min`} />
        <Tag text={data.topic.title} />
      </View>
    </AppCard>
  );
}

export function WritingEditor({
  content,
  editable,
  maxWords,
  minWords,
  onChangeText,
}: {
  content: string;
  editable: boolean;
  maxWords: number;
  minWords: number;
  onChangeText: (text: string) => void;
}) {
  const words = countWritingWords(content);
  const tone = words < minWords ? colors.danger : words > maxWords ? colors.danger : colors.success;

  return (
    <AppCard style={styles.editorCard}>
      <View style={styles.cardHeader}>
        <AppText variant="heading">Bai viet cua ban</AppText>
        <AppText variant="small" color={tone}>
          {words}/{minWords}-{maxWords}
        </AppText>
      </View>
      <TextInput
        accessibilityLabel="Noi dung bai viet"
        editable={editable}
        multiline
        onChangeText={onChangeText}
        placeholder="Write your answer here..."
        placeholderTextColor={colors.textMuted}
        scrollEnabled
        style={styles.editor}
        textAlignVertical="top"
        value={content}
      />
      <AppText variant="caption" color={colors.textMuted}>
        Word count is guidance. Backend validates the final submission.
      </AppText>
    </AppCard>
  );
}

export function WritingProcessingState({ status }: { status?: WritingProcessingStatus | null }) {
  const failed = status?.status === 'FAILED';
  const completed = status?.status === 'COMPLETED';
  const progress = clampWritingScore(status?.progress ?? 8);

  return (
    <AppCard style={styles.processingCard}>
      <View style={[styles.processingIcon, failed ? styles.processingFailed : completed ? styles.processingDone : null]}>
        <Ionicons
          name={failed ? 'alert-circle-outline' : completed ? 'checkmark-circle' : 'sparkles-outline'}
          size={42}
          color={failed ? colors.danger : completed ? colors.success : colors.primary}
        />
      </View>
      <AppText variant="title" style={styles.centerText}>
        {failed ? 'Cham bai that bai' : completed ? 'Da co ket qua' : 'Dang cham bai'}
      </AppText>
      <AppText color={colors.textMuted} style={styles.centerText}>
        {status?.message ?? 'Backend dang phan tich ngu phap, tu vung, cau truc va muc do bam sat de bai.'}
      </AppText>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {status?.step ?? 'SUBMITTED'} | {progress}%
      </AppText>
      {status?.errorMessage ? <AppText color={colors.danger}>{status.errorMessage}</AppText> : null}
    </AppCard>
  );
}

export function WritingResultSummary({ result }: { result: WritingResultResponse }) {
  return (
    <AppCard style={styles.resultCard}>
      <View style={styles.resultIcon}>
        <Ionicons name="checkmark-circle" size={46} color={colors.success} />
      </View>
      <AppText variant="title" style={styles.centerText}>
        {result.result.overallScore}%
      </AppText>
      <AppText color={colors.textMuted} style={styles.centerText}>
        {result.result.grade} | {result.session.wordCount} words
      </AppText>
    </AppCard>
  );
}

export function WritingBreakdown({ result }: { result: WritingResultResponse }) {
  const rows = [
    ['Task', result.result.taskAchievement],
    ['Coherence', result.result.coherence],
    ['Vocabulary', result.result.lexicalResource],
    ['Grammar', result.result.grammar],
  ] as const;

  return (
    <AppCard style={styles.stack}>
      <AppText variant="heading">Breakdown</AppText>
      {rows.map(([label, score]) => (
        <View key={label} style={styles.scoreRow}>
          <AppText>{label}</AppText>
          <AppText variant="small" color={colors.primary}>
            {score}/100
          </AppText>
        </View>
      ))}
    </AppCard>
  );
}

export function WritingFeedback({ result }: { result: WritingResultResponse }) {
  const improvements = normalizeStringArray(result.improvements);
  const tips = normalizeStringArray(result.learningTips);

  return (
    <AppCard style={styles.stack}>
      <AppText variant="heading">Feedback</AppText>
      {result.result.feedback ? <AppText color={colors.textMuted}>{result.result.feedback}</AppText> : null}
      {improvements.map((item) => (
        <View key={item} style={styles.listRow}>
          <Ionicons name="bulb-outline" size={18} color={colors.primary} />
          <AppText style={styles.flex}>{item}</AppText>
        </View>
      ))}
      {tips.map((item) => (
        <View key={item} style={styles.listRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
          <AppText style={styles.flex}>{item}</AppText>
        </View>
      ))}
    </AppCard>
  );
}

export function WritingEssayReview({ result }: { result: WritingResultResponse }) {
  return (
    <AppCard style={styles.stack}>
      <AppText variant="heading">Bai cua ban</AppText>
      <AppText color={colors.textMuted}>{result.session.content}</AppText>
      {result.suggestedVersion || result.correctedEssay ? (
        <>
          <AppText variant="heading">Goi y chinh sua</AppText>
          <AppText color={colors.textMuted}>{result.suggestedVersion ?? result.correctedEssay}</AppText>
        </>
      ) : null}
    </AppCard>
  );
}

export function WritingCorrections({ result }: { result: WritingResultResponse }) {
  if (!result.corrections.length) {
    return <WritingStateCard title="Khong co loi chi tiet" body="Backend khong tra ve correction rieng cho bai nay." icon="checkmark-circle-outline" />;
  }

  return (
    <View style={styles.stack}>
      {result.corrections.map((item, index) => (
        <AppCard key={`${item.wrong}-${index}`} style={styles.stack}>
          <AppText variant="caption" color={colors.primary}>
            {item.type}
          </AppText>
          <AppText color={colors.danger}>{item.wrong}</AppText>
          <AppText color={colors.success}>{item.correct}</AppText>
          {item.explanation ? <AppText color={colors.textMuted}>{item.explanation}</AppText> : null}
        </AppCard>
      ))}
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View style={styles.tag}>
      <AppText variant="caption" color={colors.primary}>
        {text}
      </AppText>
    </View>
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  taskCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  recentCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  promptBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  editorCard: {
    gap: spacing.md,
  },
  editor: {
    minHeight: 280,
    maxHeight: 520,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.text,
    backgroundColor: colors.surfaceSoft,
    fontFamily: typography.family.regular,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    padding: spacing.md,
  },
  processingCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  processingIcon: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    backgroundColor: colors.primarySoft,
  },
  processingDone: {
    backgroundColor: '#e8f8ef',
  },
  processingFailed: {
    backgroundColor: '#fff1f2',
  },
  centerText: {
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
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
  resultCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  resultIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: '#e8f8ef',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
});

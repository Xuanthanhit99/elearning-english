import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../theme';
import type { GrammarLessonLearning, GrammarQuestion, GrammarTopic, SubmitGrammarResult } from '../types/grammar';
import { clampPercent } from '../utils/grammar-utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function GrammarSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeleton, { minHeight: 150 }]} />
      <View style={[styles.skeleton, { minHeight: 110 }]} />
      <View style={[styles.skeleton, { minHeight: 260 }]} />
    </View>
  );
}

export function GrammarStateCard({
  action,
  body,
  icon = 'school-outline',
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
        <Ionicons name={icon} size={25} color={colors.primary} />
      </View>
      <View style={styles.stateBody}>
        <AppText variant="heading">{title}</AppText>
        <AppText color={colors.textMuted}>{body}</AppText>
        {action}
      </View>
    </AppCard>
  );
}

export function GrammarProgressCard({
  averageScore,
  completedLessons,
  progress,
  totalLessons,
}: {
  averageScore: number;
  completedLessons: number;
  progress: number;
  totalLessons: number;
}) {
  const safe = clampPercent(progress);

  return (
    <AppCard>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">Tiến độ Ngữ pháp</AppText>
          <AppText color={colors.textMuted}>
            {completedLessons}/{totalLessons} bài học đã hoàn thành
          </AppText>
        </View>
        <AppText variant="heading" color={colors.primary}>
          {safe}%
        </AppText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${safe}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        Điểm trung bình: {averageScore}%
      </AppText>
    </AppCard>
  );
}

export function GrammarTopicCard({ onPress, topic }: { onPress: () => void; topic: GrammarTopic }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.topicCard, pressed ? styles.pressed : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{topic.title}</AppText>
          <AppText color={colors.textMuted}>{topic.description ?? topic.category}</AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </View>
      <View style={styles.metaRow}>
        <Tag text={topic.level ?? 'Level'} />
        <Tag text={`${topic.totalLessons} bài`} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${clampPercent(topic.progress)}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {topic.completedLessons}/{topic.totalLessons} bài hoàn thành
      </AppText>
    </Pressable>
  );
}

export function LessonContent({ lesson }: { lesson: GrammarLessonLearning }) {
  return (
    <View style={styles.stack}>
      {lesson.content.overview ? <ContentBlock title="Khi nào dùng?" body={lesson.content.overview} /> : null}
      {lesson.content.structure.length > 0 ? (
        <AppCard style={styles.lessonBlock}>
          <AppText variant="heading">Cấu trúc</AppText>
          {lesson.content.structure.map((item) => (
            <View key={item} style={styles.formula}>
              <AppText variant="small" color={colors.primary}>
                {item}
              </AppText>
            </View>
          ))}
        </AppCard>
      ) : null}
      {lesson.content.examples.length > 0 ? (
        <AppCard style={styles.lessonBlock}>
          <AppText variant="heading">Ví dụ</AppText>
          {lesson.content.examples.map((item) => (
            <View key={`${item.en}-${item.vi}`} style={styles.example}>
              <AppText variant="small">{item.en}</AppText>
              {item.vi ? <AppText color={colors.textMuted}>{item.vi}</AppText> : null}
            </View>
          ))}
        </AppCard>
      ) : null}
      {lesson.content.notes.length > 0 ? <ListBlock title="Lưu ý" items={lesson.content.notes} /> : null}
      {lesson.content.tips.length > 0 ? <ListBlock title="Mẹo ghi nhớ" items={lesson.content.tips} /> : null}
    </View>
  );
}

export function MultipleChoiceQuestion({
  answer,
  disabled,
  index,
  onSelect,
  question,
  result,
  total,
}: {
  answer?: string;
  disabled?: boolean;
  index: number;
  onSelect: (answer: string) => void;
  question: GrammarQuestion;
  result?: SubmitGrammarResult['results'][number];
  total: number;
}) {
  return (
    <AppCard style={styles.questionCard}>
      <AppText variant="caption" color={colors.primary}>
        {index + 1}/{total}
      </AppText>
      <AppText variant="heading">{question.question}</AppText>
      <View style={styles.options}>
        {question.options.map((option) => {
          const selected = answer === option;
          const correct = result?.correctAnswer === option;
          const wrongSelected = Boolean(result && selected && !result.isCorrect);

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Đáp án ${option}`}
              disabled={disabled || Boolean(result)}
              onPress={() => onSelect(option)}
              style={[
                styles.option,
                selected ? styles.optionSelected : null,
                correct ? styles.optionCorrect : null,
                wrongSelected ? styles.optionWrong : null,
              ]}
            >
              <AppText variant="small" color={correct ? colors.success : wrongSelected ? colors.danger : selected ? colors.primary : colors.text}>
                {option}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {result ? <AnswerFeedback result={result} /> : null}
    </AppCard>
  );
}

export function AnswerFeedback({ result }: { result: SubmitGrammarResult['results'][number] }) {
  return (
    <View style={[styles.feedback, result.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
      <AppText variant="small" color={result.isCorrect ? colors.success : colors.danger}>
        {result.isCorrect ? 'Chính xác' : `Chưa đúng. Đáp án: ${result.correctAnswer}`}
      </AppText>
      {result.explanation ? <AppText color={colors.textMuted}>{result.explanation}</AppText> : null}
    </View>
  );
}

export function GrammarResultSummary({
  onHome,
  onLearn,
  result,
}: {
  onHome: () => void;
  onLearn: () => void;
  result?: { score: number; correct: number; total: number; alreadyCompleted?: boolean } | null;
}) {
  return (
    <AppCard style={styles.resultCard}>
      <View style={styles.resultIcon}>
        <Ionicons name="checkmark-circle" size={46} color={colors.success} />
      </View>
      <AppText variant="title" style={styles.centerText}>
        Hoàn thành bài học
      </AppText>
      <AppText color={colors.textMuted} style={styles.centerText}>
        Backend đã xác nhận kết quả.
      </AppText>
      {result ? (
        <View style={styles.resultScore}>
          <AppText variant="title" color={colors.primary}>
            {result.score}%
          </AppText>
          <AppText color={colors.textMuted}>
            {result.total > 0 ? `${result.correct}/${result.total} câu đúng` : 'Bài học đã hoàn thành trước đó'}
          </AppText>
        </View>
      ) : null}
      <View style={styles.resultActions}>
        <AppButton onPress={onLearn}>Về Học tập</AppButton>
        <Pressable accessibilityRole="button" onPress={onHome} style={styles.secondaryButton}>
          <AppText variant="small" color={colors.primary}>
            Về Trang chủ
          </AppText>
        </Pressable>
      </View>
    </AppCard>
  );
}

function ContentBlock({ body, title }: { body: string; title: string }) {
  return (
    <AppCard style={styles.lessonBlock}>
      <AppText variant="heading">{title}</AppText>
      <AppText color={colors.textMuted}>{body}</AppText>
    </AppCard>
  );
}

function ListBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <AppCard style={styles.lessonBlock}>
      <AppText variant="heading">{title}</AppText>
      {items.map((item) => (
        <View key={item} style={styles.listRow}>
          <Ionicons name="bulb-outline" size={18} color={colors.primary} />
          <AppText style={styles.flex}>{item}</AppText>
        </View>
      ))}
    </AppCard>
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
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  topicCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.78,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  lessonBlock: {
    gap: spacing.md,
  },
  formula: {
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  example: {
    gap: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.mint,
    paddingLeft: spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  questionCard: {
    gap: spacing.lg,
  },
  options: {
    gap: spacing.md,
  },
  option: {
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: 'rgba(25, 196, 140, 0.12)',
  },
  optionWrong: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(255, 95, 126, 0.12)',
  },
  feedback: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  feedbackCorrect: {
    backgroundColor: 'rgba(25, 196, 140, 0.12)',
  },
  feedbackWrong: {
    backgroundColor: 'rgba(255, 95, 126, 0.12)',
  },
  resultCard: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  resultIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: 'rgba(25, 196, 140, 0.12)',
  },
  centerText: {
    textAlign: 'center',
  },
  resultScore: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  resultActions: {
    width: '100%',
    gap: spacing.md,
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../theme';
import type { ReadingArticleListItem, ReadingQuestion, ReadingResultResponse } from '../types/reading';
import { clampPercent, normalizeOptions } from '../utils/reading-utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function ReadingSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeleton, { minHeight: 150 }]} />
      <View style={[styles.skeleton, { minHeight: 120 }]} />
      <View style={[styles.skeleton, { minHeight: 260 }]} />
    </View>
  );
}

export function ReadingStateCard({
  action,
  body,
  icon = 'book-outline',
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

export function ReadingProgressCard({
  completed,
  learning,
  percent,
  total,
}: {
  completed: number;
  learning: number;
  percent: number;
  total: number;
}) {
  const safe = clampPercent(percent);

  return (
    <AppCard>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">Tien do Reading</AppText>
          <AppText color={colors.textMuted}>
            {completed}/{total} bai da hoan thanh
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
        Dang doc: {learning} bai
      </AppText>
    </AppCard>
  );
}

export function ReadingArticleCard({ article, onPress }: { article: ReadingArticleListItem; onPress: () => void }) {
  const progress = clampPercent(article.progressPercent);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.articleCard, pressed ? styles.pressed : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{article.title}</AppText>
          {article.description ? <AppText color={colors.textMuted}>{article.description}</AppText> : null}
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </View>
      <View style={styles.metaRow}>
        <Tag text={article.categoryName} />
        <Tag text={article.difficultyText} />
        <Tag text={`${article.xpReward} XP`} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {article.readTimeText} · {article.questionCount} cau hoi · {progress}% tien do
      </AppText>
    </Pressable>
  );
}

export function ReadingQuestionCard({
  answer,
  disabled,
  onSelect,
  question,
  total,
}: {
  answer?: string;
  disabled?: boolean;
  onSelect: (answer: string) => void;
  question: ReadingQuestion;
  total: number;
}) {
  const options = normalizeOptions(question.options);

  return (
    <AppCard style={styles.questionCard}>
      <AppText variant="caption" color={colors.primary}>
        {question.index}/{total}
      </AppText>
      <AppText variant="heading">{question.question}</AppText>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = answer === option;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              disabled={disabled}
              onPress={() => onSelect(option)}
              style={[styles.option, selected ? styles.optionSelected : null]}
            >
              <AppText variant="small" color={selected ? colors.primary : colors.text}>
                {option}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </AppCard>
  );
}

export function ReadingResultSummary({
  result,
}: {
  result: ReadingResultResponse;
}) {
  return (
    <AppCard style={styles.resultCard}>
      <View style={styles.resultIcon}>
        <Ionicons name="checkmark-circle" size={46} color={colors.success} />
      </View>
      <AppText variant="title" style={styles.centerText}>
        {result.summary.score}%
      </AppText>
      <AppText color={colors.textMuted} style={styles.centerText}>
        {result.summary.correctAnswers}/{result.summary.totalQuestions} cau dung · {result.summary.xpReward} XP
      </AppText>
      <AppText color={colors.textMuted} style={styles.centerText}>
        {result.summary.passedText}
      </AppText>
    </AppCard>
  );
}

export function ReadingReviewQuestion({ question }: { question: ReadingResultResponse['questions'][number] }) {
  const options = normalizeOptions(question.options);

  return (
    <AppCard style={styles.questionCard}>
      <AppText variant="caption" color={question.isCorrect ? colors.success : colors.danger}>
        Cau {question.index} · {question.isCorrect ? 'Dung' : 'Chua dung'}
      </AppText>
      <AppText variant="heading">{question.question}</AppText>
      <View style={styles.options}>
        {options.map((option) => {
          const correct = option === question.correctAnswer;
          const selectedWrong = option === question.selected && !question.isCorrect;

          return (
            <View key={option} style={[styles.option, correct ? styles.optionCorrect : null, selectedWrong ? styles.optionWrong : null]}>
              <AppText variant="small" color={correct ? colors.success : selectedWrong ? colors.danger : colors.text}>
                {option}
              </AppText>
            </View>
          );
        })}
      </View>
      {question.explanation ? <AppText color={colors.textMuted}>{question.explanation}</AppText> : null}
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
  articleCard: {
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  questionCard: {
    gap: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: '#e8f8ef',
  },
  optionWrong: {
    borderColor: colors.danger,
    backgroundColor: '#fff1f2',
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
  centerText: {
    textAlign: 'center',
  },
});

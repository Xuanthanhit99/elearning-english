import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../theme';
import type { DailyWordItem, VocabularyStatus, VocabularyStats } from '../types/vocabulary';
import { getWordMeaning } from '../utils/vocabulary-utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function VocabularySkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeleton, { minHeight: 170 }]} />
      <View style={[styles.skeleton, { minHeight: 130 }]} />
      <View style={[styles.skeleton, { minHeight: 180 }]} />
    </View>
  );
}

export function VocabularyStateCard({
  action,
  body,
  icon = 'leaf-outline',
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
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <View style={styles.stateBody}>
        <AppText variant="heading">{title}</AppText>
        <AppText color={colors.textMuted}>{body}</AppText>
        {action}
      </View>
    </AppCard>
  );
}

export function VocabularyProgressCard({
  completed,
  percent,
  remaining,
  total,
}: {
  completed: number;
  percent: number;
  remaining: number;
  total: number;
}) {
  return (
    <AppCard>
      <View style={styles.cardHeader}>
        <View>
          <AppText variant="heading">Từ vựng hôm nay</AppText>
          <AppText color={colors.textMuted}>
            {completed}/{total} từ đã lưu tiến độ
          </AppText>
        </View>
        <AppText variant="heading" color={colors.primary}>
          {percent}%
        </AppText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {remaining > 0 ? `${remaining} từ còn lại` : 'Bạn đã đi hết danh sách hôm nay.'}
      </AppText>
    </AppCard>
  );
}

export function VocabularyStatsRow({ stats }: { stats?: VocabularyStats | null }) {
  if (!stats) return null;

  return (
    <View style={styles.statsGrid}>
      <MiniStat icon="albums-outline" label="Đã học" value={String(stats.learnedWords)} />
      <MiniStat icon="repeat-outline" label="Cần ôn" value={String(stats.reviewDue)} />
      <MiniStat icon="sparkles-outline" label="Ghi nhớ" value={`${stats.memoryRate}%`} />
    </View>
  );
}

export function VocabularyStudyCard({ item, index, total }: { item: DailyWordItem; index: number; total: number }) {
  return (
    <AppCard style={styles.studyCard}>
      <AppText variant="caption" color={colors.primary}>
        {index + 1}/{total}
      </AppText>
      <View style={styles.wordBody}>
        <AppText variant="title" style={styles.word}>
          {item.word.word}
        </AppText>
        {item.word.phonetic ? (
          <AppText color={colors.textMuted}>{item.word.phonetic}</AppText>
        ) : null}
        {item.word.partOfSpeech ? (
          <View style={styles.tag}>
            <AppText variant="caption" color={colors.primary}>
              {item.word.partOfSpeech}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.meaningBox}>
        <AppText variant="caption" color={colors.textMuted}>
          Nghĩa
        </AppText>
        <AppText variant="heading">{getWordMeaning(item)}</AppText>
      </View>
      {item.word.example ? (
        <View style={styles.exampleBox}>
          <AppText variant="caption" color={colors.textMuted}>
            Example
          </AppText>
          <AppText>{item.word.example}</AppText>
        </View>
      ) : null}
      {item.progress?.status ? (
        <AppText variant="caption" color={colors.textMuted}>
          Trạng thái hiện tại: {statusLabel(item.progress.status)}
        </AppText>
      ) : null}
    </AppCard>
  );
}

export function VocabularyActions({
  disabled,
  onAction,
}: {
  disabled?: boolean;
  onAction: (status: Extract<VocabularyStatus, 'LEARNING' | 'KNOWN' | 'REVIEW'>) => void;
}) {
  return (
    <View style={styles.actions}>
      <ActionButton
        icon="refresh-outline"
        label="Cần ôn"
        tone={colors.warning}
        disabled={disabled}
        onPress={() => onAction('REVIEW')}
      />
      <ActionButton
        icon="book-outline"
        label="Đang học"
        tone={colors.primary}
        disabled={disabled}
        onPress={() => onAction('LEARNING')}
      />
      <ActionButton
        icon="checkmark-circle-outline"
        label="Đã nhớ"
        tone={colors.success}
        disabled={disabled}
        onPress={() => onAction('KNOWN')}
      />
    </View>
  );
}

export function ResultSummary({
  learned,
  onHome,
  onLearn,
  total,
}: {
  learned: number;
  onHome: () => void;
  onLearn: () => void;
  total: number;
}) {
  return (
    <AppCard style={styles.resultCard}>
      <View style={styles.resultIcon}>
        <Ionicons name="checkmark-circle" size={46} color={colors.success} />
      </View>
      <AppText variant="title" style={styles.centerText}>
        Hoàn thành
      </AppText>
      <AppText color={colors.textMuted} style={styles.centerText}>
        Backend đã xác nhận bài học hôm nay. {learned}/{total} từ có tiến độ trong phiên này.
      </AppText>
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

function MiniStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
  tone,
}: {
  disabled?: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
  tone: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { borderColor: `${tone}55`, backgroundColor: `${tone}12` },
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Ionicons name={icon} size={22} color={tone} />
      <AppText variant="small" color={tone}>
        {label}
      </AppText>
    </Pressable>
  );
}

function statusLabel(status: VocabularyStatus) {
  switch (status) {
    case 'KNOWN':
      return 'Đã nhớ';
    case 'REVIEW':
      return 'Cần ôn';
    case 'LEARNING':
      return 'Đang học';
    case 'MASTERED':
      return 'Thành thạo';
    default:
      return 'Mới';
  }
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
    marginBottom: spacing.lg,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniStat: {
    flex: 1,
    minHeight: 104,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  studyCard: {
    gap: spacing.lg,
  },
  wordBody: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  word: {
    textAlign: 'center',
  },
  tag: {
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  meaningBox: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.lg,
  },
  exampleBox: {
    gap: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.mint,
    paddingLeft: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  actionButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.55,
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

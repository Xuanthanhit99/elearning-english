import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../theme';
import type {
  ListeningHomeResponse,
  ListeningOptionLabel,
  ListeningQuestion,
  ListeningResultResponse,
} from '../types/listening';
import { LISTENING_SPEEDS, clampPercent, formatListeningSeconds, normalizeListeningOptions } from '../utils/listening-utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function ListeningSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeleton, { minHeight: 150 }]} />
      <View style={[styles.skeleton, { minHeight: 110 }]} />
      <View style={[styles.skeleton, { minHeight: 260 }]} />
    </View>
  );
}

export function ListeningStateCard({
  action,
  body,
  icon = 'headset-outline',
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

export function ListeningProgressCard({ data }: { data: ListeningHomeResponse }) {
  return (
    <AppCard>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">Tien do Listening</AppText>
          <AppText color={colors.textMuted}>
            {data.stats.completedSessions} bai hoan thanh · {data.stats.totalListeningTimeText}
          </AppText>
        </View>
        <AppText variant="heading" color={colors.primary}>
          {data.stats.averageAccuracy}%
        </AppText>
      </View>
      <View style={styles.metaRow}>
        <Tag text={data.level.current} />
        <Tag text={`${data.stats.totalXp} XP`} />
        <Tag text={`${data.streak.current} ngay`} />
      </View>
    </AppCard>
  );
}

export function ListeningRecommendationCard({
  onPress,
  recommendation,
}: {
  onPress: () => void;
  recommendation: ListeningHomeResponse['dailyRecommendation'];
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.activityCard, pressed ? styles.pressed : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{recommendation.topic}</AppText>
          <AppText color={colors.textMuted}>
            {recommendation.level} · {recommendation.limit} cau hoi
          </AppText>
        </View>
        <Ionicons name="play-circle-outline" size={26} color={colors.primary} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        De xuat hom nay tu backend
      </AppText>
    </Pressable>
  );
}

export function ListeningContinueCard({
  onPress,
  session,
}: {
  onPress: () => void;
  session: NonNullable<ListeningHomeResponse['continueSession']>;
}) {
  const progress = clampPercent(session.progressPercent);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.activityCard, pressed ? styles.pressed : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{session.topic ?? 'Listening'}</AppText>
          <AppText color={colors.textMuted}>
            {session.level ?? 'Level'} · {session.correct + session.wrong + session.skipped}/{session.total} cau
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {progress}% tien do
      </AppText>
    </Pressable>
  );
}

export function ListeningRecentCard({
  onPress,
  session,
}: {
  onPress: () => void;
  session: ListeningHomeResponse['recentSessions'][number];
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.recentCard, pressed ? styles.pressed : null]}>
      <View style={styles.flex}>
        <AppText variant="small">{session.topic ?? 'Listening'}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {session.level ?? 'Level'} · {session.correct}/{session.total} cau dung
        </AppText>
      </View>
      <AppText variant="heading" color={colors.primary}>
        {session.score}%
      </AppText>
    </Pressable>
  );
}

export function ListeningAudioPlayer({
  audio,
  disabled,
}: {
  audio: {
    duration: number;
    error: string | null;
    isBuffering: boolean;
    isLoaded: boolean;
    isPlaying: boolean;
    pause: () => void;
    play: () => void;
    position: number;
    replay: () => void;
    resolvedUrl: string | null;
    seekBy: (seconds: number) => void;
    setSpeed: (speed: number) => void;
    speed: number;
  };
  disabled?: boolean;
}) {
  const duration = audio.duration || 0;
  const progress = duration > 0 ? clampPercent((audio.position / duration) * 100) : 0;

  return (
    <AppCard style={styles.playerCard}>
      <View style={styles.playerTop}>
        <View style={styles.playerIcon}>
          <Ionicons name="headset-outline" size={30} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">Audio</AppText>
          <AppText color={colors.textMuted}>
            {audio.isBuffering ? 'Dang dem...' : audio.resolvedUrl ? 'San sang phat' : 'Chua co audio'}
          </AppText>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <AppText variant="caption" color={colors.textMuted}>
          {formatListeningSeconds(audio.position)}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {duration > 0 ? formatListeningSeconds(duration) : '--:--'}
        </AppText>
      </View>

      <View style={styles.controls}>
        <IconButton
          accessibilityLabel="Lui 10 giay"
          disabled={disabled || !audio.isLoaded}
          icon="play-back-outline"
          onPress={() => audio.seekBy(-10)}
        />
        <IconButton
          accessibilityLabel={audio.isPlaying ? 'Tam dung audio' : 'Phat audio'}
          disabled={disabled || !audio.resolvedUrl}
          icon={audio.isPlaying ? 'pause' : 'play'}
          large
          onPress={audio.isPlaying ? audio.pause : audio.play}
        />
        <IconButton
          accessibilityLabel="Tien 10 giay"
          disabled={disabled || !audio.isLoaded}
          icon="play-forward-outline"
          onPress={() => audio.seekBy(10)}
        />
        <IconButton
          accessibilityLabel="Phat lai tu dau"
          disabled={disabled || !audio.resolvedUrl}
          icon="refresh"
          onPress={audio.replay}
        />
      </View>

      <View style={styles.speedRow}>
        {LISTENING_SPEEDS.map((speed) => {
          const active = audio.speed === speed;
          return (
            <Pressable
              key={speed}
              accessibilityRole="button"
              accessibilityLabel={`Toc do ${speed}x`}
              disabled={disabled}
              onPress={() => audio.setSpeed(speed)}
              style={[styles.speedButton, active ? styles.speedButtonActive : null]}
            >
              <AppText variant="caption" color={active ? colors.white : colors.primary}>
                {speed}x
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {audio.error ? (
        <ListeningStateCard
          title="Khong the phat audio"
          body="Hay thu lai hoac kiem tra ket noi."
          icon="alert-circle-outline"
        />
      ) : null}
    </AppCard>
  );
}

export function ListeningQuestionRenderer({
  disabled,
  onSelect,
  question,
  selectedAnswer,
}: {
  disabled?: boolean;
  onSelect: (answer: ListeningOptionLabel) => void;
  question: ListeningQuestion;
  selectedAnswer?: ListeningOptionLabel | null;
}) {
  const options = normalizeListeningOptions(question.options);

  return (
    <AppCard style={styles.questionCard}>
      <AppText variant="caption" color={colors.primary}>
        Cau {question.order}
      </AppText>
      <AppText variant="heading">{question.question}</AppText>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = selectedAnswer === option.label;
          const correct = question.answered && question.correctAnswer === option.label;
          const wrongSelected = question.answered && selected && !question.isCorrect;

          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              disabled={disabled || question.answered}
              onPress={() => onSelect(option.label)}
              style={[
                styles.option,
                selected ? styles.optionSelected : null,
                correct ? styles.optionCorrect : null,
                wrongSelected ? styles.optionWrong : null,
              ]}
            >
              <View style={styles.optionLabel}>
                <AppText variant="caption" color={selected || correct ? colors.primary : colors.textMuted}>
                  {option.label}
                </AppText>
              </View>
              <AppText variant="small" style={styles.flex} color={correct ? colors.success : wrongSelected ? colors.danger : colors.text}>
                {option.text}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {question.answered && question.explanation ? (
        <View style={styles.feedback}>
          <AppText variant="small" color={question.isCorrect ? colors.success : colors.danger}>
            {question.isCorrect ? 'Chinh xac' : `Dap an dung: ${question.correctAnswer}`}
          </AppText>
          <AppText color={colors.textMuted}>{question.explanation}</AppText>
        </View>
      ) : null}
    </AppCard>
  );
}

export function ListeningTranscript({ transcript, unlocked }: { transcript?: string | null; unlocked: boolean }) {
  if (!unlocked || !transcript) {
    return (
      <ListeningStateCard
        title="Transcript dang khoa"
        body="Transcript se mo sau khi ban tra loi hoac bo qua cau nghe nay."
        icon="lock-closed-outline"
      />
    );
  }

  return (
    <AppCard style={styles.transcriptCard}>
      <AppText variant="heading">Transcript</AppText>
      <AppText color={colors.textMuted}>{transcript}</AppText>
    </AppCard>
  );
}

export function ListeningResultSummary({ result }: { result: ListeningResultResponse }) {
  return (
    <AppCard style={styles.resultCard}>
      <View style={styles.resultIcon}>
        <Ionicons name="checkmark-circle" size={46} color={colors.success} />
      </View>
      <AppText variant="title" style={styles.centerText}>
        {result.summary.score}%
      </AppText>
      <AppText color={colors.textMuted} style={styles.centerText}>
        {result.summary.correct}/{result.summary.totalQuestions} cau dung · +{result.summary.xpEarned} XP
      </AppText>
      <AppText variant="caption" color={colors.textMuted} style={styles.centerText}>
        {result.summary.totalTimeText}
      </AppText>
    </AppCard>
  );
}

export function ListeningReviewQuestion({ question }: { question: ListeningResultResponse['questions'][number] }) {
  const options = normalizeListeningOptions(question.options);

  return (
    <AppCard style={styles.questionCard}>
      <AppText variant="caption" color={question.isCorrect ? colors.success : colors.danger}>
        Cau {question.order} · {question.isCorrect ? 'Dung' : question.isSkipped ? 'Bo qua' : 'Sai'}
      </AppText>
      <AppText variant="heading">{question.question}</AppText>
      <View style={styles.options}>
        {options.map((option) => {
          const correct = question.correctAnswer === option.label;
          const selectedWrong = question.selectedAnswer === option.label && !question.isCorrect;
          return (
            <View key={option.label} style={[styles.option, correct ? styles.optionCorrect : null, selectedWrong ? styles.optionWrong : null]}>
              <View style={styles.optionLabel}>
                <AppText variant="caption" color={correct ? colors.success : selectedWrong ? colors.danger : colors.textMuted}>
                  {option.label}
                </AppText>
              </View>
              <AppText variant="small" style={styles.flex} color={correct ? colors.success : selectedWrong ? colors.danger : colors.text}>
                {option.text}
              </AppText>
            </View>
          );
        })}
      </View>
      {question.explanation ? <AppText color={colors.textMuted}>{question.explanation}</AppText> : null}
      <ListeningTranscript transcript={question.transcript} unlocked={Boolean(question.transcript)} />
    </AppCard>
  );
}

function IconButton({
  accessibilityLabel,
  disabled,
  icon,
  large,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: IconName;
  large?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, large ? styles.iconButtonLarge : null, disabled ? styles.disabled : null]}
    >
      <Ionicons name={icon} size={large ? 28 : 21} color={colors.white} />
    </Pressable>
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
    marginTop: spacing.lg,
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  activityCard: {
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
  playerCard: {
    gap: spacing.md,
  },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playerIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: colors.primarySoft,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  iconButtonLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  disabled: {
    opacity: 0.5,
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  speedButton: {
    minWidth: 64,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  speedButtonActive: {
    backgroundColor: colors.primary,
  },
  questionCard: {
    gap: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionLabel: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.surface,
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
  feedback: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  transcriptCard: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceSoft,
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

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { useListeningAudio } from '../../listening/hooks/useListeningAudio';
import { colors, radius, spacing, typography } from '../../../theme';
import { usePlacementRecording } from '../hooks/usePlacementRecording';
import type { PlacementIntroduction, PlacementProcessingSnapshot, PlacementQuestion, PlacementResult } from '../types/placement';
import { clampPercent, countPlacementWords, placementProgressText, skillLabel } from '../utils/placement-utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function PlacementSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeleton, { minHeight: 150 }]} />
      <View style={[styles.skeleton, { minHeight: 260 }]} />
      <View style={[styles.skeleton, { minHeight: 110 }]} />
    </View>
  );
}

export function PlacementStateCard({
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

export function PlacementIntroCard({ data }: { data: PlacementIntroduction }) {
  return (
    <AppCard style={styles.stack}>
      <AppText variant="caption" color={colors.primary}>
        Placement
      </AppText>
      <AppText variant="title">Kiem tra trinh do tieng Anh</AppText>
      <AppText color={colors.textMuted}>{data.content.description}</AppText>
      <View style={styles.metaRow}>
        {data.content.summaryCards.map((item) => (
          <View key={item.key} style={styles.metaPill}>
            <AppText variant="small">{item.value}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {data.content.autosaveMessage}
      </AppText>
    </AppCard>
  );
}

export function PlacementProgressHeader({ question }: { question: PlacementQuestion }) {
  return (
    <AppCard style={styles.stack}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.primary}>
            {placementProgressText(question)} | {skillLabel(question.skill)} | {question.level}
          </AppText>
          <AppText variant="heading">{question.type.replace('_', ' ')}</AppText>
        </View>
        <AppText variant="heading" color={colors.primary}>
          {question.sectionOrder}/{question.sectionTotal}
        </AppText>
      </View>
      <AppText color={colors.textMuted}>{question.adaptiveMessage}</AppText>
    </AppCard>
  );
}

export function ObjectivePlacementQuestion({
  disabled,
  onChange,
  question,
  selected,
}: {
  disabled: boolean;
  onChange: (answer: string) => void;
  question: PlacementQuestion;
  selected: string | null;
}) {
  const fillBlank = question.type === 'FILL_BLANK' && question.options.length === 0;

  return (
    <AppCard style={styles.stack}>
      {question.passage ? (
        <View style={styles.promptBox}>
          <AppText variant="small">Reading passage</AppText>
          <AppText color={colors.textMuted}>{question.passage}</AppText>
        </View>
      ) : null}
      <AppText variant="title">{question.prompt}</AppText>
      {fillBlank ? (
        <TextInput
          accessibilityLabel="Placement answer"
          editable={!disabled}
          onChangeText={onChange}
          placeholder="Type your answer"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={selected ?? ''}
        />
      ) : (
        <View style={styles.optionList}>
          {question.options.map((option) => {
            const active = selected === option.text;
            return (
              <Pressable
                accessibilityLabel={`Answer ${option.key}: ${option.text}${active ? ', selected' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled }}
                disabled={disabled}
                key={option.key}
                onPress={() => onChange(option.text)}
                style={({ pressed }) => [styles.option, active ? styles.optionActive : null, pressed ? styles.pressed : null]}
              >
                <View style={[styles.optionKey, active ? styles.optionKeyActive : null]}>
                  <AppText variant="small" color={active ? colors.white : colors.primary}>
                    {option.key}
                  </AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="small">{option.text}</AppText>
                  {option.translation ? (
                    <AppText variant="caption" color={colors.textMuted}>
                      {option.translation}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </AppCard>
  );
}

export function ListeningPlacementQuestion({
  disabled,
  onChange,
  question,
  selected,
}: {
  disabled: boolean;
  onChange: (answer: string) => void;
  question: PlacementQuestion;
  selected: string | null;
}) {
  const audio = useListeningAudio(question.audioUrl);

  return (
    <View style={styles.stack}>
      <AppCard style={styles.stack}>
        <AppText variant="heading">Listen carefully</AppText>
        <AppText color={colors.textMuted}>Play the audio, then choose the best answer.</AppText>
        <View style={styles.buttonRow}>
          <AppButton disabled={disabled || audio.isPlaying} onPress={audio.play}>
            Play
          </AppButton>
          <AppButton disabled={disabled} onPress={() => void audio.replay()}>
            Replay
          </AppButton>
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          Played {audio.playCount} time(s)
        </AppText>
        {audio.error ? <AppText color={colors.danger}>{audio.error}</AppText> : null}
      </AppCard>
      <ObjectivePlacementQuestion disabled={disabled} onChange={onChange} question={{ ...question, type: 'MULTIPLE_CHOICE' }} selected={selected} />
    </View>
  );
}

export function WritingPlacementQuestion({
  content,
  disabled,
  onChange,
  question,
}: {
  content: string;
  disabled: boolean;
  onChange: (text: string) => void;
  question: PlacementQuestion;
}) {
  const words = countPlacementWords(content);
  const ready = words >= 20;

  return (
    <AppCard style={styles.stack}>
      <AppText variant="caption" color={colors.primary}>
        Writing | {question.level}
      </AppText>
      <AppText variant="title">{question.prompt}</AppText>
      <TextInput
        accessibilityLabel="Placement writing answer"
        editable={!disabled}
        multiline
        onChangeText={onChange}
        placeholder="Write your response here..."
        placeholderTextColor={colors.textMuted}
        style={styles.editor}
        textAlignVertical="top"
        value={content}
      />
      <AppText variant="caption" color={ready ? colors.success : colors.warning}>
        {words} words | Backend requires at least 20 words.
      </AppText>
    </AppCard>
  );
}

export function SpeakingPlacementQuestion({
  disabled,
  error,
  onDefer,
  onSkip,
  onSubmit,
  question,
}: {
  disabled: boolean;
  error?: string | null;
  onDefer: () => void;
  onSkip: () => void;
  onSubmit: (uri: string) => void;
  question: PlacementQuestion;
}) {
  const recording = usePlacementRecording();

  return (
    <AppCard style={styles.stack}>
      <AppText variant="caption" color={colors.primary}>
        Speaking | {question.level}
      </AppText>
      <AppText variant="title">{question.prompt}</AppText>
      <View style={styles.recordCircle}>
        <Ionicons name={recording.isRecording ? 'mic' : 'mic-outline'} size={38} color={recording.isRecording ? colors.danger : colors.primary} />
        <AppText variant="heading">{formatSeconds(recording.durationSeconds)}</AppText>
      </View>
      {recording.error ? <AppText color={colors.danger}>{recording.error}</AppText> : null}
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
      <View style={styles.buttonRow}>
        {!recording.isRecording ? (
          <AppButton disabled={disabled} onPress={() => void recording.start()}>
            Record
          </AppButton>
        ) : (
          <AppButton disabled={disabled} onPress={() => void recording.stop()}>
            Stop
          </AppButton>
        )}
        <AppButton disabled={disabled || !recording.recordingUri} onPress={() => void recording.play()}>
          Listen
        </AppButton>
      </View>
      <View style={styles.buttonRow}>
        <AppButton disabled={disabled || !recording.recordingUri} onPress={() => recording.recordingUri && onSubmit(recording.recordingUri)}>
          Submit speaking
        </AppButton>
        <AppButton disabled={disabled} onPress={onSkip}>
          Skip
        </AppButton>
        <AppButton disabled={disabled} onPress={onDefer}>
          Defer
        </AppButton>
      </View>
    </AppCard>
  );
}

export function PlacementProcessingCard({ snapshot }: { snapshot?: PlacementProcessingSnapshot | null }) {
  const failed = snapshot?.status === 'FAILED';
  const completed = snapshot?.status === 'COMPLETED';
  const progress = clampPercent(snapshot?.progress ?? 5);

  return (
    <AppCard style={styles.processingCard}>
      <View style={[styles.processingIcon, failed ? styles.failedIcon : completed ? styles.doneIcon : null]}>
        <Ionicons name={failed ? 'alert-circle-outline' : completed ? 'checkmark-circle' : 'analytics-outline'} size={42} color={failed ? colors.danger : completed ? colors.success : colors.primary} />
      </View>
      <AppText variant="title" style={styles.centerText}>
        {failed ? 'Chua xu ly duoc' : completed ? 'Da co ket qua' : 'Dang phan tich ket qua'}
      </AppText>
      <AppText color={colors.textMuted} style={styles.centerText}>
        {snapshot?.currentStep ?? 'Backend dang danh gia cau tra loi va tao lo trinh.'}
      </AppText>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {snapshot?.status ?? 'WAITING'} | {progress}%
      </AppText>
      {snapshot?.errorMessage ? <AppText color={colors.danger}>{snapshot.errorMessage}</AppText> : null}
    </AppCard>
  );
}

export function PlacementResultCard({ result }: { result: PlacementResult }) {
  return (
    <AppCard style={styles.stack}>
      <View style={styles.resultHeader}>
        <View>
          <AppText variant="caption" color={colors.primary}>
            Trinh do cua ban
          </AppText>
          <AppText variant="title">{result.overview.overallLevel}</AppText>
        </View>
        <AppText variant="title" color={colors.primary}>
          {result.overview.overallScore}%
        </AppText>
      </View>
      {result.overview.summary ? <AppText color={colors.textMuted}>{result.overview.summary}</AppText> : null}
      <View style={styles.metaRow}>
        {result.overview.confidence !== null ? <Tag text={`Confidence ${result.overview.confidence}%`} /> : null}
        {result.overview.projectedLevel ? <Tag text={`Next ${result.overview.projectedLevel}`} /> : null}
        <Tag text={`${result.analysis.totalQuestions} questions`} />
      </View>
    </AppCard>
  );
}

export function PlacementSkillBreakdown({ result }: { result: PlacementResult }) {
  if (!result.skills.length) return null;

  return (
    <AppCard style={styles.stack}>
      <AppText variant="heading">Skill breakdown</AppText>
      {result.skills.map((item) => (
        <View key={item.skill} style={styles.scoreRow}>
          <View style={styles.flex}>
            <AppText>{skillLabel(item.skill)}</AppText>
            {item.level ? (
              <AppText variant="caption" color={colors.textMuted}>
                {item.level} | {item.status}
              </AppText>
            ) : null}
          </View>
          <AppText variant="small" color={colors.primary}>
            {item.score}%
          </AppText>
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

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
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
  },
  metaPill: {
    minWidth: 128,
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  tag: {
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  promptBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    fontFamily: typography.family.regular,
    fontSize: typography.size.md,
    paddingHorizontal: spacing.md,
  },
  editor: {
    minHeight: 260,
    maxHeight: 520,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    fontFamily: typography.family.regular,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    padding: spacing.md,
  },
  optionList: {
    gap: spacing.md,
  },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionKey: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.surfaceSoft,
  },
  optionKeyActive: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.78,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  recordCircle: {
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
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
  doneIcon: {
    backgroundColor: '#e8f8ef',
  },
  failedIcon: {
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
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  scoreRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../theme';
import type {
  CompanionDisplayMessage,
  CompanionPetStatus,
  CompanionQuickAction,
} from '../types/companion';

const quickActionLabels: Record<CompanionQuickAction, string> = {
  CHEER_UP: 'Dong vien',
  BANTER: 'Nghi mot chut',
  QUICK_TIP: 'Goi y hoc nhanh',
};

export function UserMessage({ message }: { message: CompanionDisplayMessage }) {
  const pending = 'pending' in message && message.pending;

  return (
    <View style={styles.userRow}>
      <View style={[styles.bubble, styles.userBubble, pending ? styles.pendingBubble : null]}>
        <AppText color={colors.white}>{message.content}</AppText>
        {pending ? (
          <AppText variant="caption" color={colors.white}>
            Dang gui
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function CompanionMessage({
  message,
  action,
}: {
  message: CompanionDisplayMessage;
  action?: { label: string; onPress: () => void } | null;
}) {
  return (
    <View style={styles.companionRow}>
      <View style={styles.avatar}>
        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
      </View>
      <View style={[styles.bubble, styles.companionBubble]}>
        <AppText>{message.content}</AppText>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.actionButton}>
            <AppText variant="caption" color={colors.primary}>
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function GeneratingMessage({ petName }: { petName: string }) {
  return (
    <View style={styles.companionRow}>
      <View style={styles.avatar}>
        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
      </View>
      <View style={[styles.bubble, styles.companionBubble, styles.generatingBubble]}>
        <AppText color={colors.textMuted}>{petName} dang tra loi...</AppText>
      </View>
    </View>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <AppCard style={styles.errorCard}>
      <Ionicons name="warning-outline" size={20} color={colors.warning} />
      <AppText variant="small" color={colors.textMuted}>
        {message}
      </AppText>
    </AppCard>
  );
}

export function SuggestionChip({
  quickAction,
  disabled,
  onPress,
}: {
  quickAction: CompanionQuickAction;
  disabled?: boolean;
  onPress: (quickAction: CompanionQuickAction) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => onPress(quickAction)}
      style={({ pressed }) => [
        styles.chip,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <AppText variant="caption" color={colors.primary}>
        {quickActionLabels[quickAction]}
      </AppText>
    </Pressable>
  );
}

export function CompanionHeader({ pet }: { pet?: CompanionPetStatus | null }) {
  return (
    <AppCard style={styles.headerCard}>
      <View style={styles.headerIcon}>
        <Ionicons name="chatbubbles-outline" size={26} color={colors.primary} />
      </View>
      <View style={styles.headerCopy}>
        <AppText variant="heading">BeaconVie Companion</AppText>
        <AppText color={colors.textMuted}>
          {pet
            ? `${pet.name} | Lv ${pet.level} | streak ${pet.streak} | HP ${pet.hp}/100`
            : 'Nguoi ban dong hanh hoc tieng Anh cua ban'}
        </AppText>
      </View>
    </AppCard>
  );
}

export function MemoryReference() {
  return null;
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
  },
  bubble: {
    maxWidth: '82%',
    gap: spacing.xs,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  userBubble: {
    borderBottomRightRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  companionBubble: {
    borderBottomLeftRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingBubble: {
    opacity: 0.72,
  },
  generatingBubble: {
    opacity: 0.84,
  },
  actionButton: {
    minHeight: 36,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderColor: `${colors.warning}55`,
  },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});

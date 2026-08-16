import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../theme';

export function SettingsSection({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

export function ToggleRow({
  title,
  body,
  value,
  disabled,
  onChange,
}: {
  title: string;
  body?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="small">{title}</AppText>
        {body ? (
          <AppText variant="caption" color={colors.textMuted}>
            {body}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : colors.white}
      />
    </View>
  );
}

export function ChoiceRow<T extends string | number>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value?: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceBlock}>
      <AppText variant="small">{title}</AppText>
      <View style={styles.choiceWrap}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              onPress={() => onChange(option.value)}
              style={[styles.choice, active ? styles.activeChoice : null]}
            >
              <AppText variant="caption" color={active ? colors.white : colors.textSecondary}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  choiceBlock: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  activeChoice: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});

import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { AppText } from './AppText';

type AppTextInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AppTextInput({ label, error, style, ...props }: AppTextInputProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="small" color={colors.textSecondary}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        autoCapitalize="none"
        {...props}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.danger,
  },
});

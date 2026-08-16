import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';

type AppButtonProps = {
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function AppButton({ children, onPress, disabled, style }: PropsWithChildren<AppButtonProps>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <AppText variant="small" color={colors.white} style={styles.label}>
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
  disabled: {
    opacity: 0.58,
  },
  label: {
    fontWeight: '900',
  },
});

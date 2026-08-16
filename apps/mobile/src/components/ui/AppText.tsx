import { PropsWithChildren } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { colors, typography } from '../../theme';

type AppTextVariant = 'title' | 'heading' | 'body' | 'small' | 'caption';

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  color?: string;
};

export function AppText({
  children,
  variant = 'body',
  color,
  style,
  ...props
}: PropsWithChildren<AppTextProps>) {
  return (
    <Text style={[styles.base, styles[variant], color ? { color } : null, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontFamily: typography.family.regular,
  },
  title: {
    fontSize: typography.size['3xl'],
    lineHeight: typography.lineHeight['3xl'],
    fontWeight: '900',
  },
  heading: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontWeight: '800',
  },
  body: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '500',
  },
  small: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
  },
  caption: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '700',
  },
});

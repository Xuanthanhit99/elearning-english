import { StyleSheet, Text } from 'react-native';

import Screen from '@/components/ui/Screen';
import { colors, spacing } from '@/theme';
export default function CommunityScreen() {
  return (
    <Screen style={styles.container}>
      <Text style={styles.title}>
        Học 📚
      </Text>

      <Text style={styles.subtitle}>
        Vocabulary, Grammar, Reading và Listening sẽ nằm ở đây.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
  },

  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
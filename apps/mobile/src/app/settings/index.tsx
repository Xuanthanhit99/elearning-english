import Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '../../components/layout/Screen';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { colors, spacing } from '../../theme';

const SECTIONS: Array<{
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
}> = [
  {
    title: 'Account',
    body: 'Email, profile identity, and account status.',
    icon: 'person-circle-outline',
    href: '/(tabs)/profile',
  },
  {
    title: 'Learning',
    body: 'Goals, level, daily minutes, and study rhythm.',
    icon: 'school-outline',
    href: '/settings/learning',
  },
  {
    title: 'Notifications',
    body: 'In-app/email preference fields from backend settings.',
    icon: 'notifications-outline',
    href: '/settings/notifications',
  },
  {
    title: 'Privacy',
    body: 'Profile visibility and personalization controls.',
    icon: 'shield-checkmark-outline',
    href: '/settings/privacy',
  },
  {
    title: 'Security',
    body: 'Change password and email verification.',
    icon: 'lock-closed-outline',
    href: '/settings/security',
  },
  {
    title: 'Sessions',
    body: 'Review and revoke signed-in devices.',
    icon: 'phone-portrait-outline',
    href: '/settings/sessions',
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.titleBlock}>
          <AppText variant="caption" color={colors.primary}>
            BeaconVie
          </AppText>
          <AppText variant="title">Settings</AppText>
        </View>
      </View>

      <View style={styles.stack}>
        {SECTIONS.map((section) => (
          <Pressable
            key={section.title}
            accessibilityRole="button"
            onPress={() => router.push(section.href)}
          >
            {({ pressed }) => (
              <AppCard style={[styles.rowCard, pressed ? styles.pressedCard : null]}>
                <View style={styles.rowIcon}>
                  <Ionicons name={section.icon} size={23} color={colors.primary} />
                </View>
                <View style={styles.rowBody}>
                  <AppText variant="heading">{section.title}</AppText>
                  <AppText color={colors.textMuted}>{section.body}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </AppCard>
            )}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.72,
  },
  titleBlock: {
    flex: 1,
  },
  stack: {
    gap: spacing.md,
  },
  rowCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressedCard: {
    opacity: 0.76,
  },
  rowIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
});

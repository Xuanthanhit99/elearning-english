import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '../../components/layout/Screen';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { SettingsSection, ToggleRow } from '../../features/settings/components/SettingsControls';
import {
  useNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
} from '../../features/settings/hooks/useSettingsQuery';
import type { NotificationSettings } from '../../features/settings/types/settings';
import { normalizeApiError } from '../../services/api/errors';
import { colors, spacing } from '../../theme';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const query = useNotificationSettingsQuery();
  const updateMutation = useUpdateNotificationSettingsMutation();
  const settings = query.data;
  const [dailyReminderTime, setDailyReminderTime] = useState('');

  useEffect(() => {
    if (settings?.dailyReminderTime) {
      setDailyReminderTime(settings.dailyReminderTime);
    }
  }, [settings?.dailyReminderTime]);

  const patch = async (input: Partial<NotificationSettings>) => {
    try {
      await updateMutation.mutateAsync(input);
    } catch (error) {
      Alert.alert('Notifications', normalizeApiError(error).message);
    }
  };

  return (
    <Screen>
      <Header title="Notifications" onBack={() => router.back()} />
      <AppCard style={styles.card}>
        {!settings ? (
          <AppText color={colors.textMuted}>Loading notification preferences...</AppText>
        ) : (
          <SettingsSection title="Preferences">
            <ToggleRow
              title="Daily reminder"
              value={settings.dailyReminderEnabled}
              onChange={(value) => void patch({ dailyReminderEnabled: value })}
            />
            <AppTextInput
              label="Daily reminder time"
              value={dailyReminderTime}
              onChangeText={setDailyReminderTime}
              onEndEditing={() => {
                if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(dailyReminderTime)) {
                  void patch({ dailyReminderTime });
                } else {
                  Alert.alert('Notifications', 'Use HH:mm format, for example 19:30.');
                  setDailyReminderTime(settings.dailyReminderTime);
                }
              }}
              placeholder="19:30"
              maxLength={5}
            />
            <ToggleRow
              title="Mission reminders"
              value={settings.missionReminder}
              onChange={(value) => void patch({ missionReminder: value })}
            />
            <ToggleRow
              title="Friend activity"
              value={settings.friendActivity}
              onChange={(value) => void patch({ friendActivity: value })}
            />
            <ToggleRow
              title="Club notifications"
              value={settings.clubNotification}
              onChange={(value) => void patch({ clubNotification: value })}
            />
            <ToggleRow
              title="Leaderboard"
              value={settings.leaderboardNotification}
              onChange={(value) => void patch({ leaderboardNotification: value })}
            />
            <ToggleRow
              title="AI feedback"
              value={settings.aiFeedbackNotification}
              onChange={(value) => void patch({ aiFeedbackNotification: value })}
            />
            <ToggleRow
              title="Email"
              value={settings.emailNotification}
              onChange={(value) => void patch({ emailNotification: value })}
            />
            <ToggleRow
              title="Push preference"
              body="Device push registration is not enabled in this phase."
              value={settings.pushNotification}
              onChange={(value) => void patch({ pushNotification: value })}
            />
          </SettingsSection>
        )}
      </AppCard>
    </Screen>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
      </Pressable>
      <View>
        <AppText variant="caption" color={colors.primary}>
          Settings
        </AppText>
        <AppText variant="title">{title}</AppText>
      </View>
    </View>
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
  card: {
    gap: spacing.lg,
  },
});

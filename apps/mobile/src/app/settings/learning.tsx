import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '../../components/layout/Screen';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import {
  ChoiceRow,
  SettingsSection,
  ToggleRow,
} from '../../features/settings/components/SettingsControls';
import {
  useSettingsQuery,
  useUpdateSettingsMutation,
} from '../../features/settings/hooks/useSettingsQuery';
import type { UserSettings } from '../../features/settings/types/settings';
import { normalizeApiError } from '../../services/api/errors';
import { colors, spacing } from '../../theme';

export default function LearningSettingsScreen() {
  const router = useRouter();
  const settingsQuery = useSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();
  const settings = settingsQuery.data;

  const patch = async (input: Partial<UserSettings>) => {
    try {
      await updateMutation.mutateAsync(input);
    } catch (error) {
      Alert.alert('Settings', normalizeApiError(error).message);
    }
  };

  return (
    <Screen>
      <Header title="Learning" onBack={() => router.back()} />
      <AppCard style={styles.card}>
        {!settings ? (
          <AppText color={colors.textMuted}>Loading learning settings...</AppText>
        ) : (
          <SettingsSection title="Learning plan">
            <ChoiceRow
              title="Daily study minutes"
              value={settings.dailyStudyMinutes}
              onChange={(value) => void patch({ dailyStudyMinutes: value })}
              options={[10, 20, 30, 45, 60].map((value) => ({
                value,
                label: `${value} min`,
              }))}
            />
            <ChoiceRow
              title="Current level"
              value={settings.currentLevel}
              onChange={(value) => {
                Alert.alert(
                  'Change level?',
                  'This can affect your learning path recommendations.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Change', onPress: () => void patch({ currentLevel: value }) },
                  ],
                );
              }}
              options={['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((value) => ({
                value,
                label: value,
              }))}
            />
            <ChoiceRow
              title="Weekly target"
              value={settings.weeklyTargetDays}
              onChange={(value) => void patch({ weeklyTargetDays: value })}
              options={[3, 4, 5, 6, 7].map((value) => ({
                value,
                label: `${value} days`,
              }))}
            />
            <ToggleRow
              title="Auto-detect level"
              body="Placement and progress can update your level."
              value={settings.autoDetectLevel}
              onChange={(value) => void patch({ autoDetectLevel: value })}
            />
            <ToggleRow
              title="Adaptive dashboard"
              value={settings.adaptiveDashboard}
              onChange={(value) => void patch({ adaptiveDashboard: value })}
            />
            <ToggleRow
              title="Focus mode"
              body="Hides community and leaderboard widgets on Dashboard."
              value={settings.focusMode}
              onChange={(value) => void patch({ focusMode: value })}
            />
            <ToggleRow
              title="Energy mode"
              value={settings.energyMode}
              onChange={(value) => void patch({ energyMode: value })}
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

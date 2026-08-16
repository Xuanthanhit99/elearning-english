import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '../../components/layout/Screen';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { SettingsSection, ToggleRow } from '../../features/settings/components/SettingsControls';
import {
  usePrivacySettingsQuery,
  useUpdateSettingsMutation,
} from '../../features/settings/hooks/useSettingsQuery';
import type { UserSettings } from '../../features/settings/types/settings';
import { normalizeApiError } from '../../services/api/errors';
import { colors, spacing } from '../../theme';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const query = usePrivacySettingsQuery();
  const updateMutation = useUpdateSettingsMutation();
  const settings = query.data;

  const patch = async (input: Partial<UserSettings>) => {
    try {
      await updateMutation.mutateAsync(input);
    } catch (error) {
      Alert.alert('Privacy', normalizeApiError(error).message);
    }
  };

  return (
    <Screen>
      <Header title="Privacy" onBack={() => router.back()} />
      <AppCard style={styles.card}>
        {!settings ? (
          <AppText color={colors.textMuted}>Loading privacy settings...</AppText>
        ) : (
          <SettingsSection title="Visibility">
            <ToggleRow
              title="Public profile"
              value={Boolean(settings.publicProfile)}
              onChange={(value) => void patch({ publicProfile: value })}
            />
            <ToggleRow
              title="Show streak"
              value={Boolean(settings.showStreak)}
              onChange={(value) => void patch({ showStreak: value })}
            />
            <ToggleRow
              title="Show achievements"
              value={Boolean(settings.showAchievements)}
              onChange={(value) => void patch({ showAchievements: value })}
            />
            <ToggleRow
              title="Show online status"
              value={Boolean(settings.showOnlineStatus)}
              onChange={(value) => void patch({ showOnlineStatus: value })}
            />
            <ToggleRow
              title="Show last seen"
              value={Boolean(settings.showLastSeen)}
              onChange={(value) => void patch({ showLastSeen: value })}
            />
            <ToggleRow
              title="Data personalization"
              value={Boolean(settings.dataPersonalization)}
              onChange={(value) => void patch({ dataPersonalization: value })}
            />
            <ToggleRow
              title="Analytics consent"
              value={Boolean(settings.analyticsConsent)}
              onChange={(value) => void patch({ analyticsConsent: value })}
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

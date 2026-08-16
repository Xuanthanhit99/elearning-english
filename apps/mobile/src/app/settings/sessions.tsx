import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import {
  useDeviceSessionsQuery,
  useRevokeDeviceSessionMutation,
  useRevokeOtherDeviceSessionsMutation,
} from '../../features/security/hooks/useSecurityQuery';
import type { DeviceSession } from '../../features/settings/types/settings';
import { resolveSessionPresentation } from '../../features/settings/utils/session-presentation';
import { normalizeApiError } from '../../services/api/errors';
import { colors, spacing } from '../../theme';

export default function SessionsScreen() {
  const router = useRouter();
  const query = useDeviceSessionsQuery();
  const revokeDevice = useRevokeDeviceSessionMutation();
  const revokeAllOther = useRevokeOtherDeviceSessionsMutation();
  const sessions = query.data ?? [];
  const otherSessions = sessions.filter((session) => !session.current);

  const confirmRevoke = (session: DeviceSession) => {
    const presentation = resolveSessionPresentation(session);
    Alert.alert(
      'Logout this device?',
      `${presentation.title} will need to log in again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeDevice.mutateAsync(session.id);
            } catch (error) {
              Alert.alert('Sessions', normalizeApiError(error).message);
            }
          },
        },
      ],
    );
  };

  const confirmRevokeAll = () => {
    Alert.alert(
      'Logout other devices?',
      'All other active sessions will need to log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout others',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeAllOther.mutateAsync();
            } catch (error) {
              Alert.alert('Sessions', normalizeApiError(error).message);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={sessions}
        keyExtractor={(item) => item.id}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={22} color={colors.primary} />
              </Pressable>
              <View>
                <AppText variant="caption" color={colors.primary}>
                  Settings
                </AppText>
                <AppText variant="title">Sessions</AppText>
              </View>
            </View>
            {otherSessions.length ? (
              <AppButton
                disabled={revokeAllOther.isPending}
                onPress={confirmRevokeAll}
              >
                Logout other devices
              </AppButton>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            busy={revokeDevice.isPending}
            onRevoke={() => confirmRevoke(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <AppCard style={styles.emptyCard}>
            <Ionicons name="phone-portrait-outline" size={30} color={colors.primary} />
            <AppText variant="heading">
              {query.isLoading ? 'Loading devices...' : 'No active sessions'}
            </AppText>
            <AppText color={colors.textMuted}>Pull down to refresh.</AppText>
          </AppCard>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function SessionCard({
  session,
  busy,
  onRevoke,
}: {
  session: DeviceSession;
  busy: boolean;
  onRevoke: () => void;
}) {
  const presentation = resolveSessionPresentation(session);
  return (
    <AppCard style={styles.sessionCard}>
      <View style={styles.sessionIcon}>
        <Ionicons
          name={session.os === 'Android' || session.os === 'iOS' ? 'phone-portrait-outline' : 'desktop-outline'}
          size={24}
          color={colors.primary}
        />
      </View>
      <View style={styles.sessionBody}>
        <View style={styles.sessionTitleRow}>
          <AppText variant="heading">{presentation.title}</AppText>
          {session.current ? (
            <View style={styles.currentBadge}>
              <AppText variant="caption" color={colors.primary}>
                This device
              </AppText>
            </View>
          ) : null}
        </View>
        {presentation.details ? (
          <AppText color={colors.textMuted}>{presentation.details}</AppText>
        ) : null}
        {presentation.lastActive ? (
          <AppText variant="caption" color={colors.textMuted}>
            Last active {presentation.lastActive}
          </AppText>
        ) : null}
        {!session.current ? (
          <AppButton disabled={busy} onPress={onRevoke} style={styles.dangerButton}>
            Logout device
          </AppButton>
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  headerStack: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
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
  separator: {
    height: spacing.md,
  },
  sessionCard: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sessionIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
  },
  sessionBody: {
    flex: 1,
    gap: spacing.sm,
  },
  sessionTitleRow: {
    gap: spacing.xs,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});

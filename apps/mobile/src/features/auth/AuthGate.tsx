import { usePathname, useRouter, useSegments } from 'expo-router';
import { PropsWithChildren, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { useAuthStore } from '../../stores/auth-store';
import { colors, spacing } from '../../theme';

export function AuthGate({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const inAuthGroup =
    segments[0] === '(auth)' ||
    pathname === '/login' ||
    pathname === '/register';
  const shouldShowAuth = status === 'unauthenticated' && !inAuthGroup;
  const shouldShowApp = status === 'authenticated' && inAuthGroup;
  const redirectTarget = shouldShowAuth
    ? '/(auth)/login'
    : shouldShowApp
      ? '/(tabs)'
      : null;
  const lastRedirectTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!redirectTarget) {
      lastRedirectTarget.current = null;
      return;
    }

    if (lastRedirectTarget.current === redirectTarget) {
      return;
    }

    lastRedirectTarget.current = redirectTarget;
    router.replace(redirectTarget);
  }, [redirectTarget, router]);

  return (
    <View style={styles.root}>
      {children}
      {status === 'loading' || redirectTarget ? (
        <View style={[StyleSheet.absoluteFill, styles.loading]}>
          <ActivityIndicator color={colors.primary} />
          {status === 'loading' ? (
            <AppText color={colors.textMuted}>Dang mo BeaconVie...</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});

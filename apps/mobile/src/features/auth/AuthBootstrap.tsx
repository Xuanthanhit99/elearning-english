import { PropsWithChildren, useEffect } from 'react';

import { getCurrentUser } from './api/auth-api';
import { useAuthStore } from '../../stores/auth-store';
import { getAccessToken, getRefreshToken, clearTokens } from '../../services/auth/token-storage';
import { markAuthSessionChanged } from '../../services/api/client';

export function AuthBootstrap({ children }: PropsWithChildren) {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      setLoading();

      try {
        const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);

        if (!accessToken || !refreshToken) {
          if (mounted) setUnauthenticated();
          return;
        }

        const user = await getCurrentUser();
        if (mounted) setAuthenticated(user);
      } catch {
        markAuthSessionChanged();
        await clearTokens();
        if (mounted) setUnauthenticated();
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [setAuthenticated, setLoading, setUnauthenticated]);

  return children;
}

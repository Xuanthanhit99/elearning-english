import { logout } from '../api/auth-api';
import { markAuthSessionChanged } from '../../../services/api/client';
import { clearTokens, getRefreshToken } from '../../../services/auth/token-storage';
import { queryClient } from '../../../services/query/query-client';
import { useAuthStore } from '../../../stores/auth-store';

export async function signOutCurrentDevice() {
  try {
    const refreshToken = await getRefreshToken();
    await logout(refreshToken);
  } finally {
    await clearLocalAuthState();
  }
}

export async function clearLocalAuthState() {
  markAuthSessionChanged();
  await clearTokens();
  queryClient.clear();
  useAuthStore.getState().setUnauthenticated();
}

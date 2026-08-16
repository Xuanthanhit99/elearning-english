import * as SecureStore from 'expo-secure-store';

import type { AuthTokens } from '../api/types';
import { notifyAccessTokenChanged } from '../socket/socket-auth';

const ACCESS_TOKEN_KEY = 'beaconvie.accessToken';
const REFRESH_TOKEN_KEY = 'beaconvie.refreshToken';

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens(tokens: AuthTokens) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
  notifyAccessTokenChanged(tokens.accessToken);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
  notifyAccessTokenChanged(null);
}

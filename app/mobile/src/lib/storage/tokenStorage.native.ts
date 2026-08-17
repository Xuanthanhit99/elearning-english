import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'beaconvie.refresh-token';

export const tokenStorage = {
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(
      REFRESH_TOKEN_KEY,
      token,
    );
  },

  async removeRefreshToken(): Promise<void> {
    await SecureStore.deleteItemAsync(
      REFRESH_TOKEN_KEY,
    );
  },
};
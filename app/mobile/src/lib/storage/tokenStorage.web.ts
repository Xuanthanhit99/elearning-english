const REFRESH_TOKEN_KEY = 'beaconvie.refresh-token';

export const tokenStorage = {
  async getRefreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(
      REFRESH_TOKEN_KEY,
    );
  },

  async setRefreshToken(token: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      REFRESH_TOKEN_KEY,
      token,
    );
  },

  async removeRefreshToken(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(
      REFRESH_TOKEN_KEY,
    );
  },
};
let accessToken: string | null = null;

export const tokenManager = {
  async getAccessToken(): Promise<string | null> {
    return accessToken;
  },

  async setAccessToken(token: string): Promise<void> {
    accessToken = token;
  },

  async clearAccessToken(): Promise<void> {
    accessToken = null;
  }
}
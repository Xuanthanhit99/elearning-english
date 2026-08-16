export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL?.replace(/\/+$/, '') ?? '',
} as const;

export function assertApiBaseUrl() {
  if (!env.apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is required.');
  }

  return env.apiUrl;
}

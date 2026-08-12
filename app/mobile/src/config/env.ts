const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_URL environment variable',
  );
}

export const env = {
  API_URL,

  APP_ENV:
    process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
} as const;
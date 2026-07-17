export const SETTINGS_REDIS = Symbol('SETTINGS_REDIS');

export const settingsCacheKey = (userId: string) => `settings:user:${userId}`;

export const SETTINGS_CACHE_TTL_SECONDS = 300;

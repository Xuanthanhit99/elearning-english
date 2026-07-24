export const AUTH_REDIS = Symbol('AUTH_REDIS');

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days, matches existing cookie maxAge

export const refreshSessionRedisKey = (jti: string) => `auth:refresh:${jti}`;

/**
 * TTL is a safety net only — `unbanUser` deletes this key explicitly.
 * Sized to REFRESH_TOKEN_TTL_SECONDS so an orphaned key can never outlive a
 * legitimate session by more than the existing refresh-token lifetime.
 */
export const BANNED_USER_TTL_SECONDS = REFRESH_TOKEN_TTL_SECONDS;

export const bannedUserRedisKey = (userId: string) => `auth:banned:${userId}`;

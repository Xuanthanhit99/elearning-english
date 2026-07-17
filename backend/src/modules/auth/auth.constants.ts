export const AUTH_REDIS = Symbol('AUTH_REDIS');

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days, matches existing cookie maxAge

export const refreshSessionRedisKey = (jti: string) => `auth:refresh:${jti}`;

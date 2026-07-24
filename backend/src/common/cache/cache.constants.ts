export const CONTENT_REDIS = Symbol('CONTENT_REDIS');

/**
 * Bump this when the *shape* of cached payloads changes so old entries are
 * silently ignored instead of being deserialized into a mismatched shape.
 * Cheaper than a migration: old keys just expire on their own TTL.
 */
export const CONTENT_CACHE_VERSION = 'v1';

export const CONTENT_CACHE_NEGATIVE_MARKER = '__NEG__';

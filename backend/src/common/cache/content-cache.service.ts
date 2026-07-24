import { Injectable } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';
import { CacheMetricsService } from './cache-metrics.service';
import {
  CONTENT_CACHE_NEGATIVE_MARKER,
  CONTENT_CACHE_VERSION,
} from './cache.constants';

/**
 * Cache-aside helper for reusable lesson content (vocabulary, grammar,
 * reading, listening, speaking, writing, placement question banks).
 *
 * Redis here is purely a read accelerator sitting in front of Postgres —
 * Postgres stays the source of truth. Every method degrades to "no cache"
 * (never throws) so a Redis outage only costs cache hit rate, never lesson
 * availability. Callers are expected to keep following DB -> Gemini ->
 * persist -> refreshJson on a miss, per module.
 */
@Injectable()
export class ContentCacheService {
  constructor(
    private readonly redis: RedisCacheService,
    private readonly metrics: CacheMetricsService,
  ) {}

  private versioned(key: string) {
    return `content:${CONTENT_CACHE_VERSION}:${key}`;
  }

  async getJson<T>(module: string, key: string): Promise<T | null> {
    const raw = await this.redis.get(this.versioned(key));

    if (!this.redis.isAvailable()) {
      this.metrics.record(module, 'REDIS_UNAVAILABLE', key);
    }

    if (raw === null) {
      this.metrics.record(module, 'MISS', key);
      return null;
    }

    if (raw === CONTENT_CACHE_NEGATIVE_MARKER) {
      this.metrics.record(module, 'NEGATIVE_HIT', key);
      return null;
    }

    try {
      this.metrics.record(module, 'HIT', key);
      return JSON.parse(raw) as T;
    } catch {
      // Corrupted/stale-shape entry — treat as a miss rather than crash the read path.
      this.metrics.record(module, 'MISS', key);
      return null;
    }
  }

  async setJson(
    module: string,
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const ok = await this.redis.set(
      this.versioned(key),
      JSON.stringify(value),
      ttlSeconds,
    );
    if (ok) {
      this.metrics.record(module, 'CACHE_REFRESH', key);
    }
  }

  /**
   * Marks a key as "known to have insufficient content right now" for a
   * short TTL, so a burst of concurrent requests for a topic/level that just
   * failed generation (or is mid-generation behind the lock) don't each
   * re-trigger a DB scan + Gemini call. Kept short (caller-supplied TTL,
   * typically tens of seconds) since it's purely a stampede guard, not a
   * long-lived "this will never have content" statement.
   */
  async setNegative(
    module: string,
    key: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(this.versioned(key), CONTENT_CACHE_NEGATIVE_MARKER, ttlSeconds);
    this.metrics.record(module, 'CACHE_REFRESH', `${key} (negative)`);
  }

  async invalidate(key: string): Promise<void> {
    await this.redis.del(this.versioned(key));
  }

  async invalidateMany(keys: string[]): Promise<void> {
    await this.redis.del(...keys.map((key) => this.versioned(key)));
  }
}

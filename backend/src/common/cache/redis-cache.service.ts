import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { CONTENT_REDIS } from './cache.constants';

/**
 * Thin, failure-tolerant wrapper around the shared content-cache Redis
 * client. Every method swallows connection/command errors instead of
 * throwing — a Redis outage must only ever cost cache performance, never
 * lesson availability (Postgres remains the source of truth; callers fall
 * back to it whenever this returns null/false).
 */
@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private available = true;

  constructor(@Inject(CONTENT_REDIS) private readonly redis: Redis) {
    this.redis.on('error', (error) => {
      if (this.available) {
        this.logger.warn(
          `Content cache Redis unavailable, degrading to DB-only reads: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      this.available = false;
    });

    this.redis.on('ready', () => {
      if (!this.available) {
        this.logger.log('Content cache Redis connection restored');
      }
      this.available = true;
    });
  }

  isAvailable(): boolean {
    return this.available;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.markDegraded(error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
      return true;
    } catch (error) {
      this.markDegraded(error);
      return false;
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.markDegraded(error);
    }
  }

  private markDegraded(error: unknown) {
    if (this.available) {
      this.logger.warn(
        `Content cache Redis command failed, degrading to DB-only reads: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    this.available = false;
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}

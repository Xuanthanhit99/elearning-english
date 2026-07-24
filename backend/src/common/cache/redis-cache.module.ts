import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { CONTENT_REDIS } from './cache.constants';
import { RedisCacheService } from './redis-cache.service';
import { CacheMetricsService } from './cache-metrics.service';
import { ContentCacheService } from './content-cache.service';

/**
 * Shared lesson-content cache, reusing the same Redis instance (env vars)
 * every other module already connects to (Auth, Settings, Leaderboard,
 * Listening, Arena) rather than standing up a new caching layer. Global so
 * any feature module can inject ContentCacheService without importing this
 * module explicitly.
 */
@Global()
@Module({
  providers: [
    {
      provide: CONTENT_REDIS,
      useFactory: () =>
        new Redis({
          host: process.env.REDIS_HOST ?? '127.0.0.1',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        }),
    },
    RedisCacheService,
    CacheMetricsService,
    ContentCacheService,
  ],
  exports: [ContentCacheService, CacheMetricsService, RedisCacheService],
})
export class RedisCacheModule {}

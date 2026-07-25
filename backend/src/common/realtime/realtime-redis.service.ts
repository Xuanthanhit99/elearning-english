import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Dedicated Redis client for cross-instance realtime primitives (presence
 * sets, disconnect-grace bookkeeping) — mirrors ArenaRedisService's
 * pattern (arena/realtime/arena-redis.service.ts) rather than overloading
 * RedisCacheService, whose surface is string get/set/setNx, not Set
 * operations. Never a source of truth — Postgres owns room/session state.
 */
@Injectable()
export class RealtimeRedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}

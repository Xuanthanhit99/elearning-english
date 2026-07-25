import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis.config';

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
      ...getRedisConnectionOptions(),
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}

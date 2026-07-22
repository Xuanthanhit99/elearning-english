import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/*
 * Dedicated Redis client for Arena realtime (presence + Gate E cooldown
 * keys) — never the source of truth for score/combo/inventory, those stay
 * in Postgres. Wrapped as an injectable (rather than a bare factory
 * Provider like `ListeningRedisProvider`) so it implements
 * `OnModuleDestroy` and Nest closes the connection on `app.close()` /
 * module teardown, which integration tests rely on for a clean
 * `--detectOpenHandles` run.
 */
@Injectable()
export class ArenaRedisService implements OnModuleDestroy {
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

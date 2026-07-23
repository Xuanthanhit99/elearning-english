import { HttpException, HttpStatus, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export type ArenaRateLimitAction =
  | 'queueJoin'
  | 'queueCancel'
  | 'matchmakingRetry'
  | 'answerSubmit'
  | 'finishRequest'
  | 'reconnectResume'
  | 'historyFetch'
  | 'adminOperation'
  | 'adminRewardRetry';

type LimitConfig = {
  limit: number;
  windowSeconds: number;
};

function envBool(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function envInt(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

const DEFAULTS: Record<ArenaRateLimitAction, LimitConfig> = {
  queueJoin: { limit: 5, windowSeconds: 60 },
  queueCancel: { limit: 10, windowSeconds: 60 },
  matchmakingRetry: { limit: 5, windowSeconds: 60 },
  answerSubmit: { limit: 120, windowSeconds: 60 },
  finishRequest: { limit: 10, windowSeconds: 60 },
  reconnectResume: { limit: 30, windowSeconds: 60 },
  historyFetch: { limit: 60, windowSeconds: 60 },
  adminOperation: { limit: 5, windowSeconds: 300 },
  adminRewardRetry: { limit: 5, windowSeconds: 300 },
};

const ENV_NAMES: Record<ArenaRateLimitAction, { limit: string; window: string }> = {
  queueJoin: { limit: 'ARENA_QUEUE_JOIN_LIMIT', window: 'ARENA_QUEUE_JOIN_WINDOW_SECONDS' },
  queueCancel: { limit: 'ARENA_QUEUE_CANCEL_LIMIT', window: 'ARENA_QUEUE_CANCEL_WINDOW_SECONDS' },
  matchmakingRetry: { limit: 'ARENA_MATCHMAKING_RETRY_LIMIT', window: 'ARENA_MATCHMAKING_RETRY_WINDOW_SECONDS' },
  answerSubmit: { limit: 'ARENA_ANSWER_LIMIT', window: 'ARENA_ANSWER_WINDOW_SECONDS' },
  finishRequest: { limit: 'ARENA_FINISH_LIMIT', window: 'ARENA_FINISH_WINDOW_SECONDS' },
  reconnectResume: { limit: 'ARENA_RECONNECT_LIMIT', window: 'ARENA_RECONNECT_WINDOW_SECONDS' },
  historyFetch: { limit: 'ARENA_HISTORY_LIMIT', window: 'ARENA_HISTORY_WINDOW_SECONDS' },
  adminOperation: { limit: 'ARENA_ADMIN_OPERATION_LIMIT', window: 'ARENA_ADMIN_OPERATION_WINDOW_SECONDS' },
  adminRewardRetry: { limit: 'ARENA_ADMIN_REWARD_RETRY_LIMIT', window: 'ARENA_ADMIN_REWARD_RETRY_WINDOW_SECONDS' },
};

@Injectable()
export class ArenaRateLimiterService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: envInt('ARENA_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS', 1000),
    });
    this.redis.on('error', () => undefined);
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }

  async consume(userId: string | undefined, action: ArenaRateLimitAction, options?: { internal?: boolean }) {
    if (options?.internal || !this.isEnabled()) return { allowed: true, remaining: null, resetSeconds: null };
    if (!userId) {
      throw new HttpException(
        { message: 'Arena request is not authorized.', error: 'ARENA_RATE_LIMIT_AUTH_REQUIRED' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const config = this.getConfig(action);
    const key = `${this.keyPrefix()}:${action}:user:${userId}`;

    let result: [number, number, number];
    try {
      await this.ensureConnected();
      result = (await this.redis.eval(
        `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
end
local ttl = redis.call("TTL", KEYS[1])
if current > tonumber(ARGV[1]) then
  return {0, current, ttl}
end
return {1, current, ttl}
        `,
        1,
        key,
        String(config.limit),
        String(config.windowSeconds),
      )) as [number, number, number];
    } catch {
      throw new HttpException(
        { message: 'Arena is temporarily busy. Please try again shortly.', error: 'ARENA_RATE_LIMIT_UNAVAILABLE' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const [allowed, count, ttl] = result;
    if (allowed === 1) {
      return {
        allowed: true,
        remaining: Math.max(config.limit - count, 0),
        resetSeconds: Math.max(ttl, 0),
      };
    }

    throw new HttpException(
      {
        message: 'Too many Arena requests. Please wait a moment and try again.',
        error: 'ARENA_RATE_LIMITED',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async cleanupTestKeys(prefix = this.keyPrefix()) {
    await this.ensureConnected();
    const stream = this.redis.scanStream({ match: `${prefix}:*`, count: 100 });
    const keys: string[] = [];
    for await (const chunk of stream) {
      keys.push(...(chunk as string[]));
    }
    if (keys.length > 0) await this.redis.del(...keys);
    return keys.length;
  }

  private isEnabled() {
    return envBool('ARENA_RATE_LIMIT_ENABLED', true);
  }

  private keyPrefix() {
    return process.env.ARENA_RATE_LIMIT_KEY_PREFIX || 'arena:rate-limit';
  }

  private getConfig(action: ArenaRateLimitAction): LimitConfig {
    const defaults = DEFAULTS[action];
    const names = ENV_NAMES[action];
    return {
      limit: envInt(names.limit, defaults.limit),
      windowSeconds: envInt(names.window, defaults.windowSeconds),
    };
  }

  private async ensureConnected() {
    if (this.redis.status === 'ready') return;
    if (this.redis.status === 'wait' || this.redis.status === 'end') {
      await this.redis.connect();
    }
  }
}

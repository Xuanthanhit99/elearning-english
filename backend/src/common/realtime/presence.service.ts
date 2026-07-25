import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RealtimeRedisService } from './realtime-redis.service';

const PRESENCE_TTL_SECONDS = 120;

/**
 * Generic, namespaced presence primitive — the same Redis-backed
 * socket-id-set + disconnect-grace pattern proven by
 * arena/realtime/arena-presence.service.ts, generalized so any gateway
 * (Study Rooms today; Community/Friends online-status was flagged in the
 * Step 0 audit as a real gap with no fix yet — this makes that a follow-up
 * wiring task instead of a from-scratch build) can reuse it instead of
 * hand-rolling its own. Cross-instance correct: a user is only "gone" once
 * their socket-id set is empty everywhere, not just on the instance that
 * saw the last disconnect — because the set lives in Redis, shared across
 * every backend instance.
 */
@Injectable()
export class PresenceService implements OnModuleDestroy {
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly redisService: RealtimeRedisService) {}

  private key(namespace: string, entityId: string, userId: string) {
    return `presence:${namespace}:${entityId}:${userId}`;
  }

  private entityKey(namespace: string, entityId: string) {
    return `presence:${namespace}:${entityId}:*`;
  }

  private graceKey(namespace: string, entityId: string, userId: string) {
    return `${namespace}:${entityId}:${userId}`;
  }

  async registerSocket(
    namespace: string,
    entityId: string,
    userId: string,
    socketId: string,
  ) {
    const key = this.key(namespace, entityId, userId);
    await this.redisService.client.sadd(key, socketId);
    await this.redisService.client.expire(key, PRESENCE_TTL_SECONDS);
    this.clearGrace(namespace, entityId, userId);
  }

  async removeSocket(
    namespace: string,
    entityId: string,
    userId: string,
    socketId: string,
  ) {
    await this.redisService.client.srem(
      this.key(namespace, entityId, userId),
      socketId,
    );
  }

  async isPresent(
    namespace: string,
    entityId: string,
    userId: string,
  ): Promise<boolean> {
    const count = await this.redisService.client.scard(
      this.key(namespace, entityId, userId),
    );
    return count > 0;
  }

  /** Best-effort "who's online in this room" — uses SCAN, not KEYS, so it
   * never blocks Redis even if a room has many members. Fine for a
   * moderate-cardinality per-room presence list; not meant for global
   * scans. */
  async listPresentUserIds(namespace: string, entityId: string): Promise<string[]> {
    const pattern = this.entityKey(namespace, entityId);
    const userIds: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redisService.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      for (const key of keys) {
        const userId = key.split(':').pop();
        if (userId) userIds.push(userId);
      }
    } while (cursor !== '0');
    return userIds;
  }

  scheduleGrace(
    namespace: string,
    entityId: string,
    userId: string,
    graceMs: number,
    onExpire: () => void | Promise<void>,
  ) {
    const timerKey = this.graceKey(namespace, entityId, userId);
    this.clearGrace(namespace, entityId, userId);
    const timer = setTimeout(() => {
      this.graceTimers.delete(timerKey);
      void onExpire();
    }, graceMs);
    timer.unref?.();
    this.graceTimers.set(timerKey, timer);
  }

  clearGrace(namespace: string, entityId: string, userId: string) {
    const timerKey = this.graceKey(namespace, entityId, userId);
    const timer = this.graceTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(timerKey);
    }
  }

  onModuleDestroy() {
    for (const timer of this.graceTimers.values()) {
      clearTimeout(timer);
    }
    this.graceTimers.clear();
  }
}

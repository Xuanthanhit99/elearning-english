import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ArenaRedisService } from './arena-redis.service';

const PRESENCE_TTL_SECONDS = 120;

/*
 * Presence is Redis-backed (shared across every backend instance behind the
 * Redis Socket.IO adapter) so multi-tab and cross-instance disconnect
 * detection are correct: a user is only "gone" from a room when their
 * socket-id set is empty everywhere, not just on the instance that saw the
 * last disconnect.
 *
 * The disconnect-grace *timer* itself is intentionally in-process
 * (`setTimeout`, scoped to the instance that owned the disconnecting
 * socket) — only the presence *check* it performs when it fires needs to be
 * cross-instance-consistent, and that check reads Redis, not local state.
 */
@Injectable()
export class ArenaPresenceService implements OnModuleDestroy {
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly redisService: ArenaRedisService) {}

  private key(roomId: string, userId: string) {
    return `arena:presence:${roomId}:${userId}`;
  }

  private graceKey(roomId: string, userId: string) {
    return `${roomId}:${userId}`;
  }

  async registerSocket(roomId: string, userId: string, socketId: string) {
    const key = this.key(roomId, userId);
    await this.redisService.client.sadd(key, socketId);
    await this.redisService.client.expire(key, PRESENCE_TTL_SECONDS);
    this.clearGrace(roomId, userId);
  }

  async removeSocket(roomId: string, userId: string, socketId: string) {
    await this.redisService.client.srem(this.key(roomId, userId), socketId);
  }

  async isPresent(roomId: string, userId: string): Promise<boolean> {
    const count = await this.redisService.client.scard(
      this.key(roomId, userId),
    );
    return count > 0;
  }

  scheduleGrace(
    roomId: string,
    userId: string,
    graceMs: number,
    onExpire: () => void | Promise<void>,
  ) {
    const timerKey = this.graceKey(roomId, userId);
    this.clearGrace(roomId, userId);
    const timer = setTimeout(() => {
      this.graceTimers.delete(timerKey);
      void onExpire();
    }, graceMs);
    timer.unref?.();
    this.graceTimers.set(timerKey, timer);
  }

  clearGrace(roomId: string, userId: string) {
    const timerKey = this.graceKey(roomId, userId);
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

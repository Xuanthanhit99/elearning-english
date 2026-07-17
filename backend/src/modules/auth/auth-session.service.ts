import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUTH_REDIS,
  REFRESH_TOKEN_TTL_SECONDS,
  refreshSessionRedisKey,
} from './auth.constants';

type SessionPointer = { userId: string; sessionId: string };

/**
 * Owns UserDeviceSession bookkeeping and the Redis-backed refresh-token
 * lookup used for rotation + revocation. The refresh JWT itself only ever
 * carries a `jti`; the mapping jti -> (userId, sessionId) lives in Redis so a
 * revoked session can never mint a new access token again.
 */
@Injectable()
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTH_REDIS) private readonly redis: Redis,
  ) {}

  async createSession(params: {
    userId: string;
    jti: string;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    const { deviceName, browser, os } = this.parseUserAgent(params.userAgent);

    const session = await this.prisma.userDeviceSession.create({
      data: {
        userId: params.userId,
        deviceName,
        browser,
        os,
        ipAddress: params.ipAddress ?? null,
        current: true,
        refreshTokenId: params.jti,
      },
    });

    await this.pointJti(params.jti, {
      userId: params.userId,
      sessionId: session.id,
    });

    return session;
  }

  /**
   * Verifies the refresh token is still backed by a live, non-revoked
   * session, then rotates it to a brand-new jti (refresh token rotation).
   * Returns null if the token has already been used/revoked — callers must
   * treat that as "refresh token không hợp lệ".
   */
  async rotate(oldJti: string, newJti: string): Promise<SessionPointer | null> {
    const pointer = await this.getPointer(oldJti);

    if (!pointer) {
      return null;
    }

    const session = await this.prisma.userDeviceSession.findUnique({
      where: { id: pointer.sessionId },
    });

    if (!session || session.revokedAt || session.userId !== pointer.userId) {
      await this.redis.del(refreshSessionRedisKey(oldJti)).catch(() => undefined);
      return null;
    }

    await this.prisma.userDeviceSession.update({
      where: { id: session.id },
      data: { refreshTokenId: newJti, lastActiveAt: new Date() },
    });

    await this.redis
      .multi()
      .del(refreshSessionRedisKey(oldJti))
      .set(
        refreshSessionRedisKey(newJti),
        JSON.stringify(pointer),
        'EX',
        REFRESH_TOKEN_TTL_SECONDS,
      )
      .exec();

    return pointer;
  }

  async invalidateByJti(jti: string) {
    await this.redis.del(refreshSessionRedisKey(jti)).catch(() => undefined);
  }

  /** Used by Settings' device-revoke endpoints. */
  async invalidateSession(sessionId: string) {
    const session = await this.prisma.userDeviceSession.findUnique({
      where: { id: sessionId },
      select: { refreshTokenId: true },
    });

    if (session?.refreshTokenId) {
      await this.invalidateByJti(session.refreshTokenId);
    }
  }

  async invalidateAllOtherSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.userDeviceSession.findMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
      select: { id: true, refreshTokenId: true },
    });

    await Promise.all(
      sessions
        .filter((session) => session.refreshTokenId)
        .map((session) => this.invalidateByJti(session.refreshTokenId as string)),
    );
  }

  private async pointJti(jti: string, pointer: SessionPointer) {
    await this.redis.set(
      refreshSessionRedisKey(jti),
      JSON.stringify(pointer),
      'EX',
      REFRESH_TOKEN_TTL_SECONDS,
    );
  }

  private async getPointer(jti: string): Promise<SessionPointer | null> {
    const raw = await this.redis.get(refreshSessionRedisKey(jti)).catch(() => null);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as SessionPointer;
    } catch {
      this.logger.warn(`Corrupted session pointer for jti=${jti}`);
      return null;
    }
  }

  /**
   * Minimal, dependency-free User-Agent parsing used only for display
   * purposes in the device list. Not meant to be exhaustive.
   */
  private parseUserAgent(userAgent?: string | null) {
    const ua = userAgent || '';

    const os = /windows/i.test(ua)
      ? 'Windows'
      : /mac os|macintosh/i.test(ua)
        ? 'macOS'
        : /android/i.test(ua)
          ? 'Android'
          : /iphone|ipad|ios/i.test(ua)
            ? 'iOS'
            : /linux/i.test(ua)
              ? 'Linux'
              : null;

    const browser = /edg\//i.test(ua)
      ? 'Edge'
      : /chrome\//i.test(ua)
        ? 'Chrome'
        : /firefox\//i.test(ua)
          ? 'Firefox'
          : /safari\//i.test(ua) && !/chrome\//i.test(ua)
            ? 'Safari'
            : null;

    const isMobile = /mobile/i.test(ua);
    const deviceName = [browser, os].filter(Boolean).join(' on ') ||
      (isMobile ? 'Mobile device' : 'Unknown device');

    return { deviceName, browser, os };
  }
}

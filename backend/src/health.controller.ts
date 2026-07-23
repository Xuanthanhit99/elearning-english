import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness() {
    const checks: Record<string, boolean> = {
      postgres: false,
      redis: false,
      arenaSeason: true,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = true;
      if (process.env.ARENA_SEASON_ENABLED !== 'false') {
        const activeSeason = await this.prisma.arenaSeason.findFirst({
          where: {
            isActive: true,
            status: 'ACTIVE',
            startsAt: { lte: new Date() },
            endsAt: { gt: new Date() },
          },
          select: { id: true },
        });
        checks.arenaSeason = Boolean(activeSeason);
      }
    } catch {
      checks.postgres = false;
      checks.arenaSeason = false;
    }

    const redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 1000,
      retryStrategy: null,
    });
    redis.on('error', () => undefined);
    try {
      checks.redis =
        (await Promise.race([
          (async () => {
            await redis.connect();
            return redis.ping();
          })(),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Redis readiness timeout')), 1500),
          ),
        ])) === 'PONG';
    } catch {
      checks.redis = false;
    } finally {
      await redis.quit().catch(() => undefined);
    }

    const ready = Object.values(checks).every(Boolean);
    if (!ready) {
      throw new ServiceUnavailableException({
        message: 'Service is not ready.',
        error: 'SERVICE_NOT_READY',
        checks,
      });
    }
    return {
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

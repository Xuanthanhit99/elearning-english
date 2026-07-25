import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import {
  FEATURE_FLAG_KEYS,
  FeatureFlagKey,
  KNOWN_FEATURE_FLAGS,
} from './feature-flags.constants';

const PUBLIC_FLAGS_CACHE_KEY = 'feature-flags:public';
const PUBLIC_FLAGS_CACHE_TTL_SECONDS = 60;

/**
 * Real, DB-backed feature flags — replaces admin-dashboard's previous
 * hardcoded, non-persisted `getFeatureFlags()` stub. Boolean-only by
 * design (Part 11: "avoid overengineering"); a short Redis cache sits in
 * front of the public read path since it's meant to be checked on hot
 * paths (e.g. "is AI_CONVERSATION enabled" on every conversation start).
 */
@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCache: RedisCacheService,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    for (const flag of KNOWN_FEATURE_FLAGS) {
      await this.prisma.featureFlag.upsert({
        where: { key: flag.key },
        create: {
          key: flag.key,
          description: flag.description,
          isEnabled: true,
        },
        // Never overwrite an admin's chosen isEnabled value on redeploy —
        // only backfill description in case it changed in code.
        update: { description: flag.description },
      });
    }
  }

  /** Admin view — every known flag, including who last changed it. */
  async listAll() {
    const rows = await this.prisma.featureFlag.findMany({
      where: { key: { in: FEATURE_FLAG_KEYS } },
      orderBy: { key: 'asc' },
      include: {
        updatedBy: { select: { id: true, fullname: true, email: true } },
      },
    });
    return rows.map((r) => ({
      key: r.key,
      description: r.description,
      isEnabled: r.isEnabled,
      updatedAt: r.updatedAt,
      updatedBy: r.updatedBy,
      runtimeWritable: true,
    }));
  }

  /** Frontend-safe subset — key -> boolean only, nothing else. */
  async getPublicFlags(): Promise<Record<string, boolean>> {
    const cached = await this.redisCache.get(PUBLIC_FLAGS_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Record<string, boolean>;
        return parsed;
      } catch {
        // corrupted entry — fall through and recompute
      }
    }

    const rows = await this.prisma.featureFlag.findMany({
      where: { key: { in: FEATURE_FLAG_KEYS } },
      select: { key: true, isEnabled: true },
    });
    const flags = Object.fromEntries(rows.map((r) => [r.key, r.isEnabled]));

    await this.redisCache.set(
      PUBLIC_FLAGS_CACHE_KEY,
      JSON.stringify(flags),
      PUBLIC_FLAGS_CACHE_TTL_SECONDS,
    );
    return flags;
  }

  /**
   * Single-flag check for feature code to gate on (e.g. an emergency AI
   * kill switch). Fails OPEN (treats an unreadable flag as enabled) on any
   * Redis/DB error — same "never cost availability over a cache/DB
   * hiccup" discipline as RedisCacheService/AuthSessionService.isBanned
   * elsewhere in this codebase. A real outage should degrade to "features
   * behave as if flags didn't exist", not silently disable the platform.
   */
  async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    try {
      const flags = await this.getPublicFlags();
      return flags[key] ?? true;
    } catch (error) {
      this.logger.warn(
        `Feature flag check failed for key=${key}, failing open: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return true;
    }
  }

  async setEnabled(key: string, isEnabled: boolean, actorId: string) {
    if (!FEATURE_FLAG_KEYS.includes(key as FeatureFlagKey)) {
      throw new BadRequestException(`Unknown feature flag key: ${key}`);
    }

    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: { isEnabled, updatedById: actorId },
    });

    await this.redisCache.del(PUBLIC_FLAGS_CACHE_KEY);
    return updated;
  }
}

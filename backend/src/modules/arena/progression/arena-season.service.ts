import { ConflictException, Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ArenaSeason, ArenaTier, Prisma, XpSourceType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { XpService } from 'src/modules/leaderboard/xp.service';
import { applyEloDelta, resolveArenaTier } from './arena-rating-engine';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

export const getArenaSeasonEnabled = () => envBool('ARENA_SEASON_ENABLED', true);
export const getArenaSeasonAutoCreate = () => envBool('ARENA_SEASON_AUTO_CREATE', true);
export const getArenaSeasonDurationDays = () => envInt('ARENA_SEASON_DURATION_DAYS', 30);
export const getArenaSeasonTransitionGraceMinutes = () => envInt('ARENA_SEASON_TRANSITION_GRACE_MINUTES', 15);
export const getArenaSeasonMinMatchesForReward = () => envInt('ARENA_SEASON_MIN_MATCHES_FOR_REWARD', 5);
export const getArenaSeasonBaseMmr = () => envInt('ARENA_SEASON_BASE_MMR', 1500);
export const getArenaSeasonResetFactor = () => envFloat('ARENA_SEASON_RESET_FACTOR', 0.5);
export const getArenaRewardsEnabled = () => envBool('ARENA_REWARDS_ENABLED', true);

export type ArenaSeasonLifecycleSummary = {
  activated: number;
  closing: number;
  closed: number;
  created: number;
  rewardsGranted: number;
  rewardsFailed: number;
  resetsApplied: number;
};

const ZERO_SUMMARY: ArenaSeasonLifecycleSummary = {
  activated: 0,
  closing: 0,
  closed: 0,
  created: 0,
  rewardsGranted: 0,
  rewardsFailed: 0,
  resetsApplied: 0,
};

function rewardForTier(tier: ArenaTier, matches: number) {
  if (matches < getArenaSeasonMinMatchesForReward()) {
    return { tier: 'NONE', xp: 0, gold: 0, arenaPoints: 0 };
  }
  const table: Record<ArenaTier, { tier: string; xp: number; gold: number; arenaPoints: number }> = {
    BRONZE: { tier: 'BRONZE', xp: 50, gold: 50, arenaPoints: 10 },
    SILVER: { tier: 'SILVER', xp: 75, gold: 75, arenaPoints: 15 },
    GOLD: { tier: 'GOLD', xp: 100, gold: 100, arenaPoints: 25 },
    PLATINUM: { tier: 'PLATINUM', xp: 150, gold: 150, arenaPoints: 40 },
    DIAMOND: { tier: 'DIAMOND', xp: 220, gold: 220, arenaPoints: 60 },
    MASTER: { tier: 'MASTER', xp: 300, gold: 300, arenaPoints: 90 },
    LEGEND: { tier: 'LEGEND', xp: 400, gold: 400, arenaPoints: 125 },
  };
  return table[tier];
}

function softResetMmr(currentMmr: number) {
  const base = getArenaSeasonBaseMmr();
  return applyEloDelta(base, Math.round((currentMmr - base) * getArenaSeasonResetFactor()));
}

@Injectable()
export class ArenaSeasonService implements OnModuleInit {
  private readonly logger = new Logger(ArenaSeasonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpService,
  ) {}

  async onModuleInit() {
    try {
      await this.runLifecycle();
    } catch (error) {
      this.logger.error(
        `Failed to run Arena season lifecycle at startup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async getActiveSeason(
    client: Pick<PrismaService, 'arenaSeason'> | Prisma.TransactionClient = this.prisma,
  ): Promise<ArenaSeason | null> {
    const now = new Date();
    return client.arenaSeason.findFirst({
      where: {
        isActive: true,
        status: 'ACTIVE',
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  async requireActiveSeason(
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<ArenaSeason | null> {
    if (!getArenaSeasonEnabled()) return null;
    const active = await this.getActiveSeason(client);
    if (!active) {
      throw new ServiceUnavailableException('Arena ranked season is not available right now.');
    }
    return active;
  }

  async ensureActiveSeason(): Promise<ArenaSeason> {
    const existing = await this.getActiveSeason();
    if (existing) return existing;

    if (!getArenaSeasonAutoCreate()) {
      throw new ServiceUnavailableException('No active Arena season is configured.');
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + getArenaSeasonDurationDays() * 24 * 60 * 60 * 1000);
    return this.createSeason({
      name: this.defaultSeasonName(now),
      startsAt: now,
      endsAt,
      activate: true,
    });
  }

  async createSeason(input: {
    name: string;
    startsAt: Date;
    endsAt: Date;
    activate?: boolean;
  }): Promise<ArenaSeason> {
    if (input.endsAt <= input.startsAt) {
      throw new ConflictException('Arena season endsAt must be after startsAt.');
    }
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('arena_season_lifecycle'))`);
        const overlapping = await tx.arenaSeason.findFirst({
          where: {
            status: { in: ['UPCOMING', 'ACTIVE', 'CALCULATING'] },
            startsAt: { lt: input.endsAt },
            endsAt: { gt: input.startsAt },
          },
        });
        if (overlapping) return overlapping;

        const last = await tx.arenaSeason.findFirst({
          orderBy: { seasonNumber: 'desc' },
          select: { seasonNumber: true },
        });
        const seasonNumber = (last?.seasonNumber ?? 0) + 1;
        return tx.arenaSeason.create({
          data: {
            name: input.name,
            seasonCode: `arena-s${seasonNumber}`,
            seasonNumber,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            status: input.activate ? 'ACTIVE' : 'UPCOMING',
            isActive: Boolean(input.activate),
            activatedAt: input.activate ? new Date() : null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async runLifecycle(now = new Date()): Promise<ArenaSeasonLifecycleSummary> {
    if (!getArenaSeasonEnabled()) return { ...ZERO_SUMMARY };

    const summary = { ...ZERO_SUMMARY };
    const closing = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('arena_season_lifecycle'))`);
        const active = await tx.arenaSeason.findFirst({ where: { status: 'ACTIVE', isActive: true } });
        if (active && active.endsAt <= now) {
          const claimed = await tx.arenaSeason.updateMany({
            where: { id: active.id, status: 'ACTIVE', isActive: true },
            data: { status: 'CALCULATING', isActive: false, closingStartedAt: now },
          });
          if (claimed.count > 0) {
            await tx.arenaQueue.deleteMany({});
            summary.closing += 1;
            return active.id;
          }
        }
        return null;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const due = await this.prisma.arenaSeason.findMany({
      where: {
        status: 'CALCULATING',
        endsAt: {
          lte: new Date(now.getTime() - getArenaSeasonTransitionGraceMinutes() * 60 * 1000),
        },
      },
    });
    for (const season of due) {
      const result = await this.finalizeSeason(season.id, now);
      summary.closed += result.closed;
      summary.rewardsGranted += result.rewardsGranted;
      summary.rewardsFailed += result.rewardsFailed;
      summary.resetsApplied += result.resetsApplied;
    }

    const active = await this.getActiveSeason();
    if (!active && getArenaSeasonAutoCreate()) {
      const latest = await this.prisma.arenaSeason.findFirst({ orderBy: { endsAt: 'desc' } });
      const startsAt = latest && latest.endsAt > now ? latest.endsAt : now;
      const endsAt = new Date(startsAt.getTime() + getArenaSeasonDurationDays() * 24 * 60 * 60 * 1000);
      const season = await this.createSeason({
        name: this.defaultSeasonName(startsAt),
        startsAt,
        endsAt,
        activate: startsAt <= now,
      });
      summary.created += 1;
      if (season.isActive) summary.activated += 1;
    }

    if (closing) {
      this.logger.log(`Arena season moved to closing: ${closing}`);
    }
    return summary;
  }

  async finalizeSeason(seasonId: string, now = new Date()) {
    const summary = { closed: 0, rewardsGranted: 0, rewardsFailed: 0, resetsApplied: 0 };
    const season = await this.prisma.arenaSeason.findUnique({ where: { id: seasonId } });
    if (!season || season.status === 'COMPLETED') return summary;

    await this.createSeasonSnapshots(seasonId);
    const results = await this.prisma.arenaSeasonResult.findMany({ where: { seasonId } });
    for (const result of results) {
      if (result.rewardStatus === 'GRANTED' || result.rewardStatus === 'NONE') continue;
      const reward = rewardForTier(result.finalTier, result.matches);
      if (!getArenaRewardsEnabled() || reward.tier === 'NONE') {
        await this.prisma.arenaSeasonResult.update({
          where: { id: result.id },
          data: {
            rewardTier: reward.tier,
            rewardPayload: reward,
            rewardStatus: 'NONE',
            rewardXpStatus: 'SKIPPED',
            rewardGoldStatus: 'SKIPPED',
            rewardArenaPointStatus: 'SKIPPED',
            rewardNotificationStatus: 'SKIPPED',
          },
        });
        continue;
      }
      try {
        await this.grantSeasonRewardComponents(result.id, seasonId, result.userId, reward, now);
        const updated = await this.prisma.arenaSeasonResult.findUniqueOrThrow({ where: { id: result.id } });
        if (updated.rewardStatus === 'GRANTED') summary.rewardsGranted += 1;
        if (updated.rewardStatus === 'FAILED') summary.rewardsFailed += 1;
      } catch (error) {
        await this.prisma.arenaSeasonResult.update({
          where: { id: result.id },
          data: { rewardStatus: 'FAILED', rewardPayload: { reward, error: error instanceof Error ? error.message : String(error) } },
        });
        summary.rewardsFailed += 1;
      }
    }

    const resetResults = await this.prisma.arenaSeasonResult.findMany({
      where: { seasonId, resetNextMmr: null },
      include: { user: { include: { arenaProfile: true } } },
    });
    for (const result of resetResults) {
      const profile = result.user.arenaProfile;
      if (!profile) continue;
      const nextMmr = softResetMmr(profile.mmr);
      await this.prisma.$transaction(async (tx) => {
        await tx.arenaProfile.update({
          where: { userId: result.userId },
          data: {
            mmr: nextMmr,
            tier: resolveArenaTier(nextMmr),
            level: Math.floor(nextMmr / 250),
            seasonWinCount: 0,
            seasonLoseCount: 0,
          },
        });
        await tx.arenaSeasonResult.update({
          where: { id: result.id },
          data: { resetPreviousMmr: profile.mmr, resetNextMmr: nextMmr },
        });
      });
      summary.resetsApplied += 1;
    }

    const failed = await this.prisma.arenaSeasonResult.count({ where: { seasonId, rewardStatus: 'FAILED' } });
    if (failed === 0) {
      const closed = await this.prisma.arenaSeason.updateMany({
        where: { id: seasonId, status: 'CALCULATING' },
        data: {
          status: 'COMPLETED',
          closedAt: now,
          rewardsDistributedAt: now,
          resetAppliedAt: now,
          isActive: false,
        },
      });
      summary.closed += closed.count;
    }

    return summary;
  }

  private async grantSeasonRewardComponents(
    resultId: string,
    seasonId: string,
    userId: string,
    reward: { tier: string; xp: number; gold: number; arenaPoints: number },
    now: Date,
  ) {
    const xpKey = `arena:season:${seasonId}:reward:${userId}:xp`;
    const current = await this.prisma.arenaSeasonResult.findUniqueOrThrow({ where: { id: resultId } });

    if (current.rewardXpStatus !== 'GRANTED') {
      await this.xpService.awardXpWithSideEffects(
        {
          userId,
          sourceType: XpSourceType.ARENA,
          sourceId: seasonId,
          baseXp: reward.xp,
          idempotencyKey: xpKey,
          reason: `Arena season reward ${reward.tier}`,
          metadata: reward,
        },
        async (tx) => {
          await tx.arenaSeasonResult.update({
            where: { id: resultId },
            data: {
              rewardTier: reward.tier,
              rewardPayload: reward,
              rewardXpStatus: 'GRANTED',
            },
          });
        },
      );
      await this.prisma.arenaSeasonResult.updateMany({
        where: { id: resultId, rewardXpStatus: { not: 'GRANTED' } },
        data: { rewardXpStatus: 'GRANTED', rewardPayload: reward },
      });
    }

    this.throwInjectedRewardFailure('gold');
    await this.grantProfileCurrencyComponent(resultId, userId, 'rewardGoldStatus', { gold: { increment: reward.gold } });

    this.throwInjectedRewardFailure('arenaPoint');
    await this.grantProfileCurrencyComponent(resultId, userId, 'rewardArenaPointStatus', { arenaPoint: { increment: reward.arenaPoints } });

    try {
      this.throwInjectedRewardFailure('notification');
      await this.prisma.arenaSeasonResult.updateMany({
        where: { id: resultId, rewardNotificationStatus: { not: 'SKIPPED' } },
        data: { rewardNotificationStatus: 'SKIPPED' },
      });
    } catch (error) {
      await this.prisma.arenaSeasonResult.update({
        where: { id: resultId },
        data: {
          rewardNotificationStatus: 'FAILED',
          rewardStatus: 'FAILED',
          rewardPayload: { reward, error: error instanceof Error ? error.message : String(error) },
        },
      });
      return;
    }

    const latest = await this.prisma.arenaSeasonResult.findUniqueOrThrow({ where: { id: resultId } });
    const balanceGranted =
      latest.rewardXpStatus === 'GRANTED' &&
      latest.rewardGoldStatus === 'GRANTED' &&
      latest.rewardArenaPointStatus === 'GRANTED';
    if (balanceGranted && latest.rewardNotificationStatus !== 'FAILED') {
      await this.prisma.arenaSeasonResult.update({
        where: { id: resultId },
        data: { rewardStatus: 'GRANTED', rewardGrantedAt: now, rewardPayload: reward },
      });
    }
  }

  private async grantProfileCurrencyComponent(
    resultId: string,
    userId: string,
    statusField: 'rewardGoldStatus' | 'rewardArenaPointStatus',
    increment: { gold?: { increment: number }; arenaPoint?: { increment: number } },
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.arenaSeasonResult.updateMany({
          where: { id: resultId, [statusField]: { not: 'GRANTED' } },
          data: { [statusField]: 'GRANTED' },
        });
        if (claimed.count === 0) return;
        await tx.arenaProfile.update({
          where: { userId },
          data: increment,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private throwInjectedRewardFailure(component: 'gold' | 'arenaPoint' | 'notification') {
    if (process.env.ARENA_TEST_FAIL_SEASON_REWARD_COMPONENT === component) {
      throw new Error(`Injected Arena season reward ${component} failure`);
    }
  }

  private async createSeasonSnapshots(seasonId: string) {
    const rows = await this.prisma.arenaRatingHistory.groupBy({
      by: ['userId'],
      where: { seasonId },
      _count: { _all: true },
      _max: { nextMmr: true },
    });
    const ranked = await Promise.all(
      rows.map(async (row) => {
        const [profile, wins, losses] = await Promise.all([
          this.prisma.arenaProfile.findUnique({ where: { userId: row.userId } }),
          this.prisma.arenaRatingHistory.count({
            where: { seasonId, userId: row.userId, mmrDelta: { gt: 0 } },
          }),
          this.prisma.arenaRatingHistory.count({
            where: { seasonId, userId: row.userId, mmrDelta: { lt: 0 } },
          }),
        ]);
        const finalMmr = profile?.mmr ?? row._max.nextMmr ?? 1500;
        return {
          userId: row.userId,
          finalMmr,
          finalTier: profile?.tier ?? resolveArenaTier(finalMmr),
          peakMmr: profile?.peakMmr ?? finalMmr,
          peakTier: profile?.peakTier ?? resolveArenaTier(finalMmr),
          matches: row._count._all,
          wins,
          losses,
        };
      }),
    );
    ranked.sort((a, b) => b.finalMmr - a.finalMmr || b.wins - a.wins || a.matches - b.matches || a.userId.localeCompare(b.userId));

    for (const [index, row] of ranked.entries()) {
      const winRate = row.matches === 0 ? 0 : Math.round((row.wins / row.matches) * 100);
      const reward = rewardForTier(row.finalTier, row.matches);
      await this.prisma.arenaSeasonResult.upsert({
        where: { seasonId_userId: { seasonId, userId: row.userId } },
        update: {},
        create: {
          seasonId,
          userId: row.userId,
          finalMmr: row.finalMmr,
          finalTier: row.finalTier,
          peakMmr: row.peakMmr,
          peakTier: row.peakTier,
          matches: row.matches,
          wins: row.wins,
          losses: row.losses,
          winRate,
          finalRank: index + 1,
          rewardTier: reward.tier,
          rewardPayload: reward,
          rewardStatus: reward.tier === 'NONE' ? 'NONE' : 'PENDING',
        },
      });
    }
  }

  private defaultSeasonName(startsAt: Date) {
    return `Arena Season ${startsAt.getUTCFullYear()}-${String(startsAt.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}

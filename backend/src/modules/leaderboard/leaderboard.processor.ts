import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  LeaderboardSeasonStatus,
  LeaderboardZone,
  LeagueTier,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LEADERBOARD_QUEUE,
  LEAGUE_CONFIG,
  LEAGUE_ORDER,
} from './leaderboard.constants';

export enum LeaderboardJobName {
  CREATE_WEEKLY_SEASON = 'CREATE_WEEKLY_SEASON',
  CLOSE_WEEKLY_SEASON = 'CLOSE_WEEKLY_SEASON',
  RECALCULATE_RANKS = 'RECALCULATE_RANKS',
}

@Processor(LEADERBOARD_QUEUE)
export class LeaderboardProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case LeaderboardJobName.CREATE_WEEKLY_SEASON:
        return this.createWeeklySeason();
      case LeaderboardJobName.CLOSE_WEEKLY_SEASON:
        return this.closeWeeklySeason(job.data.seasonId);
      case LeaderboardJobName.RECALCULATE_RANKS:
        return this.recalculateRanks(job.data.groupId);
      default:
        return null;
    }
  }

  async createWeeklySeason() {
    const { start, end } = this.currentWeekRange();
    const existing = await this.prisma.leaderboardSeason.findFirst({
      where: { periodType: 'WEEKLY', startsAt: start },
    });
    if (existing) return existing;

    await this.prisma.leaderboardSeason.updateMany({
      where: { periodType: 'WEEKLY', isActive: true },
      data: { isActive: false },
    });

    const season = await this.prisma.leaderboardSeason.create({
      data: {
        name: `Tuần ${start.toISOString().slice(0, 10)}`,
        periodType: 'WEEKLY',
        startsAt: start,
        endsAt: end,
        isActive: true,
        status: LeaderboardSeasonStatus.ACTIVE,
      },
    });

    for (const league of LEAGUE_ORDER) {
      await this.prisma.leaderboardGroup.create({
        data: { seasonId: season.id, league, groupNumber: 1, scope: 'GLOBAL' },
      });
    }
    return season;
  }

  async closeWeeklySeason(seasonId: string) {
    const season = await this.prisma.leaderboardSeason.findUnique({
      where: { id: seasonId },
      include: { groups: true },
    });
    if (!season) return null;

    await this.prisma.leaderboardSeason.update({
      where: { id: seasonId },
      data: { status: LeaderboardSeasonStatus.CALCULATING, isActive: false },
    });

    for (const group of season.groups) {
      await this.recalculateRanks(group.id);
      await this.finalizeGroup(group.id, seasonId, group.league);
    }

    return this.prisma.leaderboardSeason.update({
      where: { id: seasonId },
      data: { status: LeaderboardSeasonStatus.COMPLETED },
    });
  }

  async recalculateRanks(groupId: string) {
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: { groupId },
      orderBy: [{ periodXp: 'desc' }, { lastXpAt: 'asc' }, { joinedAt: 'asc' }],
    });

    await this.prisma.$transaction(
      entries.map((entry, index) => {
        const rank = index + 1;
        const zone =
          rank <= LEAGUE_CONFIG.promotionCount
            ? LeaderboardZone.PROMOTION
            : rank >
                Math.max(
                  LEAGUE_CONFIG.promotionCount,
                  entries.length - LEAGUE_CONFIG.relegationCount,
                )
              ? LeaderboardZone.RELEGATION
              : LeaderboardZone.SAFE;

        return this.prisma.leaderboardEntry.update({
          where: { id: entry.id },
          data: { previousRank: entry.rank, rank, zone },
        });
      }),
    );
    return entries.length;
  }

  private async finalizeGroup(
    groupId: string,
    seasonId: string,
    league: LeagueTier,
  ) {
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: { groupId },
      orderBy: { rank: 'asc' },
      include: { xpProfile: true },
    });

    for (const entry of entries) {
      const rank = entry.rank ?? entries.length;
      const promoted =
        rank <= LEAGUE_CONFIG.promotionCount && league !== LeagueTier.LEGEND;
      const relegated =
        rank >
          Math.max(
            LEAGUE_CONFIG.promotionCount,
            entries.length - LEAGUE_CONFIG.relegationCount,
          ) && league !== LeagueTier.BRONZE;

      await this.prisma.$transaction(async (tx) => {
        await tx.leaderboardEntry.update({
          where: { id: entry.id },
          data: { promoted, relegated },
        });

        await tx.leaderboardHistory.upsert({
          where: { userId_seasonId: { userId: entry.userId, seasonId } },
          create: {
            userId: entry.userId,
            xpProfileId: entry.xpProfileId,
            seasonId,
            league,
            finalRank: rank,
            periodXp: entry.periodXp,
            promoted,
            relegated,
          },
          update: {
            finalRank: rank,
            periodXp: entry.periodXp,
            promoted,
            relegated,
          },
        });

        const nextLeague = promoted
          ? this.shiftLeague(league, 1)
          : relegated
            ? this.shiftLeague(league, -1)
            : league;

        await tx.userXpProfile.update({
          where: { id: entry.xpProfileId },
          data: { currentLeague: nextLeague },
        });

        const reward = await tx.leaderboardReward.findFirst({
          where: {
            isActive: true,
            minRank: {
              lte: rank,
            },
            maxRank: {
              gte: rank,
            },
            AND: [
              {
                OR: [{ seasonId }, { seasonId: null }],
              },
              {
                OR: [{ league }, { league: null }],
              },
            ],
          },
        });

        if (reward) {
          await tx.userLeaderboardReward.upsert({
            where: {
              userId_rewardId_seasonId: {
                userId: entry.userId,
                rewardId: reward.id,
                seasonId,
              },
            },
            create: {
              userId: entry.userId,
              xpProfileId: entry.xpProfileId,
              rewardId: reward.id,
              seasonId,
            },
            update: {},
          });
        }
      });
    }
  }

  private shiftLeague(current: LeagueTier, delta: number) {
    const index = LEAGUE_ORDER.indexOf(current);
    return LEAGUE_ORDER[
      Math.max(0, Math.min(LEAGUE_ORDER.length - 1, index + delta))
    ];
  }

  private currentWeekRange() {
    const now = new Date();
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() + diffToMonday);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);
    return { start, end };
  }
}

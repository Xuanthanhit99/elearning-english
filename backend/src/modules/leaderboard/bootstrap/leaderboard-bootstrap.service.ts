import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  LeaderboardPeriodType,
  LeaderboardScopeType,
  LeaderboardSeasonStatus,
  LeaderboardZone,
  LeagueTier,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  LEAGUE_ORDER,
  LEAGUE_RULES,
} from '../background-job/leaderboard-phase3.constants';

@Injectable()
export class LeaderboardBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LeaderboardBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.ensureCurrentWeeklySeason();
      await this.assignMissingProfiles();
      await this.recoverStuckCalculatingSeasons();
    } catch (error) {
      this.logger.error(
        'Leaderboard bootstrap failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async ensureCurrentWeeklySeason() {
    const now = new Date();
    const active = await this.prisma.leaderboardSeason.findFirst({
      where: {
        periodType: LeaderboardPeriodType.WEEKLY,
        status: LeaderboardSeasonStatus.ACTIVE,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { startsAt: 'desc' },
    });

    if (active) {
      await this.ensureSeasonGroups(active.id);
      return { created: false, season: active };
    }

    const { startsAt, endsAt } = this.currentUtcWeek(now);
    const season = await this.prisma.$transaction(
      async (tx) => {
        const existed = await tx.leaderboardSeason.findFirst({
          where: { periodType: LeaderboardPeriodType.WEEKLY, startsAt, endsAt },
        });
        if (existed) {
          return tx.leaderboardSeason.update({
            where: { id: existed.id },
            data: { status: LeaderboardSeasonStatus.ACTIVE, isActive: true },
          });
        }
        return tx.leaderboardSeason.create({
          data: {
            name: `Bảng xếp hạng tuần ${startsAt.toISOString().slice(0, 10)}`,
            periodType: LeaderboardPeriodType.WEEKLY,
            startsAt,
            endsAt,
            status: LeaderboardSeasonStatus.ACTIVE,
            isActive: true,
            metadata: { generatedBy: 'leaderboard-bootstrap' },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.ensureSeasonGroups(season.id);
    return { created: true, season };
  }

  async ensureSeasonGroups(seasonId: string) {
    const count = await this.prisma.leaderboardGroup.count({
      where: { seasonId, scope: LeaderboardScopeType.GLOBAL },
    });
    if (count > 0) return { created: false, groupCount: count };

    const profiles = await this.prisma.userXpProfile.findMany({
      where: { optedOut: false },
      select: { id: true, userId: true, currentLeague: true, totalXp: true },
      orderBy: [
        { currentLeague: 'asc' },
        { totalXp: 'desc' },
        { userId: 'asc' },
      ],
    });

    let groups = 0;
    let entries = 0;
    for (const league of LEAGUE_ORDER) {
      const members = profiles.filter((p) => p.currentLeague === league);
      const maxMembers = LEAGUE_RULES[league].maxMembers;
      for (
        let offset = 0, groupNumber = 1;
        offset < members.length;
        offset += maxMembers, groupNumber++
      ) {
        const chunk = members.slice(offset, offset + maxMembers);
        const group = await this.prisma.leaderboardGroup.create({
          data: {
            seasonId,
            scope: LeaderboardScopeType.GLOBAL,
            league,
            groupNumber,
            maxMembers,
          },
        });
        groups++;
        const result = await this.prisma.leaderboardEntry.createMany({
          data: chunk.map((p) => ({
            groupId: group.id,
            userId: p.userId,
            xpProfileId: p.id,
            periodXp: 0,
            zone: LeaderboardZone.SAFE,
          })),
          skipDuplicates: true,
        });
        entries += result.count;
      }
    }
    return { created: true, groups, entries };
  }

  async assignMissingProfiles() {
    const active = await this.ensureCurrentWeeklySeason();
    const seasonId = active.season.id;
    const profiles = await this.prisma.userXpProfile.findMany({
      where: {
        optedOut: false,
        entries: {
          none: { group: { seasonId, scope: LeaderboardScopeType.GLOBAL } },
        },
      },
      select: { id: true, userId: true, currentLeague: true },
    });

    for (const profile of profiles) {
      await this.assignOneProfile(seasonId, profile);
    }
    return { assigned: profiles.length };
  }

  async recoverStuckCalculatingSeasons() {
    const threshold = new Date(Date.now() - 30 * 60 * 1000);
    const result = await this.prisma.leaderboardSeason.updateMany({
      where: {
        status: LeaderboardSeasonStatus.CALCULATING,
        updatedAt: { lte: threshold },
      },
      data: { status: LeaderboardSeasonStatus.ACTIVE, isActive: true },
    });
    if (result.count)
      this.logger.warn(`Recovered ${result.count} stuck season(s).`);
    return { recovered: result.count };
  }

  private async assignOneProfile(
    seasonId: string,
    profile: { id: string; userId: string; currentLeague: LeagueTier },
  ) {
    const groups = await this.prisma.leaderboardGroup.findMany({
      where: {
        seasonId,
        scope: LeaderboardScopeType.GLOBAL,
        league: profile.currentLeague,
      },
      include: { _count: { select: { entries: true } } },
      orderBy: { groupNumber: 'asc' },
    });

    let group = groups.find((g) => g._count.entries < g.maxMembers);
    if (!group) {
      group = await this.prisma.leaderboardGroup.create({
        data: {
          seasonId,
          scope: LeaderboardScopeType.GLOBAL,
          league: profile.currentLeague,
          groupNumber: (groups.at(-1)?.groupNumber ?? 0) + 1,
          maxMembers: LEAGUE_RULES[profile.currentLeague].maxMembers,
        },
        include: { _count: { select: { entries: true } } },
      });
    }

    await this.prisma.leaderboardEntry.upsert({
      where: { groupId_userId: { groupId: group.id, userId: profile.userId } },
      update: {},
      create: {
        groupId: group.id,
        userId: profile.userId,
        xpProfileId: profile.id,
        periodXp: 0,
        zone: LeaderboardZone.SAFE,
      },
    });
  }

  private currentUtcWeek(value: Date) {
    const date = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
    const day = date.getUTCDay() || 7;
    const startsAt = new Date(date);
    startsAt.setUTCDate(startsAt.getUTCDate() - day + 1);
    startsAt.setUTCHours(0, 0, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setUTCDate(endsAt.getUTCDate() + 7);
    return { startsAt, endsAt };
  }
}

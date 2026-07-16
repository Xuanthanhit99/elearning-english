import { Injectable, Logger } from '@nestjs/common';
import {
  LeaderboardPeriodType,
  LeaderboardRewardStatus,
  LeaderboardScopeType,
  LeaderboardSeasonStatus,
  LeaderboardZone,
  LeagueTier,
  Prisma,
} from '@prisma/client';
import {
  LEAGUE_ORDER,
  LEAGUE_RULES,
  resolveZone,
} from './leaderboard-phase3.constants';
import { LeaderboardRealtimeGateway } from './leaderboard-realtime.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';

type ClosedEntry = {
  userId: string;
  xpProfileId: string;
  groupId: string;
  league: LeagueTier;
  nextLeague: LeagueTier;
  rank: number;
  periodXp: number;
  zone: LeaderboardZone;
  promoted: boolean;
  relegated: boolean;
};

@Injectable()
export class LeaderboardWeeklyCloseService {
  private readonly logger = new Logger(LeaderboardWeeklyCloseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: LeaderboardRealtimeGateway,
  ) {}

  async closeExpiredWeeklySeason() {
    const season = await this.prisma.leaderboardSeason.findFirst({
      where: {
        periodType: LeaderboardPeriodType.WEEKLY,
        status: LeaderboardSeasonStatus.ACTIVE,
        isActive: true,
        endsAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        endsAt: 'asc',
      },
    });

    if (!season) {
      return {
        skipped: true,
        reason: 'Không có bảng xếp hạng tuần đã hết hạn.',
      };
    }

    /*
     * LeaderboardHistory đã unique(userId, seasonId).
     * Nếu có history nghĩa là season đã được chốt.
     */
    const historyCount = await this.prisma.leaderboardHistory.count({
      where: {
        seasonId: season.id,
      },
    });

    if (historyCount > 0) {
      return {
        skipped: true,
        reason: 'Season này đã được chốt trước đó.',
        seasonId: season.id,
      };
    }

    await this.prisma.leaderboardSeason.update({
      where: {
        id: season.id,
      },
      data: {
        status: LeaderboardSeasonStatus.CALCULATING,
      },
    });

    const groups = await this.prisma.leaderboardGroup.findMany({
      where: {
        seasonId: season.id,
        scope: LeaderboardScopeType.GLOBAL,
      },
      include: {
        entries: {
          orderBy: [
            {
              periodXp: 'desc',
            },
            {
              lastXpAt: 'asc',
            },
            {
              joinedAt: 'asc',
            },
          ],
        },
      },
      orderBy: [
        {
          league: 'asc',
        },
        {
          groupNumber: 'asc',
        },
      ],
    });

    const closedEntries: ClosedEntry[] = [];

    for (const group of groups) {
      const total = group.entries.length;

      for (let index = 0; index < group.entries.length; index += 1) {
        const entry = group.entries[index];
        const rank = index + 1;
        const zone = resolveZone({
          rank,
          total,
          league: group.league,
        });

        const promoted = zone === LeaderboardZone.PROMOTION;

        const relegated = zone === LeaderboardZone.RELEGATION;

        closedEntries.push({
          userId: entry.userId,
          xpProfileId: entry.xpProfileId,
          groupId: group.id,
          league: group.league,
          nextLeague: this.moveLeague(group.league, promoted, relegated),
          rank,
          periodXp: entry.periodXp,
          zone,
          promoted,
          relegated,
        });
      }
    }

    try {
      await this.prisma.$transaction(
        async (tx) => {
          for (const item of closedEntries) {
            await tx.leaderboardEntry.update({
              where: {
                groupId_userId: {
                  groupId: item.groupId,
                  userId: item.userId,
                },
              },
              data: {
                previousRank: null,
                rank: item.rank,
                zone: item.zone,
                promoted: item.promoted,
                relegated: item.relegated,
              },
            });

            await tx.leaderboardHistory.create({
              data: {
                userId: item.userId,
                xpProfileId: item.xpProfileId,
                seasonId: season.id,
                league: item.league,
                finalRank: item.rank,
                periodXp: item.periodXp,
                promoted: item.promoted,
                relegated: item.relegated,
              },
            });

            await tx.userXpProfile.update({
              where: {
                id: item.xpProfileId,
              },
              data: {
                currentLeague: item.nextLeague,
              },
            });
          }

          await this.createUserRewards(tx, season.id, closedEntries);

          await tx.leaderboardSeason.update({
            where: {
              id: season.id,
            },
            data: {
              status: LeaderboardSeasonStatus.COMPLETED,
              isActive: false,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      /*
       * Nếu transaction chốt tuần lỗi, đưa season về ACTIVE
       * để scheduler có thể thử lại.
       */
      await this.prisma.leaderboardSeason.update({
        where: {
          id: season.id,
        },
        data: {
          status: LeaderboardSeasonStatus.ACTIVE,
          isActive: true,
        },
      });

      throw error;
    }

    const nextSeason = await this.createOrGetNextWeeklySeason(season.endsAt);

    await this.assignProfilesToSeason(nextSeason.id);

    await this.notifyWeeklyResults(season.id, closedEntries);

    this.realtime.emitSeasonStarted({
      seasonId: nextSeason.id,
      name: nextSeason.name,
      startsAt: nextSeason.startsAt,
      endsAt: nextSeason.endsAt,
    });

    return {
      skipped: false,
      closedSeasonId: season.id,
      nextSeasonId: nextSeason.id,
      groups: groups.length,
      users: closedEntries.length,
    };
  }

  private async createUserRewards(
    tx: Prisma.TransactionClient,
    seasonId: string,
    entries: ClosedEntry[],
  ) {
    const rewards = await tx.leaderboardReward.findMany({
      where: {
        isActive: true,
        OR: [
          {
            seasonId,
          },
          {
            seasonId: null,
          },
        ],
      },
      orderBy: {
        minRank: 'asc',
      },
    });

    for (const entry of entries) {
      const matchedRewards = rewards.filter(
        (reward) =>
          entry.rank >= reward.minRank &&
          entry.rank <= reward.maxRank &&
          (!reward.league || reward.league === entry.league),
      );

      for (const reward of matchedRewards) {
        await tx.userLeaderboardReward.upsert({
          where: {
            userId_rewardId_seasonId: {
              userId: entry.userId,
              rewardId: reward.id,
              seasonId,
            },
          },
          update: {
            status: LeaderboardRewardStatus.AVAILABLE,

            payload: this.toJsonInput(reward.rewardValue),

            expiresAt: this.addDays(new Date(), 30),
          },
          create: {
            userId: entry.userId,
            xpProfileId: entry.xpProfileId,
            rewardId: reward.id,
            seasonId,

            status: LeaderboardRewardStatus.AVAILABLE,

            payload: this.toJsonInput(reward.rewardValue),

            expiresAt: this.addDays(new Date(), 30),
          },
        });
      }
    }
  }

  private async createOrGetNextWeeklySeason(startsAtValue: Date) {
    const startsAt = new Date(startsAtValue);
    const endsAt = new Date(startsAt);

    endsAt.setUTCDate(endsAt.getUTCDate() + 7);

    const existing = await this.prisma.leaderboardSeason.findFirst({
      where: {
        periodType: LeaderboardPeriodType.WEEKLY,
        startsAt,
        endsAt,
      },
    });

    if (existing) {
      if (
        !existing.isActive ||
        existing.status !== LeaderboardSeasonStatus.ACTIVE
      ) {
        return this.prisma.leaderboardSeason.update({
          where: {
            id: existing.id,
          },
          data: {
            isActive: true,
            status: LeaderboardSeasonStatus.ACTIVE,
          },
        });
      }

      return existing;
    }

    return this.prisma.leaderboardSeason.create({
      data: {
        name: `Bảng xếp hạng tuần ${this.weekLabel(startsAt)}`,
        periodType: LeaderboardPeriodType.WEEKLY,
        startsAt,
        endsAt,
        status: LeaderboardSeasonStatus.ACTIVE,
        isActive: true,
        metadata: {
          generatedBy: 'leaderboard-phase-3',
        },
      },
    });
  }

  private async assignProfilesToSeason(seasonId: string) {
    const existingGroups = await this.prisma.leaderboardGroup.count({
      where: {
        seasonId,
        scope: LeaderboardScopeType.GLOBAL,
      },
    });

    if (existingGroups > 0) {
      return;
    }

    const profiles = await this.prisma.userXpProfile.findMany({
      where: {
        optedOut: false,
      },
      select: {
        id: true,
        userId: true,
        currentLeague: true,
        totalXp: true,
      },
      orderBy: [
        {
          currentLeague: 'asc',
        },
        {
          totalXp: 'desc',
        },
      ],
    });

    for (const league of LEAGUE_ORDER) {
      const leagueProfiles = profiles.filter(
        (profile) => profile.currentLeague === league,
      );

      const maxMembers = LEAGUE_RULES[league].maxMembers;

      for (
        let offset = 0, groupNumber = 1;
        offset < leagueProfiles.length;
        offset += maxMembers, groupNumber += 1
      ) {
        const chunk = leagueProfiles.slice(offset, offset + maxMembers);

        const group = await this.prisma.leaderboardGroup.create({
          data: {
            seasonId,
            scope: LeaderboardScopeType.GLOBAL,
            league,
            groupNumber,
            maxMembers,
          },
        });

        await this.prisma.leaderboardEntry.createMany({
          data: chunk.map((profile) => ({
            groupId: group.id,
            userId: profile.userId,
            xpProfileId: profile.id,
            periodXp: 0,
            zone: LeaderboardZone.SAFE,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  private async notifyWeeklyResults(seasonId: string, entries: ClosedEntry[]) {
    for (const item of entries) {
      const movementText = item.promoted
        ? `Bạn đã thăng lên ${item.nextLeague}.`
        : item.relegated
          ? `Bạn đã chuyển xuống ${item.nextLeague}.`
          : `Bạn tiếp tục ở ${item.nextLeague}.`;

      try {
        await this.notifications.createFromPayload({
          userId: item.userId,
          type: 'ACHIEVEMENT',
          title: `Kết quả tuần: hạng #${item.rank}`,
          message: `Bạn đạt ${item.periodXp} XP trong tuần. ` + movementText,
          href: '/leaderboard',
        });
      } catch (error) {
        this.logger.error(
          `Weekly notification failed: ${item.userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      this.realtime.emitWeeklyResult(item.userId, {
        seasonId,
        rank: item.rank,
        periodXp: item.periodXp,
        league: item.league,
        nextLeague: item.nextLeague,
        promoted: item.promoted,
        relegated: item.relegated,
        zone: item.zone,
      });
    }
  }

  private moveLeague(
    current: LeagueTier,
    promoted: boolean,
    relegated: boolean,
  ) {
    const index = LEAGUE_ORDER.indexOf(current);

    if (promoted) {
      return (
        LEAGUE_ORDER[Math.min(index + 1, LEAGUE_ORDER.length - 1)] ?? current
      );
    }

    if (relegated) {
      return LEAGUE_ORDER[Math.max(index - 1, 0)] ?? current;
    }

    return current;
  }

  private addDays(value: Date, days: number) {
    const result = new Date(value);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private weekLabel(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private toJsonInput(
    value: Prisma.JsonValue,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }
}

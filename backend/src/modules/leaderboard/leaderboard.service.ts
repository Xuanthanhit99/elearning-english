import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaderboardPeriodType,
  LeaderboardRewardStatus,
  LeaderboardScopeType,
  LeaderboardSeasonStatus,
  LeaderboardZone,
  LearningSkill,
} from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LEADERBOARD_REDIS,
  LEAGUE_CONFIG,
  weeklyRedisKey,
} from './leaderboard.constants';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LEADERBOARD_REDIS) private readonly redis: Redis,
  ) {}

  async getWeekly(userId: string, query: LeaderboardQueryDto) {
    const season = await this.activeSeason(LeaderboardPeriodType.WEEKLY);
    if (!season) return this.emptyResponse();

    const entry = await this.prisma.leaderboardEntry.findFirst({
      where: {
        userId,
        group: {
          seasonId: season.id,
          scope: LeaderboardScopeType.GLOBAL,
          ...(query.league ? { league: query.league } : {}),
        },
      },
      include: { group: true },
    });

    if (!entry) {
      return {
        ...this.emptyResponse(),
        period: season,
        message:
          'Bạn chưa tham gia bảng xếp hạng tuần này. Hoàn thành một bài học để tham gia.',
      };
    }

    return this.readGroup(
      season,
      entry.groupId,
      userId,
      query.page ?? 1,
      query.limit ?? 30,
    );
  }

  async getMonthly(userId: string, query: LeaderboardQueryDto) {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    const rows = await this.prisma.xpTransaction.groupBy({
      by: ['userId'],
      where: { earnedAt: { gte: start, lt: end }, finalXp: { gt: 0 } },
      _sum: { finalXp: true },
      orderBy: { _sum: { finalXp: 'desc' } },
      take: query.limit ?? 30,
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 30),
    });

    return this.hydrateAggregate(rows, userId, {
      type: 'MONTHLY',
      startsAt: start,
      endsAt: end,
    });
  }

  async getSkill(
    userId: string,
    skill: LearningSkill,
    query: LeaderboardQueryDto,
  ) {
    const season = await this.activeSeason(LeaderboardPeriodType.WEEKLY);
    if (!season) return this.emptyResponse();

    const rows = await this.prisma.xpTransaction.groupBy({
      by: ['userId'],
      where: {
        skill,
        earnedAt: { gte: season.startsAt, lt: season.endsAt },
        finalXp: { gt: 0 },
      },
      _sum: { finalXp: true },
      orderBy: { _sum: { finalXp: 'desc' } },
      take: query.limit ?? 30,
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 30),
    });

    return this.hydrateAggregate(rows, userId, { ...season, skill });
  }

  async getFriends(userId: string, query: LeaderboardQueryDto) {
    const friendIds = await this.getFriendIds(userId);

    const participantIds = Array.from(new Set([userId, ...friendIds]));

    if (!participantIds.length) {
      return {
        period: null,
        currentUser: null,
        entries: [],
        message: 'Bạn chưa có bạn bè.',
      };
    }

    const season = await this.activeSeason(LeaderboardPeriodType.WEEKLY);

    if (!season) {
      return {
        period: null,
        currentUser: null,
        entries: [],
        message: 'Chưa có mùa bảng xếp hạng đang hoạt động.',
      };
    }

    const xpRows = await this.prisma.xpTransaction.groupBy({
      by: ['userId'],

      where: {
        userId: {
          in: participantIds,
        },

        earnedAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },

        reversedAt: null,
      },

      _sum: {
        finalXp: true,
      },
    });

    return this.buildSocialLeaderboard({
      participantIds,
      currentUserId: userId,
      xpRows,
      period: {
        ...season,
        scope: 'FRIENDS',
      },
      page: query.page ?? 1,
      limit: query.limit ?? 30,
    });
  }

  async getClub(userId: string, clubId: string, query: LeaderboardQueryDto) {
    const membership = await this.prisma.communityClubMember.findFirst({
      where: {
        userId,
        clubId,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của câu lạc bộ này',
      );
    }

    const club = await this.prisma.communityClub.findUnique({
      where: {
        id: clubId,
      },

      select: {
        id: true,
        name: true,
        iconUrl: true,
        coverUrl: true,
      },
    });

    if (!club) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    const members = await this.prisma.communityClubMember.findMany({
      where: {
        clubId,
      },

      select: {
        userId: true,
      },
    });

    const participantIds = Array.from(
      new Set(members.map((member) => member.userId)),
    );

    const season = await this.activeSeason(LeaderboardPeriodType.WEEKLY);

    if (!season) {
      return {
        period: null,
        currentUser: null,
        entries: [],
        club,
        message: 'Chưa có mùa bảng xếp hạng đang hoạt động.',
      };
    }

    const xpRows = await this.prisma.xpTransaction.groupBy({
      by: ['userId'],

      where: {
        userId: {
          in: participantIds,
        },

        earnedAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },

        reversedAt: null,
      },

      _sum: {
        finalXp: true,
      },
    });

    const leaderboard = await this.buildSocialLeaderboard({
      participantIds,
      currentUserId: userId,
      xpRows,
      period: {
        ...season,
        scope: 'CLUB',
        clubId,
      },
      page: query.page ?? 1,
      limit: query.limit ?? 30,
    });

    return {
      ...leaderboard,
      club,
    };
  }

  private async buildSocialLeaderboard(input: {
    participantIds: string[];
    currentUserId: string;

    xpRows: Array<{
      userId: string;
      _sum: {
        finalXp: number | null;
      };
    }>;

    period: unknown;
    page: number;
    limit: number;
  }) {
    const { participantIds, currentUserId, xpRows, period, page, limit } =
      input;

    const xpMap = new Map<string, number>(
      xpRows.map((row) => [row.userId, row._sum.finalXp ?? 0]),
    );

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: participantIds,
        },
      },

      select: {
        id: true,
        fullname: true,
        username: true,
        avatar: true,
        level: true,
        englishLevel: true,

        xpProfile: {
          select: {
            currentStreak: true,
            showStreak: true,
            useNickname: true,
            leaderboardName: true,
            optedOut: true,
          },
        },
      },
    });

    const allEntries = users
      .filter((user) => !user.xpProfile?.optedOut)
      .map((user) => ({
        periodXp: Math.max(0, xpMap.get(user.id) ?? 0),

        user: {
          id: user.id,

          displayName:
            user.xpProfile?.useNickname && user.xpProfile.leaderboardName
              ? user.xpProfile.leaderboardName
              : user.fullname,

          username: user.username,
          avatarUrl: user.avatar,
          level: user.level,
          cefrLevel: user.englishLevel,

          streak: user.xpProfile?.showStreak
            ? user.xpProfile.currentStreak
            : null,
        },
      }))
      .sort((a, b) => {
        if (b.periodXp !== a.periodXp) {
          return b.periodXp - a.periodXp;
        }

        return a.user.displayName.localeCompare(b.user.displayName);
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    const currentUser =
      allEntries.find((entry) => entry.user.id === currentUserId) ?? null;

    const start = (page - 1) * limit;
    const entries = allEntries.slice(start, start + limit);

    return {
      period,
      currentUser,
      entries,

      pagination: {
        page,
        limit,
        total: allEntries.length,
        totalPages: Math.max(1, Math.ceil(allEntries.length / limit)),
      },
    };
  }

  async getMe(userId: string) {
    const profile = await this.prisma.userXpProfile.findUnique({
      where: { userId },
      include: {
        entries: {
          where: { group: { season: { isActive: true } } },
          include: { group: { include: { season: true } } },
          take: 1,
        },
      },
    });
    if (!profile) return null;

    const entry = profile.entries[0];
    if (!entry) return { profile, current: null };

    const key = weeklyRedisKey(entry.group.seasonId, entry.groupId);
    const redisRank = await this.redis.zrevrank(key, userId);
    return {
      profile,
      current: {
        season: entry.group.season,
        groupId: entry.groupId,
        rank: redisRank === null ? entry.rank : redisRank + 1,
        periodXp: entry.periodXp,
        zone: entry.zone,
      },
    };
  }

  async getHistory(userId: string) {
    return this.prisma.leaderboardHistory.findMany({
      where: { userId },
      include: { season: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getRewards(userId: string) {
    return this.prisma.userLeaderboardReward.findMany({
      where: { userId },
      include: { reward: true, season: true },
      orderBy: { status: 'asc' },
    });
  }

  async claimReward(userId: string, rewardAssignmentId: string) {
    const assignment = await this.prisma.userLeaderboardReward.findFirst({
      where: { id: rewardAssignmentId, userId },
      include: { reward: true },
    });
    if (!assignment) throw new NotFoundException('Reward not found');
    if (assignment.status !== LeaderboardRewardStatus.AVAILABLE) {
      throw new NotFoundException('Reward is not available');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.userLeaderboardReward.update({
        where: { id: assignment.id },
        data: {
          status: LeaderboardRewardStatus.CLAIMED,
          claimedAt: new Date(),
        },
      });

      const value = assignment.reward.rewardValue as Record<string, number>;
      if (value.xp) {
        const profile = await tx.userXpProfile.upsert({
          where: { userId },
          create: { userId, totalXp: value.xp },
          update: { totalXp: { increment: value.xp } },
        });
        await tx.user.update({
          where: { id: userId },
          data: { xp: profile.totalXp },
        });
      }
      return updated;
    });
  }

  async updatePrivacy(
    userId: string,
    data: {
      optedOut?: boolean;
      showOnline?: boolean;
      showStreak?: boolean;
      useNickname?: boolean;
      leaderboardName?: string | null;
    },
  ) {
    return this.prisma.userXpProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async getMyClubs(userId: string) {
    const memberships = await this.prisma.communityClubMember.findMany({
      where: {
        userId,
      },

      select: {
        clubId: true,
        role: true,
        joinedAt: true,
      },

      orderBy: {
        joinedAt: 'desc',
      },
    });

    if (!memberships.length) {
      return [];
    }

    const clubIds = memberships.map((membership) => membership.clubId);

    const clubs = await this.prisma.communityClub.findMany({
      where: {
        id: {
          in: clubIds,
        },
      },

      select: {
        id: true,
        name: true,
        iconUrl: true,
        coverUrl: true,
      },
    });

    const memberCounts = await this.prisma.communityClubMember.groupBy({
      by: ['clubId'],

      where: {
        clubId: {
          in: clubIds,
        },
      },

      _count: {
        clubId: true,
      },
    });

    const clubMap = new Map(clubs.map((club) => [club.id, club]));

    const countMap = new Map(
      memberCounts.map((item) => [item.clubId, item._count.clubId]),
    );

    return memberships.flatMap((membership) => {
      const club = clubMap.get(membership.clubId);

      if (!club) {
        return [];
      }

      return [
        {
          id: club.id,
          name: club.name,
          iconUrl: club.iconUrl,
          coverUrl: club.coverUrl,
          role: membership.role,
          memberCount: countMap.get(club.id) ?? 0,
        },
      ];
    });
  }

  private async readGroup(
    season: any,
    groupId: string,
    userId: string,
    page: number,
    limit: number,
  ) {
    const key = weeklyRedisKey(season.id, groupId);
    let rankedIds = await this.redis.zrevrange(
      key,
      (page - 1) * limit,
      page * limit - 1,
      'WITHSCORES',
    );

    if (!rankedIds.length) {
      const dbEntries = await this.prisma.leaderboardEntry.findMany({
        where: { groupId },
        orderBy: [{ periodXp: 'desc' }, { lastXpAt: 'asc' }],
      });
      if (dbEntries.length) {
        await this.redis.zadd(
          key,
          ...dbEntries.flatMap((row) => [row.periodXp, row.userId]),
        );
        rankedIds = await this.redis.zrevrange(
          key,
          (page - 1) * limit,
          page * limit - 1,
          'WITHSCORES',
        );
      }
    }

    const pairs: Array<{ userId: string; score: number }> = [];
    for (let i = 0; i < rankedIds.length; i += 2) {
      pairs.push({ userId: rankedIds[i], score: Number(rankedIds[i + 1]) });
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: pairs.map((x) => x.userId) } },
      select: {
        id: true,
        fullname: true,
        username: true,
        avatar: true,
        level: true,
        englishLevel: true,
        xpProfile: {
          select: {
            currentStreak: true,
            showStreak: true,
            useNickname: true,
            leaderboardName: true,
          },
        },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const currentRank = await this.redis.zrevrank(key, userId);
    const currentScore = Number((await this.redis.zscore(key, userId)) ?? 0);
    const above =
      currentRank && currentRank > 0
        ? await this.redis.zrevrange(
            key,
            currentRank - 1,
            currentRank - 1,
            'WITHSCORES',
          )
        : [];

    const entries = pairs.map((pair, index) => {
      const rank = (page - 1) * limit + index + 1;
      const user = userMap.get(pair.userId);
      return {
        rank,
        periodXp: pair.score,
        zone: this.zoneForRank(rank),
        user: user
          ? {
              id: user.id,
              displayName:
                user.xpProfile?.useNickname && user.xpProfile.leaderboardName
                  ? user.xpProfile.leaderboardName
                  : user.fullname,
              username: user.username,
              avatarUrl: user.avatar,
              level: user.level,
              cefrLevel: user.englishLevel,
              streak: user.xpProfile?.showStreak
                ? user.xpProfile.currentStreak
                : null,
            }
          : null,
      };
    });

    return {
      period: season,
      groupId,
      league: entries.length
        ? (
            await this.prisma.leaderboardGroup.findUnique({
              where: { id: groupId },
            })
          )?.league
        : null,
      config: LEAGUE_CONFIG,
      currentUser: {
        rank: currentRank === null ? null : currentRank + 1,
        periodXp: currentScore,
        xpToNextRank:
          above.length >= 2
            ? Math.max(0, Number(above[1]) - currentScore + 1)
            : 0,
        zone: currentRank === null ? null : this.zoneForRank(currentRank + 1),
      },
      entries,
    };
  }

  private zoneForRank(rank: number) {
    if (rank <= LEAGUE_CONFIG.promotionCount) return LeaderboardZone.PROMOTION;
    if (rank > LEAGUE_CONFIG.groupSize - LEAGUE_CONFIG.relegationCount) {
      return LeaderboardZone.RELEGATION;
    }
    return LeaderboardZone.SAFE;
  }

  private async hydrateAggregate(
    rows: Array<{
      userId: string;
      _sum: {
        finalXp: number | null;
      };
    }>,
    currentUserId: string,
    period: unknown,
    participantIds?: string[],
  ) {
    const scoreMap = new Map(
      rows.map((row) => [row.userId, row._sum.finalXp ?? 0]),
    );

    const ids = participantIds?.length
      ? participantIds
      : rows.map((row) => row.userId);

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },

      select: {
        id: true,
        fullname: true,
        username: true,
        avatar: true,
        level: true,
        englishLevel: true,

        xpProfile: {
          select: {
            currentStreak: true,
            showStreak: true,
            useNickname: true,
            leaderboardName: true,
            optedOut: true,
          },
        },
      },
    });

    const entries = users
      .filter((user) => !user.xpProfile?.optedOut)
      .map((user) => ({
        userId: user.id,
        periodXp: scoreMap.get(user.id) ?? 0,
        user: {
          id: user.id,

          displayName:
            user.xpProfile?.useNickname && user.xpProfile.leaderboardName
              ? user.xpProfile.leaderboardName
              : user.fullname,

          username: user.username,
          avatarUrl: user.avatar,
          level: user.level,
          cefrLevel: user.englishLevel,

          streak: user.xpProfile?.showStreak
            ? user.xpProfile.currentStreak
            : null,
        },
      }))
      .sort((a, b) => b.periodXp - a.periodXp)
      .map((item, index) => ({
        rank: index + 1,
        periodXp: item.periodXp,
        user: item.user,
      }));

    const currentUser =
      entries.find((entry) => entry.user.id === currentUserId) ?? null;

    return {
      period,
      currentUser,
      entries,
    };
  }

  private async activeSeason(periodType: LeaderboardPeriodType) {
    return this.prisma.leaderboardSeason.findFirst({
      where: {
        periodType,
        isActive: true,
        status: LeaderboardSeasonStatus.ACTIVE,
        startsAt: { lte: new Date() },
        endsAt: { gt: new Date() },
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  private async getFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.prisma.communityFriendship.findMany({
      where: {
        OR: [
          {
            userAId: userId,
          },
          {
            userBId: userId,
          },
        ],
      },

      select: {
        userAId: true,
        userBId: true,
      },
    });

    return Array.from(
      new Set(
        friendships.map((friendship) =>
          friendship.userAId === userId
            ? friendship.userBId
            : friendship.userAId,
        ),
      ),
    );
  }

  private emptyResponse() {
    return { period: null, currentUser: null, entries: [] };
  }
}

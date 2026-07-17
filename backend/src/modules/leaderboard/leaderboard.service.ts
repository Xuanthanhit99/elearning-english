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
        message: 'Bạn chưa tham gia bảng xếp hạng tuần này. Hoàn thành một bài học để tham gia.',
      };
    }

    return this.readGroup(season, entry.groupId, userId, query.page ?? 1, query.limit ?? 30);
  }

  async getMonthly(userId: string, query: LeaderboardQueryDto) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const rows = await this.prisma.xpTransaction.groupBy({
      by: ['userId'],
      where: { earnedAt: { gte: start, lt: end }, finalXp: { gt: 0 } },
      _sum: { finalXp: true },
      orderBy: { _sum: { finalXp: 'desc' } },
      take: query.limit ?? 30,
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 30),
    });

    return this.hydrateAggregate(rows, userId, { type: 'MONTHLY', startsAt: start, endsAt: end });
  }

  async getSkill(userId: string, skill: LearningSkill, query: LeaderboardQueryDto) {
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
    // Thay `communityFollow` bằng model follow thực tế nếu tên khác.
    const friendIds = await this.getFriendIdsSafely(userId);
    const season = await this.activeSeason(LeaderboardPeriodType.WEEKLY);
    if (!season) return this.emptyResponse();

    const rows = await this.prisma.xpTransaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: [userId, ...friendIds] },
        earnedAt: { gte: season.startsAt, lt: season.endsAt },
        finalXp: { gt: 0 },
      },
      _sum: { finalXp: true },
      orderBy: { _sum: { finalXp: 'desc' } },
      take: query.limit ?? 30,
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 30),
    });

    return this.hydrateAggregate(rows, userId, { ...season, scope: 'FRIENDS' });
  }

  async getClub(userId: string, clubId: string, query: LeaderboardQueryDto) {
    // Dùng raw query để dễ đổi tên model ClubMember trong dự án.
    const membership = await this.prisma.communityClubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Bạn không phải thành viên của câu lạc bộ này.');
    }

    const members = await this.prisma.communityClubMember.findMany({
      where: { clubId },
      select: { userId: true },
    });

    const season = await this.activeSeason(LeaderboardPeriodType.WEEKLY);
    if (!season) return this.emptyResponse();

    const rows = await this.prisma.xpTransaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: members.map((m) => m.userId) },
        earnedAt: { gte: season.startsAt, lt: season.endsAt },
        finalXp: { gt: 0 },
      },
      _sum: { finalXp: true },
      orderBy: { _sum: { finalXp: 'desc' } },
      take: query.limit ?? 30,
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 30),
    });

    return this.hydrateAggregate(rows, userId, { ...season, scope: 'CLUB', clubId });
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
        data: { status: LeaderboardRewardStatus.CLAIMED, claimedAt: new Date() },
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

  async updatePrivacy(userId: string, data: {
    optedOut?: boolean;
    showOnline?: boolean;
    showStreak?: boolean;
    useNickname?: boolean;
    leaderboardName?: string | null;
  }) {
    return this.prisma.userXpProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
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
    let rankedIds = await this.redis.zrevrange(key, (page - 1) * limit, page * limit - 1, 'WITHSCORES');

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
        rankedIds = await this.redis.zrevrange(key, (page - 1) * limit, page * limit - 1, 'WITHSCORES');
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
    const above = currentRank && currentRank > 0
      ? await this.redis.zrevrange(key, currentRank - 1, currentRank - 1, 'WITHSCORES')
      : [];

    const entries = pairs.map((pair, index) => {
      const rank = (page - 1) * limit + index + 1;
      const user = userMap.get(pair.userId);
      return {
        rank,
        periodXp: pair.score,
        zone: this.zoneForRank(rank),
        isCurrentUser: pair.userId === userId,
        user: user ? {
          id: user.id,
          displayName:
            user.xpProfile?.useNickname && user.xpProfile.leaderboardName
              ? user.xpProfile.leaderboardName
              : user.fullname,
          username: user.username,
          avatarUrl: user.avatar,
          level: user.level,
          cefrLevel: user.englishLevel,
          streak: user.xpProfile?.showStreak ? user.xpProfile.currentStreak : null,
        } : null,
      };
    });

    return {
      period: season,
      groupId,
      league: entries.length ? (await this.prisma.leaderboardGroup.findUnique({ where: { id: groupId } }))?.league : null,
      config: LEAGUE_CONFIG,
      currentUser: {
        rank: currentRank === null ? null : currentRank + 1,
        periodXp: currentScore,
        xpToNextRank: above.length >= 2 ? Math.max(0, Number(above[1]) - currentScore + 1) : 0,
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

  private async hydrateAggregate(rows: any[], userId: string, period: any) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, fullname: true, username: true, avatar: true, level: true, englishLevel: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));
    const entries = rows.map((r, index) => ({
      rank: index + 1,
      periodXp: r._sum.finalXp ?? 0,
      isCurrentUser: r.userId === userId,
      user: map.get(r.userId),
    }));
    const me = entries.find((e) => e.user?.id === userId) ?? null;
    return { period, currentUser: me, entries };
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

  private async getFriendIdsSafely(userId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT CASE
        WHEN "followerId" = ${userId} THEN "followingId"
        ELSE "followerId"
      END AS id
      FROM "CommunityFollow"
      WHERE "followerId" = ${userId} OR "followingId" = ${userId}
    `.catch(() => [] as Array<{ id: string }>);
    return rows.map((r) => r.id);
  }

  private emptyResponse() {
    return { period: null, currentUser: null, entries: [] };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaderboardActivityType,
  LeaderboardPeriodType,
  Prisma,
  SocialChallengeParticipantStatus,
  SocialChallengeStatus,
  SocialChallengeType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SocialLeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getFriendsLeaderboard(userId: string) {
    const friendIds = await this.getFriendIds(userId);
    const participantIds = [...new Set([userId, ...friendIds])];
    const period = await this.getWeeklyPeriod();
    const xpRows = period
      ? await this.getXpRows(participantIds, period.startsAt, period.endsAt)
      : [];

    return this.buildLeaderboard(
      participantIds,
      userId,
      xpRows,
      period ? { ...period, scope: 'FRIENDS' } : null,
      friendIds.length === 0
        ? 'Bạn chưa có bạn bè. Hãy kết bạn để cùng thi đua.'
        : undefined,
    );
  }

  async getMyClubs(userId: string) {
    const memberships = await this.prisma.communityClubMember.findMany({
      where: { userId },
      select: { clubId: true, role: true, joinedAt: true },
      orderBy: { joinedAt: 'desc' },
    });

    if (!memberships.length) return [];

    const clubIds = memberships.map((item) => item.clubId);
    const [clubs, counts] = await Promise.all([
      this.prisma.communityClub.findMany({
        where: { id: { in: clubIds } },
        select: {
          id: true,
          name: true,
          iconUrl: true,
          coverUrl: true,
        },
      }),
      this.prisma.communityClubMember.groupBy({
        by: ['clubId'],
        where: { clubId: { in: clubIds } },
        _count: { clubId: true },
      }),
    ]);

    const clubMap = new Map(clubs.map((club) => [club.id, club]));
    const countMap = new Map(
      counts.map((row) => [row.clubId, row._count.clubId]),
    );

    return memberships.flatMap((membership) => {
      const club = clubMap.get(membership.clubId);
      if (!club) return [];
      return [
        {
          ...club,
          role: membership.role,
          joinedAt: membership.joinedAt,
          memberCount: countMap.get(club.id) ?? 0,
        },
      ];
    });
  }

  async getClubLeaderboard(userId: string, clubId: string) {
    await this.assertClubMember(userId, clubId);

    const club = await this.prisma.communityClub.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        iconUrl: true,
        coverUrl: true,
      },
    });
    if (!club) throw new NotFoundException('Không tìm thấy câu lạc bộ');

    const members = await this.prisma.communityClubMember.findMany({
      where: { clubId },
      select: { userId: true },
    });

    const participantIds = [...new Set(members.map((m) => m.userId))];
    const period = await this.getWeeklyPeriod();
    const xpRows = period
      ? await this.getXpRows(participantIds, period.startsAt, period.endsAt)
      : [];

    return {
      ...(await this.buildLeaderboard(
        participantIds,
        userId,
        xpRows,
        period ? { ...period, scope: 'CLUB', clubId } : null,
      )),
      club,
    };
  }

  async getFriendsActivity(userId: string, limit = 20) {
    const ids = [...new Set([userId, ...(await this.getFriendIds(userId))])];

    return this.prisma.leaderboardActivity.findMany({
      where: { userId: { in: ids }, isPublic: true },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async getClubActivity(userId: string, clubId: string, limit = 20) {
    await this.assertClubMember(userId, clubId);

    return this.prisma.leaderboardActivity.findMany({
      where: { clubId, isPublic: true },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async createActivity(input: {
    userId: string;
    clubId?: string;
    type: LeaderboardActivityType;
    title: string;
    description?: string;
    xp?: number;
    sourceId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.leaderboardActivity.create({
      data: {
        userId: input.userId,
        clubId: input.clubId,
        type: input.type,
        title: input.title,
        description: input.description,
        xp: input.xp,
        sourceId: input.sourceId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async createChallenge(userId: string, dto: any) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }

    if (dto.type === SocialChallengeType.CLUB) {
      if (!dto.clubId) throw new BadRequestException('Thiếu clubId');
      await this.assertClubMember(userId, dto.clubId);
    } else {
      const friendIds = new Set(await this.getFriendIds(userId));
      if (
        dto.participantIds.some(
          (id: string) => id !== userId && !friendIds.has(id),
        )
      ) {
        throw new BadRequestException('Chỉ được mời người đã kết bạn');
      }
    }

    const participantIds = [...new Set([userId, ...dto.participantIds])];

    return this.prisma.socialChallenge.create({
      data: {
        creatorId: userId,
        clubId: dto.clubId,
        type: dto.type,
        metric: dto.metric,
        title: dto.title,
        description: dto.description,
        targetValue: dto.targetValue,
        startsAt,
        endsAt,
        rewardXp: dto.rewardXp ?? 0,
        status:
          startsAt <= new Date()
            ? SocialChallengeStatus.ACTIVE
            : SocialChallengeStatus.UPCOMING,
        participants: {
          create: participantIds.map((id) => ({
            userId: id,
            status:
              id === userId
                ? SocialChallengeParticipantStatus.ACCEPTED
                : SocialChallengeParticipantStatus.INVITED,
            acceptedAt: id === userId ? new Date() : undefined,
          })),
        },
      },
      include: { participants: true },
    });
  }

  async getMyChallenges(userId: string) {
    return this.prisma.socialChallenge.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullname: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { progress: 'desc' },
        },
      },
      orderBy: [{ status: 'asc' }, { endsAt: 'asc' }],
    });
  }

  async acceptChallenge(userId: string, challengeId: string) {
    const participant = await this.prisma.socialChallengeParticipant.findUnique(
      {
        where: { challengeId_userId: { challengeId, userId } },
      },
    );
    if (!participant)
      throw new NotFoundException('Bạn không thuộc thử thách này');

    return this.prisma.socialChallengeParticipant.update({
      where: { id: participant.id },
      data: {
        status: SocialChallengeParticipantStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  }

  async updateChallengeProgress(
    userId: string,
    metric:
      | 'XP'
      | 'LESSONS'
      | 'SPEAKING'
      | 'WRITING'
      | 'VOCABULARY'
      | 'STREAK'
      | 'MISSIONS',
    incrementBy: number,
  ) {
    if (incrementBy <= 0) return;

    const rows = await this.prisma.socialChallengeParticipant.findMany({
      where: {
        userId,
        status: SocialChallengeParticipantStatus.ACCEPTED,
        challenge: {
          metric,
          status: SocialChallengeStatus.ACTIVE,
          startsAt: { lte: new Date() },
          endsAt: { gt: new Date() },
        },
      },
      include: { challenge: true },
    });

    for (const row of rows) {
      const progress = row.progress + incrementBy;
      const completed = progress >= row.challenge.targetValue;

      await this.prisma.socialChallengeParticipant.update({
        where: { id: row.id },
        data: {
          progress,
          status: completed
            ? SocialChallengeParticipantStatus.COMPLETED
            : SocialChallengeParticipantStatus.ACCEPTED,
          completedAt: completed ? new Date() : null,
        },
      });
    }
  }

private async buildLeaderboard(
  participantIds: string[],
  currentUserId: string,
  xpRows: Array<{
    userId: string;
    _sum: {
      finalXp: number | null;
    };
  }>,
  period: unknown,
  message?: string,
) {
  if (!participantIds.length) {
    return {
      period,
      currentUser: null,
      entries: [],
      message,
    };
  }

  const xpMap = new Map<string, number>(
    xpRows.map((row) => [
      row.userId,
      row._sum.finalXp ?? 0,
    ]),
  );

  /*
   * Query User riêng.
   *
   * Không select xpProfile vì schema User hiện tại
   * chưa có relation xpProfile trong Prisma Client.
   */
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
    },
  });

  /*
   * Query UserXpProfile riêng, tránh phụ thuộc vào:
   *
   * user.xpProfile
   */
  const profiles =
    await this.prisma.userXpProfile.findMany({
      where: {
        userId: {
          in: participantIds,
        },
      },
      select: {
        userId: true,
        currentStreak: true,
        showStreak: true,
        useNickname: true,
        leaderboardName: true,
        optedOut: true,
      },
    });

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.userId,
      profile,
    ]),
  );

  /*
   * Xác định người nào đã nhận XP hôm nay.
   *
   * Không cần field User.lastActiveDate.
   */
  const todayStart = new Date();

  todayStart.setHours(0, 0, 0, 0);

  const todayTransactions =
    await this.prisma.xpTransaction.findMany({
      where: {
        userId: {
          in: participantIds,
        },
        earnedAt: {
          gte: todayStart,
        },
        finalXp: {
          gt: 0,
        },
        reversedAt: null,
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

  const learnedTodayIds = new Set(
    todayTransactions.map(
      (transaction) => transaction.userId,
    ),
  );

  const entries = users
    .filter((user) => {
      const profile = profileMap.get(user.id);

      return !profile?.optedOut;
    })
    .map((user) => {
      const profile = profileMap.get(user.id);

      const displayName =
        profile?.useNickname &&
        profile.leaderboardName
          ? profile.leaderboardName
          : user.fullname;

      return {
        periodXp: Math.max(
          0,
          xpMap.get(user.id) ?? 0,
        ),

        user: {
          id: user.id,
          displayName,
          username: user.username,
          avatarUrl: user.avatar,
          level: user.level,
          cefrLevel: user.englishLevel,

          streak: profile?.showStreak
            ? profile.currentStreak
            : null,

          learnedToday:
            learnedTodayIds.has(user.id),
        },
      };
    })
    .sort((a, b) => {
      if (b.periodXp !== a.periodXp) {
        return b.periodXp - a.periodXp;
      }

      return a.user.displayName.localeCompare(
        b.user.displayName,
        'vi',
      );
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    period,

    currentUser:
      entries.find(
        (entry) =>
          entry.user.id === currentUserId,
      ) ?? null,

    entries,
    message,
  };
}

  private async getFriendIds(userId: string) {
    const rows = await this.prisma.communityFriendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { userAId: true, userBId: true },
    });

    return [
      ...new Set(
        rows.map((row) => (row.userAId === userId ? row.userBId : row.userAId)),
      ),
    ];
  }

  private async assertClubMember(userId: string, clubId: string) {
    const row = await this.prisma.communityClubMember.findFirst({
      where: { userId, clubId },
    });
    if (!row) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của câu lạc bộ này',
      );
    }
  }

  private async getWeeklyPeriod() {
    return this.prisma.leaderboardSeason.findFirst({
      where: {
        periodType: LeaderboardPeriodType.WEEKLY,
        isActive: true,
        startsAt: { lte: new Date() },
        endsAt: { gt: new Date() },
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  private async getXpRows(userIds: string[], startsAt: Date, endsAt: Date) {
    if (!userIds.length) return [];
    return this.prisma.xpTransaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        earnedAt: { gte: startsAt, lt: endsAt },
        reversedAt: null,
      },
      _sum: { finalXp: true },
    });
  }

  private isToday(date: Date | null) {
    if (!date) return false;
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
}

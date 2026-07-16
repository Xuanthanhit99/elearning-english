import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  LeaderboardActivityType,
  LeaderboardSeasonStatus,
  Prisma,
  XpSourceType,
} from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DAILY_XP_LIMITS,
  LEADERBOARD_REDIS,
  skillRedisKey,
  weeklyRedisKey,
} from './leaderboard.constants';
import { AwardXpDto } from './dto/award-xp.dto';
import { LeaderboardGateway } from './leaderboard.gateway';
import { SocialLeaderboardService } from './social-leaderboard.service';
import { LeaderboardRealtimeGateway } from './backgrount-job/leaderboard-realtime.gateway';

type ChallengeMetric =
  | 'LESSONS'
  | 'SPEAKING'
  | 'WRITING'
  | 'VOCABULARY'
  | 'MISSIONS';

@Injectable()
export class XpService {
  private readonly logger = new Logger(XpService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LEADERBOARD_REDIS)
    private readonly redis: Redis,
    private readonly gateway: LeaderboardGateway,
    private readonly socialLeaderboard: SocialLeaderboardService,
     private readonly realtime:
    LeaderboardRealtimeGateway,
  ) {}

  async awardXp(input: AwardXpDto) {
    if (input.baseXp === 0 && (input.bonusXp ?? 0) === 0) {
      throw new BadRequestException('XP must not be zero');
    }

    const existing = await this.prisma.xpTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existing) {
      return {
        duplicated: true,
        transaction: existing,
      };
    }

    const finalXp = Math.max(
      -10000,
      Math.min(10000, input.baseXp + (input.bonusXp ?? 0)),
    );

    await this.assertDailyLimit(
      input.userId,
      input.sourceType,
      Math.max(0, finalXp),
    );

    const result = await this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.userXpProfile.upsert({
          where: { userId: input.userId },
          create: {
            userId: input.userId,
            totalXp: Math.max(0, finalXp),
            currentLevel: this.levelFromXp(Math.max(0, finalXp)),
            lastXpEarnedAt: new Date(),
          },
          update: {
            totalXp: { increment: finalXp },
            lastXpEarnedAt: new Date(),
          },
        });

        const refreshedProfile = await tx.userXpProfile.findUniqueOrThrow({
          where: { id: profile.id },
        });

        if (refreshedProfile.totalXp < 0) {
          await tx.userXpProfile.update({
            where: { id: profile.id },
            data: { totalXp: 0 },
          });
        }

        const safeTotalXp = Math.max(0, refreshedProfile.totalXp);
        const level = this.levelFromXp(safeTotalXp);

        const updatedProfile = await tx.userXpProfile.update({
          where: { id: profile.id },
          data: { currentLevel: level },
        });

        await tx.user.update({
          where: {
            id: input.userId,
          },
          data: {
            xp: safeTotalXp,
            level,
          },
        });

        const transaction = await tx.xpTransaction.create({
          data: {
            userId: input.userId,
            xpProfileId: profile.id,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            skill: input.skill,
            baseXp: input.baseXp,
            bonusXp: input.bonusXp ?? 0,
            finalXp,
            reason: input.reason,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata as Prisma.InputJsonValue | undefined,
          },
        });

        const activeSeason = await tx.leaderboardSeason.findFirst({
          where: {
            isActive: true,
            status: LeaderboardSeasonStatus.ACTIVE,
            startsAt: { lte: new Date() },
            endsAt: { gt: new Date() },
          },
        });

        let entry: {
          id: string;
          groupId: string;
          periodXp: number;
        } | null = null;

        if (activeSeason && !updatedProfile.optedOut) {
          entry = await this.ensureWeeklyEntry(
            tx,
            input.userId,
            profile.id,
            activeSeason.id,
          );

          entry = await tx.leaderboardEntry.update({
            where: { id: entry.id },
            data: {
              periodXp: { increment: finalXp },
              lastXpAt: new Date(),
            },
            select: {
              id: true,
              groupId: true,
              periodXp: true,
            },
          });
        }

        return {
          transaction,
          profile: updatedProfile,
          activeSeason,
          entry,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    await this.syncRealtimeLeaderboard(input, result, finalXp);

    // XP đã được commit. Nếu Social Leaderboard lỗi thì chỉ log,
    // không báo awardXp thất bại và không khiến client gọi lại gây trùng.
    try {
      await this.syncSocialGamification(input, result.transaction.finalXp);
    } catch (error) {
      this.logger.error(
        `Social gamification sync failed for XP transaction ${result.transaction.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      duplicated: false,
      ...result,
    };
  }

  async reverseTransaction(transactionId: string, reason: string) {
    const source = await this.prisma.xpTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!source) {
      throw new BadRequestException('XP transaction not found');
    }

    if (source.reversedAt) {
      throw new ConflictException('Transaction already reversed');
    }

    const result = await this.awardXp({
      userId: source.userId,
      sourceType: XpSourceType.ADMIN_ADJUSTMENT,
      sourceId: source.id,
      baseXp: -source.finalXp,
      idempotencyKey: `reverse:${source.id}`,
      reason,
      metadata: {
        reversedTransactionId: source.id,
      },
    });

    await this.prisma.xpTransaction.update({
      where: { id: source.id },
      data: {
        reversedAt: new Date(),
        reversalReason: reason,
      },
    });

    return result;
  }

  private async syncRealtimeLeaderboard(
    input: AwardXpDto,
    result: {
      activeSeason: { id: string } | null;
      entry: {
        id: string;
        groupId: string;
        periodXp: number;
      } | null;
    },
    finalXp: number,
  ) {
    if (!result.activeSeason || !result.entry) {
      return;
    }

    const key = weeklyRedisKey(result.activeSeason.id, result.entry.groupId);

    await this.redis.zadd(key, result.entry.periodXp, input.userId);

    await this.redis.expire(key, 60 * 60 * 24 * 14);

    if (input.skill) {
      const periodKey = this.periodKey(new Date());

      await this.redis.zincrby(
        skillRedisKey(input.skill, periodKey),
        finalXp,
        input.userId,
      );
    }

    this.gateway.emitLeaderboardUpdated(result.entry.groupId, {
      userId: input.userId,
      periodXp: result.entry.periodXp,
    });
  }

  private async syncSocialGamification(input: AwardXpDto, awardedXp: number) {
    // Không tạo feed/challenge progress cho giao dịch trừ XP hoặc rollback.
    if (awardedXp <= 0) {
      return;
    }

    await this.socialLeaderboard.createActivity({
      userId: input.userId,
      type: this.mapActivityType(input.sourceType),
      title: this.buildActivityTitle(input.sourceType),
      description: input.reason,
      xp: awardedXp,
      sourceId: input.sourceId,
      metadata: input.metadata,
    });

    // Challenge theo tổng XP.
    await this.socialLeaderboard.updateChallengeProgress(
      input.userId,
      'XP',
      awardedXp,
    );

    // Challenge theo số lần hoàn thành hoạt động.
    const metric = this.mapChallengeMetric(input.sourceType);

    if (metric) {
      await this.socialLeaderboard.updateChallengeProgress(
        input.userId,
        metric,
        1,
      );
    }
  }

  private mapActivityType(sourceType: XpSourceType): LeaderboardActivityType {
    const map: Partial<Record<XpSourceType, LeaderboardActivityType>> = {
      [XpSourceType.SPEAKING]: LeaderboardActivityType.SPEAKING_COMPLETED,
      [XpSourceType.WRITING]: LeaderboardActivityType.WRITING_COMPLETED,
      [XpSourceType.VOCABULARY]: LeaderboardActivityType.VOCABULARY_COMPLETED,
      [XpSourceType.MISSION]: LeaderboardActivityType.MISSION_COMPLETED,
      [XpSourceType.LESSON]: LeaderboardActivityType.LESSON_COMPLETED,
    };

    return map[sourceType] ?? LeaderboardActivityType.XP_EARNED;
  }

  private buildActivityTitle(sourceType: XpSourceType): string {
    const map: Partial<Record<XpSourceType, string>> = {
      [XpSourceType.SPEAKING]: 'đã hoàn thành một bài Speaking',
      [XpSourceType.WRITING]: 'đã hoàn thành một bài Writing',
      [XpSourceType.VOCABULARY]: 'đã hoàn thành bài Vocabulary',
      [XpSourceType.MISSION]: 'đã hoàn thành một nhiệm vụ',
      [XpSourceType.LESSON]: 'đã hoàn thành một bài học',
      [XpSourceType.LISTENING]: 'đã hoàn thành một bài Listening',
      [XpSourceType.READING]: 'đã hoàn thành một bài Reading',
      [XpSourceType.GRAMMAR]: 'đã hoàn thành một bài Grammar',
      [XpSourceType.PLACEMENT]: 'đã hoàn thành Placement Test',
    };

    return map[sourceType] ?? 'đã nhận thêm XP';
  }

  private mapChallengeMetric(sourceType: XpSourceType): ChallengeMetric | null {
    const map: Partial<Record<XpSourceType, ChallengeMetric>> = {
      [XpSourceType.LESSON]: 'LESSONS',
      [XpSourceType.SPEAKING]: 'SPEAKING',
      [XpSourceType.WRITING]: 'WRITING',
      [XpSourceType.VOCABULARY]: 'VOCABULARY',
      [XpSourceType.MISSION]: 'MISSIONS',
    };

    return map[sourceType] ?? null;
  }

  private async assertDailyLimit(
    userId: string,
    sourceType: XpSourceType,
    addingXp: number,
  ) {
    const limit = DAILY_XP_LIMITS[sourceType];

    if (!limit || addingXp <= 0) {
      return;
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const total = await this.prisma.xpTransaction.aggregate({
      where: {
        userId,
        sourceType,
        earnedAt: { gte: start },
        finalXp: { gt: 0 },
        reversedAt: null,
      },
      _sum: {
        finalXp: true,
      },
    });

    if ((total._sum.finalXp ?? 0) + addingXp > limit) {
      throw new BadRequestException(`Daily XP limit reached for ${sourceType}`);
    }
  }

  private async ensureWeeklyEntry(
    tx: Prisma.TransactionClient,
    userId: string,
    xpProfileId: string,
    seasonId: string,
  ) {
    const profile = await tx.userXpProfile.findUniqueOrThrow({
      where: { id: xpProfileId },
    });

    let entry = await tx.leaderboardEntry.findFirst({
      where: {
        userId,
        group: {
          seasonId,
          scope: 'GLOBAL',
        },
      },
      select: {
        id: true,
        groupId: true,
        periodXp: true,
      },
    });

    if (entry) {
      return entry;
    }

    let group = await tx.leaderboardGroup.findFirst({
      where: {
        seasonId,
        scope: 'GLOBAL',
        league: profile.currentLeague,
        entries: { none: {} },
      },
      orderBy: {
        groupNumber: 'asc',
      },
    });

    if (!group) {
      const candidates = await tx.leaderboardGroup.findMany({
        where: {
          seasonId,
          scope: 'GLOBAL',
          league: profile.currentLeague,
        },
        include: {
          _count: {
            select: {
              entries: true,
            },
          },
        },
        orderBy: {
          groupNumber: 'asc',
        },
      });

      group =
        candidates.find(
          (candidate) => candidate._count.entries < candidate.maxMembers,
        ) ?? null;
    }

    if (!group) {
      const maxGroup = await tx.leaderboardGroup.aggregate({
        where: {
          seasonId,
          scope: 'GLOBAL',
          league: profile.currentLeague,
        },
        _max: {
          groupNumber: true,
        },
      });

      group = await tx.leaderboardGroup.create({
        data: {
          seasonId,
          scope: 'GLOBAL',
          league: profile.currentLeague,
          groupNumber: (maxGroup._max.groupNumber ?? 0) + 1,
        },
      });
    }

    return tx.leaderboardEntry.create({
      data: {
        groupId: group.id,
        userId,
        xpProfileId,
      },
      select: {
        id: true,
        groupId: true,
        periodXp: true,
      },
    });
  }

  private levelFromXp(totalXp: number) {
    return Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
  }

  private periodKey(date: Date) {
    const year = date.getUTCFullYear();
    const firstDay = new Date(Date.UTC(year, 0, 1));

    const day = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);

    const week = Math.ceil((day + firstDay.getUTCDay() + 1) / 7);

    return `${year}-W${String(week).padStart(2, '0')}`;
  }
}

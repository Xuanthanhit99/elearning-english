import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { LeaderboardSeasonStatus, Prisma, XpSourceType } from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DAILY_XP_LIMITS,
  LEADERBOARD_REDIS,
  skillRedisKey,
  weeklyRedisKey,
} from './leaderboard.constants';
import { AwardXpDto } from './dto/award-xp.dto';
import { LeaderboardRealtimeGateway } from './socket/leaderboard-realtime.gateway';

@Injectable()
export class XpService {
  private readonly logger = new Logger(XpService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LEADERBOARD_REDIS) private readonly redis: Redis,
    private readonly gateway: LeaderboardRealtimeGateway,
  ) {}

  async awardXp(input: AwardXpDto) {
    if (input.baseXp === 0 && (input.bonusXp ?? 0) === 0) {
      throw new BadRequestException('XP must not be zero');
    }

    const existing = await this.prisma.xpTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return { duplicated: true, transaction: existing };

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
          where: { id: input.userId },
          data: { xp: safeTotalXp, level },
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

        let entry: { id: string; groupId: string; periodXp: number } | null =
          null;
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
            select: { id: true, groupId: true, periodXp: true },
          });
        }

        return { transaction, profile: updatedProfile, activeSeason, entry };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.activeSeason && result.entry) {
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

      this.gateway.emitGroupUpdated(result.entry.groupId, {
        userId: input.userId,
        periodXp: result.entry.periodXp,
      });
    }

    return { duplicated: false, ...result };
  }

  async awardXpWithSideEffects<T>(
    input: AwardXpDto,
    sideEffects: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
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
        sideEffectResult: null as T | null,
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

    try {
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
            where: { id: input.userId },
            data: { xp: safeTotalXp, level },
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

          const sideEffectResult = await sideEffects(tx);

          const activeSeason = await tx.leaderboardSeason.findFirst({
            where: {
              isActive: true,
              status: LeaderboardSeasonStatus.ACTIVE,
              startsAt: { lte: new Date() },
              endsAt: { gt: new Date() },
            },
          });

          let entry: { id: string; groupId: string; periodXp: number } | null =
            null;
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
              select: { id: true, groupId: true, periodXp: true },
            });
          }

          return {
            transaction,
            profile: updatedProfile,
            activeSeason,
            entry,
            sideEffectResult,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (result.activeSeason && result.entry) {
        const key = weeklyRedisKey(
          result.activeSeason.id,
          result.entry.groupId,
        );
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

        this.gateway.emitGroupUpdated(result.entry.groupId, {
          userId: input.userId,
          periodXp: result.entry.periodXp,
        });
      }

      return {
        duplicated: false,
        ...result,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.xpTransaction.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });

        if (duplicate) {
          return {
            duplicated: true,
            transaction: duplicate,
            sideEffectResult: null as T | null,
          };
        }
      }

      throw error;
    }
  }

  async reverseTransaction(transactionId: string, reason: string) {
    const source = await this.prisma.xpTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!source) throw new BadRequestException('XP transaction not found');
    if (source.reversedAt)
      throw new ConflictException('Transaction already reversed');

    const result = await this.awardXp({
      userId: source.userId,
      sourceType: XpSourceType.ADMIN_ADJUSTMENT,
      sourceId: source.id,
      baseXp: -source.finalXp,
      idempotencyKey: `reverse:${source.id}`,
      reason,
      metadata: { reversedTransactionId: source.id },
    });

    await this.prisma.xpTransaction.update({
      where: { id: source.id },
      data: { reversedAt: new Date(), reversalReason: reason },
    });
    return result;
  }

  private async assertDailyLimit(
    userId: string,
    sourceType: XpSourceType,
    addingXp: number,
  ) {
    const limit = DAILY_XP_LIMITS[sourceType];
    if (!limit || addingXp <= 0) return;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const total = await this.prisma.xpTransaction.aggregate({
      where: {
        userId,
        sourceType,
        earnedAt: { gte: start },
        finalXp: { gt: 0 },
      },
      _sum: { finalXp: true },
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
    const entry = await tx.leaderboardEntry.findFirst({
      where: { userId, group: { seasonId, scope: 'GLOBAL' } },
      select: { id: true, groupId: true, periodXp: true },
    });
    if (entry) return entry;

    let group = await tx.leaderboardGroup.findFirst({
      where: {
        seasonId,
        scope: 'GLOBAL',
        league: profile.currentLeague,
        entries: { none: {} },
      },
      orderBy: { groupNumber: 'asc' },
    });

    if (!group) {
      const candidates = await tx.leaderboardGroup.findMany({
        where: { seasonId, scope: 'GLOBAL', league: profile.currentLeague },
        include: { _count: { select: { entries: true } } },
        orderBy: { groupNumber: 'asc' },
      });
      group = candidates.find((g) => g._count.entries < g.maxMembers) ?? null;
    }

    if (!group) {
      const maxGroup = await tx.leaderboardGroup.aggregate({
        where: { seasonId, scope: 'GLOBAL', league: profile.currentLeague },
        _max: { groupNumber: true },
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
      data: { groupId: group.id, userId, xpProfileId },
      select: { id: true, groupId: true, periodXp: true },
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

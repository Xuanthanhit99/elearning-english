import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LeaderboardRewardStatus, Prisma, XpSourceType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

type RewardPayload = { xp: number; coins: number; food: number; energy: number; happiness: number };

@Injectable()
export class LeaderboardRewardService {
  private readonly logger = new Logger(LeaderboardRewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listMyRewards(userId: string) {
    await this.expireOldRewards(userId);
    const rows = await this.prisma.userLeaderboardReward.findMany({
      where: { userId },
      include: { reward: true, season: true },
      orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }],
    });
    return rows.map((row) => this.toResponse(row));
  }

  async claim(userId: string, id: string) {
    const existing = await this.prisma.userLeaderboardReward.findFirst({
      where: { id, userId },
      include: { reward: true, season: true },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy phần thưởng bảng xếp hạng.');
    if (existing.status === LeaderboardRewardStatus.CLAIMED) {
      return { alreadyClaimed: true, reward: this.toResponse(existing) };
    }
    if (existing.status !== LeaderboardRewardStatus.AVAILABLE) {
      throw new BadRequestException('Phần thưởng không còn khả dụng.');
    }
    if (existing.expiresAt && existing.expiresAt <= new Date()) {
      await this.prisma.userLeaderboardReward.updateMany({
        where: { id, userId, status: LeaderboardRewardStatus.AVAILABLE },
        data: { status: LeaderboardRewardStatus.EXPIRED },
      });
      throw new BadRequestException('Phần thưởng đã hết hạn.');
    }

    const payload = this.normalize(existing.payload ?? existing.reward.rewardValue);
    const claimed = await this.prisma.$transaction(async (tx) => {
      const lock = await tx.userLeaderboardReward.updateMany({
        where: {
          id,
          userId,
          status: LeaderboardRewardStatus.AVAILABLE,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { status: LeaderboardRewardStatus.CLAIMED, claimedAt: new Date() },
      });
      if (lock.count !== 1) return null;

      const profile = await tx.userXpProfile.findUniqueOrThrow({ where: { userId } });
      const nextLevel = this.levelFromXp(profile.totalXp + payload.xp);

      if (payload.xp > 0) {
        await tx.userXpProfile.update({
          where: { id: profile.id },
          data: { totalXp: { increment: payload.xp }, currentLevel: nextLevel, lastXpEarnedAt: new Date() },
        });
        await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: payload.xp }, level: nextLevel },
        });
        await tx.xpTransaction.upsert({
          where: { idempotencyKey: `leaderboard-reward:${id}` },
          update: {},
          create: {
            userId,
            xpProfileId: profile.id,
            sourceType: XpSourceType.ADMIN_ADJUSTMENT,
            sourceId: id,
            baseXp: payload.xp,
            finalXp: payload.xp,
            reason: existing.reward.title,
            idempotencyKey: `leaderboard-reward:${id}`,
            metadata: { source: 'LEADERBOARD_REWARD', rewardId: existing.rewardId, seasonId: existing.seasonId },
          },
        });
      }

      if (payload.coins || payload.food || payload.energy || payload.happiness) {
        await tx.petProfile.upsert({
          where: { userId },
          update: {
            coins: { increment: payload.coins },
            food: { increment: payload.food },
            energy: { increment: payload.energy },
            happiness: { increment: payload.happiness },
          },
          create: {
            userId,
            petType: 'fox',
            petName: 'Foxy',
            isChosen: true,
            coins: payload.coins,
            food: 2 + payload.food,
            energy: 100 + payload.energy,
            happiness: 100 + payload.happiness,
          },
        });
      }

      return tx.userLeaderboardReward.findUniqueOrThrow({
        where: { id },
        include: { reward: true, season: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!claimed) {
      const latest = await this.prisma.userLeaderboardReward.findUnique({ where: { id }, include: { reward: true, season: true } });
      if (latest?.status === LeaderboardRewardStatus.CLAIMED) {
        return { alreadyClaimed: true, reward: this.toResponse(latest) };
      }
      throw new BadRequestException('Phần thưởng đã được xử lý hoặc hết hạn.');
    }

    try {
      await this.notifications.createFromPayload({
        userId,
        type: 'ACHIEVEMENT',
        title: 'Đã nhận thưởng bảng xếp hạng',
        message: `${claimed.reward.title}: ${this.message(payload)}.`,
        href: '/leaderboard/rewards',
      });
    } catch (error) {
      this.logger.error(`Reward notification failed: ${id}`, error instanceof Error ? error.stack : String(error));
    }

    return { alreadyClaimed: false, reward: this.toResponse(claimed) };
  }

  async expireOldRewards(userId?: string) {
    const result = await this.prisma.userLeaderboardReward.updateMany({
      where: {
        ...(userId ? { userId } : {}),
        status: LeaderboardRewardStatus.AVAILABLE,
        expiresAt: { lte: new Date() },
      },
      data: { status: LeaderboardRewardStatus.EXPIRED },
    });
    return { expired: result.count };
  }

  private normalize(value: Prisma.JsonValue): RewardPayload {
    const source = value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, Prisma.JsonValue>
      : {};
    const num = (v: Prisma.JsonValue | undefined) => Math.max(0, Math.floor(Number(v ?? 0) || 0));
    return { xp: num(source.xp), coins: num(source.coins), food: num(source.food), energy: num(source.energy), happiness: num(source.happiness) };
  }

  private levelFromXp(totalXp: number) {
    return Math.max(1, Math.floor(Math.sqrt(Math.max(0, totalXp) / 100)) + 1);
  }

  private message(payload: RewardPayload) {
    return [payload.xp && `+${payload.xp} XP`, payload.coins && `+${payload.coins} coins`, payload.food && `+${payload.food} food`, payload.energy && `+${payload.energy} energy`, payload.happiness && `+${payload.happiness} happiness`].filter(Boolean).join(', ') || 'đã nhận thưởng';
  }

  private toResponse(row: any) {
    return {
      id: row.id,
      status: row.status,
      claimedAt: row.claimedAt,
      expiresAt: row.expiresAt,
      title: row.reward.title,
      description: row.reward.description,
      rewardType: row.reward.rewardType,
      payload: this.normalize(row.payload ?? row.reward.rewardValue),
      season: row.season,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MissionV2Status, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { LearningXpPublisher } from '../../learning-xp/learning-xp.publisher';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class MissionV2RewardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly learningXp: LearningXpPublisher,
  ) {}

  async claim(userId: string, missionId: string) {
    const mission = await this.prisma.userMissionV2.findUnique({
      where: {
        id: missionId,
      },
    });

    if (!mission || mission.userId !== userId) {
      throw new NotFoundException('Khong tim thay nhiem vu.');
    }

    if (mission.status === MissionV2Status.CLAIMED) {
      const transaction =
        await this.prisma.missionRewardTransactionV2.findUnique({
          where: { userMissionId: mission.id },
        });

      await this.publishMissionXp(userId, mission);

      return {
        mission,
        alreadyClaimed: true,
        reward: {
          xp: transaction?.xp ?? mission.rewardXp,
          coins: transaction?.coins ?? mission.rewardCoins,
          food: transaction?.food ?? mission.rewardFood,
          energy: transaction?.energy ?? mission.rewardEnergy,
          happiness: transaction?.happiness ?? mission.rewardHappiness,
        },
      };
    }

    if (mission.status !== MissionV2Status.COMPLETED) {
      throw new BadRequestException(
        'Nhiem vu chua hoan thanh hoac khong the nhan thuong.',
      );
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const updatedCount = await tx.userMissionV2.updateMany({
          where: {
            id: mission.id,
            userId,
            status: MissionV2Status.COMPLETED,
          },
          data: {
            status: MissionV2Status.CLAIMED,
            claimedAt: new Date(),
          },
        });

        if (updatedCount.count === 0) {
          const current = await tx.userMissionV2.findUniqueOrThrow({
            where: { id: mission.id },
          });
          const transaction = await tx.missionRewardTransactionV2.findUnique({
            where: { userMissionId: mission.id },
          });

          return {
            mission: current,
            alreadyClaimed: current.status === MissionV2Status.CLAIMED,
            reward: {
              xp: transaction?.xp ?? 0,
              coins: transaction?.coins ?? 0,
              food: transaction?.food ?? 0,
              energy: transaction?.energy ?? 0,
              happiness: transaction?.happiness ?? 0,
            },
          };
        }

        const updated = await tx.userMissionV2.findUniqueOrThrow({
          where: {
            id: mission.id,
          },
        });

        const transaction = await tx.missionRewardTransactionV2.create({
          data: {
            userId,
            userMissionId: mission.id,
            xp: mission.rewardXp,
            coins: mission.rewardCoins,
            food: mission.rewardFood,
            energy: mission.rewardEnergy,
            happiness: mission.rewardHappiness,
          },
        });

        await tx.petProfile.upsert({
          where: {
            userId,
          },
          update: {
            xp: {
              increment: mission.rewardXp,
            },
            coins: {
              increment: mission.rewardCoins,
            },
            food: {
              increment: mission.rewardFood,
            },
            energy: {
              increment: mission.rewardEnergy,
            },
            happiness: {
              increment: mission.rewardHappiness,
            },
          },
          create: {
            userId,
            petType: 'fox',
            petName: 'Foxy',
            isChosen: true,
            xp: mission.rewardXp,
            coins: mission.rewardCoins,
            food: mission.rewardFood,
            energy: 70 + mission.rewardEnergy,
            happiness: 70 + mission.rewardHappiness,
          },
        });

        return {
          mission: updated,
          alreadyClaimed: false,
          reward: {
            xp: transaction.xp,
            coins: transaction.coins,
            food: transaction.food,
            energy: transaction.energy,
            happiness: transaction.happiness,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.publishMissionXp(userId, mission);

    if (!result.alreadyClaimed) {
      try {
        await this.notifications.createFromPayload({
          userId,
          type: 'ACHIEVEMENT',
          title: 'Da nhan thuong nhiem vu',
          message:
            `Ban nhan +${mission.rewardXp} XP va ` +
            `+${mission.rewardCoins} coins tu "${mission.title}".`,
          href: '/missions',
        });
      } catch {
        // Notification is non-critical after a successful claim.
      }
    }

    return result;
  }

  private async publishMissionXp(
    userId: string,
    mission: {
      id: string;
      title: string;
      type: unknown;
      skill: unknown;
      rewardXp: number;
      rewardCoins: number;
      rewardFood: number;
      rewardEnergy: number;
      rewardHappiness: number;
    },
  ) {
    try {
      await this.learningXp.publish({
        activity: 'MISSION_CLAIMED',
        userId,
        sourceId: mission.id,
        rewardXp: mission.rewardXp,
        metadata: {
          userMissionId: mission.id,
          missionTitle: mission.title,
          missionType: mission.type,
          skill: mission.skill,
          rewardCoins: mission.rewardCoins,
          rewardFood: mission.rewardFood,
          rewardEnergy: mission.rewardEnergy,
          rewardHappiness: mission.rewardHappiness,
        },
      });
    } catch (error) {
      console.error(`Mission XP publish failed: ${mission.id}`, error);
    }
  }
}

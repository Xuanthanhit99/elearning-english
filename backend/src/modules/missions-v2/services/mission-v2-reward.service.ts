import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MissionV2Status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { LearningXpPublisher } from 'src/modules/learning-xp/learning-xp.publisher';

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
      throw new NotFoundException('Không tìm thấy nhiệm vụ.');
    }

    if (mission.status !== MissionV2Status.COMPLETED) {
      throw new BadRequestException(
        'Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.missionRewardTransactionV2.findUnique({
        where: {
          userMissionId: mission.id,
        },
      });

      if (duplicate) {
        throw new BadRequestException('Phần thưởng đã được nhận.');
      }

      const updated = await tx.userMissionV2.update({
        where: {
          id: mission.id,
        },
        data: {
          status: MissionV2Status.CLAIMED,
          claimedAt: new Date(),
        },
      });

      await tx.missionRewardTransactionV2.create({
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
        reward: {
          xp: mission.rewardXp,
          coins: mission.rewardCoins,
          food: mission.rewardFood,
          energy: mission.rewardEnergy,
          happiness: mission.rewardHappiness,
        },
      };
    });

    /*
     * Chỉ phát event sau khi transaction claim reward
     * đã commit thành công.
     */
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

    try {
      await this.notifications.createFromPayload({
        userId,
        type: 'ACHIEVEMENT',
        title: 'Đã nhận thưởng nhiệm vụ',
        message:
          `Bạn nhận +${mission.rewardXp} XP và ` +
          `+${mission.rewardCoins} coins từ "${mission.title}".`,
        href: '/missions',
      });
    } catch (error) {
      console.error(`Mission notification failed: ${mission.id}`, error);
    }

    return result;
  }
}

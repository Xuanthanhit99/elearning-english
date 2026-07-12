import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MissionV2Status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MissionV2RewardService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async claim(
    userId: string,
    missionId: string,
  ) {
    const mission =
      await this.prisma.userMissionV2.findUnique({
        where: {
          id: missionId,
        },
      });

    if (
      !mission ||
      mission.userId !== userId
    ) {
      throw new NotFoundException(
        'Không tìm thấy nhiệm vụ.',
      );
    }

    if (
      mission.status !==
      MissionV2Status.COMPLETED
    ) {
      throw new BadRequestException(
        'Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const duplicate =
          await tx.missionRewardTransactionV2.findUnique({
            where: {
              userMissionId: mission.id,
            },
          });

        if (duplicate) {
          throw new BadRequestException(
            'Phần thưởng đã được nhận.',
          );
        }

        const updated =
          await tx.userMissionV2.update({
            where: {
              id: mission.id,
            },
            data: {
              status:
                MissionV2Status.CLAIMED,
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
            happiness:
              mission.rewardHappiness,
          },
        });

        await tx.petProfile.upsert({
          where: {
            userId,
          },
          update: {
            xp: {
              increment:
                mission.rewardXp,
            },
            coins: {
              increment:
                mission.rewardCoins,
            },
            food: {
              increment:
                mission.rewardFood,
            },
            energy: {
              increment:
                mission.rewardEnergy,
            },
            happiness: {
              increment:
                mission.rewardHappiness,
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
            energy:
              70 + mission.rewardEnergy,
            happiness:
              70 +
              mission.rewardHappiness,
          },
        });

        return {
          mission: updated,
          reward: {
            xp: mission.rewardXp,
            coins: mission.rewardCoins,
            food: mission.rewardFood,
            energy:
              mission.rewardEnergy,
            happiness:
              mission.rewardHappiness,
          },
        };
      },
    );
  }
}

import { Injectable } from '@nestjs/common';
import { MissionAction, MissionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class MissionsService {
  constructor(private prismaService: PrismaService) {}

  private getPeriodKey(type: MissionType) {
    const now = new Date();

    if (type === MissionType.DAILY) {
      return now.toISOString().slice(0, 10);
    }

    if (type === MissionType.WEEKLY) {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor(now.getTime() - firstDay.getTime()) / 86400000;

      const week = Math.ceil((days + firstDay.getDay() + 1) / 7);
      return `${now.getFullYear()}-W${week}`;
    }

    return 'ACHIEVEMENT';
  }

  async getMyMissions(userId: string) {
    const missions = await this.prismaService.mission.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result = [];

    for (const mission of missions) {
      const periodKey = await this.getPeriodKey(mission.type);

      let userMission = await this.prismaService.userMission.findUnique({
        where: {
          userId_missionId_periodkey: {
            userId,
            missionId: mission.id,
            periodKey,
          },
        },
      });

      if (!userMission) {
        this.prismaService.userMission.create({
          data: {
            userId,
            missionId: mission.id,
            periodKey,
          },
        });
      }
      result.push({
        ...mission,
        userProgress: {
          progress: userMission.progress,
          target: mission.target,
          completed: userMission.completed,
          claimed: userMission.claimed,
          periodKey: userMission.periodKey,
        },
      });
    }
    return result;
  }

  async increaseProgress(userId: string, action: MissionAction, amount: 1) {
    const missions = await this.prismaService.mission.findMany({
      where: {
        action,
        isActive: true,
      },
    });

    for (const mission of missions) {
      const periodKey = await this.getPeriodKey(mission.type);

      const current = await this.prisma.userMission.upsert({
        where: {
          userId_missionId_periodKey: {
            userId,
            missionId: mission.id,
            periodKey,
          },
        },
        create: {
          userId,
          missionId: mission.id,
          periodKey,
          progress: Math.min(amount, mission.target),
          completed: amount >= mission.target,
          completedAt: amount >= mission.target ? new Date() : null,
        },
        update: {},
      });

      if (current.completed) continue;
      const nextProgress = Math.min(current.progress + amount, mission.target);
      const completed = nextProgress >= mission.target;

      await this.prisma.userMission.update({
        where: {
          id: current.id,
        },
        data: {
          progress: nextProgress,
          completed,
          completedAt: completed ? new Date() : null,
        },
      });
    }
    return {
      message: 'Mission progress updated',
    };
  }

  async claimReward(userId: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: {
        id: missionId,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const periodKey = this.getPeriodKey(mission.type);

    const userMission = await this.prisma.userMission.findUnique({
      where: {
        userId_missionId_periodKey: {
          userId,
          missionId,
          periodKey,
        },
      },
    });

    if (!userMission || !userMission.completed) {
      throw new BadRequestException('Mission is not completed');
    }

    if (userMission.claimed) {
      throw new BadRequestException('Reward already claimed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedMission = await tx.userMission.update({
        where: {
          id: userMission.id,
        },
        data: {
          claimed: true,
          claimedAt: new Date(),
        },
      });

      await tx.petProfile.update({
        where: {
          userId,
        },
        data: {
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
      });

      return {
        message: 'Claim reward successfully',
        reward: {
          xp: mission.rewardXp,
          coins: mission.rewardCoins,
          food: mission.rewardFood,
          energy: mission.rewardEnergy,
          happiness: mission.rewardHappiness,
        },
        mission: updatedMission,
      };
    });
  }

  async createMission(data: Prisma.MissionCreateInput) {
    return this.prisma.mission.create({
      data,
    });
  }
}

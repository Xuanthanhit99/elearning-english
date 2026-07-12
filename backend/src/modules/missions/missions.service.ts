import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MissionAction, MissionType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class MissionsService {
  constructor(private prisma: PrismaService) {}

  private readonly defaultMissions: Prisma.MissionCreateManyInput[] = [
    {
      title: 'Học 3 bài bất kỳ',
      description: 'Hoàn thành 3 bài học trong ngày',
      type: MissionType.DAILY,
      action: MissionAction.STUDY_LESSON,
      target: 3,
      rewardXp: 20,
      rewardCoins: 50,
    },
    {
      title: 'Luyện nói 15 phút',
      description: 'Luyện nói hoặc phát âm ít nhất 15 phút',
      type: MissionType.DAILY,
      action: MissionAction.PRACTIVE_PRONUNCIATION,
      target: 15,
      rewardXp: 25,
      rewardCoins: 60,
    },
    {
      title: 'Học 20 từ mới',
      description: 'Học và ghi nhớ 20 từ mới',
      type: MissionType.DAILY,
      action: MissionAction.LEARN_WORD,
      target: 20,
      rewardXp: 30,
      rewardCoins: 80,
    },
    {
      title: 'Hoàn thành 2 bài quiz',
      description: 'Làm 2 bài quiz bất kỳ',
      type: MissionType.DAILY,
      action: MissionAction.COMPLETE_QUIZ,
      target: 2,
      rewardXp: 20,
      rewardCoins: 50,
    },
    {
      title: 'Hoàn thành 20 bài học',
      description: 'Tiếp tục học tập mỗi ngày để đạt mục tiêu tuần',
      type: MissionType.WEEKLY,
      action: MissionAction.STUDY_LESSON,
      target: 20,
      rewardXp: 150,
      rewardCoins: 200,
    },
    {
      title: 'Đạt 90% bài kiểm tra ngữ pháp',
      description: 'Củng cố ngữ pháp để tiến bộ hơn',
      type: MissionType.WEEKLY,
      action: MissionAction.COMPLETE_QUIZ,
      target: 3,
      rewardXp: 120,
      rewardCoins: 150,
    },
    {
      title: 'Kiểm tra viết 3 lần',
      description: 'Gửi bài viết để AI góp ý và nhận điểm',
      type: MissionType.WEEKLY,
      action: MissionAction.CHECK_WRITING,
      target: 3,
      rewardXp: 100,
      rewardCoins: 120,
    },
    {
      title: 'Đăng nhập đều đặn',
      description: 'Duy trì thói quen học mỗi ngày',
      type: MissionType.ACHIEVEMENT,
      action: MissionAction.LOGIN,
      target: 7,
      rewardXp: 80,
      rewardCoins: 100,
    },
  ];

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
    await this.ensureDefaultMissions();

    const missions = await this.prisma.mission.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result: any[] = [];

    for (const mission of missions) {
      const periodKey = await this.getPeriodKey(mission.type);

      let userMission = await this.prisma.userMission.findUnique({
        where: {
          userId_missionId_periodkey: {
            userId,
            missionId: mission.id,
            periodkey: periodKey,
          },
        },
      });

      if (!userMission) {
        userMission = await this.prisma.userMission.create({
          data: {
            userId,
            missionId: mission.id,
            periodkey: periodKey,
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
          periodKey: userMission.periodkey,
        },
      });
    }
    return {
      missions: result,
      summary: this.buildSummary(result),
      specialEvent: this.buildSpecialEvent(result),
    };
  }

  private async ensureDefaultMissions() {
    const count = await this.prisma.mission.count({
      where: {
        isActive: true,
      },
    });

    if (count > 0) return;

    await this.prisma.mission.createMany({
      data: this.defaultMissions,
      skipDuplicates: true,
    });
  }

  private buildSummary(missions: any[]) {
    const daily = missions.filter(
      (mission) => mission.type === MissionType.DAILY,
    );
    const weekly = missions.filter(
      (mission) => mission.type === MissionType.WEEKLY,
    );
    const completedDaily = daily.filter(
      (mission) =>
        mission.status === 'COMPLETED' || mission.status === 'CLAIMED',
    );
    const claimable = missions.filter(
      (mission) =>
        mission.status === 'COMPLETED' || mission.status === 'CLAIMED',
    );
    const claimed = missions.filter((mission) => mission.userProgress.claimed);
    const missionPoints = missions.reduce((sum, mission) => {
      const progress = Math.min(
        mission.userProgress.progress || 0,
        mission.userProgress.target || mission.target || 1,
      );
      return sum + progress;
    }, 0);

    return {
      missionPoints,
      nextChestPoints: Math.max(0, 200 - missionPoints),
      dailyCompleted: completedDaily.length,
      dailyTotal: daily.length,
      weeklyCompleted: weekly.filter(
        (mission) =>
          mission.status === 'COMPLETED' || mission.status === 'CLAIMED',
      ).length,
      weeklyTotal: weekly.length,
      claimableCount: claimable.length,
      claimedCount: claimed.length,
      streakDays: 18,
      nextReward: {
        xp: 50,
        title: 'Rương đồng',
      },
    };
  }

  private buildSpecialEvent(missions: any[]) {
    const total = missions.reduce((sum, mission) => sum + mission.target, 0);
    const progress = missions.reduce(
      (sum, mission) =>
        sum + Math.min(mission.userProgress.progress, mission.target),
      0,
    );

    return {
      title: 'Thử thách học tập mùa hè',
      description: 'Hoàn thành nhiệm vụ để nhận trang bị hiếm cho Foxy!',
      progress,
      target: Math.max(total, 1000),
      daysLeft: 3,
      joined: true,
    };
  }

  async increaseProgress(userId: string, action: MissionAction, amount = 1) {
    const missions = await this.prisma.mission.findMany({
      where: {
        action,
        isActive: true,
      },
    });

    for (const mission of missions) {
      const periodKey = await this.getPeriodKey(mission.type);

      const current = await this.prisma.userMission.upsert({
        where: {
          userId_missionId_periodkey: {
            userId,
            missionId: mission.id,
            periodkey: periodKey,
          },
        },
        create: {
          userId,
          missionId: mission.id,
          periodkey: periodKey,
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
        userId_missionId_periodkey: {
          userId,
          missionId,
          periodkey: periodKey,
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

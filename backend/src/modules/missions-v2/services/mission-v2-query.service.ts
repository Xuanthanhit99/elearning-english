import { Injectable } from '@nestjs/common';
import {
  MissionV2Status,
  MissionV2Type,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { MissionV2GeneratorService } from './mission-v2-generator.service';

@Injectable()
export class MissionV2QueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generator:
      MissionV2GeneratorService,
  ) {}

  async getMyMissions(userId: string) {
    await this.generator.ensureCurrentMissions(
      userId,
    );

    await this.prisma.userMissionV2.updateMany({
      where: {
        userId,
        status: MissionV2Status.ACTIVE,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        status: MissionV2Status.EXPIRED,
      },
    });

    const missions =
      await this.prisma.userMissionV2.findMany({
        where: {
          userId,
          status: {
            notIn: [
              MissionV2Status.CANCELLED,
            ],
          },
        },
        orderBy: [
          {
            type: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });

    const completed = (
      status: MissionV2Status,
    ) =>
      status === MissionV2Status.COMPLETED ||
      status === MissionV2Status.CLAIMED;

    const daily = missions.filter(
      (item) =>
        item.type === MissionV2Type.DAILY,
    );

    const weekly = missions.filter(
      (item) =>
        item.type ===
        MissionV2Type.WEEKLY,
    );

    return {
      missions: missions.map((mission) => ({
        id: mission.id,
        title: mission.title,
        description:
          mission.description,
        type: mission.type,
        scope: mission.scope,
        action: mission.action,
        skill: mission.skill,
        progress: mission.progress,
        target: mission.target,
        progressPercent: Math.round(
          (mission.progress /
            Math.max(mission.target, 1)) *
            100,
        ),
        status: mission.status,
        completed: completed(mission.status),
        claimed:
          mission.status ===
          MissionV2Status.CLAIMED,
        reward: {
          xp: mission.rewardXp,
          coins: mission.rewardCoins,
          food: mission.rewardFood,
          energy: mission.rewardEnergy,
          happiness:
            mission.rewardHappiness,
        },
        periodKey: mission.periodKey,
        startsAt: mission.startsAt,
        expiresAt: mission.expiresAt,
        learningPathPhaseId:
          mission.learningPathPhaseId,
        lessonId: mission.lessonId,
      })),
      summary: {
        dailyCompleted: daily.filter(
          (item) => completed(item.status),
        ).length,
        dailyTotal: daily.length,
        weeklyCompleted: weekly.filter(
          (item) => completed(item.status),
        ).length,
        weeklyTotal: weekly.length,
        claimableCount: missions.filter(
          (item) =>
            item.status ===
            MissionV2Status.COMPLETED,
        ).length,
        claimedCount: missions.filter(
          (item) =>
            item.status ===
            MissionV2Status.CLAIMED,
        ).length,
      },
    };
  }
}

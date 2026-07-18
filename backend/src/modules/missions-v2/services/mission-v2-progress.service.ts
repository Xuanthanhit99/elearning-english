import { Injectable } from '@nestjs/common';
import { MissionV2Status, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { MissionV2ProgressEvent } from '../types/mission-v2-event.types';
import { MissionV2GeneratorService } from './mission-v2-generator.service';

type MissionProgressResult = {
  updatedCount: number;
  missionUpdates: Array<{
    missionId: string;
    progress: number;
    target: number;
    status: MissionV2Status;
  }>;
};

@Injectable()
export class MissionV2ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: MissionV2GeneratorService,
    private readonly notifications: NotificationsService,
  ) {}

  async increase(event: MissionV2ProgressEvent) {
    await this.generator.ensureCurrentMissions(event.userId);

    const amount = event.studyMinutes ?? event.amount ?? 1;

    try {
      const result = event.idempotencyKey
        ? await this.prisma.$transaction(async (tx) => {
            await tx.missionProgressEventV2.create({
              data: {
                userId: event.userId,
                action: event.action,
                idempotencyKey: event.idempotencyKey as string,
                amount,
                skill: event.skill ?? undefined,
                lessonId: event.lessonId ?? undefined,
                sourceId:
                  event.sourceId ??
                  event.lessonId ??
                  event.quizId ??
                  event.articleId ??
                  event.courseId ??
                  undefined,
              },
            });

            return this.applyProgress(tx, event, amount);
          })
        : await this.applyProgress(this.prisma, event, amount);

      await this.notifyCompletedMissions(event.userId, result.missionUpdates);

      return {
        ...result,
        duplicated: false,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        event.idempotencyKey
      ) {
        return {
          updatedCount: 0,
          missionUpdates: [],
          duplicated: true,
        };
      }

      throw error;
    }
  }

  private async applyProgress(
    tx: Prisma.TransactionClient | PrismaService,
    event: MissionV2ProgressEvent,
    amount: number,
  ): Promise<MissionProgressResult> {
    const missions = await tx.userMissionV2.findMany({
      where: {
        userId: event.userId,
        action: event.action,
        status: MissionV2Status.ACTIVE,
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: new Date(),
            },
          },
        ],
      },
    });

    let updatedCount = 0;
    const missionUpdates: MissionProgressResult['missionUpdates'] = [];

    for (const mission of missions) {
      if (mission.skill && mission.skill !== event.skill) {
        continue;
      }

      if (mission.lessonId && mission.lessonId !== event.lessonId) {
        continue;
      }

      const progress = Math.min(mission.progress + amount, mission.target);
      const completed = progress >= mission.target;

      const updated = await tx.userMissionV2.update({
        where: {
          id: mission.id,
        },
        data: {
          progress,
          status: completed
            ? MissionV2Status.COMPLETED
            : MissionV2Status.ACTIVE,
          completedAt: completed ? new Date() : null,
        },
      });

      missionUpdates.push({
        missionId: updated.id,
        progress: updated.progress,
        target: updated.target,
        status: updated.status,
      });
      updatedCount++;
    }

    return {
      updatedCount,
      missionUpdates,
    };
  }

  private async notifyCompletedMissions(
    userId: string,
    updates: MissionProgressResult['missionUpdates'],
  ) {
    const completed = updates.filter(
      (update) => update.status === MissionV2Status.COMPLETED,
    );

    for (const update of completed) {
      const mission = await this.prisma.userMissionV2.findUnique({
        where: { id: update.missionId },
        select: { title: true },
      });

      if (!mission) continue;

      try {
        await this.notifications.createOncePerDay({
          userId,
          type: 'MISSION',
          title: 'Nhiem vu da hoan thanh',
          message: `Ban da hoan thanh nhiem vu "${mission.title}". Nhan thuong ngay nhe.`,
          href: '/missions',
        });
      } catch {
        // Notifications must not break mission progress.
      }
    }
  }
}

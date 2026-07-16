import { Injectable } from '@nestjs/common';
import { MissionV2Status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { MissionV2ProgressEvent } from '../types/mission-v2-event.types';
import { MissionV2GeneratorService } from './mission-v2-generator.service';

@Injectable()
export class MissionV2ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: MissionV2GeneratorService,
    private readonly notifications: NotificationsService,
  ) {}

  async increase(event: MissionV2ProgressEvent) {
    await this.generator.ensureCurrentMissions(event.userId);

    const missions = await this.prisma.userMissionV2.findMany({
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

    const amount = event.studyMinutes ?? event.amount ?? 1;

    let updatedCount = 0;

    for (const mission of missions) {
      if (mission.skill && mission.skill !== event.skill) {
        continue;
      }

      if (mission.lessonId && mission.lessonId !== event.lessonId) {
        continue;
      }

      const progress = Math.min(mission.progress + amount, mission.target);

      const completed = progress >= mission.target;

      const updated = await this.prisma.userMissionV2.update({
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

      if (completed && mission.status !== MissionV2Status.COMPLETED) {
        await this.notifications.createOncePerDay({
          userId: event.userId,
          type: 'MISSION',
          title: 'Nhiệm vụ đã hoàn thành',
          message: `Bạn đã hoàn thành nhiệm vụ "${updated.title}". Nhận thưởng ngay nhé.`,
          href: '/missions',
        });
      }

      updatedCount++;
    }

    return {
      updatedCount,
    };
  }
}

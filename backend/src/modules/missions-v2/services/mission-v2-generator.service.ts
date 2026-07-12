import { Injectable } from '@nestjs/common';
import {
  LearningSkill,
  MissionTemplateV2,
  MissionV2Scope,
  MissionV2Status,
  PlacementResultStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { MissionV2PeriodService } from './mission-v2-period.service';
import { MissionV2TemplateService } from './mission-v2-template.service';

@Injectable()
export class MissionV2GeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periods:
      MissionV2PeriodService,
    private readonly templates:
      MissionV2TemplateService,
  ) {}

  async ensureCurrentMissions(userId: string) {
    await this.templates.ensureDefaultTemplates();

    const result =
      await this.prisma.placementResult.findFirst({
        where: {
          userId,
          status:
            PlacementResultStatus.READY,
          phases: {
            some: {},
          },
        },
        orderBy: {
          generatedAt: 'desc',
        },
        select: {
          id: true,
          phases: {
            orderBy: {
              phase: 'asc',
            },
            select: {
              id: true,
              phase: true,
              title: true,
              progress: true,
            },
          },
          priorities: {
            orderBy: {
              priority: 'asc',
            },
            take: 3,
            select: {
              skill: true,
              priority: true,
              reason: true,
            },
          },
        },
      });

    const templates =
      await this.prisma.missionTemplateV2.findMany({
        where: {
          isActive: true,
        },
        orderBy: [
          {
            type: 'asc',
          },
          {
            priority: 'desc',
          },
        ],
      });

    for (const template of templates) {
      await this.ensureOne(
        userId,
        template,
        result,
      );
    }
  }

  private async ensureOne(
    userId: string,
    template: MissionTemplateV2,
    result:
      | {
          id: string;
          phases: Array<{
            id: string;
            phase: number;
            title: string;
            progress: number;
          }>;
          priorities: Array<{
            skill: LearningSkill;
            priority: number;
            reason: string;
          }>;
        }
      | null,
  ) {
    const period = this.periods.getPeriod(
      template.type,
    );

    const currentPhase =
      result?.phases.find(
        (item) => item.progress < 100,
      ) ??
      result?.phases[0] ??
      null;

    const topPriority =
      result?.priorities[0] ?? null;

    if (
      template.scope !== MissionV2Scope.GLOBAL &&
      !result
    ) {
      return;
    }

    let title = template.title;
    let description = template.description;
    let skill = template.skill;
    let learningPathPhaseId:
      | string
      | null = null;

    if (
      template.code ===
      'V2_DAILY_CURRENT_LESSON'
    ) {
      learningPathPhaseId =
        currentPhase?.id ?? null;

      if (currentPhase) {
        title = `Hoàn thành bài học trong ${currentPhase.title}`;
        description = `Tiếp tục giai đoạn ${currentPhase.phase}: ${currentPhase.title}.`;
      }
    }

    if (
      template.code ===
      'V2_DAILY_PRIORITY_SKILL'
    ) {
      skill = topPriority?.skill ?? null;

      if (!skill) {
        return;
      }

      title = `Luyện ${this.skillLabel(skill)}`;
      description =
        topPriority?.reason ??
        template.description;
    }

    const existing =
      await this.prisma.userMissionV2.findFirst({
        where: {
          userId,
          templateId: template.id,
          periodKey: period.periodKey,
          learningPathPhaseId,
          lessonId: null,
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      return;
    }

    await this.prisma.userMissionV2.create({
      data: {
        userId,
        templateId: template.id,
        periodKey: period.periodKey,
        status: MissionV2Status.ACTIVE,
        title,
        description,
        type: template.type,
        scope: template.scope,
        action: template.action,
        target: template.defaultTarget,
        rewardXp: template.rewardXp,
        rewardCoins:
          template.rewardCoins,
        rewardFood:
          template.rewardFood,
        rewardEnergy:
          template.rewardEnergy,
        rewardHappiness:
          template.rewardHappiness,
        skill,
        placementResultId:
          result?.id ?? null,
        learningPathPhaseId,
        startsAt: period.startsAt,
        expiresAt: period.expiresAt,
      },
    });
  }

  private skillLabel(skill: LearningSkill) {
    const labels: Record<
      LearningSkill,
      string
    > = {
      VOCABULARY: 'Từ vựng',
      GRAMMAR: 'Ngữ pháp',
      LISTENING: 'Nghe',
      READING: 'Đọc',
      SPEAKING: 'Nói',
      WRITING: 'Viết',
    };

    return labels[skill];
  }
}

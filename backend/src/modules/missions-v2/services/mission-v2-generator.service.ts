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
import { SettingsQueryService } from '../../settings/settings-query.service';
import { EnergyModeService, EnergyModeAssessment } from '../../settings/energy-mode.service';

@Injectable()
export class MissionV2GeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periods:
      MissionV2PeriodService,
    private readonly templates:
      MissionV2TemplateService,
    private readonly settingsQuery: SettingsQueryService,
    private readonly energyMode: EnergyModeService,
  ) {}

  async ensureCurrentMissions(userId: string) {
    await this.templates.ensureDefaultTemplates();

    const learningSettings = await this.settingsQuery.getLearningSettings(userId);
    const energyAssessment = await this.energyMode.assess(userId);

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
        learningSettings,
        energyAssessment,
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
    learningSettings: Awaited<
      ReturnType<SettingsQueryService['getLearningSettings']>
    >,
    energyAssessment: EnergyModeAssessment,
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
      // Placement priority wins when available; otherwise fall back to the
      // user's own Settings preference so missions still feel personalized
      // before a placement test has ever run.
      skill =
        topPriority?.skill ??
        (learningSettings.preferredSkills?.[0] as LearningSkill | undefined) ??
        null;

      if (!skill) {
        return;
      }

      title = `Luyện ${this.skillLabel(skill)}`;
      description =
        topPriority?.reason ??
        (!topPriority && learningSettings.preferredSkills?.length
          ? 'Dựa trên kỹ năng bạn ưu tiên trong Cài đặt học tập.'
          : template.description);
    }

    const target = this.resolveTarget(template, learningSettings, energyAssessment);

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
        target,
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

  /**
   * Scales a template's default target using the user's own Settings, so
   * next-cycle missions actually reflect challengeMode and dailyStudyMinutes
   * instead of always using the same hard-coded template value. Only ever
   * applies to newly generated missions for a *future* period — an active
   * mission the user is already working on today is never mutated here.
   *
   * Energy Mode is applied last, as a temporary session-level reduction on
   * top of the challengeMode-scaled target — it never touches the user's
   * official level/challengeMode preference, it only shrinks *this cycle's*
   * target when recent accuracy signals fatigue.
   */
  private resolveTarget(
    template: MissionTemplateV2,
    learningSettings: { challengeMode: string; dailyStudyMinutes: number },
    energyAssessment: EnergyModeAssessment,
  ): number {
    if (template.action === 'STUDY_MINUTES') {
      const studyTarget = Math.max(1, learningSettings.dailyStudyMinutes);
      return this.energyMode.applyToTarget(studyTarget, energyAssessment);
    }

    const challengeMultiplier: Record<string, number> = {
      EASY: 0.8,
      NORMAL: 1,
      HARD: 1.25,
      EXPERT: 1.5,
    };

    const multiplier = challengeMultiplier[learningSettings.challengeMode] ?? 1;

    const scaledTarget = Math.max(1, Math.round(template.defaultTarget * multiplier));

    return this.energyMode.applyToTarget(scaledTarget, energyAssessment);
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

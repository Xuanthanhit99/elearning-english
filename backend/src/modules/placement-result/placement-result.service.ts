import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CefrLevel,
  EnglishLevel,
  PlacementProcessingItemStatus,
  PlacementProcessingStatus,
  PlacementResultStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { PlacementResultAiService } from './placement-result-ai/placement-result-ai.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { SettingsCommandService } from '../settings/settings-command.service';

@Injectable()
export class PlacementResultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: PlacementResultAiService,
    private readonly learningXp: LearningXpPublisher,
    private readonly settingsCommand: SettingsCommandService,
  ) {}

  async ensureGenerated(userId: string, testId: string) {
    const existing = await this.prisma.placementResult.findUnique({
      where: { testId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing || existing.status !== PlacementResultStatus.READY) {
      await this.generate(userId, testId);
    }

    return this.getResult(userId, testId);
  }

  async generate(userId: string, testId: string) {
    const test = await this.prisma.placementTest.findUnique({
      where: { id: testId },
      select: {
        id: true,
        userId: true,
        startedAt: true,
        completedAt: true,
        user: {
          select: {
            fullname: true,
          },
        },
        processingJob: {
          include: {
            skills: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra.');
    }

    if (test.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem kết quả này.');
    }

    if (
      !test.processingJob ||
      test.processingJob.status !== PlacementProcessingStatus.COMPLETED
    ) {
      throw new BadRequestException('Bài kiểm tra chưa xử lý hoàn tất.');
    }

    const evaluatedSkills = test.processingJob.skills.filter(
      (item) =>
        item.status !== PlacementProcessingItemStatus.SKIPPED &&
        item.status !== PlacementProcessingItemStatus.FAILED &&
        item.score !== null,
    );

    const overallScore =
      evaluatedSkills.length > 0
        ? Math.round(
            evaluatedSkills.reduce((sum, item) => sum + (item.score ?? 0), 0) /
              evaluatedSkills.length,
          )
        : 0;

    const overallLevel = this.scoreToLevel(overallScore);

    const processedSeconds =
      test.processingJob.startedAt && test.processingJob.completedAt
        ? Math.max(
            0,
            Math.round(
              (test.processingJob.completedAt.getTime() -
                test.processingJob.startedAt.getTime()) /
                1000,
            ),
          )
        : 0;

    const aiResult = await this.aiService.buildResult({
      userName: test.user.fullname ?? 'Bạn',
      overallScore,
      overallLevel,
      processedSeconds,
      skills: test.processingJob.skills.map((item) => ({
        skill: item.skill,
        score: item.score ?? 0,
        level: item.level,
        status: item.status,
        message: item.message,
      })),
    });

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.placementResult.upsert({
        where: { testId },
        create: {
          testId,
          userId,
          status: PlacementResultStatus.READY,
          overallScore: aiResult.overallScore,
          overallLevel: aiResult.overallLevel,
          percentile: aiResult.percentile,
          confidence: aiResult.confidence,
          summary: aiResult.summary,
          strengths: aiResult.strengths,
          improvements: aiResult.improvements,
          projectedLevel: aiResult.projectedLevel,
          projectedWeeksMin: aiResult.projectedWeeksMin,
          projectedWeeksMax: aiResult.projectedWeeksMax,
          processedSeconds,
          certificateCode: this.createCertificateCode(),
        },
        update: {
          status: PlacementResultStatus.READY,
          overallScore: aiResult.overallScore,
          overallLevel: aiResult.overallLevel,
          percentile: aiResult.percentile,
          confidence: aiResult.confidence,
          summary: aiResult.summary,
          strengths: aiResult.strengths,
          improvements: aiResult.improvements,
          projectedLevel: aiResult.projectedLevel,
          projectedWeeksMin: aiResult.projectedWeeksMin,
          projectedWeeksMax: aiResult.projectedWeeksMax,
          processedSeconds,
        },
      });
      try {
        await this.learningXp.publish({
          activity: 'PLACEMENT_COMPLETED',

          userId,

          sourceId: test.id,

          score: result.overallScore,

          completionRate: 100,

          metadata: {
            placementResultId: result.id,
            placementTestId: test.id,
            overallLevel: result.overallLevel,
            overallScore: result.overallScore,
            processedSeconds,
          },
        });
      } catch (error) {
        console.error(`Placement XP publish failed: ${test.id}`, error);
      }

      await tx.placementResultSkill.deleteMany({
        where: { resultId: result.id },
      });
      await tx.placementLearningPathPhase.deleteMany({
        where: { resultId: result.id },
      });
      await tx.placementLearningPriority.deleteMany({
        where: { resultId: result.id },
      });
      await tx.placementRecommendedCourse.deleteMany({
        where: { resultId: result.id },
      });

      await tx.placementResultSkill.createMany({
        data: aiResult.skills.map((item) => ({
          resultId: result.id,
          skill: item.skill,
          score: item.score,
          level: item.level,
          status: item.status,
          rating: item.rating,
          label: item.label,
          strengths: item.strengths,
          improvements: item.improvements,
          feedback: item.feedback,
        })),
      });

      await tx.placementLearningPathPhase.createMany({
        data: aiResult.phases.map((item) => ({
          resultId: result.id,
          phase: item.phase,
          title: item.title,
          targetLevel: item.targetLevel,
          weeksMin: item.weeksMin,
          weeksMax: item.weeksMax,
          description: item.description,
          objectives: item.objectives,
        })),
      });

      await tx.placementLearningPriority.createMany({
        data: aiResult.priorities.map((item) => ({
          resultId: result.id,
          skill: item.skill,
          priority: item.priority,
          reason: item.reason,
        })),
      });

      await tx.placementRecommendedCourse.createMany({
        data: aiResult.recommendedCourses.map((item) => ({
          resultId: result.id,
          title: item.title,
          slug: item.slug,
          thumbnail: item.thumbnail,
          rating: item.rating,
          reviews: item.reviews,
          lessonCount: item.lessonCount,
          reason: item.reason,
          order: item.order,
        })),
      });
    });

    // Settings owns whether the auto-detected level is actually applied
    // (it no-ops when the user has disabled autoDetectLevel). This must run
    // through SettingsCommandService, never a direct Prisma write here, so
    // the settings.updated event / audit trail stay consistent.
    try {
      await this.settingsCommand.applyPlacementResult(userId, {
        level: this.cefrToEnglishLevel(aiResult.overallLevel),
      });
    } catch (error) {
      console.error(`applyPlacementResult failed for userId=${userId}`, error);
    }
  }

  private cefrToEnglishLevel(level: CefrLevel): EnglishLevel {
    return EnglishLevel[level];
  }

  async getResult(userId: string, testId: string) {
    const result = await this.prisma.placementResult.findUnique({
      where: { testId },
      include: {
        test: {
          select: {
            id: true,
            completedAt: true,
            questions: {
              select: {
                question: {
                  select: {
                    type: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullname: true,
            avatar: true,
          },
        },
        skills: true,
        phases: {
          orderBy: { phase: 'asc' },
        },
        priorities: {
          orderBy: { priority: 'asc' },
        },
        courses: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Chưa có kết quả bài kiểm tra.');
    }

    if (result.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem kết quả này.');
    }

    const speakingCount = result.test.questions.filter(
      (item) => item.question.type === 'SPEAKING',
    ).length;

    const writingCount = result.test.questions.filter(
      (item) => item.question.type === 'WRITING',
    ).length;

    return {
      testId: result.testId,
      status: result.status,
      completedAt: result.test.completedAt,
      generatedAt: result.generatedAt,
      user: result.user,
      overview: {
        overallScore: result.overallScore,
        overallLevel: result.overallLevel,
        percentile: result.percentile,
        confidence: result.confidence,
        summary: result.summary,
        strengths: this.jsonArray(result.strengths),
        improvements: this.jsonArray(result.improvements),
        projectedLevel: result.projectedLevel,
        projectedWeeksMin: result.projectedWeeksMin,
        projectedWeeksMax: result.projectedWeeksMax,
        processedSeconds: result.processedSeconds,
      },
      analysis: {
        totalQuestions: result.test.questions.length,
        speakingCount,
        writingCount,
      },
      skills: result.skills.map((item) => ({
        skill: item.skill,
        score: item.score,
        level: item.level,
        status: item.status,
        rating: item.rating,
        label: item.label,
        feedback: item.feedback,
        strengths: this.jsonArray(item.strengths),
        improvements: this.jsonArray(item.improvements),
      })),
      learningPath: {
        phases: result.phases.map((item) => ({
          phase: item.phase,
          title: item.title,
          targetLevel: item.targetLevel,
          weeksMin: item.weeksMin,
          weeksMax: item.weeksMax,
          description: item.description,
          objectives: this.jsonArray(item.objectives),
          progress: item.progress,
        })),
        priorities: result.priorities,
      },
      recommendedCourses: result.courses,
      certificate: {
        code: result.certificateCode,
        url: result.certificateUrl,
        level: result.overallLevel,
      },
      actions: {
        startLearningUrl: '/learning-path',
        retryTestUrl: '/placement/test/intro',
        chooseOtherPathUrl: '/learning-path/select',
        detailedAnalysisUrl: `/placement/test/${testId}/analysis`,
      },
    };
  }

  private scoreToLevel(score: number): CefrLevel {
    if (score >= 90) return CefrLevel.C2;
    if (score >= 80) return CefrLevel.C1;
    if (score >= 70) return CefrLevel.B2;
    if (score >= 55) return CefrLevel.B1;
    if (score >= 40) return CefrLevel.A2;
    return CefrLevel.A1;
  }

  private createCertificateCode() {
    return `PL-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }

  private jsonArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}

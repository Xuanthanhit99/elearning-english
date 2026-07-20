import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  PlacementProcessingStatus,
  PlacementResultStatus,
  PlacementTestStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const RETAKE_COOLDOWN_DAYS = 7;

@Injectable()
export class PlacementDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        currentPlacementTestId: true,
        placementTests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
            questions: {
              select: {
                question: {
                  select: { type: true },
                },
              },
            },
            processingJob: {
              select: { status: true },
            },
            result: {
              include: {
                skills: true,
                phases: { orderBy: { phase: 'asc' } },
                priorities: { orderBy: { priority: 'asc' } },
                courses: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');

    const tests = user.placementTests;
    const inProgress = tests.find(
      (item) => item.status === PlacementTestStatus.IN_PROGRESS,
    );
    const processing = tests.find(
      (item) =>
        item.processingJob?.status === PlacementProcessingStatus.WAITING ||
        item.processingJob?.status === PlacementProcessingStatus.PROCESSING,
    );
    const completed = tests.filter(
      (item) => item.result?.status === PlacementResultStatus.READY,
    );

    const latest = completed[0] ?? null;
    const previous = completed[1] ?? null;

    const state = inProgress
      ? 'IN_PROGRESS'
      : processing
        ? 'PROCESSING'
        : latest
          ? 'COMPLETED'
          : 'FIRST_TIME';

    const current = inProgress ?? processing ?? latest;

    return {
      state,
      currentTest: current
        ? {
            id: current.id,
            status: current.status,
            startedAt: current.startedAt,
            completedAt: current.completedAt,
            testUrl: `/placement/test/${current.id}`,
            processingUrl: `/placement/test/${current.id}/processing`,
            resultUrl: `/placement/test/${current.id}/result`,
          }
        : null,
      latestResult: latest?.result
        ? {
            testId: latest.id,
            overallLevel: latest.result.overallLevel,
            overallScore: latest.result.overallScore,
            percentile: latest.result.percentile,
            confidence: latest.result.confidence,
            completedAt: latest.completedAt,
            totalQuestions: latest.questions.length,
            speakingCount: latest.questions.filter(
              (item) => item.question.type === 'SPEAKING',
            ).length,
            writingCount: latest.questions.filter(
              (item) => item.question.type === 'WRITING',
            ).length,
            processedSeconds: latest.result.processedSeconds,
            strengths: this.jsonArray(latest.result.strengths),
            improvements: this.jsonArray(latest.result.improvements),
            summary: latest.result.summary,
            projectedLevel: latest.result.projectedLevel,
            projectedWeeksMin: latest.result.projectedWeeksMin,
            projectedWeeksMax: latest.result.projectedWeeksMax,
          }
        : null,
      skills:
        latest?.result?.skills.map((item) => ({
          skill: item.skill,
          score: item.score,
          level: item.level,
          status: item.status,
          label: item.label,
          feedback: item.feedback,
          strengths: this.jsonArray(item.strengths),
          improvements: this.jsonArray(item.improvements),
        })) ?? [],
      priorities:
        latest?.result?.priorities.map((item) => ({
          id: item.id,
          skill: item.skill,
          priority: item.priority,
          reason: item.reason,
        })) ?? [],
      learningPath:
        latest?.result?.phases.map((item) => ({
          id: item.id,
          phase: item.phase,
          title: item.title,
          targetLevel: item.targetLevel,
          weeksMin: item.weeksMin,
          weeksMax: item.weeksMax,
          description: item.description,
          objectives: this.jsonArray(item.objectives),
          progress: item.progress,
        })) ?? [],
      recommendedCourses:
        latest?.result?.courses.map((item) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          thumbnail: item.thumbnail,
          rating: item.rating,
          reviews: item.reviews,
          lessonCount: item.lessonCount,
          reason: item.reason,
        })) ?? [],
      history: completed.slice(0, 5).map((item, index) => ({
        testId: item.id,
        completedAt: item.completedAt,
        level: item.result!.overallLevel,
        score: item.result!.overallScore,
        isLatest: index === 0,
        resultUrl: `/placement/test/${item.id}/result`,
      })),
      comparison: this.buildComparison(latest, previous),
      retake: this.buildRetake(latest?.completedAt ?? null),
      actions: {
        continueLearningUrl: '/learning-path',
        retakeUrl: '/placement/retake',
        resultUrl: latest ? `/placement/test/${latest.id}/result` : null,
        historyUrl: '/placement/history',
        detailedAnalysisUrl: latest
          ? `/placement/test/${latest.id}/analysis`
          : null,
        learningPathUrl: '/learning-path',
      },
    };
  }

  async getHistory(userId: string) {
    const tests = await this.prisma.placementTest.findMany({
      where: {
        userId,
        result: { status: PlacementResultStatus.READY },
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        completedAt: true,
        result: {
          select: {
            overallLevel: true,
            overallScore: true,
            confidence: true,
            percentile: true,
          },
        },
      },
    });

    return tests.map((item, index) => ({
      testId: item.id,
      completedAt: item.completedAt,
      level: item.result!.overallLevel,
      score: item.result!.overallScore,
      confidence: item.result!.confidence,
      percentile: item.result!.percentile,
      isLatest: index === 0,
      resultUrl: `/placement/test/${item.id}/result`,
    }));
  }

  async compare(userId: string, testId: string) {
    const current = await this.prisma.placementTest.findUnique({
      where: { id: testId },
      select: {
        id: true,
        userId: true,
        completedAt: true,
        result: { include: { skills: true } },
      },
    });

    if (!current || !current.result) {
      throw new NotFoundException('Không tìm thấy kết quả bài kiểm tra.');
    }
    if (current.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem dữ liệu so sánh.');
    }

    const previous = await this.prisma.placementTest.findFirst({
      where: {
        userId,
        completedAt: { lt: current.completedAt ?? new Date() },
        result: { status: PlacementResultStatus.READY },
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        result: { include: { skills: true } },
      },
    });

    return this.buildComparison(current, previous);
  }

  private buildComparison(current: any, previous: any) {
    if (!current?.result || !previous?.result) {
      return {
        hasPrevious: false,
        previousTestId: null,
        scoreDelta: null,
        levelDelta: null,
        previousLevel: null,
        previousScore: null,
        skillDeltas: [],
      };
    }

    const previousSkillMap = new Map(
      previous.result.skills.map((item: any) => [item.skill, item.score]),
    );

    return {
      hasPrevious: true,
      previousTestId: previous.id,
      scoreDelta: current.result.overallScore - previous.result.overallScore,
      levelDelta:
        this.levelIndex(current.result.overallLevel) -
        this.levelIndex(previous.result.overallLevel),
      previousLevel: previous.result.overallLevel,
      previousScore: previous.result.overallScore,
      skillDeltas: current.result.skills.map((item: any) => {
        const previousScore = Number(previousSkillMap.get(item.skill) ?? 0);
        return {
          skill: item.skill,
          currentScore: item.score,
          previousScore,
          delta: item.score - previousScore,
        };
      }),
    };
  }

  private buildRetake(completedAt: Date | null) {
    if (!completedAt) {
      return {
        allowed: true,
        cooldownDays: RETAKE_COOLDOWN_DAYS,
        remainingDays: 0,
        recommendedDate: null,
        message: 'Bạn có thể làm bài kiểm tra ngay.',
      };
    }

    const elapsedDays = Math.floor(
      (Date.now() - completedAt.getTime()) / (24 * 60 * 60 * 1000),
    );
    const remainingDays = Math.max(RETAKE_COOLDOWN_DAYS - elapsedDays, 0);
    const recommendedDate =
      remainingDays > 0
        ? new Date(
            completedAt.getTime() + RETAKE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
          )
        : null;

    return {
      allowed: remainingDays === 0,
      cooldownDays: RETAKE_COOLDOWN_DAYS,
      remainingDays,
      recommendedDate,
      message:
        remainingDays === 0
          ? 'Bạn có thể làm lại bài kiểm tra.'
          : `Nên làm lại sau ${remainingDays} ngày để phản ánh tiến bộ rõ hơn.`,
    };
  }

  private levelIndex(level: CefrLevel) {
    const order = [
      CefrLevel.A1,
      CefrLevel.A2,
      CefrLevel.B1,
      CefrLevel.B2,
      CefrLevel.C1,
      CefrLevel.C2,
    ];
    return order.indexOf(level);
  }

  private jsonArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}

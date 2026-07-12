import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  CefrLevel,
  LearningSkill,
  PlacementMethod,
  PlacementProcessingItemStatus,
  PlacementProcessingStatus,
  PlacementProcessingStep,
  PlacementStatus,
} from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { PLACEMENT_PROCESSING_QUEUE } from './placement-processing.module';
import { PlacementAiService } from '../placement/placement-ai/placement-ai.service';
import { Logger, NotFoundException } from '@nestjs/common';
import { PlacementResultService } from '../placement-result/placement-result.service';

type QueuePayload = {
  testId: string;
  userId: string;
  processingJobId: string;
};

@Processor('placement-processing')
export class PlacementProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(PlacementProcessingProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly placementAiService: PlacementAiService,
    private readonly placementResultService: PlacementResultService,
  ) {
    super();
    this.logger.log('PlacementProcessingProcessor initialized');
  }

  async process(job: Job<QueuePayload>) {
    const { testId, processingJobId } = job.data;

    try {
      await this.prisma.placementProcessingJob.update({
        where: {
          id: processingJobId,
        },
        data: {
          status: PlacementProcessingStatus.PROCESSING,
          startedAt: new Date(),
        },
      });

      await this.runAnswerAnalysis(processingJobId);

      await this.runSkillEvaluation(testId, processingJobId);

      await this.runLearningPath(testId, processingJobId);

      await this.runQualityCheck(processingJobId);

      await this.prisma.placementProcessingJob.update({
        where: {
          id: processingJobId,
        },
        data: {
          status: PlacementProcessingStatus.COMPLETED,
          progress: 100,
          estimatedRemainingSeconds: 0,
          completedAt: new Date(),
        },
      });

      await this.placementResultService.ensureGenerated(
        job.data.userId,
        testId,
      );
    } catch (error) {
      await this.prisma.placementProcessingJob.update({
        where: {
          id: processingJobId,
        },
        data: {
          status: PlacementProcessingStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  private async runSkillEvaluation(testId: string, processingJobId: string) {
    await this.runStep(
      processingJobId,
      PlacementProcessingStep.SKILL_EVALUATION,
      25,
      'Đang đánh giá các kỹ năng.',
    );

    await Promise.all([
      this.evaluateObjectiveSkill(
        testId,
        processingJobId,
        LearningSkill.VOCABULARY,
      ),

      this.evaluateObjectiveSkill(
        testId,
        processingJobId,
        LearningSkill.GRAMMAR,
      ),

      this.evaluateObjectiveSkill(
        testId,
        processingJobId,
        LearningSkill.READING,
      ),

      this.evaluateObjectiveSkill(
        testId,
        processingJobId,
        LearningSkill.LISTENING,
      ),

      this.evaluateSpeaking(testId, processingJobId),

      this.evaluateWriting(testId, processingJobId),
    ]);

    await this.completeStep(
      processingJobId,
      PlacementProcessingStep.SKILL_EVALUATION,
      68,
      'Đã hoàn thành đánh giá các kỹ năng.',
    );
  }

  private async evaluateWriting(testId: string, processingJobId: string) {
    const writingQuestion = await this.prisma.placementTestQuestion.findFirst({
      where: {
        testId,
        question: {
          skill: LearningSkill.WRITING,
        },
      },
      select: {
        writingText: true,
        question: {
          select: {
            question: true,
            level: true,
          },
        },
      },
    });

    if (!writingQuestion?.writingText) {
      await this.markSkillSkipped(
        processingJobId,
        LearningSkill.WRITING,
        'Chưa có bài viết để đánh giá.',
      );

      return;
    }

    const result = await this.placementAiService.evaluateWriting({
      prompt: writingQuestion.question.question,
      answer: writingQuestion.writingText,
      level: writingQuestion.question.level,
    });

    await this.prisma.placementProcessingSkillState.update({
      where: {
        jobId_skill: {
          jobId: processingJobId,
          skill: LearningSkill.WRITING,
        },
      },
      data: {
        status: PlacementProcessingItemStatus.COMPLETED,
        progress: 100,
        score: result.score,
        level: result.level,
        message: result.summary,
      },
    });
  }

  private async runLearningPath(testId: string, processingJobId: string) {
    await this.runStep(
      processingJobId,
      PlacementProcessingStep.LEARNING_PATH,
      72,
      'Đang xây dựng lộ trình cá nhân hóa.',
    );

    const skills = await this.prisma.placementProcessingSkillState.findMany({
      where: {
        jobId: processingJobId,
      },
      orderBy: {
        order: 'asc',
      },
    });

    const result = await this.placementAiService.generateLearningPath({
      skills: skills.map((item) => ({
        skill: item.skill,
        score: item.score,
        level: item.level,
        status: item.status,
      })),
    });

    await this.saveLearningPath(testId, result);

    await this.completeStep(
      processingJobId,
      PlacementProcessingStep.LEARNING_PATH,
      92,
      'Đã tạo lộ trình học đề xuất.',
    );
  }

  private async runAnswerAnalysis(processingJobId: string) {
    console.log('ssssssssssssssssssssssss');
    await this.runStep(
      processingJobId,
      PlacementProcessingStep.ANSWER_ANALYSIS,
      10,
      'Bắt đầu phân tích câu trả lời.',
    );

    await this.completeStep(
      processingJobId,
      PlacementProcessingStep.ANSWER_ANALYSIS,
      20,
      'Đã phân tích toàn bộ câu trả lời.',
    );
  }

  private async runQualityCheck(processingJobId: string) {
    await this.runStep(
      processingJobId,
      PlacementProcessingStep.QUALITY_CHECK,
      95,
      'Đang kiểm tra chất lượng kết quả.',
    );

    const skills = await this.prisma.placementProcessingSkillState.findMany({
      where: {
        jobId: processingJobId,
      },
    });

    const failedSkills = skills.filter(
      (item) => item.status === PlacementProcessingItemStatus.FAILED,
    );

    if (failedSkills.length > 0) {
      throw new Error(`Có ${failedSkills.length} kỹ năng xử lý thất bại.`);
    }

    await this.completeStep(
      processingJobId,
      PlacementProcessingStep.QUALITY_CHECK,
      99,
      'Đã kiểm tra chất lượng kết quả.',
    );
  }

  private async evaluateObjectiveSkill(
    testId: string,
    processingJobId: string,
    skill: LearningSkill,
  ) {
    await this.prisma.placementProcessingSkillState.update({
      where: {
        jobId_skill: {
          jobId: processingJobId,
          skill,
        },
      },
      data: {
        status: PlacementProcessingItemStatus.PROCESSING,
        progress: 40,
        message: `Đang phân tích ${this.skillLabel(skill)}.`,
      },
    });

    const questions = await this.prisma.placementTestQuestion.findMany({
      where: {
        testId,
        question: {
          skill,
        },
      },
      select: {
        isCorrect: true,
        isSkipped: true,
      },
    });

    if (questions.length === 0) {
      await this.markSkillSkipped(
        processingJobId,
        skill,
        'Không có dữ liệu để đánh giá.',
      );

      return;
    }

    const allSkipped = questions.every((item) => item.isSkipped);

    if (allSkipped) {
      await this.markSkillSkipped(
        processingJobId,
        skill,
        'Người dùng đã bỏ qua kỹ năng này.',
      );

      return;
    }

    const scorableQuestions = questions.filter(
      (item) => item.isCorrect !== null && !item.isSkipped,
    );

    const score =
      scorableQuestions.length > 0
        ? Math.round(
            (scorableQuestions.filter((item) => item.isCorrect === true)
              .length /
              scorableQuestions.length) *
              100,
          )
        : 0;

    const level = this.scoreToLevel(score);

    await this.prisma.placementProcessingSkillState.update({
      where: {
        jobId_skill: {
          jobId: processingJobId,
          skill,
        },
      },
      data: {
        status: PlacementProcessingItemStatus.COMPLETED,
        progress: 100,
        score,
        level,
        message:
          score >= 70
            ? `${this.skillLabel(skill)} là điểm mạnh hiện tại.`
            : `${this.skillLabel(skill)} cần được ưu tiên trong lộ trình.`,
      },
    });
  }

  private async evaluateSpeaking(testId: string, processingJobId: string) {
    const speakingQuestion = await this.prisma.placementTestQuestion.findFirst({
      where: {
        testId,
        question: {
          skill: LearningSkill.SPEAKING,
        },
      },
      select: {
        isSkipped: true,
        transcript: true,
        audioUrl: true,
        question: {
          select: {
            question: true,
            level: true,
          },
        },
      },
    });

    if (!speakingQuestion || speakingQuestion.isSkipped) {
      await this.markSkillSkipped(
        processingJobId,
        LearningSkill.SPEAKING,
        'Speaking chưa được đánh giá.',
      );

      return;
    }

    if (!speakingQuestion.transcript) {
      await this.markSkillSkipped(
        processingJobId,
        LearningSkill.SPEAKING,
        'Bài nói chưa có transcript để AI đánh giá.',
      );

      return;
    }

    const result = await this.placementAiService.evaluateSpeaking({
      prompt: speakingQuestion.question.question,
      transcript: speakingQuestion.transcript,
      level: speakingQuestion.question.level,
    });

    await this.prisma.placementProcessingSkillState.update({
      where: {
        jobId_skill: {
          jobId: processingJobId,
          skill: LearningSkill.SPEAKING,
        },
      },
      data: {
        status: PlacementProcessingItemStatus.COMPLETED,
        progress: 100,
        score: result.score,
        level: result.level,
        message: result.summary,
      },
    });
  }

  private async markSkillSkipped(
    processingJobId: string,
    skill: LearningSkill,
    message: string,
  ) {
    await this.prisma.placementProcessingSkillState.update({
      where: {
        jobId_skill: {
          jobId: processingJobId,
          skill,
        },
      },
      data: {
        status: PlacementProcessingItemStatus.SKIPPED,
        progress: 100,
        score: 0,
        level: null,
        message,
      },
    });
  }

  private async saveLearningPath(
    testId: string,
    result: {
      overallLevel: CefrLevel;
      summary: string;
      priorities: Array<{
        skill: LearningSkill;
        level: CefrLevel | null;
        priority: number;
        reason: string;
      }>;
    },
  ): Promise<void> {
    const test = await this.prisma.placementTest.findUnique({
      where: {
        id: testId,
      },
      select: {
        userId: true,
      },
    });

    if (!test) {
      throw new NotFoundException(
        'Không tìm thấy bài kiểm tra để lưu lộ trình.',
      );
    }

    await this.prisma.userPlacement.upsert({
      where: {
        userId: test.userId,
      },
      create: {
        userId: test.userId,
        method: PlacementMethod.TEST,
        status: PlacementStatus.COMPLETED,
        overallLevel: result.overallLevel,
        completedAt: new Date(),
      },
      update: {
        method: PlacementMethod.TEST,
        status: PlacementStatus.COMPLETED,
        overallLevel: result.overallLevel,
        completedAt: new Date(),
      },
    });

    await this.prisma.placementProcessingInsight.create({
      data: {
        jobId: await this.resolveProcessingJobId(testId),
        content: result.summary,
        order: result.priorities.length + 1,
      },
    });
  }

  private async runStep(
    jobId: string,
    step: PlacementProcessingStep,
    progress: number,
    message: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.placementProcessingJob.update({
        where: { id: jobId },
        data: {
          status: PlacementProcessingStatus.PROCESSING,
          currentStep: step,
          progress,
          estimatedRemainingSeconds: Math.max(
            5,
            Math.round((100 - progress) * 0.8),
          ),
        },
      }),
      this.prisma.placementProcessingStepState.update({
        where: {
          jobId_step: {
            jobId,
            step,
          },
        },
        data: {
          status: PlacementProcessingItemStatus.PROCESSING,
          progress: 15,
          startedAt: new Date(),
        },
      }),
    ]);

    await this.log(jobId, message, PlacementProcessingItemStatus.PROCESSING);
  }

  private async completeStep(
    jobId: string,
    step: PlacementProcessingStep,
    progress: number,
    message: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.placementProcessingJob.update({
        where: { id: jobId },
        data: {
          progress,
          estimatedRemainingSeconds: Math.max(
            2,
            Math.round((100 - progress) * 0.7),
          ),
        },
      }),
      this.prisma.placementProcessingStepState.update({
        where: {
          jobId_step: {
            jobId,
            step,
          },
        },
        data: {
          status: PlacementProcessingItemStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
        },
      }),
    ]);

    await this.log(jobId, message, PlacementProcessingItemStatus.COMPLETED);
  }

  private async log(
    jobId: string,
    message: string,
    status: PlacementProcessingItemStatus,
  ) {
    await this.prisma.placementProcessingLog.create({
      data: {
        jobId,
        message,
        status,
      },
    });
  }

  private skillLabel(skill: LearningSkill): string {
    const labels: Record<LearningSkill, string> = {
      [LearningSkill.VOCABULARY]: 'Từ vựng',
      [LearningSkill.GRAMMAR]: 'Ngữ pháp',
      [LearningSkill.LISTENING]: 'Nghe',
      [LearningSkill.READING]: 'Đọc',
      [LearningSkill.SPEAKING]: 'Nói',
      [LearningSkill.WRITING]: 'Viết',
    };

    return labels[skill];
  }

  private scoreToLevel(score: number): CefrLevel {
    const normalizedScore = Math.max(0, Math.min(100, score));

    if (normalizedScore >= 90) {
      return CefrLevel.C2;
    }

    if (normalizedScore >= 80) {
      return CefrLevel.C1;
    }

    if (normalizedScore >= 70) {
      return CefrLevel.B2;
    }

    if (normalizedScore >= 55) {
      return CefrLevel.B1;
    }

    if (normalizedScore >= 40) {
      return CefrLevel.A2;
    }

    return CefrLevel.A1;
  }

  private async resolveProcessingJobId(testId: string): Promise<string> {
    const processingJob = await this.prisma.placementProcessingJob.findUnique({
      where: {
        testId,
      },
      select: {
        id: true,
      },
    });

    if (!processingJob) {
      throw new NotFoundException('Không tìm thấy tiến trình xử lý.');
    }

    return processingJob.id;
  }
}

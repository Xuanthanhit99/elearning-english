import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  LearningSkill,
  PlacementProcessingStatus,
  PlacementTestStatus,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { PLACEMENT_PROCESSING_QUEUE } from './placement-processing.module';
import { PrismaService } from 'src/prisma/prisma.service';

const STEPS = [
  ['ANSWER_ANALYSIS', 'Phân tích câu trả lời', 1],
  ['SKILL_EVALUATION', 'Đánh giá năng lực', 2],
  ['LEARNING_PATH', 'Đề xuất lộ trình', 3],
  ['QUALITY_CHECK', 'Kiểm tra chất lượng', 4],
] as const;

const SKILLS: LearningSkill[] = [
  LearningSkill.VOCABULARY,
  LearningSkill.GRAMMAR,
  LearningSkill.READING,
  LearningSkill.LISTENING,
  LearningSkill.SPEAKING,
  LearningSkill.WRITING,
];

@Injectable()
export class PlacementProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('placement-processing')
    private readonly queue: Queue,
  ) {}

  async ensureStarted(userId: string, testId: string) {
    const existing = await this.prisma.placementProcessingJob.findUnique({
      where: {
        testId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      await this.start(userId, testId);

      return this.getSnapshot(userId, testId);
    }

    if (existing.status === PlacementProcessingStatus.COMPLETED) {
      return this.getSnapshot(userId, testId);
    }

    const queueJobId = `placement-processing-${testId}`;

    const queueJob = await this.queue.getJob(queueJobId);

    if (!queueJob) {
      await this.queue.add(
        'process-placement',
        {
          testId,
          userId,
          processingJobId: existing.id,
        },
        {
          jobId: queueJobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      );
    }

    return this.getSnapshot(userId, testId);
  }

  async start(userId: string, testId: string) {
    const test = await this.prisma.placementTest.findUnique({
      where: { id: testId },
      select: {
        id: true,
        userId: true,
        questions: {
          select: {
            userAnswer: true,
            isSkipped: true,
            answeredAt: true,
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra.');
    }

    if (test.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền xử lý bài kiểm tra này.',
      );
    }

    const answered = test.questions.filter(
      (item) =>
        item.userAnswer !== null || item.isSkipped || item.answeredAt !== null,
    ).length;

    if (test.questions.length === 0 || answered !== test.questions.length) {
      throw new BadRequestException('Bài kiểm tra chưa hoàn thành đầy đủ.');
    }

    const processingJob = await this.prisma.$transaction(async (tx) => {
      await tx.placementTest.update({
        where: { id: testId },
        data: {
          status: PlacementTestStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      const created = await tx.placementProcessingJob.upsert({
        where: { testId },
        create: {
          testId,
          userId,
          status: PlacementProcessingStatus.WAITING,
          progress: 0,
          estimatedRemainingSeconds: 90,
          nextUrl: `/placement/test/${testId}/result`,
        },
        update: {
          status: PlacementProcessingStatus.WAITING,
          currentStep: null,
          progress: 0,
          estimatedRemainingSeconds: 90,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          nextUrl: `/placement/test/${testId}/result`,
        },
      });

      await tx.placementProcessingStepState.deleteMany({
        where: { jobId: created.id },
      });
      await tx.placementProcessingSkillState.deleteMany({
        where: { jobId: created.id },
      });
      await tx.placementProcessingLog.deleteMany({
        where: { jobId: created.id },
      });
      await tx.placementProcessingInsight.deleteMany({
        where: { jobId: created.id },
      });

      await tx.placementProcessingStepState.createMany({
        data: STEPS.map(([step, title, order]) => ({
          jobId: created.id,
          step,
          title,
          order,
        })),
      });

      await tx.placementProcessingSkillState.createMany({
        data: SKILLS.map((skill, index) => ({
          jobId: created.id,
          skill,
          order: index + 1,
        })),
      });

      return created;
    });

    const queueJobId = `placement-processing-${testId}`;
    const existingQueueJob = await this.queue.getJob(queueJobId);

    if (!existingQueueJob) {
      await this.queue.add(
        'process-placement',
        {
          testId,
          userId,
          processingJobId: processingJob.id,
        },
        {
          jobId: queueJobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      );
    }
  }

  async getSnapshot(userId: string, testId: string) {
    const test = await this.prisma.placementTest.findUnique({
      where: { id: testId },
      select: { userId: true },
    });

    if (!test) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra.');
    }

    if (test.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem tiến trình này.');
    }

    const job = await this.prisma.placementProcessingJob.findUnique({
      where: { testId },
      include: {
        steps: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        logs: { orderBy: { createdAt: 'asc' }, take: 40 },
        insights: { orderBy: { order: 'asc' } },
      },
    });

    if (!job) {
      throw new NotFoundException('Chưa có tiến trình xử lý.');
    }

    return {
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      estimatedRemainingSeconds: job.estimatedRemainingSeconds,
      errorMessage: job.errorMessage,
      nextUrl: job.nextUrl,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      steps: job.steps.map((item) => ({
        key: item.step,
        title: item.title,
        status: item.status,
        progress: item.progress,
      })),
      skills: job.skills.map((item) => ({
        skill: item.skill,
        status: item.status,
        progress: item.progress,
        score: item.score,
        level: item.level,
        message: item.message,
      })),
      logs: job.logs,
      insights: job.insights.map((item) => item.content),
    };
  }
}

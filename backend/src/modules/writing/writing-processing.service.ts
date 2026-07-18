import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  WRITING_PROCESSING_JOB,
  WRITING_PROCESSING_QUEUE,
} from './writing-processing.constants';
import { WritingSessionService } from './writing-session.service';

@Injectable()
export class WritingProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: WritingSessionService,
    @InjectQueue(WRITING_PROCESSING_QUEUE)
    private readonly queue: Queue,
  ) {}

  async submit(input: {
    userId: string;
    sessionId: string;
    content: string;
    timeSpentSeconds?: number;
  }) {
    const session = await this.sessions.getOwnedSession(
      input.userId,
      input.sessionId,
    );

    const { content, wordCount } = this.sessions.validateSubmission(
      input.content,
    );

    if (wordCount < session.lesson.minWords) {
      throw new BadRequestException(
        `Bài viết cần tối thiểu ${session.lesson.minWords} từ.`,
      );
    }

    const runningJob = await this.prisma.writingProcessingJob.findFirst({
      where: {
        userId: input.userId,
        sessionId: session.id,
        status: {
          in: ['QUEUED', 'PROCESSING'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (runningJob) {
      return {
        sessionId: session.id,
        processingJobId: runningJob.id,
        status: runningJob.status,
        processingUrl: `/writing/sessions/${session.id}/processing`,
      };
    }

    if (session.isSubmitted) {
      const latest = await this.prisma.writingProcessingJob.findFirst({
        where: { userId: input.userId, sessionId: session.id },
        orderBy: { createdAt: 'desc' },
      });

      return {
        sessionId: session.id,
        processingJobId: latest?.id ?? null,
        status: latest?.status ?? 'COMPLETED',
        processingUrl: `/writing/sessions/${session.id}/processing`,
        resultUrl:
          latest?.status === 'COMPLETED'
            ? `/writing/sessions/${session.id}/result`
            : null,
      };
    }

    await this.prisma.writingSession.update({
      where: { id: session.id },
      data: {
        content,
        wordCount,
        timeSpentSeconds: input.timeSpentSeconds ?? session.timeSpentSeconds,
        isSubmitted: false,
      },
    });

    const processingJob = await this.prisma.writingProcessingJob.create({
      data: {
        userId: input.userId,
        sessionId: session.id,
        status: 'QUEUED',
        step: 'SUBMITTED',
        progress: 10,
        message: 'Đã nhận bài viết. Đang chờ AI chấm điểm.',
        content,
        wordCount,
        timeSpentSeconds: input.timeSpentSeconds ?? session.timeSpentSeconds,
      },
    });

    await this.queue.add(
      WRITING_PROCESSING_JOB.EVALUATE_SESSION,
      {
        processingJobId: processingJob.id,
        sessionId: session.id,
        userId: input.userId,
      },
      {
        jobId: `writing-${processingJob.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 500 },
        removeOnFail: false,
      },
    );

    return {
      sessionId: session.id,
      processingJobId: processingJob.id,
      status: 'QUEUED',
      processingUrl: `/writing/sessions/${session.id}/processing`,
    };
  }

  async getStatus(userId: string, sessionId: string) {
    const job = await this.prisma.writingProcessingJob.findFirst({
      where: { userId, sessionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!job) {
      throw new NotFoundException('Không tìm thấy tiến trình Writing.');
    }

    return {
      id: job.id,
      sessionId: job.sessionId,
      status: job.status,
      step: job.step,
      progress: job.progress,
      message: job.message,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      resultUrl:
        job.status === 'COMPLETED'
          ? `/writing/sessions/${sessionId}/result`
          : null,
    };
  }
}

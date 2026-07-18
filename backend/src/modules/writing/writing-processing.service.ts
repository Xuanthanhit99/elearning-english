import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WRITING_PROCESSING_JOB,
  WRITING_PROCESSING_QUEUE,
} from './writing-processing.constants';
import { WritingSessionService } from './writing-session.service';

@Injectable()
export class WritingProcessingService {
  private readonly staleProcessingMs = 15 * 60 * 1000;

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

    const runningJob = await this.findRunningJob(input.userId, session.id);

    if (
      runningJob &&
      !this.isStale(runningJob.status, runningJob.startedAt ?? runningJob.updatedAt)
    ) {
      return {
        sessionId: session.id,
        processingJobId: runningJob.id,
        status: runningJob.status,
        processingUrl: `/writing/sessions/${session.id}/processing`,
      };
    }

    if (session.isSubmitted) {
      const latest = await this.findLatestJob(input.userId, session.id);

      return {
        sessionId: session.id,
        processingJobId: latest?.id ?? null,
        status: latest?.status ?? 'COMPLETED',
        processingUrl: `/writing/sessions/${session.id}/processing`,
        resultUrl:
          latest?.status === 'COMPLETED' || session.aiResult
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
    const session = await this.prisma.writingSession.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        isSubmitted: true,
        aiResult: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện viết.');
    }

    const job = await this.findLatestJob(userId, sessionId);

    if (!job) {
      if (session.isSubmitted && session.aiResult) {
        return this.completedStatus(sessionId);
      }

      throw new NotFoundException('Không tìm thấy tiến trình Writing.');
    }

    const isStale = this.isStale(job.status, job.startedAt ?? job.updatedAt);

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
      retryable: job.status === 'FAILED' || isStale,
      isStale,
      resultUrl:
        job.status === 'COMPLETED' || (session.isSubmitted && session.aiResult)
          ? `/writing/sessions/${sessionId}/result`
          : null,
    };
  }

  async retryProcessing(userId: string, sessionId: string) {
    const session = await this.sessions.getOwnedSession(userId, sessionId);

    if (session.isSubmitted && session.aiResult) {
      return {
        sessionId: session.id,
        status: 'COMPLETED',
        resultUrl: `/writing/sessions/${session.id}/result`,
      };
    }

    const latest = await this.findLatestJob(userId, sessionId);

    if (
      latest &&
      latest.status !== 'FAILED' &&
      !this.isStale(latest.status, latest.startedAt ?? latest.updatedAt)
    ) {
      return {
        sessionId: session.id,
        processingJobId: latest.id,
        status: latest.status,
        processingUrl: `/writing/sessions/${session.id}/processing`,
      };
    }

    return this.submit({
      userId,
      sessionId,
      content: session.content ?? '',
      timeSpentSeconds: session.timeSpentSeconds,
    });
  }

  private findRunningJob(userId: string, sessionId: string) {
    return this.prisma.writingProcessingJob.findFirst({
      where: {
        userId,
        sessionId,
        status: {
          in: ['QUEUED', 'PROCESSING'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private findLatestJob(userId: string, sessionId: string) {
    return this.prisma.writingProcessingJob.findFirst({
      where: { userId, sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private isStale(status: string, updatedAt: Date) {
    return (
      status === 'PROCESSING' &&
      Date.now() - updatedAt.getTime() > this.staleProcessingMs
    );
  }

  private completedStatus(sessionId: string) {
    return {
      id: null,
      sessionId,
      status: 'COMPLETED',
      step: 'COMPLETED',
      progress: 100,
      message: 'Bài Writing đã có kết quả.',
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      retryable: false,
      isStale: false,
      resultUrl: `/writing/sessions/${sessionId}/result`,
    };
  }
}

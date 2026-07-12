import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  LISTENING_GENERATION_JOB,
  LISTENING_GENERATION_QUEUE,
} from './listening-job.constants';

@Injectable()
export class ListeningAudioBackfillService {
  private readonly logger = new Logger(ListeningAudioBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(LISTENING_GENERATION_QUEUE)
    private readonly queue: Queue,
  ) {}

  /**
   * Gọi một lần sau khi deploy để bù audio cho dữ liệu cũ.
   */
  async enqueueMissingAudio(limit = 500) {
    const safeLimit = Math.min(Math.max(limit, 1), 5000);

    const questions = await this.prisma.listeningQuestion.findMany({
      where: {
        OR: [
          {
            audioUrl: '',
          },
          {
            audioUrl: '',
          },
        ],
        transcript: {
          not: null,
        },
      },
      select: {
        id: true,
        transcript: true,
      },
      take: safeLimit,
      orderBy: {
        createdAt: 'asc',
      },
    });

    let queued = 0;

    for (const question of questions) {
      if (!question.transcript?.trim()) {
        continue;
      }

      await this.queue.add(
        LISTENING_GENERATION_JOB.GENERATE_AUDIO,
        {
          questionId: question.id,
          transcript: question.transcript,
        },
        {
          jobId: `listening-audio-${question.id}`,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      queued += 1;
    }

    this.logger.log(`Queued ${queued} missing Listening audio jobs.`);

    return {
      scanned: questions.length,
      queued,
    };
  }
}

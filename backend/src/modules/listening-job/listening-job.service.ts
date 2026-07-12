import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import {
  LISTENING_GENERATION_JOB,
  LISTENING_GENERATION_QUEUE,
} from './listening-job.constants';
import { ListeningGenerationConfig } from './listening-job.types';

@Injectable()
export class ListeningJobService {
  private readonly logger = new Logger(ListeningJobService.name);

  private readonly configs: ListeningGenerationConfig[] = [
    { level: 'A1', topic: 'Daily Life' },
    { level: 'A2', topic: 'School' },
    { level: 'B1', topic: 'Environment' },
    { level: 'B1', topic: 'Technology' },
  ];

  constructor(
    @InjectQueue(LISTENING_GENERATION_QUEUE)
    private readonly queue: Queue,
  ) {}

  // /**
  //  * 02:00 mỗi ngày.
  //  * Khi cần test, có thể tạm đổi thành:
  //  * @Cron('*/1 * * * *')
  //  */
  @Cron('0 2 * * *')
  async generateDailyListeningQuestions() {
    const totalNeed = 100;
    const batchSize = 5;

    this.logger.log(
      `Queue daily Listening generation: total=${totalNeed}, batch=${batchSize}`,
    );

    let queued = 0;
    let configIndex = 0;

    while (queued < totalNeed) {
      const config = this.configs[configIndex % this.configs.length];
      const count = Math.min(batchSize, totalNeed - queued);

      const jobId = [
        'listening',
        'generate',
        new Date().toISOString().slice(0, 10),
        config.level,
        this.slug(config.topic),
        queued,
      ].join('-');

      await this.queue.add(
        LISTENING_GENERATION_JOB.GENERATE_BATCH,
        {
          level: config.level,
          topic: config.topic,
          count,
        },
        {
          jobId,
          attempts: 4,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 24 * 60 * 60,
            count: 500,
          },
          removeOnFail: {
            age: 7 * 24 * 60 * 60,
            count: 1000,
          },
        },
      );

      queued += count;
      configIndex += 1;
    }

    this.logger.log(`Queued ${queued} Listening questions.`);
  }

  /**
   * Dùng để chạy tay từ service/controller/admin command nếu cần.
   */
  async enqueueGeneration(input?: {
    totalNeed?: number;
    batchSize?: number;
    configs?: ListeningGenerationConfig[];
  }) {
    const totalNeed = Math.max(1, input?.totalNeed ?? 20);
    const batchSize = Math.min(Math.max(1, input?.batchSize ?? 5), 10);
    const configs = input?.configs?.length ? input.configs : this.configs;

    let queued = 0;
    let configIndex = 0;

    while (queued < totalNeed) {
      const config = configs[configIndex % configs.length];
      const count = Math.min(batchSize, totalNeed - queued);

      await this.queue.add(
        LISTENING_GENERATION_JOB.GENERATE_BATCH,
        {
          level: config.level,
          topic: config.topic,
          count,
        },
        {
          attempts: 4,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      queued += count;
      configIndex += 1;
    }

    return {
      queued,
      batchSize,
      configCount: configs.length,
    };
  }

  private slug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

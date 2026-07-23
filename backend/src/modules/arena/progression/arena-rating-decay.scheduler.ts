import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { ARENA_RATING_DECAY_JOB, ARENA_RATING_DECAY_QUEUE } from './arena-rating-decay.constants';
import { getArenaDecayEnabled } from './arena-rating-engine';

@Injectable()
export class ArenaRatingDecayScheduler {
  constructor(@InjectQueue(ARENA_RATING_DECAY_QUEUE) private readonly queue: Queue) {}

  @Cron('0 15 3 * * *')
  async scheduleDecay() {
    if (!getArenaDecayEnabled()) return;
    const dayBucket = new Date().toISOString().slice(0, 10);
    await this.queue.add(
      ARENA_RATING_DECAY_JOB,
      {},
      {
        jobId: `arena-rating-decay-${dayBucket}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60, count: 100 },
        removeOnFail: false,
      },
    );
  }
}

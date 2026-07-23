import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { ARENA_SEASON_LIFECYCLE_JOB, ARENA_SEASON_LIFECYCLE_QUEUE } from './arena-season-lifecycle.constants';
import { getArenaSeasonEnabled } from './arena-season.service';

@Injectable()
export class ArenaSeasonLifecycleScheduler {
  constructor(@InjectQueue(ARENA_SEASON_LIFECYCLE_QUEUE) private readonly queue: Queue) {}

  @Cron('0 */5 * * * *')
  async scheduleLifecycle() {
    if (!getArenaSeasonEnabled()) return;
    const bucket = Math.floor(Date.now() / 300000);
    await this.queue.add(
      ARENA_SEASON_LIFECYCLE_JOB,
      {},
      {
        jobId: `arena-season-lifecycle-${bucket}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60, count: 100 },
        removeOnFail: false,
      },
    );
  }
}

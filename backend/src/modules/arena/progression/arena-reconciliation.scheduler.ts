import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { ARENA_RECONCILIATION_JOB, ARENA_RECONCILIATION_QUEUE } from './arena-reconciliation.constants';

/**
 * Same "poll every N minutes, let the query decide what needs work"
 * idiom as `LeaderboardWeeklyCloseScheduler` — the `jobId` bucketed by
 * time window gives natural dedup across overlapping app instances
 * without any distributed lock.
 */
@Injectable()
export class ArenaReconciliationScheduler {
  constructor(@InjectQueue(ARENA_RECONCILIATION_QUEUE) private readonly queue: Queue) {}

  @Cron('0 */2 * * * *')
  async scheduleReconciliation() {
    const twoMinuteBucket = Math.floor(Date.now() / 120000);
    await this.queue.add(
      ARENA_RECONCILIATION_JOB,
      {},
      {
        jobId: `arena-reconciliation-${twoMinuteBucket}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60, count: 100 },
        removeOnFail: false,
      },
    );
  }
}

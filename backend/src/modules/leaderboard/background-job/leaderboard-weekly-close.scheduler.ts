import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import {
  LEADERBOARD_WEEKLY_CLOSE_JOB,
  LEADERBOARD_WEEKLY_CLOSE_QUEUE,
} from './leaderboard-phase3.constants';

@Injectable()
export class LeaderboardWeeklyCloseScheduler {
  constructor(
    @InjectQueue(LEADERBOARD_WEEKLY_CLOSE_QUEUE)
    private readonly queue: Queue,
  ) {}

  /*
   * Kiểm tra 5 phút một lần.
   * Database quyết định season nào đã hết hạn.
   */
  @Cron('0 */5 * * * *')
  async scheduleWeeklyClose() {
    const fiveMinuteBucket = Math.floor(Date.now() / 300000);

    await this.queue.add(
      LEADERBOARD_WEEKLY_CLOSE_JOB,
      {},
      {
        jobId: `leaderboard-weekly-close-${fiveMinuteBucket}`,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: {
          age: 7 * 24 * 60 * 60,
          count: 100,
        },
        removeOnFail: false,
      },
    );
  }
}

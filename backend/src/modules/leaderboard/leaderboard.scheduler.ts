import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LEADERBOARD_QUEUE } from './leaderboard.constants';
import { LeaderboardJobName } from './leaderboard.processor';

@Injectable()
export class LeaderboardScheduler implements OnModuleInit {
  constructor(@InjectQueue(LEADERBOARD_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    await this.queue.add(
      LeaderboardJobName.CREATE_WEEKLY_SEASON,
      {},
      {
        jobId: 'leaderboard:create-weekly-season',
        repeat: { pattern: '5 0 * * 1' },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    await this.queue.add(
      LeaderboardJobName.CLOSE_WEEKLY_SEASON,
      {},
      {
        jobId: 'leaderboard:close-weekly-season',
        repeat: { pattern: '0 0 * * 1' },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
  }
}

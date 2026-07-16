import {
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  LEADERBOARD_WEEKLY_CLOSE_JOB,
  LEADERBOARD_WEEKLY_CLOSE_QUEUE,
} from './leaderboard-phase3.constants';
import { LeaderboardWeeklyCloseService } from './leaderboard-weekly-close.service';

@Processor(
  LEADERBOARD_WEEKLY_CLOSE_QUEUE,
  {
    concurrency: 1,
  },
)
export class LeaderboardWeeklyCloseProcessor
  extends WorkerHost
{
  private readonly logger = new Logger(
    LeaderboardWeeklyCloseProcessor.name,
  );

  constructor(
    private readonly weeklyClose:
      LeaderboardWeeklyCloseService,
  ) {
    super();
  }

  async process(job: Job) {
    if (
      job.name !==
      LEADERBOARD_WEEKLY_CLOSE_JOB
    ) {
      throw new Error(
        `Unsupported leaderboard job: ${job.name}`,
      );
    }

    return this.weeklyClose
      .closeExpiredWeeklySeason();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `Weekly leaderboard job completed: ${job.id}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(
    job: Job | undefined,
    error: Error,
  ) {
    this.logger.error(
      `Weekly leaderboard job failed: ${job?.id}`,
      error.stack,
    );
  }
}

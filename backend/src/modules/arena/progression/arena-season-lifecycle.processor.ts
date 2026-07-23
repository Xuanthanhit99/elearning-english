import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ARENA_SEASON_LIFECYCLE_QUEUE } from './arena-season-lifecycle.constants';
import { ArenaSeasonService } from './arena-season.service';

@Processor(ARENA_SEASON_LIFECYCLE_QUEUE, { concurrency: 1 })
export class ArenaSeasonLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(ArenaSeasonLifecycleProcessor.name);

  constructor(private readonly seasons: ArenaSeasonService) {
    super();
  }

  async process(_job: Job) {
    return this.seasons.runLifecycle();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Arena season lifecycle job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Arena season lifecycle job failed: ${job?.id}`, error.stack);
  }
}

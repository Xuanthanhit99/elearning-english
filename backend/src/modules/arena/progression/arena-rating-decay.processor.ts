import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ARENA_RATING_DECAY_QUEUE } from './arena-rating-decay.constants';
import { ArenaRatingDecayService } from './arena-rating-decay.service';

@Processor(ARENA_RATING_DECAY_QUEUE, { concurrency: 1 })
export class ArenaRatingDecayProcessor extends WorkerHost {
  private readonly logger = new Logger(ArenaRatingDecayProcessor.name);

  constructor(private readonly decay: ArenaRatingDecayService) {
    super();
  }

  async process(_job: Job) {
    return this.decay.runDecay();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Arena rating decay job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Arena rating decay job failed: ${job?.id}`, error.stack);
  }
}

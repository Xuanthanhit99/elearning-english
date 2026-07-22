import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ARENA_RECONCILIATION_QUEUE } from './arena-reconciliation.constants';
import { ArenaReconciliationService } from './arena-reconciliation.service';

@Processor(ARENA_RECONCILIATION_QUEUE, { concurrency: 1 })
export class ArenaReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ArenaReconciliationProcessor.name);

  constructor(private readonly reconciliation: ArenaReconciliationService) {
    super();
  }

  async process(_job: Job) {
    return this.reconciliation.reconcile();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Arena reconciliation job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Arena reconciliation job failed: ${job?.id}`, error.stack);
  }
}

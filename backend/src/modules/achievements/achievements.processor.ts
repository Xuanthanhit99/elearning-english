import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  ACHIEVEMENT_QUEUE,
  AchievementJobName,
} from './achievements.constants';
import { AchievementActivityEvent } from './achievement-event.types';
import { AchievementsService } from './achievements.service';

@Processor(ACHIEVEMENT_QUEUE)
export class AchievementsProcessor extends WorkerHost {
  private readonly logger = new Logger(AchievementsProcessor.name);

  constructor(private readonly achievements: AchievementsService) {
    super();
  }

  async process(job: Job<AchievementActivityEvent>) {
    if (job.name !== AchievementJobName.PROCESS_EVENT) {
      this.logger.warn(`Unsupported achievement job: ${job.name}`);
      return { skipped: true };
    }

    const result = await this.achievements.processActivityEvent(job.data);
    this.logger.log(
      `Achievement event processed eventId=${job.data.eventId} processed=${result.processed} unlocked=${result.unlocked.length}`,
    );
    return result;
  }

  // Foundation-hardening addition (Phase F0.6): every processor backing a
  // "critical" domain event must surface failures at the worker level, not
  // just via internal try/catch — matches the shape already used by
  // WritingProcessor/SpeakingProcessingProcessor/ListeningJobProcessor.
  @OnWorkerEvent('failed')
  onFailed(job: Job<AchievementActivityEvent> | undefined, error: Error) {
    this.logger.error(
      `Achievement job failed eventId=${job?.data?.eventId} jobId=${job?.id}`,
      error.stack,
    );
  }
}

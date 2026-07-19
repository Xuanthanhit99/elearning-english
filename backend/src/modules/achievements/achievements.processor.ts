import { Processor, WorkerHost } from '@nestjs/bullmq';
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
}

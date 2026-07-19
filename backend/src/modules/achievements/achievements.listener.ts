import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { LearningActivityCompletedEvent } from '../learning-xp/events/learning-activity-completed.event';
import {
  ACHIEVEMENT_QUEUE,
  AchievementJobName,
} from './achievements.constants';
import { AchievementActivityEvent } from './achievement-event.types';

@Injectable()
export class AchievementsListener {
  private readonly logger = new Logger(AchievementsListener.name);

  constructor(
    @InjectQueue(ACHIEVEMENT_QUEUE)
    private readonly queue: Queue<AchievementActivityEvent>,
  ) {}

  @OnEvent('learning.activity.completed', { async: true })
  async handleLearningActivity(event: LearningActivityCompletedEvent) {
    const payload: AchievementActivityEvent = {
      eventId: `learning:${event.activity}:${event.userId}:${event.sourceId}`,
      eventType: event.activity,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      userId: event.userId,
      sourceId: event.sourceId,
      score: event.score,
      completionRate: event.completionRate,
      rewardXp: event.rewardXp,
      metadata: event.metadata,
    };

    try {
      await this.queue.add(AchievementJobName.PROCESS_EVENT, payload, {
        jobId: payload.eventId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 500,
      });
    } catch (error) {
      this.logger.error(
        `Queue achievement event failed: ${payload.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

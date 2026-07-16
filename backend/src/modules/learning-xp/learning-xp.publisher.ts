import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LearningActivityCompletedEvent } from './events/learning-activity-completed.event';
import type { LearningActivityCode } from './learning-xp.constants';

@Injectable()
export class LearningXpPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(input: {
    activity: LearningActivityCode;
    userId: string;
    sourceId: string;
    score?: number | null;
    completionRate?: number | null;
    rewardXp?: number | null;
    metadata?: Record<string, unknown>;
  }) {
    await this.eventEmitter.emitAsync(
      'learning.activity.completed',
      new LearningActivityCompletedEvent(
        input.activity,
        input.userId,
        input.sourceId,
        input.score,
        input.completionRate,
        input.rewardXp,
        input.metadata,
      ),
    );
  }
}

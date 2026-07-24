import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { runCriticalEventHandler } from '../../common/events/critical-event-handler.util';
import { PrismaService } from '../../prisma/prisma.service';
import { LearningActivityCompletedEvent } from '../learning-xp/events/learning-activity-completed.event';
import {
  ACHIEVEMENT_QUEUE,
  AchievementJobName,
} from './achievements.constants';
import { AchievementActivityEvent } from './achievement-event.types';
import { STREAK_EVENT_TYPE } from './achievement-catalog';

@Injectable()
export class AchievementsListener {
  private readonly logger = new Logger(AchievementsListener.name);

  constructor(
    @InjectQueue(ACHIEVEMENT_QUEUE)
    private readonly queue: Queue<AchievementActivityEvent>,
    private readonly prisma: PrismaService,
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

    // Foundation-hardening (Phase F0.6): same try/catch + Logger.error
    // behavior as before, now via the shared reusable helper so every
    // future critical-event listener (including Arena's) doesn't hand-roll
    // this — see docs/arena-progression-sequence.md's domain-event standard.
    //
    // `jobId` is sanitized separately from `payload.eventId` — BullMQ
    // rejects any custom job ID containing `:` ("Custom Id cannot contain
    // :", bullmq/dist/cjs/classes/job.js), but every event id in this
    // module (including the pre-existing SPEAKING_COMPLETED/WRITING_
    // COMPLETED ones) is colon-delimited. This was never caught before
    // because achievements.service.spec.ts always mocks the Queue —
    // discovered here via this feature's real-BullMQ runtime validation.
    // `payload.eventId` itself is left untouched (stored as-is in
    // AchievementProcessedEvent.eventId, a plain text column with no such
    // restriction) — only the value handed to BullMQ's `jobId` option
    // needs sanitizing.
    await runCriticalEventHandler(this.logger, 'learning.activity.completed', async () => {
      await this.queue.add(AchievementJobName.PROCESS_EVENT, payload, {
        jobId: this.toBullJobId(payload.eventId),
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 500,
      });
    });

    // Reuse PetProfile.streak (the existing source of truth Dashboard already
    // reads — see learning-path.service.ts/pets.service.ts) rather than
    // having the achievements module recompute streak state itself. This is
    // a single indexed PK read; enqueueing is a deterministic-jobId Redis
    // write BullMQ already dedupes on (same pattern as ArenaAchievementListener),
    // so a same-day repeat (multiple lessons completed same day, streak
    // unchanged) collapses to a no-op re-add instead of a fresh job.
    await runCriticalEventHandler(this.logger, 'learning.activity.completed:streak', async () => {
      const pet = await this.prisma.petProfile.findUnique({
        where: { userId: event.userId },
        select: { streak: true },
      });
      if (!pet || pet.streak <= 0) return;

      const dayKey = new Date().toISOString().slice(0, 10);
      const streakPayload: AchievementActivityEvent = {
        eventId: `streak:${event.userId}:${pet.streak}:${dayKey}`,
        eventType: STREAK_EVENT_TYPE,
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        userId: event.userId,
        sourceId: `streak:${pet.streak}`,
        score: pet.streak,
      };

      await this.queue.add(AchievementJobName.PROCESS_EVENT, streakPayload, {
        jobId: this.toBullJobId(streakPayload.eventId),
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 500,
      });
    });
  }

  // BullMQ custom job IDs cannot contain ':' — see the comment above the
  // first queue.add() call for the full explanation.
  private toBullJobId(eventId: string): string {
    return eventId.replace(/:/g, '_');
  }
}

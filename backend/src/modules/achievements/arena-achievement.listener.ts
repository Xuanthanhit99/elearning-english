import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { runCriticalEventHandler } from '../../common/events/critical-event-handler.util';
import { ARENA_MATCH_COMPLETED, ARENA_RATING_CHANGED } from '../arena/realtime/arena-domain-event';
import type { ArenaDomainEvent } from '../arena/realtime/arena-domain-event';
import { ARENA_ACHIEVEMENT_EVENT_TYPE } from '../arena/progression/arena-progression.constants';
import { ACHIEVEMENT_QUEUE, AchievementJobName } from './achievements.constants';
import { AchievementActivityEvent } from './achievement-event.types';

/**
 * Arena's bridge into the existing achievement pipeline — mirrors
 * `AchievementsListener` exactly (subscribe → `runCriticalEventHandler` →
 * enqueue with a deterministic `jobId`), just for Arena's own domain
 * events instead of `learning.activity.completed`. Lives in the
 * achievements module (not arena) so Arena never needs to depend on
 * BullMQ/the achievement queue directly — Arena only ever does a plain
 * `EventEmitter2.emit()` via `ArenaEventPublisher`, same as any other
 * consumer of its events.
 */
@Injectable()
export class ArenaAchievementListener {
  private readonly logger = new Logger(ArenaAchievementListener.name);

  constructor(
    @InjectQueue(ACHIEVEMENT_QUEUE)
    private readonly queue: Queue<AchievementActivityEvent>,
  ) {}

  @OnEvent(ARENA_MATCH_COMPLETED, { async: true })
  async handleMatchCompleted(event: ArenaDomainEvent) {
    if (!event.userId || !event.matchId) return; // defensive — always populated by the progression dispatcher for this event type
    await this.enqueue(ARENA_ACHIEVEMENT_EVENT_TYPE.MATCH_COMPLETED, event);
    if (event.outcome === 'WIN') {
      await this.enqueue(ARENA_ACHIEVEMENT_EVENT_TYPE.MATCH_WON, event);
    }
    await this.enqueue(ARENA_ACHIEVEMENT_EVENT_TYPE.REWARD_APPLIED, event);
  }

  @OnEvent(ARENA_RATING_CHANGED, { async: true })
  async handleRatingChanged(event: ArenaDomainEvent) {
    if (!event.userId || !event.matchId) return;
    await this.enqueue(ARENA_ACHIEVEMENT_EVENT_TYPE.RATING_CHANGED, event);
    if (event.promoted) {
      await this.enqueue(ARENA_ACHIEVEMENT_EVENT_TYPE.PROMOTED, event);
    }
  }

  private async enqueue(eventType: string, event: ArenaDomainEvent) {
    const payload: AchievementActivityEvent = {
      // Deterministic, derived from IDs already in scope — no new
      // UUID-generation-and-store step, matching every other idempotency
      // key in this system (docs/arena-progression-sequence.md §8).
      eventId: `${eventType}:${event.matchId}:${event.userId}`,
      eventType,
      eventVersion: 1,
      occurredAt: event.occurredAt,
      userId: event.userId!,
      sourceId: event.matchId!,
      metadata: {
        roomId: event.roomId,
        outcome: event.outcome ?? null,
        previousTier: event.previousTier ?? null,
        nextTier: event.nextTier ?? null,
      },
    };

    await runCriticalEventHandler(this.logger, eventType, async () => {
      await this.queue.add(AchievementJobName.PROCESS_EVENT, payload, {
        jobId: payload.eventId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 500,
      });
    });
  }
}

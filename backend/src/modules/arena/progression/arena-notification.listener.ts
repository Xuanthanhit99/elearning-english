import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationEventPublisher } from '../../notifications/notification-event-publisher';
import {
  NotificationEventPriority,
  NotificationEventType,
} from '../../notifications/contracts/notification-event-type';
import { runCriticalEventHandler } from '../../../common/events/critical-event-handler.util';
import { ARENA_DECAY_APPLIED, ARENA_PLACEMENT_COMPLETED, ARENA_RATING_CHANGED } from '../realtime/arena-domain-event';
import type { ArenaDomainEvent } from '../realtime/arena-domain-event';

const ARENA_TIER_LABELS: Record<string, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond',
  MASTER: 'Master',
  LEGEND: 'Legend',
};

/**
 * Arena's bridge into the existing notification pipeline. Only wires
 * promotion for F1 (per the approved scope — demotion notifications are
 * not in the F1 event list); the rating-changed event itself still fires
 * for achievements regardless (see `ArenaAchievementListener`). Phase F2.1
 * adds one more branch for placement completion, same pattern.
 */
@Injectable()
export class ArenaNotificationListener {
  private readonly logger = new Logger(ArenaNotificationListener.name);

  constructor(private readonly notifications: NotificationEventPublisher) {}

  @OnEvent(ARENA_RATING_CHANGED, { async: true })
  async handleRatingChanged(event: ArenaDomainEvent) {
    if (!event.userId || !event.matchId || !event.nextTier) return;

    await runCriticalEventHandler(this.logger, ARENA_RATING_CHANGED, async () => {
      if (!event.promoted && !event.demoted) return;
      await this.notifications.publish({
        eventType: event.demoted
          ? NotificationEventType.ARENA_TIER_DEMOTED
          : NotificationEventType.ARENA_PROMOTED,
        eventVersion: 1,
        recipientUserIds: [event.userId!],
        actorUserId: null,
        entityType: 'ArenaRatingHistory',
        entityId: event.matchId!,
        deduplicationKey: `arena:tier:{recipientId}:${event.matchId}`,
        priority: NotificationEventPriority.HIGH,
        context: {
          metadata: {
            tierLabel: ARENA_TIER_LABELS[event.nextTier!] ?? event.nextTier,
          },
        },
      });
    });
  }

  @OnEvent(ARENA_DECAY_APPLIED, { async: true })
  async handleDecayApplied(event: ArenaDomainEvent) {
    if (!event.userId) return;

    await runCriticalEventHandler(this.logger, ARENA_DECAY_APPLIED, async () => {
      await this.notifications.publish({
        eventType: NotificationEventType.ARENA_RATING_DECAYED,
        eventVersion: 1,
        recipientUserIds: [event.userId!],
        actorUserId: null,
        entityType: 'ArenaProfile',
        entityId: event.userId!,
        deduplicationKey: `arena:decay:{recipientId}:${event.occurredAt.slice(0, 10)}`,
        priority: NotificationEventPriority.LOW,
        context: {
          metadata: {
            mmrDelta: String(Math.abs(event.mmrDelta ?? 0)),
            tierLabel: event.nextTier ? ARENA_TIER_LABELS[event.nextTier] ?? event.nextTier : null,
          },
        },
      });
    });
  }

  /**
   * Phase F2.1: lifetime-scoped deduplication key (`<userId>` only, no
   * `matchId`) — deliberate, matching the F2.0 design's lifetime-placement
   * decision (placement completes at most once per account, ever). This
   * also backstops the dispatcher's own documented limitation that its
   * `placementCompleted` flag cannot be perfectly precise across the
   * narrow crash-recovery path (`recoverFromExistingRewardLog`) — even if
   * that path were ever to report `placementCompleted: true` a second
   * time, this key ensures the `Notification` table's unique constraint
   * still allows only one row, ever, for this user.
   */
  @OnEvent(ARENA_PLACEMENT_COMPLETED, { async: true })
  async handlePlacementCompleted(event: ArenaDomainEvent) {
    if (!event.userId || !event.matchId) return;

    await runCriticalEventHandler(this.logger, ARENA_PLACEMENT_COMPLETED, async () => {
      await this.notifications.publish({
        eventType: NotificationEventType.ARENA_PLACEMENT_COMPLETED,
        eventVersion: 1,
        recipientUserIds: [event.userId!],
        actorUserId: null,
        entityType: 'ArenaProfile',
        entityId: event.userId!,
        deduplicationKey: `arena:placement:{recipientId}:completed`,
        priority: NotificationEventPriority.HIGH,
        context: {
          metadata: {
            tierLabel: event.nextTier ? ARENA_TIER_LABELS[event.nextTier] ?? event.nextTier : null,
          },
        },
      });
    });
  }
}

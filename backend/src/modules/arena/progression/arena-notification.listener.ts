import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationEventPublisher } from '../../notifications/notification-event-publisher';
import {
  NotificationEventPriority,
  NotificationEventType,
} from '../../notifications/contracts/notification-event-type';
import { runCriticalEventHandler } from '../../../common/events/critical-event-handler.util';
import { ARENA_RATING_CHANGED } from '../realtime/arena-domain-event';
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
 * for achievements regardless (see `ArenaAchievementListener`).
 */
@Injectable()
export class ArenaNotificationListener {
  private readonly logger = new Logger(ArenaNotificationListener.name);

  constructor(private readonly notifications: NotificationEventPublisher) {}

  @OnEvent(ARENA_RATING_CHANGED, { async: true })
  async handleRatingChanged(event: ArenaDomainEvent) {
    if (!event.promoted || !event.userId || !event.matchId || !event.nextTier) return;

    await runCriticalEventHandler(this.logger, ARENA_RATING_CHANGED, async () => {
      await this.notifications.publish({
        eventType: NotificationEventType.ARENA_PROMOTED,
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
}

import { Injectable } from '@nestjs/common';
import { NotificationEventPublisher } from '../../notifications/notification-event-publisher';
import { NotificationEventType } from '../../notifications/contracts/notification-event-type';

/**
 * Thin wrapper around the shared NotificationEventPublisher — every
 * Document Library lifecycle notification goes through here so the
 * dedupe-key shape stays consistent (spec §27: retries must never
 * double-send). The publisher's underlying `deduplicationKey` unique
 * constraint on (recipientUserId, deduplicationKey) is what actually
 * enforces this — see NotificationsProcessor.createFromEvent.
 */
@Injectable()
export class DocumentNotificationsService {
  constructor(private readonly publisher: NotificationEventPublisher) {}

  private dedupeKey(eventType: string, documentId: string, extra?: string) {
    return `document:${eventType}:{recipientId}:${documentId}${extra ? `:${extra}` : ''}:1`;
  }

  notify(input: {
    eventType: NotificationEventType;
    recipientUserIds: string[];
    documentId: string;
    versionId?: string;
    actorUserId?: string | null;
    metadata: Record<string, string>;
  }) {
    if (!input.recipientUserIds.length) return;
    this.publisher.publish({
      eventType: input.eventType,
      recipientUserIds: input.recipientUserIds,
      actorUserId: input.actorUserId ?? null,
      entityType: 'LearningDocument',
      entityId: input.documentId,
      deduplicationKey: this.dedupeKey(
        input.eventType,
        input.documentId,
        input.versionId,
      ),
      context: input.metadata,
    });
  }
}

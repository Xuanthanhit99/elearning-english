import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationDomainEvent,
  NotificationDomainEventInput,
} from './contracts/notification-domain-event';
import {
  NOTIFICATION_DOMAIN_EVENT,
  NotificationEventPriority,
} from './contracts/notification-event-type';

@Injectable()
export class NotificationEventPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  publish(input: NotificationDomainEventInput): NotificationDomainEvent {
    const event = this.normalize(input);
    this.validate(event);
    this.eventEmitter.emit(NOTIFICATION_DOMAIN_EVENT, event);
    return event;
  }

  private normalize(
    input: NotificationDomainEventInput,
  ): NotificationDomainEvent {
    const eventId = input.eventId || randomUUID();
    const eventVersion = input.eventVersion || 1;

    return {
      eventId,
      eventType: input.eventType,
      eventVersion,
      occurredAt: input.occurredAt || new Date().toISOString(),
      recipientUserIds: input.recipientUserIds,
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      deduplicationKey:
        input.deduplicationKey ||
        `notification:${input.eventType}:{recipientId}:${input.entityId || eventId}:${eventVersion}`,
      priority: input.priority || NotificationEventPriority.NORMAL,
      expiresAt: input.expiresAt ?? null,
      context: input.context || {},
    };
  }

  private validate(event: NotificationDomainEvent) {
    if (!event.eventId.trim()) {
      throw new Error('Notification eventId is required.');
    }

    if (!event.eventType) {
      throw new Error('Notification eventType is required.');
    }

    if (!Number.isInteger(event.eventVersion) || event.eventVersion < 1) {
      throw new Error('Notification eventVersion must be a positive integer.');
    }

    if (!event.recipientUserIds.length) {
      throw new Error('Notification recipientUserIds must not be empty.');
    }

    if (event.recipientUserIds.some((recipient) => !recipient.trim())) {
      throw new Error('Notification recipientUserIds contains an empty id.');
    }

    if (!event.entityType.trim()) {
      throw new Error('Notification entityType is required.');
    }

    if (!event.entityId.trim()) {
      throw new Error('Notification entityId is required.');
    }

    if (!event.deduplicationKey.trim()) {
      throw new Error('Notification deduplicationKey is required.');
    }

    if (Number.isNaN(Date.parse(event.occurredAt))) {
      throw new Error('Notification occurredAt must be an ISO date string.');
    }

    if (event.expiresAt && Number.isNaN(Date.parse(event.expiresAt))) {
      throw new Error('Notification expiresAt must be an ISO date string.');
    }
  }
}

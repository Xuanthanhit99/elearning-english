import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobName,
} from './notifications.constants';
import type { NotificationDomainEvent } from './contracts/notification-domain-event';
import { NOTIFICATION_DOMAIN_EVENT } from './contracts/notification-event-type';
import { NotificationCreateJobPayload } from './contracts/notification-job.payload';

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  @OnEvent(NOTIFICATION_DOMAIN_EVENT, { async: true })
  async handle(event: NotificationDomainEvent) {
    this.validate(event);

    const payload: NotificationCreateJobPayload = {
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      occurredAt: event.occurredAt,
      recipientUserIds: event.recipientUserIds,
      actorUserId: event.actorUserId,
      entityType: event.entityType,
      entityId: event.entityId,
      deduplicationKey: event.deduplicationKey,
      priority: event.priority,
      expiresAt: event.expiresAt,
      context: event.context,
    };

    const job = await this.queue.add(
      NotificationJobName.CREATE_FROM_EVENT,
      payload,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    this.logger.log(
      `Queued notification event eventType=${event.eventType} eventId=${event.eventId} jobId=${job.id} recipients=${event.recipientUserIds.length} dedupKey=${event.deduplicationKey}`,
    );
  }

  private validate(event: NotificationDomainEvent) {
    if (!event.eventId || !event.eventType || !event.deduplicationKey) {
      throw new Error('Invalid notification domain event.');
    }

    if (!event.recipientUserIds.length) {
      throw new Error('Notification domain event has no recipients.');
    }
  }
}

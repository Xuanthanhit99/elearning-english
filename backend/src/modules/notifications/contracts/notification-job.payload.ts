import { NotificationContext } from './notification-context';
import {
  NotificationEventPriority,
  NotificationEventType,
} from './notification-event-type';

export type NotificationCreateJobPayload = {
  eventId: string;
  eventType: NotificationEventType;
  eventVersion: number;
  occurredAt: string;
  recipientUserIds: string[];
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  deduplicationKey: string;
  priority: NotificationEventPriority;
  expiresAt: string | null;
  context: NotificationContext;
};

export type NotificationCreateJobResult = {
  created: number;
  skippedPreference: number;
  skippedExpired: number;
  skippedRecipient: number;
  duplicate: number;
  failed: number;
  notificationIds: string[];
};

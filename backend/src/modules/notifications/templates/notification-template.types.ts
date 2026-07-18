import { NotificationEventType } from '../contracts/notification-event-type';
import { JsonValue } from '../contracts/notification-context';

export type NotificationTemplateContext = {
  eventType: NotificationEventType;
  eventVersion: number;
  entityType: string;
  entityId: string;
  metadata: Record<string, JsonValue>;
};

export type NotificationTemplateResult = {
  templateKey: string;
  title: string;
  body: string;
  actionUrl: string;
  metadata: Record<string, JsonValue>;
};

export type NotificationTemplateDefinition = {
  eventType: NotificationEventType;
  eventVersion: number;
  templateKey: string;
  render: (context: NotificationTemplateContext) => NotificationTemplateResult;
};

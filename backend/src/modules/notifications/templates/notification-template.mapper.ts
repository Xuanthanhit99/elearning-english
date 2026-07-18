import { Injectable } from '@nestjs/common';
import { NotificationCreateJobPayload } from '../contracts/notification-job.payload';
import { JsonValue } from '../contracts/notification-context';
import { NotificationActionUrlBuilder } from './notification-action-url.builder';
import {
  createNotificationTemplateRegistry,
  templateContextFromPayload,
} from './notification-template.registry';
import { NotificationTemplateResult } from './notification-template.types';

export class NotificationTemplateError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'UNSUPPORTED_EVENT'
      | 'UNSUPPORTED_EVENT_VERSION'
      | 'INVALID_CONTEXT'
      | 'INVALID_ACTION_URL',
  ) {
    super(message);
  }
}

@Injectable()
export class NotificationTemplateMapper {
  constructor(private readonly urls: NotificationActionUrlBuilder) {}

  map(payload: NotificationCreateJobPayload): NotificationTemplateResult {
    const registry = createNotificationTemplateRegistry(this.urls);
    const candidates = registry.filter(
      (template) => template.eventType === payload.eventType,
    );

    if (!candidates.length) {
      throw new NotificationTemplateError(
        `Unsupported notification event type: ${payload.eventType}`,
        'UNSUPPORTED_EVENT',
      );
    }

    const template = candidates.find(
      (item) => item.eventVersion === payload.eventVersion,
    );

    if (!template) {
      throw new NotificationTemplateError(
        `Unsupported notification event version: ${payload.eventType}@${payload.eventVersion}`,
        'UNSUPPORTED_EVENT_VERSION',
      );
    }

    try {
      return template.render(
        templateContextFromPayload({
          eventType: payload.eventType,
          eventVersion: payload.eventVersion,
          entityType: payload.entityType,
          entityId: payload.entityId,
          metadata: this.safeMetadata(payload.context.metadata || {}),
        }),
      );
    } catch (error) {
      if (error instanceof NotificationTemplateError) {
        throw error;
      }

      throw new NotificationTemplateError(
        error instanceof Error
          ? error.message
          : 'Invalid notification context.',
        'INVALID_CONTEXT',
      );
    }
  }

  private safeMetadata(metadata: Record<string, JsonValue>) {
    const blocked = new Set([
      'token',
      'accessToken',
      'refreshToken',
      'password',
      'passwordHash',
      'cookie',
      'authorization',
      'secret',
    ]);

    return Object.fromEntries(
      Object.entries(metadata).filter(([key]) => !blocked.has(key)),
    );
  }
}

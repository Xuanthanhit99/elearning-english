import {
  NotificationEventPriority,
  NotificationEventType,
} from '../contracts/notification-event-type';
import { NotificationCreateJobPayload } from '../contracts/notification-job.payload';
import { NotificationActionUrlBuilder } from './notification-action-url.builder';
import {
  NotificationTemplateError,
  NotificationTemplateMapper,
} from './notification-template.mapper';

describe('NotificationTemplateMapper', () => {
  let mapper: NotificationTemplateMapper;

  const payload: NotificationCreateJobPayload = {
    eventId: 'event-1',
    eventType: NotificationEventType.MISSION_COMPLETED,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    recipientUserIds: ['user-1'],
    actorUserId: null,
    entityType: 'MissionProgress',
    entityId: 'mission-1',
    deduplicationKey:
      'notification:MISSION_COMPLETED:{recipientId}:mission-1:1',
    priority: NotificationEventPriority.NORMAL,
    expiresAt: null,
    context: {
      metadata: {
        missionTitle: '<script>alert(1)</script>Daily Mission',
        accessToken: 'secret-token',
      },
    },
  };

  beforeEach(() => {
    mapper = new NotificationTemplateMapper(new NotificationActionUrlBuilder());
  });

  it('renders a safe server-side template for a supported event', () => {
    const result = mapper.map(payload);

    expect(result.templateKey).toBe('mission-completed.v1');
    expect(result.actionUrl).toBe('/missions');
    expect(result.body).toContain('Daily Mission');
    expect(result.body).not.toContain('<script>');
    expect(result.metadata).not.toHaveProperty('accessToken');
  });

  it('rejects unsupported event versions as non-retryable mapper errors', () => {
    expect(() => mapper.map({ ...payload, eventVersion: 99 })).toThrow(
      NotificationTemplateError,
    );
  });

  it('does not accept client-controlled external action URLs', () => {
    const result = mapper.map({
      ...payload,
      context: {
        metadata: {
          missionTitle: 'Daily Mission',
          actionUrl: 'https://attacker.example/phish',
        },
      },
    });

    expect(result.actionUrl).toBe('/missions');
    expect(result.actionUrl).not.toContain('attacker.example');
  });
});

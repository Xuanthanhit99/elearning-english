import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEventPublisher } from './notification-event-publisher';
import {
  NOTIFICATION_DOMAIN_EVENT,
  NotificationEventPriority,
  NotificationEventType,
} from './contracts/notification-event-type';

describe('NotificationEventPublisher', () => {
  const eventEmitter = {
    emit: jest.fn(),
  };

  let publisher: NotificationEventPublisher;

  beforeEach(() => {
    eventEmitter.emit.mockClear();
    publisher = new NotificationEventPublisher(
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('normalizes and publishes a typed notification event', () => {
    const event = publisher.publish({
      eventType: NotificationEventType.MISSION_COMPLETED,
      recipientUserIds: ['user-1'],
      actorUserId: 'user-1',
      entityType: 'MissionProgress',
      entityId: 'mission-1',
      priority: NotificationEventPriority.HIGH,
      context: {
        metadata: {
          missionTitle: 'Daily mission',
        },
      },
    });

    expect(event.eventId).toBeTruthy();
    expect(event.eventVersion).toBe(1);
    expect(event.deduplicationKey).toBe(
      'notification:MISSION_COMPLETED:{recipientId}:mission-1:1',
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      NOTIFICATION_DOMAIN_EVENT,
      event,
    );
  });

  it('rejects an event with no recipients', () => {
    expect(() =>
      publisher.publish({
        eventType: NotificationEventType.SYSTEM_NOTIFICATION,
        recipientUserIds: [],
        entityType: 'System',
        entityId: 'system-1',
      }),
    ).toThrow('recipientUserIds');
  });
});

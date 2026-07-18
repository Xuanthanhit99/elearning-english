import { Queue } from 'bullmq';
import { NotificationEventListener } from './notification-event.listener';
import { NotificationJobName } from './notifications.constants';
import {
  NotificationEventPriority,
  NotificationEventType,
} from './contracts/notification-event-type';

describe('NotificationEventListener', () => {
  const queue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };

  let listener: NotificationEventListener;

  beforeEach(() => {
    queue.add.mockClear();
    listener = new NotificationEventListener(queue as unknown as Queue);
  });

  it('enqueues a small BullMQ job payload with retry options', async () => {
    await listener.handle({
      eventId: 'event-1',
      eventType: NotificationEventType.SYSTEM_NOTIFICATION,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      recipientUserIds: ['user-1'],
      actorUserId: null,
      entityType: 'System',
      entityId: 'system-1',
      deduplicationKey:
        'notification:SYSTEM_NOTIFICATION:{recipientId}:system-1:1',
      priority: NotificationEventPriority.NORMAL,
      expiresAt: null,
      context: { metadata: { kind: 'system' } },
    });

    expect(queue.add).toHaveBeenCalledWith(
      NotificationJobName.CREATE_FROM_EVENT,
      expect.objectContaining({
        eventId: 'event-1',
        recipientUserIds: ['user-1'],
        entityId: 'system-1',
      }),
      expect.objectContaining({
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 200,
      }),
    );
  });
});

import { Job } from 'bullmq';
import { NotificationPriority, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';
import { NotificationPreferenceResolver } from './preferences/notification-preference.resolver';
import { NotificationPreferencePolicyError } from './preferences/notification-preference.registry';
import { NotificationTemplateMapper } from './templates/notification-template.mapper';
import { NotificationJobName } from './notifications.constants';
import { NotificationCreateJobPayload } from './contracts/notification-job.payload';
import {
  NotificationEventPriority,
  NotificationEventType,
} from './contracts/notification-event-type';

describe('NotificationsProcessor event pipeline', () => {
  const notificationsService = {
    createFromPayload: jest.fn(),
    cleanupOldNotifications: jest.fn(),
    emitNotificationCreated: jest.fn(),
  };
  const prisma = {
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
    },
  };
  const preferenceResolver = {
    resolve: jest.fn(),
  };
  const templateMapper = {
    map: jest.fn(),
  };

  let processor: NotificationsProcessor;

  const payload: NotificationCreateJobPayload = {
    eventId: 'event-1',
    eventType: NotificationEventType.MISSION_COMPLETED,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    recipientUserIds: ['user-1'],
    actorUserId: 'user-1',
    entityType: 'MissionProgress',
    entityId: 'mission-1',
    deduplicationKey:
      'notification:MISSION_COMPLETED:{recipientId}:mission-1:1',
    priority: NotificationEventPriority.HIGH,
    expiresAt: null,
    context: {
      metadata: {
        missionTitle: 'Daily mission',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new NotificationsProcessor(
      notificationsService as unknown as NotificationsService,
      prisma as unknown as PrismaService,
      preferenceResolver as unknown as NotificationPreferenceResolver,
      templateMapper as unknown as NotificationTemplateMapper,
    );
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    preferenceResolver.resolve.mockResolvedValue({
      enabled: true,
      preferenceKey: 'missionReminder',
      source: 'USER_SETTING',
      controlsInAppPersistence: true,
      reason: 'enabled',
    });
    templateMapper.map.mockReturnValue({
      templateKey: 'mission-completed.v1',
      title: 'Mission complete',
      body: 'You finished a mission.',
      actionUrl: '/missions',
      metadata: { missionTitle: 'Daily mission' },
    });
  });

  it('persists a notification from a domain event job using Stage 7A.1 schema', async () => {
    prisma.notification.create.mockResolvedValue({ id: 'notification-1' });

    const result = await processor.process({
      id: 'job-1',
      name: NotificationJobName.CREATE_FROM_EVENT,
      data: payload,
    } as Job<NotificationCreateJobPayload>);

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          recipientUserId: 'user-1',
          eventType: NotificationEventType.MISSION_COMPLETED,
          eventVersion: 1,
          deduplicationKey: 'notification:MISSION_COMPLETED:user-1:mission-1:1',
          entityType: 'MissionProgress',
          entityId: 'mission-1',
          priority: NotificationPriority.HIGH,
        }),
      }),
    );
    expect(result).toEqual({
      created: 1,
      skippedPreference: 0,
      skippedExpired: 0,
      skippedRecipient: 0,
      duplicate: 0,
      failed: 0,
      notificationIds: ['notification-1'],
    });
  });

  it('recovers from P2002 by returning the existing notification id', async () => {
    prisma.notification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['recipientUserId', 'deduplicationKey'] },
      }),
    );
    prisma.notification.findFirst.mockResolvedValue({ id: 'notification-old' });

    const result = await processor.process({
      id: 'job-2',
      name: NotificationJobName.CREATE_FROM_EVENT,
      data: payload,
    } as Job<NotificationCreateJobPayload>);

    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: {
        recipientUserId: 'user-1',
        deduplicationKey: 'notification:MISSION_COMPLETED:user-1:mission-1:1',
      },
      select: { id: true },
    });
    expect(result).toEqual({
      created: 0,
      skippedPreference: 0,
      skippedExpired: 0,
      skippedRecipient: 0,
      duplicate: 1,
      failed: 0,
      notificationIds: ['notification-old'],
    });
  });

  it('skips persistence when recipient preference disables in-app notifications', async () => {
    preferenceResolver.resolve.mockResolvedValue({
      enabled: false,
      preferenceKey: 'missionReminder',
      source: 'USER_SETTING',
      controlsInAppPersistence: true,
      reason: 'disabled',
    });

    const result = await processor.process({
      id: 'job-3',
      name: NotificationJobName.CREATE_FROM_EVENT,
      data: payload,
    } as Job<NotificationCreateJobPayload>);

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      created: 0,
      skippedPreference: 1,
      skippedExpired: 0,
      skippedRecipient: 0,
      duplicate: 0,
      failed: 0,
      notificationIds: [],
    });
  });

  it('skips expired events without inserting', async () => {
    const result = await processor.process({
      id: 'job-4',
      name: NotificationJobName.CREATE_FROM_EVENT,
      data: {
        ...payload,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    } as Job<NotificationCreateJobPayload>);

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      created: 0,
      skippedPreference: 0,
      skippedExpired: 1,
      skippedRecipient: 0,
      duplicate: 0,
      failed: 0,
      notificationIds: [],
    });
  });

  it('handles multiple recipients independently', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1' })
      .mockResolvedValueOnce({ id: 'user-2' });
    preferenceResolver.resolve
      .mockResolvedValueOnce({
        enabled: true,
        preferenceKey: 'missionReminder',
        source: 'USER_SETTING',
        controlsInAppPersistence: true,
        reason: 'enabled',
      })
      .mockResolvedValueOnce({
        enabled: false,
        preferenceKey: 'missionReminder',
        source: 'USER_SETTING',
        controlsInAppPersistence: true,
        reason: 'disabled',
      });
    prisma.notification.create.mockResolvedValue({ id: 'notification-1' });

    const result = await processor.process({
      id: 'job-5',
      name: NotificationJobName.CREATE_FROM_EVENT,
      data: { ...payload, recipientUserIds: ['user-1', 'user-2'] },
    } as Job<NotificationCreateJobPayload>);

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(1);
    expect(result.skippedPreference).toBe(1);
  });

  it('treats unsupported event preference policy as non-retryable', async () => {
    preferenceResolver.resolve.mockRejectedValue(
      new NotificationPreferencePolicyError(
        'UNSUPPORTED_EVENT',
        'Unsupported notification event type: UNKNOWN',
      ),
    );

    await expect(
      processor.process({
        id: 'job-6',
        name: NotificationJobName.CREATE_FROM_EVENT,
        data: {
          ...payload,
          eventType: 'UNKNOWN' as NotificationEventType,
        },
      } as Job<NotificationCreateJobPayload>),
    ).rejects.toThrow('Unsupported notification event type');

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

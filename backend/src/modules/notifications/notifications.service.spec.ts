import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventPublisher } from './notification-event-publisher';
import { NotificationGateway } from './notification.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const prismaMock = {
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };
  const publisherMock = { publish: jest.fn() };
  const gatewayMock = {
    emitCreated: jest.fn(),
    emitUpdated: jest.fn(),
    emitArchived: jest.fn(),
    emitUnreadCount: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationEventPublisher, useValue: publisherMock },
        { provide: NotificationGateway, useValue: gatewayMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('routes legacy payloads through the event publisher', async () => {
    publisherMock.publish.mockReturnValue({ eventId: 'event-1' });

    const result = await service.createFromPayload({
      userId: 'user-1',
      type: 'COMMUNITY',
      title: 'New comment',
      message: 'You have a new comment.',
      href: '/community',
    });

    expect(result).toEqual({ eventId: 'event-1' });
    expect(publisherMock.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserIds: ['user-1'],
        entityType: 'LegacyNotification',
      }),
    );
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it('soft archives notifications and updates unread realtime count', async () => {
    const createdAt = new Date();
    prismaMock.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      title: 'Title',
      message: 'Message',
      isRead: false,
      readAt: null,
      archivedAt: null,
      createdAt,
    });
    prismaMock.notification.update.mockResolvedValue({
      id: 'notification-1',
      title: 'Title',
      message: 'Message',
      isRead: true,
      readAt: createdAt,
      archivedAt: createdAt,
      createdAt,
    });
    prismaMock.notification.count.mockResolvedValue(0);

    await service.archive('user-1', 'notification-1');

    expect(prismaMock.notification.delete).not.toHaveBeenCalled();
    expect(gatewayMock.emitArchived).toHaveBeenCalled();
    expect(gatewayMock.emitUnreadCount).toHaveBeenCalledWith('user-1', 0);
  });
});

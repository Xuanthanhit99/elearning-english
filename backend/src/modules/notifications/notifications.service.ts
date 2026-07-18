import { createHash } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationEventPriority,
  NotificationEventType,
} from './contracts/notification-event-type';
import {
  NOTIFICATION_ARCHIVED_RETENTION_DAYS,
  NOTIFICATION_CLEANUP_BATCH_SIZE,
  NOTIFICATION_EXPIRED_RETENTION_DAYS,
  NOTIFICATION_READ_RETENTION_DAYS,
} from './notifications.constants';
import { NotificationEventPublisher } from './notification-event-publisher';
import { NotificationGateway } from './notification.gateway';
import {
  CreateNotificationInput,
  NotificationType,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationEvents: NotificationEventPublisher,
    private readonly gateway: NotificationGateway,
  ) {}

  async create(userId: string, title: string, message: string) {
    const created = await this.prismaService.notification.create({
      data: { userId, recipientUserId: userId, title, message },
    });

    const dto = this.toDto(created);
    await this.emitChanged(userId, dto, 'created');
    return dto;
  }

  async createFromPayload(input: CreateNotificationInput) {
    const eventType = this.mapLegacyTypeToEvent(input.type);
    const entityId = this.legacyEntityId(input);

    return this.notificationEvents.publish({
      eventType,
      eventVersion: 1,
      recipientUserIds: [input.userId],
      actorUserId: null,
      entityType: 'LegacyNotification',
      entityId,
      deduplicationKey: `notification:${eventType}:{recipientId}:${entityId}:1`,
      priority: this.mapLegacyPriority(input.type),
      context: {
        metadata: {
          title: input.title,
          message: input.message,
          href: input.href ?? '',
          missionTitle: input.title,
          rewardLabel: input.title,
          actorDisplayName: input.title,
          clubName: input.title,
          moduleName: input.title,
        },
      },
    });
  }

  async createOncePerDay(input: CreateNotificationInput) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const title = this.formatTitle(input.title, input.type);

    const existed = await this.prismaService.notification.findFirst({
      where: {
        OR: [
          { recipientUserId: input.userId },
          { recipientUserId: null, userId: input.userId },
        ],
        title,
        createdAt: { gte: start },
        archivedAt: null,
      },
    });

    if (existed) {
      return this.toDto(existed);
    }

    const dateKey = start.toISOString().slice(0, 10);
    const eventType = this.mapLegacyTypeToEvent(input.type);
    const entityId = this.legacyEntityId({
      ...input,
      href: input.href || dateKey,
    });

    return this.notificationEvents.publish({
      eventType,
      eventVersion: 1,
      recipientUserIds: [input.userId],
      actorUserId: null,
      entityType: 'LegacyDailyNotification',
      entityId,
      deduplicationKey: `notification:${eventType}:{recipientId}:${dateKey}:${entityId}:1`,
      priority: this.mapLegacyPriority(input.type),
      context: {
        metadata: {
          title: input.title,
          message: input.message,
          href: input.href ?? '',
          missionTitle: input.title,
          moduleName: input.title,
        },
      },
    });
  }

  async findMyNotifications(
    userId: string,
    query?: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.min(50, Math.max(1, Number(query?.limit || 20)));
    const where = {
      archivedAt: null,
      AND: [
        {
          OR: [{ recipientUserId: userId }, { recipientUserId: null, userId }],
        },
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      ],
      ...(query?.unreadOnly ? { isRead: false } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prismaService.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.notification.count({ where }),
      this.prismaService.notification.count({
        where: {
          isRead: false,
          archivedAt: null,
          AND: [
            {
              OR: [
                { recipientUserId: userId },
                { recipientUserId: null, userId },
              ],
            },
            {
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          ],
        },
      }),
    ]);

    return {
      items: items.map((item) => this.toDto(item)),
      meta: {
        page,
        limit,
        total,
        unreadCount,
        hasMore: page * limit < total,
      },
    };
  }

  getUnreadCount(userId: string) {
    return this.prismaService.notification.count({
      where: {
        OR: [{ recipientUserId: userId }, { recipientUserId: null, userId }],
        isRead: false,
        archivedAt: null,
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
      },
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prismaService.notification.findFirst({
      where: {
        id,
        OR: [{ recipientUserId: userId }, { recipientUserId: null, userId }],
        archivedAt: null,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    const updated = notification.isRead
      ? notification
      : await this.prismaService.notification.update({
          where: { id },
          data: { isRead: true, readAt: new Date() },
        });

    const dto = this.toDto(updated);
    await this.emitChanged(userId, dto, 'updated');
    return dto;
  }

  async markAllAsRead(userId: string) {
    const cutoff = new Date();
    const result = await this.prismaService.notification.updateMany({
      where: {
        OR: [{ recipientUserId: userId }, { recipientUserId: null, userId }],
        isRead: false,
        archivedAt: null,
        createdAt: { lte: cutoff },
      },
      data: { isRead: true, readAt: cutoff },
    });

    await this.emitUnreadCount(userId);
    return result;
  }

  async archive(userId: string, id: string) {
    const notification = await this.prismaService.notification.findFirst({
      where: {
        id,
        OR: [{ recipientUserId: userId }, { recipientUserId: null, userId }],
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    const updated = notification.archivedAt
      ? notification
      : await this.prismaService.notification.update({
          where: { id },
          data: {
            archivedAt: new Date(),
            isRead: true,
            readAt: notification.readAt ?? new Date(),
          },
        });

    const dto = this.toDto(updated);
    this.gateway.emitArchived(userId, dto);
    await this.emitUnreadCount(userId);

    return { archived: true, id };
  }

  async delete(userId: string, id: string) {
    return this.archive(userId, id);
  }

  async cleanupOldNotifications(now = new Date()) {
    const readCutoff = this.daysAgo(now, NOTIFICATION_READ_RETENTION_DAYS);
    const archivedCutoff = this.daysAgo(
      now,
      NOTIFICATION_ARCHIVED_RETENTION_DAYS,
    );
    const expiredCutoff = this.daysAgo(
      now,
      NOTIFICATION_EXPIRED_RETENTION_DAYS,
    );

    const candidates = await this.prismaService.notification.findMany({
      where: {
        OR: [
          { archivedAt: { lte: archivedCutoff } },
          {
            isRead: true,
            readAt: { lte: readCutoff },
            archivedAt: null,
          },
          {
            expiresAt: { lte: expiredCutoff },
            OR: [{ isRead: true }, { archivedAt: { not: null } }],
          },
        ],
      },
      select: { id: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: NOTIFICATION_CLEANUP_BATCH_SIZE,
    });

    if (!candidates.length) {
      return { deleted: 0 };
    }

    const result = await this.prismaService.notification.deleteMany({
      where: { id: { in: candidates.map((item) => item.id) } },
    });

    return { deleted: result.count };
  }

  private formatTitle(title: string, type?: NotificationType) {
    if (!type || title.startsWith(`[${type}]`)) return title;
    return `[${type}] ${title}`;
  }

  private formatMessage(message: string, href?: string) {
    if (!href || message.includes('href=')) return message;
    return `${message}\n\nhref=${href}`;
  }

  private inferType(title: string, message: string): NotificationType {
    const text = `${title} ${message}`.toLowerCase();
    const normalizedText = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

    if (normalizedText.includes('nhiem vu')) return 'MISSION';
    if (normalizedText.includes('thanh tich')) return 'ACHIEVEMENT';
    if (normalizedText.includes('tuan')) return 'WEEKLY_GOAL';
    if (
      normalizedText.includes('hom nay') ||
      normalizedText.includes('muc tieu')
    )
      return 'DAILY_GOAL';
    if (normalizedText.includes('lo trinh')) return 'LEARNING_PATH';
    if (normalizedText.includes('cong dong')) return 'COMMUNITY';
    if (normalizedText.includes('nhac')) return 'LEARNING_REMINDER';

    if (
      text.includes('mission') ||
      text.includes('nhiem vu') ||
      text.includes('nhiệm vụ')
    )
      return 'MISSION';
    if (
      text.includes('achievement') ||
      text.includes('thanh tich') ||
      text.includes('thành tích')
    )
      return 'ACHIEVEMENT';
    if (text.includes('weekly') || text.includes('tuần')) return 'WEEKLY_GOAL';
    if (
      text.includes('daily') ||
      text.includes('hôm nay') ||
      text.includes('mục tiêu')
    )
      return 'DAILY_GOAL';
    if (text.includes('learning path') || text.includes('lộ trình'))
      return 'LEARNING_PATH';
    if (text.includes('community') || text.includes('cộng đồng'))
      return 'COMMUNITY';
    if (text.includes('reminder') || text.includes('nhắc'))
      return 'LEARNING_REMINDER';
    return 'SYSTEM';
  }

  private inferHref(type: NotificationType, message: string) {
    const href = message.match(/href=(\S+)/)?.[1];
    if (href) return href;

    const fallback: Record<NotificationType, string> = {
      MISSION: '/missions',
      ACHIEVEMENT: '/vocabulary/achievements',
      LEARNING_REMINDER: '/learn',
      DAILY_GOAL: '/dashboard',
      WEEKLY_GOAL: '/dashboard',
      LEARNING_PATH: '/learning-path',
      COMMUNITY: '/community',
      SYSTEM: '/notifications',
    };

    return fallback[type];
  }

  private mapLegacyTypeToEvent(type?: NotificationType) {
    const map: Record<NotificationType, NotificationEventType> = {
      MISSION: NotificationEventType.MISSION_COMPLETED,
      ACHIEVEMENT: NotificationEventType.SYSTEM_NOTIFICATION,
      LEARNING_REMINDER: NotificationEventType.DAILY_REMINDER,
      DAILY_GOAL: NotificationEventType.DAILY_REMINDER,
      WEEKLY_GOAL: NotificationEventType.SYSTEM_NOTIFICATION,
      LEARNING_PATH: NotificationEventType.LEARNING_COMPLETED,
      COMMUNITY: NotificationEventType.COMMUNITY_ACTIVITY,
      SYSTEM: NotificationEventType.SYSTEM_NOTIFICATION,
    };

    return map[type || 'SYSTEM'];
  }

  private mapLegacyPriority(type?: NotificationType) {
    if (type === 'MISSION' || type === 'ACHIEVEMENT') {
      return NotificationEventPriority.HIGH;
    }

    if (type === 'LEARNING_REMINDER') {
      return NotificationEventPriority.NORMAL;
    }

    return NotificationEventPriority.NORMAL;
  }

  private legacyEntityId(input: CreateNotificationInput) {
    const source = [
      input.type || 'SYSTEM',
      input.title,
      input.href || '',
      input.message,
    ].join('|');

    return createHash('sha256').update(source).digest('hex').slice(0, 32);
  }

  private daysAgo(now: Date, days: number) {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  private cleanTitle(title: string) {
    return title.replace(/^\[[A-Z_]+\]\s*/, '');
  }

  private cleanMessage(message: string) {
    return message.replace(/\n\nhref=\S+/, '');
  }

  private toDto(notification: {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    readAt?: Date | null;
    archivedAt?: Date | null;
    priority?: unknown;
    eventType?: string | null;
    expiresAt?: Date | null;
    createdAt: Date;
  }) {
    const type = this.inferType(notification.title, notification.message);

    return {
      id: notification.id,
      title: this.cleanTitle(notification.title),
      message: this.cleanMessage(notification.message),
      type,
      href: this.inferHref(type, notification.message),
      eventType: notification.eventType ?? null,
      priority: notification.priority ?? 'NORMAL',
      isRead: notification.isRead,
      read: notification.isRead,
      readAt: notification.readAt ?? null,
      archivedAt: notification.archivedAt ?? null,
      expiresAt: notification.expiresAt ?? null,
      createdAt: notification.createdAt,
    };
  }

  async emitNotificationCreated(
    userId: string,
    notification: Parameters<NotificationsService['toDto']>[0],
  ) {
    await this.emitChanged(userId, this.toDto(notification), 'created');
  }

  private async emitChanged(
    userId: string,
    dto: ReturnType<NotificationsService['toDto']>,
    event: 'created' | 'updated',
  ) {
    if (event === 'created') {
      this.gateway.emitCreated(userId, dto);
    } else {
      this.gateway.emitUpdated(userId, dto);
    }

    await this.emitUnreadCount(userId);
  }

  private async emitUnreadCount(userId: string) {
    const unreadCount = await this.getUnreadCount(userId);
    this.gateway.emitUnreadCount(userId, unreadCount);
  }
}

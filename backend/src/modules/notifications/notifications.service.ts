import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateNotificationInput,
  NotificationType,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(userId: string, title: string, message: string) {
    const created = await this.prismaService.notification.create({
      data: { userId, title, message },
    });

    return this.toDto(created);
  }

  async createFromPayload(input: CreateNotificationInput) {
    return this.create(
      input.userId,
      this.formatTitle(input.title, input.type),
      this.formatMessage(input.message, input.href),
    );
  }

  async createOncePerDay(input: CreateNotificationInput) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const title = this.formatTitle(input.title, input.type);

    const existed = await this.prismaService.notification.findFirst({
      where: {
        userId: input.userId,
        title,
        createdAt: { gte: start },
      },
    });

    if (existed) {
      return this.toDto(existed);
    }

    return this.create(
      input.userId,
      title,
      this.formatMessage(input.message, input.href),
    );
  }

  async findMyNotifications(
    userId: string,
    query?: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.min(50, Math.max(1, Number(query?.limit || 20)));
    const where = {
      userId,
      ...(query?.unreadOnly ? { isRead: false } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prismaService.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.notification.count({ where }),
      this.prismaService.notification.count({
        where: { userId, isRead: false },
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
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prismaService.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    const updated = await this.prismaService.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return this.toDto(updated);
  }

  markAllAsRead(userId: string) {
    return this.prismaService.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(userId: string, id: string) {
    const notification = await this.prismaService.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    await this.prismaService.notification.delete({ where: { id } });

    return { deleted: true, id };
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
    createdAt: Date;
  }) {
    const type = this.inferType(notification.title, notification.message);

    return {
      id: notification.id,
      title: this.cleanTitle(notification.title),
      message: this.cleanMessage(notification.message),
      type,
      href: this.inferHref(type, notification.message),
      isRead: notification.isRead,
      read: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}

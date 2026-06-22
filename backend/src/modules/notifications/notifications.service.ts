import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prismaSerive: PrismaService) {}

  create(userId: string, title: string, message: string) {
    return this.prismaSerive.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });
  }

  findMyNotifications(userId: string) {
    return this.prismaSerive.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prismaSerive.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    return this.prismaSerive.notification.update({
      where: {
        id,
      },
      data: {
        isRead: true,
      },
    });
  }

  markAllAsRead(userId: string) {
    return this.prismaSerive.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
      },
    });
  }
}

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { NOTIFICATIONS_QUEUE, NotificationJobName } from './notifications.constants';
import { NotificationsService } from './notifications.service';
import { CreateNotificationInput } from './notifications.types';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<CreateNotificationInput | Record<string, never>>) {
    if (job.name === NotificationJobName.CREATE) {
      return this.notificationsService.createFromPayload(job.data as CreateNotificationInput);
    }

    if (job.name === NotificationJobName.DAILY_REMINDERS) {
      return this.createDailyReminders();
    }

    if (job.name === NotificationJobName.WEEKLY_GOALS) {
      return this.createWeeklyGoalReminders();
    }

    return { skipped: true };
  }

  private async createDailyReminders() {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, fullname: true },
      take: 500,
    });

    let created = 0;
    for (const user of users) {
      await this.notificationsService.createOncePerDay({
        userId: user.id,
        type: 'LEARNING_REMINDER',
        title: 'Nhắc học hôm nay',
        message: `${user.fullname}, hôm nay bạn đã sẵn sàng hoàn thành mục tiêu học chưa?`,
        href: '/dashboard',
      });
      created++;
    }

    return { created };
  }

  private async createWeeklyGoalReminders() {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, fullname: true },
      take: 500,
    });

    let created = 0;
    for (const user of users) {
      await this.notificationsService.createOncePerDay({
        userId: user.id,
        type: 'WEEKLY_GOAL',
        title: 'Mục tiêu tuần mới',
        message: 'Tuần mới đã bắt đầu. Kiểm tra mission và lộ trình học để giữ nhịp tiến bộ nhé.',
        href: '/missions',
      });
      created++;
    }

    return { created };
  }
}


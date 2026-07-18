import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobName,
} from './notifications.constants';
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
      return this.notificationsService.createFromPayload(
        job.data as CreateNotificationInput,
      );
    }

    if (job.name === NotificationJobName.USER_DAILY_REMINDER) {
      // Per-user repeatable job created by NotificationScheduler.syncUserDailyReminder.
      // Re-check the live setting at fire time in case it changed after the
      // job was scheduled but before this tick ran.
      return this.createUserDailyReminder(job.data as CreateNotificationInput);
    }

    if (job.name === NotificationJobName.DAILY_REMINDERS) {
      return this.createDailyReminders();
    }

    if (job.name === NotificationJobName.WEEKLY_GOALS) {
      return this.createWeeklyGoalReminders();
    }

    return { skipped: true };
  }

  private async createUserDailyReminder(payload: CreateNotificationInput) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: payload.userId },
      select: { dailyReminderEnabled: true, pushNotification: true },
    });

    // No row yet means defaults apply (dailyReminderEnabled/pushNotification
    // both default to true) — only an explicit false should skip the send.
    if (settings?.dailyReminderEnabled === false) {
      return { skipped: true, reason: 'dailyReminderEnabled is false' };
    }

    if (settings?.pushNotification === false) {
      return { skipped: true, reason: 'pushNotification is false' };
    }

    await this.notificationsService.createOncePerDay(payload);
    return { created: 1 };
  }

  private async createDailyReminders() {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        // Users who never opened Settings have no UserSettings row yet —
        // treat that as "defaults apply" (dailyReminderEnabled defaults to
        // true), rather than silently excluding them.
        OR: [{ settings: null }, { settings: { dailyReminderEnabled: true } }],
      },
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
      where: {
        status: 'ACTIVE',
        OR: [{ settings: null }, { settings: { missionReminder: true } }],
      },
      select: { id: true, fullname: true },
      take: 500,
    });

    let created = 0;
    for (const user of users) {
      await this.notificationsService.createOncePerDay({
        userId: user.id,
        type: 'WEEKLY_GOAL',
        title: 'Mục tiêu tuần mới',
        message:
          'Tuần mới đã bắt đầu. Kiểm tra mission và lộ trình học để giữ nhịp tiến bộ nhé.',
        href: '/missions',
      });
      created++;
    }

    return { created };
  }
}

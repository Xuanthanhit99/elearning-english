import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobName,
  userDailyReminderJobId,
} from './notifications.constants';
import type { CreateNotificationInput } from './notifications.types';

@Injectable()
export class NotificationScheduler implements OnModuleInit {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(@InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue) {}

  /**
   * Called whenever a user's dailyReminderEnabled/dailyReminderTime/timezone
   * changes. Always removes the previous repeatable job first so we never
   * end up with duplicate reminders after a schedule change.
   */
  async syncUserDailyReminder(
    userId: string,
    settings: { enabled: boolean; time: string; timezone: string },
  ) {
    const jobId = userDailyReminderJobId(userId);

    const repeatableJobs = await this.queue.getRepeatableJobs();
    const existing = repeatableJobs.find((job) => job.id === jobId);

    if (existing) {
      await this.queue.removeRepeatableByKey(existing.key);
    }

    if (!settings.enabled) {
      return;
    }

    const [hourStr, minuteStr] = settings.time.split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      this.logger.warn(`Invalid dailyReminderTime for userId=${userId}: ${settings.time}`);
      return;
    }

    const payload: CreateNotificationInput = {
      userId,
      type: 'LEARNING_REMINDER',
      title: 'Nhắc học hôm nay',
      message: 'Đã đến giờ học theo lịch bạn đặt trong Cài đặt. Cùng hoàn thành mục tiêu hôm nay nhé!',
      href: '/dashboard',
    };

    await this.queue.add(NotificationJobName.USER_DAILY_REMINDER, payload, {
      jobId,
      repeat: { pattern: `${minute} ${hour} * * *`, tz: settings.timezone },
      removeOnComplete: 20,
      removeOnFail: 50,
    });
  }

  async onModuleInit() {
    await this.queue.add(
      NotificationJobName.DAILY_REMINDERS,
      {},
      {
        jobId: 'notifications:daily-reminders',
        repeat: { pattern: '0 20 * * *' },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    await this.queue.add(
      NotificationJobName.WEEKLY_GOALS,
      {},
      {
        jobId: 'notifications:weekly-goals',
        repeat: { pattern: '10 8 * * 1' },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
  }
}


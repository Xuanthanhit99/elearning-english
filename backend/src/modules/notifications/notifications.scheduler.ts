import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE, NotificationJobName } from './notifications.constants';

@Injectable()
export class NotificationScheduler implements OnModuleInit {
  constructor(@InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue) {}

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


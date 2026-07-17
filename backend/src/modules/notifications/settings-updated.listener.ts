import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { SettingsUpdatedEvent } from '../settings/events/settings-updated.event';
import { NotificationScheduler } from './notifications.scheduler';

const REMINDER_FIELDS = ['dailyReminderEnabled', 'dailyReminderTime', 'timezone'];

@Injectable()
export class NotificationsSettingsListener {
  private readonly logger = new Logger(NotificationsSettingsListener.name);

  constructor(private readonly scheduler: NotificationScheduler) {}

  @OnEvent('settings.updated', { async: true })
  async handle(event: SettingsUpdatedEvent) {
    const touchesReminderSchedule = event.changedFields.some((field) =>
      REMINDER_FIELDS.includes(field),
    );

    if (!touchesReminderSchedule) return;

    try {
      await this.scheduler.syncUserDailyReminder(event.userId, {
        enabled: event.currentSettings.dailyReminderEnabled,
        time: event.currentSettings.dailyReminderTime,
        timezone: event.currentSettings.timezone,
      });
    } catch (error) {
      this.logger.error(
        `Failed to sync daily reminder schedule for userId=${event.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

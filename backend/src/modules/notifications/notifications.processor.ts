import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationPriority, Prisma } from '@prisma/client';
import { Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobName,
} from './notifications.constants';
import {
  NotificationCreateJobPayload,
  NotificationCreateJobResult,
} from './contracts/notification-job.payload';
import { NotificationPreferenceResolver } from './preferences/notification-preference.resolver';
import { NotificationPreferenceDecision } from './preferences/notification-preference.types';
import { NotificationPreferencePolicyError } from './preferences/notification-preference.registry';
import {
  NotificationTemplateError,
  NotificationTemplateMapper,
} from './templates/notification-template.mapper';
import { NotificationsService } from './notifications.service';
import { CreateNotificationInput } from './notifications.types';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly preferenceResolver: NotificationPreferenceResolver,
    private readonly templateMapper: NotificationTemplateMapper,
  ) {
    super();
  }

  async process(
    job: Job<
      | CreateNotificationInput
      | NotificationCreateJobPayload
      | Record<string, never>
    >,
  ) {
    if (job.name === NotificationJobName.CREATE) {
      return this.notificationsService.createFromPayload(
        job.data as CreateNotificationInput,
      );
    }

    if (job.name === NotificationJobName.CREATE_FROM_EVENT) {
      return this.createFromEvent(
        job.data as NotificationCreateJobPayload,
        job,
      );
    }

    if (job.name === NotificationJobName.USER_DAILY_REMINDER) {
      // Per-user repeatable job created by NotificationScheduler.syncUserDailyReminder.
      // Re-check the live setting at fire time in case it changed after the
      // job was scheduled but before this tick ran.
      return this.createUserDailyReminder(job.data as CreateNotificationInput);
    }

    if (job.name === NotificationJobName.CLEANUP) {
      return this.notificationsService.cleanupOldNotifications();
    }

    if (job.name === NotificationJobName.DAILY_REMINDERS) {
      return this.createDailyReminders();
    }

    if (job.name === NotificationJobName.WEEKLY_GOALS) {
      return this.createWeeklyGoalReminders();
    }

    return { skipped: true };
  }

  private async createFromEvent(
    payload: NotificationCreateJobPayload,
    job: Job,
  ): Promise<NotificationCreateJobResult> {
    this.validateEventPayload(payload);

    const result: NotificationCreateJobResult = {
      created: 0,
      skippedPreference: 0,
      skippedExpired: 0,
      skippedRecipient: 0,
      duplicate: 0,
      failed: 0,
      notificationIds: [],
    };

    for (const recipientUserId of payload.recipientUserIds) {
      const deduplicationKey = this.resolveDeduplicationKey(
        payload.deduplicationKey,
        recipientUserId,
      );

      try {
        const recipientExists = await this.prisma.user.findUnique({
          where: { id: recipientUserId },
          select: { id: true },
        });

        if (!recipientExists) {
          result.skippedRecipient++;
          this.logOutcome('SKIPPED_RECIPIENT_NOT_FOUND', {
            payload,
            recipientUserId,
            deduplicationKey,
            jobId: job.id,
          });
          continue;
        }

        const preference = await this.preferenceResolver.resolve(
          recipientUserId,
          payload.eventType,
        );

        if (
          preference.controlsInAppPersistence &&
          preference.enabled === false
        ) {
          result.skippedPreference++;
          this.logOutcome('SKIPPED_PREFERENCE_DISABLED', {
            payload,
            recipientUserId,
            deduplicationKey,
            jobId: job.id,
            preference,
          });
          continue;
        }

        if (this.isExpired(payload.expiresAt)) {
          result.skippedExpired++;
          this.logOutcome('SKIPPED_EXPIRED', {
            payload,
            recipientUserId,
            deduplicationKey,
            jobId: job.id,
            preference,
          });
          continue;
        }

        const template = this.templateMapper.map(payload);
        const message = this.formatMessage(template.body, template.actionUrl);

        const notification = await this.prisma.notification.create({
          data: {
            userId: recipientUserId,
            recipientUserId,
            title: template.title,
            message,
            eventType: payload.eventType,
            eventVersion: payload.eventVersion,
            deduplicationKey,
            entityType: payload.entityType,
            entityId: payload.entityId,
            priority: this.toPrismaPriority(payload.priority),
            expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
          },
          select: {
            id: true,
            title: true,
            message: true,
            isRead: true,
            readAt: true,
            archivedAt: true,
            eventType: true,
            priority: true,
            expiresAt: true,
            createdAt: true,
          },
        });

        result.created++;
        result.notificationIds.push(notification.id);
        await this.notificationsService.emitNotificationCreated(
          recipientUserId,
          notification,
        );
        this.logOutcome('CREATED', {
          payload,
          recipientUserId,
          deduplicationKey,
          jobId: job.id,
          templateKey: template.templateKey,
          preference,
        });
      } catch (error) {
        if (this.isUniqueDeduplicationError(error)) {
          const existing = await this.prisma.notification.findFirst({
            where: { recipientUserId, deduplicationKey },
            select: { id: true },
          });

          if (existing) {
            result.duplicate++;
            result.notificationIds.push(existing.id);
            this.logOutcome('DUPLICATE', {
              payload,
              recipientUserId,
              deduplicationKey,
              jobId: job.id,
            });
            continue;
          }
        }

        if (
          error instanceof NotificationTemplateError ||
          error instanceof NotificationPreferencePolicyError
        ) {
          result.failed++;
          this.logOutcome(error.code, {
            payload,
            recipientUserId,
            deduplicationKey,
            jobId: job.id,
          });
          throw new UnrecoverableError(error.message);
        }

        this.logger.error(
          `Failed notification eventType=${payload.eventType} eventId=${payload.eventId} jobId=${job.id}`,
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    }

    return result;
  }

  private validateEventPayload(payload: NotificationCreateJobPayload) {
    if (!payload.eventId || !payload.eventType || !payload.deduplicationKey) {
      throw new Error('Invalid notification create job payload.');
    }

    if (!payload.recipientUserIds.length) {
      throw new Error('Notification create job payload has no recipients.');
    }
  }

  private resolveDeduplicationKey(baseKey: string, recipientUserId: string) {
    return baseKey.includes('{recipientId}')
      ? baseKey.replaceAll('{recipientId}', recipientUserId)
      : baseKey;
  }

  private formatMessage(message: string, href?: string) {
    if (!href || message.includes('href=')) return message;
    return `${message}\n\nhref=${href}`;
  }

  private isExpired(expiresAt: string | null) {
    if (!expiresAt) return false;
    const expires = new Date(expiresAt);
    return Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now();
  }

  private toPrismaPriority(priority: string) {
    if (priority === NotificationPriority.LOW) return NotificationPriority.LOW;
    if (priority === NotificationPriority.HIGH)
      return NotificationPriority.HIGH;
    return NotificationPriority.NORMAL;
  }

  private isUniqueDeduplicationError(error: unknown) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const target = error.meta?.target;
    return (
      Array.isArray(target) &&
      target.includes('recipientUserId') &&
      target.includes('deduplicationKey')
    );
  }

  private logOutcome(
    outcome: string,
    input: {
      payload: NotificationCreateJobPayload;
      recipientUserId: string;
      deduplicationKey: string;
      jobId?: string | number;
      preference?: NotificationPreferenceDecision;
      templateKey?: string;
    },
  ) {
    this.logger.log(
      `Notification outcome=${outcome} eventType=${input.payload.eventType} eventId=${input.payload.eventId} eventVersion=${input.payload.eventVersion} recipient=${input.recipientUserId} preferenceKey=${input.preference?.preferenceKey || 'N/A'} preferenceDecision=${input.preference?.source || 'N/A'} templateKey=${input.templateKey || 'N/A'} dedupKey=${input.deduplicationKey} jobId=${input.jobId || 'N/A'}`,
    );
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

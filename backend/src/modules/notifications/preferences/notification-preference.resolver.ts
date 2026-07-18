import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationEventType } from '../contracts/notification-event-type';
import { getNotificationPreferencePolicy } from './notification-preference.registry';
import {
  NotificationPreferenceDecision,
  NotificationPreferenceKey,
} from './notification-preference.types';

type NotificationSettingsSlice = Partial<
  Record<NotificationPreferenceKey, boolean>
>;

@Injectable()
export class NotificationPreferenceResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    recipientUserId: string,
    eventType: NotificationEventType,
  ): Promise<NotificationPreferenceDecision> {
    const policy = getNotificationPreferencePolicy(eventType);

    if (policy.kind === 'ALWAYS_ENABLED') {
      return {
        enabled: true,
        preferenceKey: null,
        source: 'SYSTEM_REQUIRED',
        controlsInAppPersistence: true,
        reason: policy.reason,
      };
    }

    const { rule } = policy;

    if (!rule.controlsInAppPersistence) {
      return {
        enabled: true,
        preferenceKey: rule.preferenceKey,
        source: 'CHANNEL_ONLY',
        controlsInAppPersistence: false,
        reason: `${rule.preferenceKey} controls a delivery channel, not in-app persistence.`,
      };
    }

    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: recipientUserId },
      select: {
        dailyReminderEnabled: true,
        missionReminder: true,
        friendActivity: true,
        clubNotification: true,
        leaderboardNotification: true,
        aiFeedbackNotification: true,
        emailNotification: true,
        pushNotification: true,
      },
    });

    if (!settings) {
      return {
        enabled: rule.defaultEnabled,
        preferenceKey: rule.preferenceKey,
        source: 'DEFAULT',
        controlsInAppPersistence: rule.controlsInAppPersistence,
        reason: `No settings row; using default for ${rule.preferenceKey}.`,
      };
    }

    const value = (settings as NotificationSettingsSlice)[rule.preferenceKey];

    return {
      enabled: value ?? rule.defaultEnabled,
      preferenceKey: rule.preferenceKey,
      source: 'USER_SETTING',
      controlsInAppPersistence: rule.controlsInAppPersistence,
      reason: `Resolved ${rule.preferenceKey} from UserSettings.`,
    };
  }
}

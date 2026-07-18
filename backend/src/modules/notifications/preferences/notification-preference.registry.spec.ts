import { NotificationEventType } from '../contracts/notification-event-type';
import {
  getNotificationPreferencePolicy,
  NOTIFICATION_PREFERENCE_KEYS,
  NOTIFICATION_PREFERENCE_RULES,
} from './notification-preference.registry';
import { NotificationPreferenceKey } from './notification-preference.types';

describe('notification preference registry', () => {
  it('contains the eight real notification preference keys', () => {
    expect(new Set(NOTIFICATION_PREFERENCE_KEYS)).toEqual(
      new Set(Object.values(NotificationPreferenceKey)),
    );
    expect(NOTIFICATION_PREFERENCE_RULES).toHaveLength(8);
  });

  it('maps supported event types to a preference or explicit always-enabled policy', () => {
    for (const eventType of Object.values(NotificationEventType)) {
      expect(getNotificationPreferencePolicy(eventType)).toBeDefined();
    }
  });

  it('keeps email and push as channel-only preferences', () => {
    const channelOnly = NOTIFICATION_PREFERENCE_RULES.filter(
      (rule) =>
        rule.preferenceKey === NotificationPreferenceKey.EMAIL_NOTIFICATION ||
        rule.preferenceKey === NotificationPreferenceKey.PUSH_NOTIFICATION,
    );

    expect(channelOnly.every((rule) => !rule.controlsInAppPersistence)).toBe(
      true,
    );
    expect(channelOnly.every((rule) => rule.eventTypes.length === 0)).toBe(
      true,
    );
  });
});

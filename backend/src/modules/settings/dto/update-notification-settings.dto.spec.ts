import { validateSync } from 'class-validator';
import { UpdateNotificationSettingsDto } from './update-notification-settings.dto';

describe('UpdateNotificationSettingsDto', () => {
  it('accepts real notification preference fields', () => {
    const dto = Object.assign(new UpdateNotificationSettingsDto(), {
      dailyReminderEnabled: true,
      dailyReminderTime: '19:30',
      missionReminder: false,
      friendActivity: true,
      clubNotification: true,
      leaderboardNotification: false,
      aiFeedbackNotification: true,
      emailNotification: false,
      pushNotification: true,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects invalid boolean preferences and reminder time', () => {
    const dto = Object.assign(new UpdateNotificationSettingsDto(), {
      missionReminder: 'yes',
      dailyReminderTime: '25:99',
    });

    const fields = validateSync(dto).map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['missionReminder', 'dailyReminderTime']),
    );
  });
});

import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationEventType } from '../contracts/notification-event-type';
import { NotificationPreferenceResolver } from './notification-preference.resolver';
import { NotificationPreferenceKey } from './notification-preference.types';

describe('NotificationPreferenceResolver', () => {
  const prisma = {
    userSettings: {
      findUnique: jest.fn(),
    },
  };

  let resolver: NotificationPreferenceResolver;

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = new NotificationPreferenceResolver(
      prisma as unknown as PrismaService,
    );
  });

  it('uses user setting when the preference row exists', async () => {
    prisma.userSettings.findUnique.mockResolvedValue({
      dailyReminderEnabled: true,
      missionReminder: false,
      friendActivity: false,
      clubNotification: true,
      leaderboardNotification: true,
      aiFeedbackNotification: true,
      emailNotification: false,
      pushNotification: true,
    });

    const decision = await resolver.resolve(
      'user-1',
      NotificationEventType.MISSION_COMPLETED,
    );

    expect(decision).toEqual(
      expect.objectContaining({
        enabled: false,
        preferenceKey: NotificationPreferenceKey.MISSION_REMINDER,
        source: 'USER_SETTING',
        controlsInAppPersistence: true,
      }),
    );
  });

  it('uses registry default when the user has no settings row', async () => {
    prisma.userSettings.findUnique.mockResolvedValue(null);

    const decision = await resolver.resolve(
      'user-1',
      NotificationEventType.FRIEND_ACTIVITY,
    );

    expect(decision.enabled).toBe(false);
    expect(decision.source).toBe('DEFAULT');
  });

  it('returns system-required for always-enabled event types', async () => {
    const decision = await resolver.resolve(
      'user-1',
      NotificationEventType.SYSTEM_NOTIFICATION,
    );

    expect(prisma.userSettings.findUnique).not.toHaveBeenCalled();
    expect(decision).toEqual(
      expect.objectContaining({
        enabled: true,
        preferenceKey: null,
        source: 'SYSTEM_REQUIRED',
      }),
    );
  });
});

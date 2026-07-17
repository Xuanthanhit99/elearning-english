import { api } from './axios';
import { DeviceSession, Settings } from './settings-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

const WRITABLE_SETTINGS_FIELDS = [
  'learningGoal',
  'dailyStudyMinutes',
  'preferredSkills',
  'currentLevel',
  'autoDetectLevel',
  'challengeMode',
  'aiTeacher',
  'aiPersonality',
  'conversationSpeed',
  'correctionMode',
  'translationMode',
  'speechProvider',
  'micSensitivity',
  'autoStopSeconds',
  'playbackSpeed',
  'accent',
  'captionsEnabled',
  'dailyReminderEnabled',
  'dailyReminderTime',
  'missionReminder',
  'friendActivity',
  'clubNotification',
  'leaderboardNotification',
  'aiFeedbackNotification',
  'emailNotification',
  'pushNotification',
  'publicProfile',
  'showStreak',
  'showAchievements',
  'allowFriendRequests',
  'allowClubInvites',
  'showOnlineStatus',
  'showLastSeen',
  'communityNickname',
  'messagePermission',
  'autoJoinVoiceRoom',
  'theme',
  'language',
  'primaryColor',
  'fontScale',
  'compactMode',
  'animationsEnabled',
  'reduceMotion',
  'highContrast',
  'keyboardNavigation',
  'screenReaderOptimized',
  'focusMode',
  'energyMode',
  'learningDnaEnabled',
  'adaptiveDashboard',
  'autoSchedule',
  'weeklyTargetDays',
  'restDays',
  'preferredStudyTime',
  'timezone',
  'dataPersonalization',
  'analyticsConsent',
] as const satisfies Array<keyof Settings>;

function unwrap<T>(response: { data?: { data?: T } | T }): T {
  const value = response.data as { data?: T } | T | undefined;
  return ((value as { data?: T })?.data ?? value) as T;
}

function toWritableSettings(payload: Partial<Settings>): Partial<Settings> {
  const writable: Partial<Settings> = {};

  for (const field of WRITABLE_SETTINGS_FIELDS) {
    if (payload[field] !== undefined) {
      writable[field] = payload[field] as never;
    }
  }

  return writable;
}

export const settingsApi = {
  get: async () => unwrap<Settings>(await api.get('/settings')),

  update: async (payload: Partial<Settings>) =>
    unwrap<Settings>(await api.patch('/settings', toWritableSettings(payload))),

  resetSection: async (section: string) =>
    unwrap<Settings>(await api.post('/settings/reset-section', { section })),

  getDevices: async () => unwrap<DeviceSession[]>(await api.get('/settings/devices')),

  revokeDevice: async (id: string) =>
    unwrap(await api.delete(`/settings/devices/${id}`)),

  revokeOtherDevices: async () =>
    unwrap(await api.delete('/settings/devices')),

  getLearningDna: async () =>
    unwrap<{
      enabled: boolean;
      snapshot: null | {
        strongestSkill?: string;
        weakestSkill?: string;
        bestStudyHour?: number;
        retentionScore?: number;
        consistencyScore?: number;
        recommendedFocus: string[];
      };
    }>(await api.get('/settings/learning-dna')),

  exportUrl: `${API_BASE_URL}/settings/export`,
};

export const twoFactorApi = {
  setup: async () =>
    unwrap<{ qrCodeDataUrl: string; manualEntryKey: string }>(
      await api.post('/auth/2fa/setup'),
    ),

  confirm: async (otp: string) =>
    unwrap<{ recoveryCodes: string[] }>(
      await api.post('/auth/2fa/confirm', { otp }),
    ),

  disable: async (payload: {
    password?: string;
    otp?: string;
    recoveryCode?: string;
  }) => unwrap<{ success: boolean }>(await api.post('/auth/2fa/disable', payload)),
};

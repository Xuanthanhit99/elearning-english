export type UserSettings = {
  learningGoal: string;
  dailyStudyMinutes: number;
  preferredSkills: string[];
  currentLevel: string;
  autoDetectLevel: boolean;
  challengeMode: string;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  missionReminder: boolean;
  friendActivity: boolean;
  clubNotification: boolean;
  leaderboardNotification: boolean;
  aiFeedbackNotification: boolean;
  emailNotification: boolean;
  pushNotification: boolean;
  publicProfile: boolean;
  showStreak: boolean;
  showAchievements: boolean;
  allowFriendRequests: boolean;
  allowClubInvites: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  communityNickname?: string | null;
  messagePermission?: string;
  focusMode: boolean;
  energyMode: boolean;
  learningDnaEnabled: boolean;
  adaptiveDashboard: boolean;
  autoSchedule: boolean;
  weeklyTargetDays: number;
  restDays: string[];
  preferredStudyTime: string;
  timezone: string;
  dataPersonalization: boolean;
  analyticsConsent: boolean;
};

export type NotificationSettings = Pick<
  UserSettings,
  | 'dailyReminderEnabled'
  | 'dailyReminderTime'
  | 'missionReminder'
  | 'friendActivity'
  | 'clubNotification'
  | 'leaderboardNotification'
  | 'aiFeedbackNotification'
  | 'emailNotification'
  | 'pushNotification'
> & {
  preferredStudyTime?: string;
  timezone?: string;
  focusMode?: boolean;
};

export type DeviceSession = {
  id: string;
  deviceName?: string | null;
  browser?: string | null;
  os?: string | null;
  ipAddress?: string | null;
  current: boolean;
  lastActiveAt?: string | null;
  createdAt?: string | null;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

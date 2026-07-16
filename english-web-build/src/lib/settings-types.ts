export type Settings = {
  learningGoal: string;
  dailyStudyMinutes: number;
  preferredSkills: string[];
  currentLevel: string;
  autoDetectLevel: boolean;
  challengeMode: string;

  aiTeacher: string;
  aiPersonality: string;
  conversationSpeed: number;
  correctionMode: string;
  translationMode: string;

  speechProvider: string;
  micSensitivity: number;
  autoStopSeconds: number | null;
  playbackSpeed: number;
  accent: string;
  captionsEnabled: boolean;

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

  communityNickname: string | null;
  messagePermission: string;
  autoJoinVoiceRoom: boolean;

  theme: string;
  primaryColor: string;
  fontScale: number;
  compactMode: boolean;
  animationsEnabled: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  keyboardNavigation: boolean;
  screenReaderOptimized: boolean;

  focusMode: boolean;
  energyMode: boolean;
  learningDnaEnabled: boolean;
  adaptiveDashboard: boolean;
  autoSchedule: boolean;
  weeklyTargetDays: number;
  restDays: string[];
  preferredStudyTime: string;

  twoFactorEnabled: boolean;
  dataPersonalization: boolean;
  analyticsConsent: boolean;
};

export type DeviceSession = {
  id: string;
  deviceName: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  current: boolean;
  lastActiveAt: string;
};

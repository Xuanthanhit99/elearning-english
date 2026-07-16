import {
  AiPersonality,
  ChallengeMode,
  CorrectionMode,
  EnglishAccent,
  EnglishLevel,
  LearningGoal,
  MessagePermission,
  Prisma,
  ThemeMode,
  TranslationMode,
} from '@prisma/client';

type SettingsDefaultsMap = Record<
  string,
  Prisma.UserSettingsUncheckedUpdateInput
>;

export const settingsDefaults = {
  learning: {
    learningGoal: LearningGoal.DAILY_ENGLISH,
    dailyStudyMinutes: 20,
    preferredSkills: ['SPEAKING', 'VOCABULARY'],
    currentLevel: EnglishLevel.A1,
    autoDetectLevel: true,
    challengeMode: ChallengeMode.NORMAL,
    weeklyTargetDays: 5,
    restDays: [],
    preferredStudyTime: '19:00',
    autoSchedule: false,
  },

  ai: {
    aiTeacher: 'Emily',
    aiPersonality: AiPersonality.COACH,
    conversationSpeed: 1,
    correctionMode: CorrectionMode.EXPLAIN_GRAMMAR,
    translationMode: TranslationMode.ON_REQUEST,
  },

  speaking: {
    speechProvider: 'GOOGLE',
    micSensitivity: 60,
    autoStopSeconds: 5,
    playbackSpeed: 1,
    accent: EnglishAccent.AMERICAN,
    captionsEnabled: true,
  },

  notifications: {
    dailyReminderEnabled: true,
    dailyReminderTime: '19:00',
    missionReminder: true,
    friendActivity: false,
    clubNotification: true,
    leaderboardNotification: true,
    aiFeedbackNotification: true,
    emailNotification: false,
    pushNotification: true,
  },

  privacy: {
    publicProfile: true,
    showStreak: true,
    showAchievements: true,
    allowFriendRequests: true,
    allowClubInvites: true,
    showOnlineStatus: true,
    showLastSeen: true,
    dataPersonalization: true,
    analyticsConsent: true,
  },

  community: {
    communityNickname: null,
    messagePermission: MessagePermission.FRIENDS,
    autoJoinVoiceRoom: false,
  },

  appearance: {
    theme: ThemeMode.SYSTEM,
    primaryColor: 'VIOLET',
    fontScale: 1,
    compactMode: false,
    animationsEnabled: true,
  },

  accessibility: {
    reduceMotion: false,
    highContrast: false,
    keyboardNavigation: true,
    screenReaderOptimized: false,
  },

  advanced: {
    focusMode: false,
    energyMode: true,
    learningDnaEnabled: true,
    adaptiveDashboard: true,
  },
} satisfies SettingsDefaultsMap;

export type SettingsSection = keyof typeof settingsDefaults;
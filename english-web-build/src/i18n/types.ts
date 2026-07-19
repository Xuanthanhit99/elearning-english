export type Locale = "vi" | "en" | "zh" | "de";

export const DEFAULT_LOCALE: Locale = "vi";

export const LOCALES: Locale[] = ["vi", "en", "zh", "de"];

export const LOCALE_LABELS: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "中文",
  de: "Deutsch",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  vi: "🇻🇳",
  en: "🇬🇧",
  zh: "🇨🇳",
  de: "🇩🇪",
};

export type Dictionary = {
  common: {
    appName: string;
    loading: string;
    save: string;
    saving: string;
    default: string;
    cancel: string;
    close: string;
  };
  header: {
    greeting: string;
    readyToday: string;
    searchPlaceholder: string;
    streak: string;
    xp: string;
    notifications: string;
    account: string;
    profile: string;
    achievements: string;
    settings: string;
    logout: string;
    openMenu: string;
    closeMenu: string;
    defaultUser: string;
    language: string;
    theme: string;
  };
  theme: {
    light: string;
    dark: string;
    system: string;
  };
  sidebar: {
    groupLearning: string;
    home: string;
    dashboard: string;
    analytics: string;
    reports: string;
    progress: string;
    history: string;
    learningPath: string;
    todayLesson: string;
    groupSkills: string;
    vocabulary: string;
    listening: string;
    speaking: string;
    reading: string;
    writing: string;
    groupExplore: string;
    discover: string;
    community: string;
    studyRooms: string;
    missions: string;
    leaderboard: string;
    groupSystem: string;
    admin: string;
    settings: string;
    premiumTitle: string;
    premiumDesc: string;
    upgradeNow: string;
    collapse: string;
    expand: string;
    closeMenu: string;
  };
  settings: {
    badge: string;
    title: string;
    subtitle: string;
    reset: string;
    save: string;
    saving: string;
    savedMessage: string;
    resetMessage: string;
    tabLearning: string;
    tabAi: string;
    tabSpeaking: string;
    tabNotifications: string;
    tabCommunity: string;
    tabAppearance: string;
    tabPrivacy: string;
    tabSecurity: string;
    tabAdvanced: string;
    appearanceTitle: string;
    themeLabel: string;
    languageLabel: string;
    languageDescription: string;
    fontScaleLabel: string;
    fontScaleSmall: string;
    fontScaleDefault: string;
    fontScaleLarge: string;
    fontScaleXLarge: string;
    reduceMotionLabel: string;
    highContrastLabel: string;
    compactModeLabel: string;
  };
  home: {
    navHome: string;
    navLearn: string;
    navArena: string;
    navAiTutor: string;
    navLibrary: string;
    navCommunity: string;
    navShop: string;
    personalLabel: string;
    sidebarProfile: string;
    sidebarAchievements: string;
    sidebarFriends: string;
    sidebarSettings: string;
    sidebarChangeTheme: string;
    sidebarFreeCheck: string;
    sidebarCourses: string;
    premiumTitle: string;
    premiumFeatures: string[];
    premiumCta: string;
    foxyTitle: string;
    foxySubtitle: string;
    heroBrandLine: string;
    heroTitle: string;
    heroSubtitle: string;
    heroCtaStart: string;
    heroCtaArena: string;
    heroCreateRoom: string;
    heroStreakLabel: string;
    heroXpTodayLabel: string;
    heroRankLabel: string;
    featuresTitle: string;
    features: { title: string; desc: string }[];
    toolsTitle: string;
    tools: { title: string; desc: string }[];
    freeBadge: string;
    coursesTitle: string;
    courseFallbackLevel: string;
    courseFallbackDesc: string;
    viewAll: string;
    dailyTasksTitle: string;
    dailyTasks: string[];
    recentArenaTitle: string;
    winLabel: string;
    communityPostsTitle: string;
    communityPosts: string[];
    whyTitle: string;
    whyItems: { title: string; desc: string }[];
    whyCommunityTitle: string;
    whyJoinNow: string;
    learnerSr: string;
    novaChatTitle: string;
    novaOnline: string;
    novaGreeting: string;
    novaQuickReplies: string[];
    novaInputPlaceholder: string;
    novaOpenAria: string;
  };
  footer: {
    ctaBadge: string;
    title: string;
    subtitle: string;
    ctaRegister: string;
    ctaCourses: string;
    copyright: string;
  };
  dashboard: {
    badge: string;
    greeting: string;
    subtitle: string;
    totalXp: string;
    energy: string;
    todayGoal: string;
    tasksDone: string;
    statXpToday: string;
    statRecentSessions: string;
    statNewAchievements: string;
    statNotifications: string;
    currentLesson: string;
    currentLessonDesc: string;
    continueCta: string;
    noCurrentLesson: string;
    continueLearning: string;
    continueLearningDesc: string;
    noContinueLearning: string;
    recommended: string;
    recommendedDesc: string;
    startNow: string;
    noRecommendation: string;
    learningPath: string;
    learningPathDesc: string;
    view: string;
    level: string;
    noLearningPath: string;
    weeklyActivity: string;
    weeklyActivityDesc: string;
    analytics: string;
    analyticsDesc: string;
    xp7Days: string;
    studyTime: string;
    currentStreak: string;
    aiReport: string;
    skillProgress: string;
    skillProgressDesc: string;
    details: string;
    undetermined: string;
    recentSessions: string;
    noRecentSessions: string;
    yourPet: string;
    yourPetDesc: string;
    noPet: string;
    todayMissions: string;
    noTodayMissions: string;
    recentAchievements: string;
    noRecentAchievements: string;
    notifications: string;
    noNotifications: string;
    updateLevel: string;
    loadError: string;
    noData: string;
    retry: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
};

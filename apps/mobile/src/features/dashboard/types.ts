export type DashboardSkillKey =
  | 'VOCABULARY'
  | 'GRAMMAR'
  | 'READING'
  | 'LISTENING'
  | 'SPEAKING'
  | 'WRITING';

export type DashboardUser = {
  id: string;
  fullname: string;
  email: string;
  username?: string | null;
  avatar?: string | null;
  level?: number | null;
  englishLevel?: string | null;
  learningGoal?: string | null;
};

export type DashboardLesson = {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  progressPercent?: number | null;
  href: string;
  updatedAt?: string | null;
  level?: string | null;
  estimatedMinutes?: number | null;
};

export type DashboardSkillProgress = {
  key: DashboardSkillKey | string;
  label: string;
  percent: number;
  level?: string | null;
  status?: string | null;
  href?: string | null;
};

export type DashboardWeekActivity = {
  date: string;
  label: string;
  xp: number;
  lessons: number;
  minutes: number;
};

export type DashboardData = {
  user: DashboardUser;
  preferences?: {
    focusMode?: boolean;
    adaptiveDashboard?: boolean;
    energyMode?: boolean;
    learningGoal?: string | null;
    currentLevel?: string | null;
  };
  widgetVisibility?: {
    community?: boolean;
    leaderboard?: boolean;
  };
  currentStreak: number;
  xp: {
    total: number;
    today: number;
    week?: number;
    level?: number;
  };
  coins?: number;
  energy?: number;
  todayMissions?: {
    summary: {
      completed: number;
      total: number;
      claimable: number;
    };
    items?: Array<{
      id: string;
      title: string;
      status: string;
      progress: number;
      target: number;
    }>;
  };
  today?: {
    date: string;
    studyMinutes: number;
    targetStudyMinutes: number;
    completedActivities: number;
    completedLessons: number;
    wordsLearned: number;
    wordsReviewed: number;
    xpEarned: number;
    missionsCompleted: number;
    dailyGoalProgress: number;
    isGoalCompleted: boolean;
  };
  week?: {
    weekStart: string;
    weekEnd: string;
    studyMinutes: number;
    activeDays: number;
    targetDays: number;
    completedActivities: number;
    xpEarned: number;
    dailySeries: DashboardWeekActivity[];
  };
  learningPath?: {
    source?: 'PLACEMENT' | 'DEFAULT_FOUNDATION';
    title?: string;
    progressPercent?: number | null;
    completedLessons?: number;
    totalLessons?: number;
    overallLevel?: string | null;
    currentLesson?: unknown;
    nextLesson?: unknown;
    skillLevels?: unknown[];
  } | null;
  currentLesson: DashboardLesson | null;
  continueLearning: {
    items: DashboardLesson[];
  };
  recommendedLesson: DashboardLesson | null;
  recommendations?: DashboardLesson[];
  quickActions?: Array<{
    id: string;
    title: string;
    description?: string | null;
    href: string;
    icon?: string | null;
  }>;
  weeklyActivity: DashboardWeekActivity[];
  skillProgress: DashboardSkillProgress[];
  analytics?: {
    summary?: {
      xp: number;
      studyTimeMinutes: number;
      streak: number;
      completedMissions: number;
      completedLessons: number;
      learningPathPercent: number;
    };
    skillBreakdown?: Record<
      string,
      {
        percent: number;
        completed?: number;
        learned?: number;
        mastered?: number;
      }
    >;
  };
};

export type LeaderboardMe = {
  profile?: {
    totalXp?: number | null;
    currentLevel?: number | null;
    league?: string | null;
  };
  current?: {
    rank: number | null;
    periodXp: number;
    zone?: string | null;
    season?: {
      name?: string | null;
    } | null;
  } | null;
} | null;

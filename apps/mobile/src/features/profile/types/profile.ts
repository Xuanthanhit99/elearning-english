export type ProfileUser = {
  id: string;
  fullname: string;
  email: string;
  avatar?: string | null;
  username?: string | null;
  bio?: string | null;
  goal?: string | null;
  interests?: string[];
  phone?: string | null;
  level?: number | null;
  xp?: number | null;
  isPro?: boolean | null;
  role?: string | null;
  englishLevel?: string | null;
  learningGoal?: string | null;
  createAt?: string | null;
};

export type UpdateProfileInput = {
  fullname?: string;
  username?: string;
  bio?: string;
  goal?: string;
  phone?: string;
  englishLevel?: string;
  learningGoal?: string;
};

export type AchievementOverview = {
  summary?: {
    totalAchievements?: number;
    xpEarned?: number;
    completedChallenges?: number;
    longestStreak?: number;
  };
  recent?: Array<{
    key?: string;
    id?: string;
    title: string;
    description?: string;
    xp?: number;
    dateLabel?: string;
  }>;
  goals?: Array<{
    key: string;
    title: string;
    subtitle?: string;
    progressPercent: number;
  }>;
};

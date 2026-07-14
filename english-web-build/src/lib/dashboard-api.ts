import { api } from "@/src/lib/axios";

export type DashboardMission = {
  id: string;
  title: string;
  description: string;
  type: string;
  action: string;
  skill?: string | null;
  progress: number;
  target: number;
  progressPercent: number;
  status: string;
  completed: boolean;
  reward: {
    xp: number;
    coins: number;
    food: number;
    energy: number;
    happiness: number;
  };
};

export type DashboardData = {
  user: {
    id: string;
    fullname: string;
    email: string;
    username?: string | null;
    avatar?: string | null;
    level: number;
    englishLevel?: string | null;
    learningGoal?: string | null;
  };
  currentStreak: number;
  xp: {
    total: number;
    today: number;
  };
  coins: number;
  energy: number;
  pet: {
    id: string;
    petType: string;
    petName: string;
    level: number;
    xp: number;
    hp: number;
    energy: number;
    happiness: number;
    hunger: number;
    isChosen: boolean;
  } | null;
  todayMissions: {
    summary: {
      completed: number;
      total: number;
      claimable: number;
    };
    items: DashboardMission[];
  };
  learningPath: {
    overallLevel: string;
    overallScore: number;
    progressPercent: number;
    currentPhase: {
      id: string;
      title: string;
      phase: number;
      targetLevel?: string | null;
      progress: number;
    } | null;
    phases: Array<{
      id: string;
      title: string;
      phase: number;
      targetLevel?: string | null;
      progress: number;
    }>;
    recommendedCourses: Array<{
      id: string;
      title: string;
      slug?: string | null;
      lessonCount?: number | null;
      reason: string;
    }>;
  } | null;
  currentLesson: {
    id: string;
    type: string;
    title: string;
    subtitle?: string | null;
    progressPercent?: number;
    href: string;
    updatedAt?: string;
    level?: string | null;
    estimatedMinutes?: number | null;
  } | null;
  continueLearning: {
    items: Array<{
      id: string;
      type: string;
      title: string;
      subtitle?: string | null;
      progressPercent: number;
      updatedAt: string;
      href: string;
    }>;
  };
  recommendedLesson: {
    id: string;
    type: string;
    title: string;
    subtitle?: string | null;
    level?: string | null;
    estimatedMinutes?: number | null;
    href: string;
  } | null;
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string | null;
    href: string;
    meta?: string | null;
  }>;
  quickActions: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    icon: string;
  }>;
  weeklyActivity: Array<{
    date: string;
    label: string;
    xp: number;
    lessons: number;
    minutes: number;
  }>;
  analytics: {
    summary: {
      xp: number;
      studyTimeMinutes: number;
      streak: number;
      completedMissions: number;
      completedLessons: number;
      learningPathPercent: number;
    };
    skillBreakdown: {
      vocabulary: { percent: number; learned: number; mastered: number };
      grammar: { percent: number; completed: number };
      reading: { percent: number; completed: number };
      listening: { percent: number; completed: number };
      speaking: { percent: number; completed: number };
      writing: { percent: number; completed: number };
    };
    charts: {
      weeklyXp: Array<{ date: string; label: string; value: number }>;
      weeklyStudyTime: Array<{ date: string; label: string; value: number }>;
      weeklyLessons: Array<{ date: string; label: string; value: number }>;
      skills: Array<{ key: string; label: string; value: number; level?: string | null }>;
    };
    aiReport: {
      title: string;
      strongestSkill: { key: string; label: string; percent: number } | null;
      focusSkill: { key: string; label: string; percent: number; href: string } | null;
      insights: string[];
      nextAction: {
        title: string;
        href: string;
        reason: string;
      };
    };
  };
  skillProgress: Array<{
    key: string;
    label: string;
    percent: number;
    level?: string | null;
    status?: string | null;
    href: string;
  }>;
  recentSessions: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string | null;
    score?: number | null;
    status: string;
    completedAt: string;
    href: string;
  }>;
  recentAchievements: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    xp: number;
    coins: number;
    earnedAt: string;
    href: string;
  }>;
  notificationsPreview: Array<{
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    href: string;
  }>;
};

export async function getDashboard() {
  const response = await api.get<{ success: boolean; data: DashboardData }>(
    "/dashboard",
  );
  return response.data.data;
}

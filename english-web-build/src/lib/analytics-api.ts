import { api } from "@/src/lib/axios";

export type AnalyticsRange = "7d" | "30d" | "90d";

export type AnalyticsSkill =
  | "VOCABULARY"
  | "GRAMMAR"
  | "READING"
  | "LISTENING"
  | "SPEAKING"
  | "WRITING";

export type AnalyticsActivity = {
  id: string;
  type: string;
  title: string;
  description: string;
  skill?: AnalyticsSkill | null;
  xp: number;
  score?: number | null;
  duration?: number | null;
  entityType: string;
  entityId?: string | null;
  occurredAt: string;
  actionUrl: string;
};

export type AnalyticsOverview = {
  range: {
    key: AnalyticsRange;
    from: string;
    to: string;
    timezone: string;
  };
  summary: {
    xp: number;
    studyMinutes: number;
    completedActivities: number;
    activeDays: number;
    currentStreak: number;
  };
  trend: {
    currentValue: number;
    previousValue: number;
    absoluteChange: number;
    percentageChange: number | null;
    direction: "UP" | "DOWN" | "FLAT";
  };
  skills: Array<{
    key: AnalyticsSkill;
    label: string;
    percent: number;
    level?: string | null;
    status?: string | null;
    href: string;
    sampleStatus: "READY" | "INSUFFICIENT_DATA";
  }>;
  activityTrend: Array<{
    date: string;
    xp: number;
    studyMinutes: number;
    completedActivities: number;
  }>;
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string | null;
    href: string;
    meta?: string | null;
  }>;
  recentActivities: AnalyticsActivity[];
  aiReport: {
    title: string;
    insights: string[];
    nextAction: {
      title: string;
      href: string;
      reason: string;
    };
  };
  generatedAt: string;
};

export type AnalyticsReport = {
  range: AnalyticsOverview["range"];
  highlights: string[];
  summary: AnalyticsOverview["summary"] & {
    achievementsUnlocked: number;
  };
  skillBreakdown: AnalyticsOverview["skills"];
  activityTrend: AnalyticsOverview["activityTrend"];
  recommendations: AnalyticsOverview["recommendations"];
  generatedAt: string;
};

type ApiResponse<T> = { success: boolean; data: T };

export async function getAnalyticsOverview(range: AnalyticsRange = "7d") {
  const response = await api.get<ApiResponse<AnalyticsOverview>>(
    "/analytics/overview",
    { params: { range } },
  );
  return response.data.data;
}

export async function getAnalyticsActivity(params: {
  range?: AnalyticsRange;
  skill?: AnalyticsSkill;
  cursor?: string | null;
  limit?: number;
} = {}) {
  const response = await api.get<
    ApiResponse<{
      items: AnalyticsActivity[];
      pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
    }>
  >("/analytics/activity", { params });
  return response.data.data;
}

export async function getWeeklyReport() {
  const response = await api.get<ApiResponse<AnalyticsReport>>("/reports/weekly");
  return response.data.data;
}

export async function getMonthlyReport() {
  const response = await api.get<ApiResponse<AnalyticsReport>>("/reports/monthly");
  return response.data.data;
}

export type AnalyticsMetrics = {
  range: AnalyticsOverview["range"];
  accuracy: {
    overall: number | null;
    bySkill: Partial<Record<AnalyticsSkill, number | null>>;
  };
  completionRate: { started: number; completed: number; percent: number | null };
  durations: { avgSessionMinutes: number; completedSessionsCounted: number };
  practiceFrequency: { sessionsPerDay: number; totalSessions: number };
  missedDays: number;
  activeDays: number;
  goalCompletion: {
    targetMinutesPerDay: number;
    daysMeetingGoal: number;
    percent: number | null;
  };
  xpGrowth: {
    currentPeriodXp: number;
    previousPeriodXp: number;
    percentageChange: number | null;
    direction: "UP" | "DOWN" | "FLAT";
  };
  perSkillGrowth: Partial<
    Record<
      AnalyticsSkill,
      { previous: number | null; current: number | null; direction: "UP" | "DOWN" | "FLAT" }
    >
  >;
  generatedAt: string;
};

export async function getAnalyticsMetrics(range: AnalyticsRange = "7d") {
  const response = await api.get<ApiResponse<AnalyticsMetrics>>("/analytics/metrics", {
    params: { range },
  });
  return response.data.data;
}

export type TimelineRange = AnalyticsRange | "today" | "custom";

export type TimelineDay = {
  date: string;
  xp: number;
  studyMinutes: number;
  completedActivities: number;
  accuracyPercent: number | null;
  completedSkills: AnalyticsSkill[];
  achievementsUnlocked: number;
};

export type ProgressTimeline = {
  range: AnalyticsOverview["range"];
  days: TimelineDay[];
  generatedAt: string;
};

export async function getProgressTimeline(
  params: { range?: TimelineRange; from?: string; to?: string } = {},
) {
  const response = await api.get<ApiResponse<ProgressTimeline>>("/analytics/timeline", {
    params,
  });
  return response.data.data;
}

export type SkillRadarBasis = "RECENT_PERFORMANCE" | "LIFETIME_AVERAGE" | "INSUFFICIENT_DATA";

export type SkillRadarPoint = {
  skill: AnalyticsSkill;
  label: string;
  score: number;
  basis: SkillRadarBasis;
  sampleSize: number;
};

export type SkillRadar = {
  generatedAt: string;
  windowDays: number;
  overall: number;
  skills: SkillRadarPoint[];
};

export async function getSkillRadar() {
  const response = await api.get<ApiResponse<SkillRadar>>("/analytics/radar");
  return response.data.data;
}

export type SkillWeakness = {
  skill: AnalyticsSkill;
  skillLabel: string;
  topic: string;
  topicSlug: string | null;
  accuracy: number;
  attempts: number;
  recommendedLesson: { id: string; title: string; href: string } | null;
  reason: string;
};

export type WeaknessReport = {
  generatedAt: string;
  overallWeakest: SkillWeakness[];
  bySkill: Partial<Record<AnalyticsSkill, SkillWeakness | null>>;
};

export async function getWeaknesses() {
  const response = await api.get<ApiResponse<WeaknessReport>>("/analytics/weaknesses");
  return response.data.data;
}

export type CoachAdvice = {
  headline: string;
  whyThisLesson: string;
  recommendedFocus: { skill: string; topic: string; reason: string } | null;
  whatsNext: string[];
  weeklyPlan: string[];
  examPrepTip: string;
  dailyHabitTip: string;
  source: "GEMINI" | "FALLBACK_TEMPLATE";
  goal: string;
  generatedAt: string;
};

export async function getAiCoachAdvice(options: { refresh?: boolean } = {}) {
  const response = await api.get<ApiResponse<CoachAdvice>>("/analytics/coach", {
    params: options.refresh ? { refresh: "true" } : undefined,
  });
  return response.data.data;
}

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

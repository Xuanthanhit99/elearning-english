import { api } from "@/src/lib/axios";

export type ProgressSkill =
  | "VOCABULARY"
  | "GRAMMAR"
  | "READING"
  | "LISTENING"
  | "SPEAKING"
  | "WRITING";

export type ProgressStatus =
  | "STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "PASSED"
  | "SKIPPED"
  | "CANCELLED";

export type LearningActivity = {
  id: string;
  activityKey: string;
  type: string;
  skill: ProgressSkill | null;
  title: string;
  description?: string | null;
  status: ProgressStatus;
  entityType: string;
  entityId: string;
  sessionId?: string | null;
  score?: number | null;
  accuracy?: number | null;
  xpEarned?: number | null;
  durationSeconds?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  occurredAt: string;
  action: {
    type: "RESUME" | "VIEW_RESULT" | "VIEW_LESSON" | "RETRY" | "NONE";
    label: string;
    href: string | null;
  };
  metadata?: Record<string, string | number | boolean | null>;
};

export type ProgressOverview = {
  overview: {
    overallCompletion: number | null;
    overallProgressMode: string;
    currentLevel?: string | null;
    totalStudyMinutes: number;
    totalCompletedActivities: number;
    totalXp: number;
    currentStreak: number;
    activeSkills: number;
  };
  learningPath: unknown;
  skills: SkillProgress[];
  inProgress: Array<{
    id: string;
    activityKey: string;
    skill: ProgressSkill | null;
    title: string;
    status: ProgressStatus;
    progress?: number | null;
    lastActivityAt: string;
    estimatedRemainingMinutes?: number | null;
    resumeAction: LearningActivity["action"];
    expiresAt?: string | null;
  }>;
  recentlyCompleted: LearningActivity[];
  recommendation?: {
    title: string;
    href: string;
    type?: string;
    subtitle?: string | null;
  } | null;
  generatedAt: string;
  timezone: string;
};

export type SkillProgress = {
  skill: ProgressSkill;
  currentLevel?: string | null;
  status: string;
  completedActivities: number;
  inProgressActivities: number;
  studyMinutes: number;
  recentScore?: number | null;
  averageScore?: number | null;
  accuracy?: number | null;
  lastPracticedAt?: string | null;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  nextAction: {
    type: string;
    label: string;
    href: string;
  };
};

type ApiResponse<T> = { success?: boolean; data?: T } & T;

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  return (response.data.data ?? response.data) as T;
}

export async function getProgressOverview() {
  return unwrap<ProgressOverview>(await api.get("/progress"));
}

export async function getProgressHistory(params: {
  skill?: ProgressSkill | "ALL";
  status?: ProgressStatus | "ALL";
  range?: "7d" | "30d" | "90d";
  cursor?: string | null;
  limit?: number;
} = {}) {
  return unwrap<{
    items: LearningActivity[];
    groups: Array<{ date: string; items: LearningActivity[] }>;
    pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
  }>(
    await api.get("/progress/history", {
      params: {
        ...params,
        skill: params.skill === "ALL" ? undefined : params.skill,
        status: params.status ?? "ALL",
      },
    }),
  );
}

export async function getProgressActivityDetail(activityId: string) {
  return unwrap<{
    summary: LearningActivity;
    result: {
      score?: number | null;
      accuracy?: number | null;
      durationSeconds?: number | null;
      xpEarned?: number | null;
      startedAt?: string | null;
      completedAt?: string | null;
    };
    skillSpecific: Record<string, string | number | boolean | null>;
    action: LearningActivity["action"];
  }>(await api.get(`/progress/activities/${encodeURIComponent(activityId)}`));
}

import { api } from "./axios";

export type LearningPathLessonStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED";

export type LearningPathLesson = {
  id: string;
  title: string;
  duration: number | null;
  order: number;
  sectionId: string;
  sectionTitle: string;
  courseId: string;
  courseSlug: string;
  status: LearningPathLessonStatus;
  progressId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  href: string;
};

export type LearningPathCourse = {
  id: string;
  courseId: string | null;
  title: string;
  slug: string | null;
  thumbnail: string | null;
  rating: number | null;
  reviews: number | null;
  lessonCount: number;
  reason: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  available: boolean;
  lessons: LearningPathLesson[];
};

export type LearningPathStartingLesson = {
  skill: string;
  title: string;
  href: string;
  topicTitle: string | null;
} | null;

export type LearningPathSkillLevel = {
  skill: string;
  level: string | null;
  /** Only present when source === 'PLACEMENT'. */
  score?: number;
  status?: string;
  /** Only present when source === 'DEFAULT_FOUNDATION'. */
  source?: "PLACEMENT" | "DEFAULT_FOUNDATION" | "MANUAL_LEVEL" | "PROGRESS";
  assessedLevel?: string | null;
  startingLesson?: LearningPathStartingLesson;
};

export type LearningPathData = {
  /** null when source === 'DEFAULT_FOUNDATION' (no PlacementResult exists yet). */
  id: string | null;
  testId: string | null;
  title: string;
  overallLevel: string | null;
  overallScore: number | null;
  generatedAt: string | null;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  currentLesson: LearningPathLesson | null;
  nextLesson: LearningPathLesson | LearningPathStartingLesson;
  phases: Array<{
    id: string;
    phase: number;
    title: string;
    targetLevel: string | null;
    weeksMin: number;
    weeksMax: number;
    description: string;
    objectives: string[];
    progress: number;
  }>;
  priorities: Array<{
    id: string;
    skill: string;
    priority: number;
    reason: string;
  }>;
  recommendedCourses: Array<{
    id: string;
    title: string;
    slug: string | null;
    thumbnail: string | null;
    rating: number | null;
    reviews: number | null;
    lessonCount: number | null;
    reason: string;
  }>;
  courses: LearningPathCourse[];
  skills: LearningPathSkillLevel[];
  /** Distinguishes an AI-generated placement path from the per-skill foundation fallback. */
  source: "PLACEMENT" | "DEFAULT_FOUNDATION";
};

export type LearningPathLessonActionResult = {
  lesson: LearningPathLesson;
  learningPath: {
    id: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    currentLesson: LearningPathLesson | null;
    nextLesson: LearningPathLesson | null;
  };
  alreadyCompleted?: boolean;
  rewards?: {
    applied: boolean;
    alreadyProcessed?: boolean;
    xp: number;
    coins: number;
    streak: {
      current: number | null;
      best: number | null;
      changed: boolean;
    };
    missionUpdates: Array<{
      missionId: string;
      progress: number;
      target: number;
      status: string;
    }>;
    pet: {
      changed: boolean;
    };
    leaderboard: {
      queued: boolean;
      synced?: boolean;
    };
  };
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export async function getLearningPath() {
  const response = await api.get<ApiResponse<LearningPathData>>(
    "/learning-path",
  );

  return response.data.data;
}

export async function startLearningPathLesson(lessonId: string) {
  const response = await api.post<
    ApiResponse<LearningPathLessonActionResult>
  >(`/learning-path/lessons/${lessonId}/start`);

  return response.data.data;
}

export async function resumeLearningPathLesson(
  lessonId: string,
  signal?: AbortSignal,
) {
  const response = await api.get<
    ApiResponse<LearningPathLessonActionResult>
  >(`/learning-path/lessons/${lessonId}/resume`, { signal });

  return response.data.data;
}

export async function completeLearningPathLesson(lessonId: string) {
  const response = await api.post<
    ApiResponse<LearningPathLessonActionResult>
  >(`/learning-path/lessons/${lessonId}/complete`);

  return response.data.data;
}

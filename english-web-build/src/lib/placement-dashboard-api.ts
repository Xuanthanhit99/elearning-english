import { api } from "./axios";

export type LearningSkill =
  | 'VOCABULARY'
  | 'GRAMMAR'
  | 'LISTENING'
  | 'READING'
  | 'SPEAKING'
  | 'WRITING';

export type PlacementDashboardData = {
  state: 'FIRST_TIME' | 'IN_PROGRESS' | 'PROCESSING' | 'COMPLETED';
  currentTest: {
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    testUrl: string;
    processingUrl: string;
    resultUrl: string;
  } | null;
  latestResult: {
    testId: string;
    overallLevel: string;
    overallScore: number;
    percentile: number | null;
    confidence: number | null;
    completedAt: string | null;
    totalQuestions: number;
    speakingCount: number;
    writingCount: number;
    processedSeconds: number | null;
    strengths: string[];
    improvements: string[];
    summary: string | null;
    projectedLevel: string | null;
    projectedWeeksMin: number | null;
    projectedWeeksMax: number | null;
  } | null;
  skills: Array<{
    skill: LearningSkill;
    score: number;
    level: string | null;
    status: string;
    label: string | null;
    feedback: string | null;
    strengths: string[];
    improvements: string[];
  }>;
  priorities: Array<{
    id: string;
    skill: LearningSkill;
    priority: number;
    reason: string;
  }>;
  learningPath: Array<{
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
  history: Array<{
    testId: string;
    completedAt: string | null;
    level: string;
    score: number;
    isLatest: boolean;
    resultUrl: string;
  }>;
  comparison: {
    hasPrevious: boolean;
    previousTestId: string | null;
    scoreDelta: number | null;
    levelDelta: number | null;
    previousLevel: string | null;
    previousScore: number | null;
    skillDeltas: Array<{
      skill: LearningSkill;
      currentScore: number;
      previousScore: number;
      delta: number;
    }>;
  };
  retake: {
    allowed: boolean;
    cooldownDays: number;
    remainingDays: number;
    recommendedDate: string | null;
    message: string;
  };
  actions: {
    continueLearningUrl: string;
    retakeUrl: string;
    resultUrl: string | null;
    historyUrl: string;
    detailedAnalysisUrl: string | null;
    learningPathUrl: string;
  };
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function getPlacementDashboard() {
  const response = await api.get<ApiResponse<PlacementDashboardData>>(
    '/placement/dashboard',
  );
  return response.data.data;
}

export async function retakePlacement(force = false) {
  const response = await api.post<
    ApiResponse<{ testId: string; nextUrl: string }>
  >('/placement/retake', { force });
  return response.data.data;
}

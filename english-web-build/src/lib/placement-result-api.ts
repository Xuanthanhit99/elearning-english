import { api } from "./axios";

export type LearningSkill =
  | 'VOCABULARY'
  | 'GRAMMAR'
  | 'LISTENING'
  | 'READING'
  | 'SPEAKING'
  | 'WRITING';

export type PlacementResultData = {
  testId: string;
  status: 'DRAFT' | 'READY' | 'FAILED';
  completedAt: string | null;
  generatedAt: string;
  user: {
    id: string;
    fullname: string | null;
    avatar: string | null;
  };
  overview: {
    overallScore: number;
    overallLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    percentile: number | null;
    confidence: number | null;
    summary: string | null;
    strengths: string[];
    improvements: string[];
    projectedLevel:
      | 'A1'
      | 'A2'
      | 'B1'
      | 'B2'
      | 'C1'
      | 'C2'
      | null;
    projectedWeeksMin: number | null;
    projectedWeeksMax: number | null;
    processedSeconds: number | null;
  };
  analysis: {
    totalQuestions: number;
    speakingCount: number;
    writingCount: number;
  };
  skills: Array<{
    skill: LearningSkill;
    score: number;
    level: string | null;
    status:
      | 'WAITING'
      | 'PROCESSING'
      | 'COMPLETED'
      | 'SKIPPED'
      | 'FAILED';
    rating: number | null;
    label: string | null;
    feedback: string | null;
    strengths: string[];
    improvements: string[];
  }>;
  learningPath: {
    phases: Array<{
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
      skill: LearningSkill;
      priority: number;
      reason: string;
    }>;
  };
  recommendedCourses: Array<{
    id: string;
    title: string;
    slug: string | null;
    thumbnail: string | null;
    rating: number | null;
    reviews: number | null;
    lessonCount: number | null;
    reason: string;
    order: number;
  }>;
  certificate: {
    code: string | null;
    url: string | null;
    level: string;
  };
  actions: {
    startLearningUrl: string;
    retryTestUrl: string;
    chooseOtherPathUrl: string;
    detailedAnalysisUrl: string;
  };
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export async function generatePlacementResult(testId: string) {
  const response = await api.post<ApiResponse<PlacementResultData>>(
    `/placement/tests/${testId}/result/generate`,
  );

  return response.data.data;
}

export async function getPlacementResult(testId: string) {
  const response = await api.get<ApiResponse<PlacementResultData>>(
    `/placement/tests/${testId}/result`,
  );

  return response.data.data;
}

import { api } from "./axios";

export type LearningPathData = {
  testId: string;
  overallLevel: string;
  overallScore: number;
  generatedAt: string;
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
  skills: Array<{
    skill: string;
    score: number;
    level: string | null;
    status: string;
  }>;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export async function getLearningPath() {
  const response = await api.get<
    ApiResponse<LearningPathData>
  >('/learning-path');

  return response.data.data;
}

import { api } from "./axios";

export type ProcessingItemStatus =
  | 'WAITING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'FAILED';

export type PlacementProcessingSnapshot = {
  status: 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep:
    | 'ANSWER_ANALYSIS'
    | 'SKILL_EVALUATION'
    | 'LEARNING_PATH'
    | 'QUALITY_CHECK'
    | null;
  estimatedRemainingSeconds: number;
  errorMessage: string | null;
  nextUrl: string | null;
  steps: Array<{
    key:
      | 'ANSWER_ANALYSIS'
      | 'SKILL_EVALUATION'
      | 'LEARNING_PATH'
      | 'QUALITY_CHECK';
    title: string;
    status: ProcessingItemStatus;
    progress: number;
  }>;
  skills: Array<{
    skill:
      | 'VOCABULARY'
      | 'GRAMMAR'
      | 'LISTENING'
      | 'READING'
      | 'SPEAKING'
      | 'WRITING';
    status: ProcessingItemStatus;
    progress: number;
    score: number | null;
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
    message: string | null;
  }>;
  logs: Array<{
    id: string;
    message: string;
    status: ProcessingItemStatus;
    createdAt: string;
  }>;
  insights: string[];
  startedAt: string | null;
  completedAt: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export async function startPlacementProcessing(testId: string) {
  const response = await api.post<
    ApiResponse<PlacementProcessingSnapshot>
  >(`/placement/tests/${testId}/processing/start`);

  return response.data.data;
}

export async function getPlacementProcessing(testId: string) {
  const response = await api.get<
    ApiResponse<PlacementProcessingSnapshot>
  >(`/placement/tests/${testId}/processing`);

  return response.data.data;
}

import { api } from "./axios";

export type LearningPathAccessState =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PROCESSING'
  | 'RESULT_PENDING'
  | 'LEARNING_PATH_PENDING'
  | 'READY';

export type LearningPathAccessData = {
  state: LearningPathAccessState;
  allowed: boolean;
  currentTestId: string | null;
  hasResult: boolean;
  hasLearningPath: boolean;
  nextUrl: string;
  message: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export async function getLearningPathAccess() {
  const response = await api.get<
    ApiResponse<LearningPathAccessData>
  >('/learning-path/access');

  return response.data.data;
}

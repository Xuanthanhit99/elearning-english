export type LearningPathAccessState =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PROCESSING'
  | 'RESULT_PENDING'
  | 'LEARNING_PATH_PENDING'
  | 'READY';

export type LearningPathAccessResponse = {
  state: LearningPathAccessState;
  allowed: boolean;
  currentTestId: string | null;
  hasResult: boolean;
  hasLearningPath: boolean;
  nextUrl: string;
  message: string;
};

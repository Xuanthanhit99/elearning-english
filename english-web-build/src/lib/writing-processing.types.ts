export type WritingProcessingStatus = {
  id: string;
  sessionId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  step:
    | 'SUBMITTED'
    | 'AI_EVALUATION'
    | 'SAVING_RESULT'
    | 'UPDATING_MISSIONS'
    | 'COMPLETED'
    | 'FAILED'
    | string;
  progress: number;
  message?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  resultUrl?: string | null;
};

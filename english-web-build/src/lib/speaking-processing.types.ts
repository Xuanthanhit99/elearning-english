export type ApiEnvelope<T> = { success?: boolean; data: T; message?: string };

export type SpeakingPracticeDetail = {
  session: { id: string; status: string; durationSeconds?: number };
  lesson: {
    id: string; title: string; description?: string | null; type: string;
    level: string; estimatedMinutes: number; prompt: string;
    expectedText?: string | null; icon?: string | null;
  };
  topic?: { id: string; title: string; slug?: string } | null;
  latestAnswer?: { id: string; transcript: string; audioUrl?: string | null; overallScore: number; feedback: string } | null;
  steps?: Array<{ order: number; title: string; description: string }>;
  focusSkills?: Array<{ title: string; description: string; icon: string }>;
  tips?: Array<{ title: string; description: string; icon: string }>;
};

export type SpeakingUploadResponse = {
  processingJobId: string; sessionId: string; answerId: string;
  status: string; processingUrl: string;
};

export type SpeakingProcessingStatus = {
  id: string; sessionId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  step: 'UPLOAD_COMPLETED' | 'TRANSCRIBING' | 'AI_SCORING' | 'UPDATING_MISSIONS' | 'COMPLETED' | 'FAILED';
  progress: number; message?: string | null; errorMessage?: string | null;
  startedAt?: string | null; completedAt?: string | null; resultUrl?: string | null;
  retryable?: boolean; isStale?: boolean;
};

export type SpeakingRetryProcessingResponse = {
  sessionId: string; processingJobId: string | null;
  status: string; processingUrl: string;
};

export type SpeakingResultResponse = {
  summary: {
    sessionId: string; lessonId?: string | null; lessonTitle: string;
    topicTitle: string; categoryTitle: string; practiceType: string;
    level: string; duration: number; completedAt?: string | null;
  };
  scores: {
    overallScore: number; pronunciation: number; fluency: number;
    grammar: number; vocabulary: number; confidence: number;
  };
  answer: {
    id: string; question: string; expectedText?: string | null;
    transcript: string; audioUrl?: string | null; correctedText?: string | null;
  };
  aiFeedback: {
    feedback: string; suggestions: string[];
    mistakes: Array<{ type: string; original: string; corrected: string; explanation: string }>;
    improvedVersion?: string | null;
    nextPractice?: { focusSkill: string; title: string; reason: string } | null;
  };
  missionUpdated: boolean;
};

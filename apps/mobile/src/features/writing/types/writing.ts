export type WritingRecommendation = {
  id: string;
  title: string;
  level: string;
  type: string;
  category: string;
  imageUrl?: string | null;
  writers: number;
};

export type WritingHomeResponse = {
  user: {
    name: string;
    level: number;
  };
  stats: {
    essaysWritten: number;
    avgScore: number;
    dayStreak: number;
    xpToday?: number;
    gems?: number;
  };
  progress?: {
    overall: number;
    excellent: number;
    good: number;
    needsImprovement: number;
    total: number;
  };
  recommendations: WritingRecommendation[];
  recentHistory: Array<{
    id: string;
    title: string;
    type: string;
    level: string;
    score: number;
    submittedAt: string | null;
  }>;
  dailyGoal: {
    title: string;
    current: number;
    target: number;
    continueSessionId?: string | null;
  };
};

export type StartWritingLessonResult = {
  sessionId: string;
  lessonId: string;
  reused: boolean;
};

export type WritingSessionResponse = {
  session: {
    id: string;
    content: string;
    wordCount: number;
    timeSpentSeconds: number;
    isSubmitted: boolean;
  };
  lesson: {
    id: string;
    title: string;
    slug: string;
    prompt: string;
    description?: string | null;
    type: string;
    level: string;
    duration: number;
    minWords: number;
    maxWords: number;
    sampleEssay?: string | null;
  };
  topic: {
    id: string;
    title: string;
    slug: string;
  };
  progress: {
    overall: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    totalLessons: number;
  };
  tips: Array<{
    title: string;
    description: string;
  }>;
};

export type WritingSubmitResult = {
  sessionId: string;
  processingJobId?: string | null;
  status: WritingProcessingStatusValue;
  processingUrl?: string | null;
  resultUrl?: string | null;
};

export type WritingProcessingStatusValue = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;

export type WritingProcessingStatus = {
  id: string | null;
  sessionId: string;
  status: WritingProcessingStatusValue;
  step: 'SUBMITTED' | 'AI_EVALUATION' | 'SAVING_RESULT' | 'UPDATING_MISSIONS' | 'COMPLETED' | 'FAILED' | string;
  progress: number;
  message?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  retryable?: boolean;
  isStale?: boolean;
  resultUrl?: string | null;
};

export type WritingResultResponse = {
  session: {
    id: string;
    content: string;
    wordCount: number;
    timeSpentSeconds: number;
    submittedAt: string | null;
  };
  lesson: {
    id: string;
    title: string;
    type: string;
    level: string;
    maxWords: number;
  };
  topic: {
    id: string;
    title: string;
    slug: string;
  };
  result: {
    overallScore: number;
    grade: string;
    taskAchievement: number;
    coherence: number;
    lexicalResource: number;
    grammar: number;
    feedback: string;
  };
  strengths: string[] | unknown;
  improvements: string[] | unknown;
  detailedFeedback: Array<{
    title: string;
    description: string;
    type: string;
  }>;
  corrections: Array<{
    wrong: string;
    correct: string;
    explanation: string;
    type: string;
  }>;
  suggestedVersion?: string | null;
  learningTips?: string[] | unknown;
  aiCoachTask?: string | null;
  rewriteRequired?: boolean;
  nextPracticeSuggestion?: string | null;
  correctedEssay?: string | null;
};

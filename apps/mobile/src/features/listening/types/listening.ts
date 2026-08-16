export type ListeningOptionLabel = 'A' | 'B' | 'C' | 'D';

export type ListeningOption = {
  label: ListeningOptionLabel;
  text: string;
};

export type ListeningQuestion = {
  id: string;
  order: number;
  level: string;
  topic: string;
  audioUrl?: string | null;
  transcript?: string | null;
  duration: number;
  question: string;
  options: ListeningOption[] | unknown;
  answered: boolean;
  selectedAnswer: ListeningOptionLabel | null;
  isCorrect: boolean | null;
  isSkipped?: boolean;
  isFlagged: boolean;
  explanation?: string | null;
  correctAnswer?: ListeningOptionLabel | null;
};

export type ListeningPractice = {
  sessionId: string;
  level: string;
  topic: string;
  totalQuestions: number;
  currentQuestionIndex?: number;
  progress: {
    percent: number;
    correct: number;
    wrong: number;
    skipped: number;
  };
  questions: ListeningQuestion[];
};

export type ListeningHomeResponse = {
  stats: {
    completedSessions: number;
    averageAccuracy: number;
    totalListeningTime: number;
    totalListeningTimeText: string;
    totalXp: number;
  };
  level: {
    current: string;
    title: string;
  };
  streak: {
    current: number;
    longest: number;
  };
  continueSession: {
    sessionId: string;
    level: string | null;
    topic: string | null;
    total: number;
    correct: number;
    wrong: number;
    skipped: number;
    progressPercent: number;
  } | null;
  dailyRecommendation: {
    level: string;
    topic: string;
    limit: number;
  };
  recentSessions: Array<{
    id: string;
    level: string | null;
    topic: string | null;
    score: number;
    total: number;
    correct: number;
    completedAt: string | null;
  }>;
};

export type StartListeningInput = {
  level?: string | null;
  topic?: string | null;
  limit?: number | null;
};

export type SubmitListeningAnswerInput = {
  questionId: string;
  selectedAnswer: ListeningOptionLabel;
  timeSpent: number;
  listenedCount: number;
};

export type ListeningAnswerResult = {
  questionId: string;
  selectedAnswer: ListeningOptionLabel;
  correctAnswer: ListeningOptionLabel;
  isCorrect: boolean;
  explanation?: string | null;
  transcript?: string | null;
  progress: ListeningPractice['progress'];
};

export type ListeningSkipResult = {
  questionId: string;
  progress: ListeningPractice['progress'];
};

export type ListeningFinishResult = {
  sessionId: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  xpEarned: number;
  coinsEarned: number;
  status: string;
  completedAt: string | null;
  alreadyCompleted: boolean;
  missionUpdated: boolean;
  resultUrl: string;
};

export type ListeningResultResponse = {
  summary: {
    sessionId: string;
    level: string | null;
    topic: string | null;
    totalQuestions: number;
    correct: number;
    wrong: number;
    skipped: number;
    score: number;
    accuracy: number;
    xpEarned: number;
    coinsEarned: number;
    totalTimeSpent: number;
    totalTimeText: string;
    completedAt: string | null;
    rating?: number | null;
    ratingComment?: string | null;
    ratedAt?: string | null;
  };
  questions: Array<{
    id: string;
    order: number;
    question: string;
    options: ListeningOption[] | unknown;
    audioUrl?: string | null;
    transcript?: string | null;
    selectedAnswer: ListeningOptionLabel | null;
    correctAnswer: ListeningOptionLabel;
    isCorrect: boolean | null;
    isSkipped: boolean;
    isFlagged: boolean;
    explanation?: string | null;
    listenedCount: number;
    timeSpent: number;
  }>;
  feedback: {
    strengths: string[];
    improvements: string[];
  };
};

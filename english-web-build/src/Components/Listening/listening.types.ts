export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

export type ListeningOption = {
  label: "A" | "B" | "C" | "D";
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
  options: ListeningOption[];
  answered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  isSkipped?: boolean;
  isFlagged: boolean;
  explanation?: string | null;
  correctAnswer?: string | null;
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

export type ListeningHistoryResponse = {
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  items: Array<{
    id: string;
    level: string | null;
    topic: string | null;
    total: number;
    correct: number;
    wrong: number;
    skipped: number;
    score: number;
    xpEarned: number;
    coinsEarned: number;
    startedAt: string;
    completedAt: string | null;
  }>;
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
    selectedAnswer: string | null;
    correctAnswer: string;
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

export type MissionStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CLAIMED"
  | "EXPIRED"
  | "CANCELLED";

export type MissionItem = {
  id: string;
  title: string;
  description: string;
  type: "DAILY" | "WEEKLY" | "ACHIEVEMENT" | "EVENT";
  action: string;
  skill?: string | null;
  progress: number;
  target: number;
  progressPercent: number;
  status: MissionStatus;
  reward: {
    xp: number;
    coins: number;
    food: number;
    energy: number;
    happiness: number;
  };
  lessonId?: string | null;
};

export type MissionsDashboard = {
  missions: MissionItem[];
  summary: {
    dailyCompleted: number;
    dailyTotal: number;
    weeklyCompleted: number;
    weeklyTotal: number;
    claimableCount: number;
    claimedCount: number;
  };
};

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

export type MissionStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CLAIMED"
  | "EXPIRED"
  | "CANCELLED";

export type MissionAction =
  | "STUDY_LESSON"
  | "COMPLETE_LESSON"
  | "COMPLETE_QUIZ"
  | "LEARN_WORD"
  | "REVIEW_WORD"
  | "READ_ARTICLE"
  | "LISTEN_AUDIO"
  | "COMPLETE_SPEAKING"
  | "CHECK_WRITING"
  | "LOGIN"
  | "EARN_XP"
  | "STUDY_MINUTES";

export type MissionItem = {
  id: string;
  title: string;
  description: string;
  type: "DAILY" | "WEEKLY" | "ACHIEVEMENT" | "EVENT";
  scope: "GLOBAL" | "LEARNING_PATH" | "PHASE" | "LESSON" | "SKILL";
  action: MissionAction;
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
  periodKey: string;
  startsAt: string;
  expiresAt?: string | null;
  lessonId?: string | null;
  learningPathPhaseId?: string | null;
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

export type ReadingHomeResponse = {
  stats: {
    completedArticles: number;
    averageAccuracy: number;
    totalReadingTime: number;
    totalReadingTimeText: string;
    totalXp: number;
    completedChangeText: string;
    accuracyChangeText: string;
    timeChangeText: string;
    xpChangeText: string;
  };
  categories: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
    articleCount: number;
    difficultyText: string;
  }[];
  featuredArticles: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    categoryName: string;
    categorySlug: string;
    level: string;
    difficulty: string;
    difficultyText: string;
    readTime: number;
    readTimeText: string;
    questionCount: number;
    xpReward: number;
    isStarted: boolean;
    isCompleted: boolean;
  }[];
  progress: {
    percent: number;
    totalArticles: number;
    completedArticles: number;
    learningArticles: number;
    notStartedArticles: number;
  };
  currentLevel: {
    level: string;
    title: string;
    currentXp: number;
    nextLevelXp: number;
    percent: number;
  };
  streak: {
    currentStreak: number;
    week: { label: string; completed: boolean }[];
  };
  suggestions: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    readTimeText: string;
    difficultyText: string;
    xpReward: number;
  }[];
};

export type ReadingArticlesResponse = {
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    totalArticles: number;
    completedArticles: number;
    learningArticles: number;
    notStartedArticles: number;
    progressPercent: number;
  };
  filters: {
    categories: { label: string; value: string; count: number }[];
    difficulties: {
      label: string;
      value: "ALL" | "EASY" | "MEDIUM" | "HARD";
    }[];
    statuses: {
      label: string;
      value: "ALL" | "COMPLETED" | "LEARNING" | "NOT_STARTED";
    }[];
  };
  articles: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    categoryName: string;
    categorySlug: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    difficultyText: string;
    level: string;
    readTime: number;
    readTimeText: string;
    wordCount: number;
    wordCountText: string;
    questionCount: number;
    xpReward: number;
    status: "COMPLETED" | "LEARNING" | "NOT_STARTED";
    progressPercent: number;
    isLocked: boolean;
  }[];
  achievements: {
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
  }[];
};

export type ReadingLessonResponse = {
  article: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    content: string;
    categoryName: string;
    categorySlug: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    difficultyText: string;
    readTimeText: string;
    wordCountText: string;
    xpReward: number;
  };
  session: {
    id: string;
    isCompleted: boolean;
    score: number;
    accuracy: number;
    answeredCount: number;
    totalQuestions: number;
    progressPercent: number;
  } | null;
  questions: {
    id: string;
    index: number;
    question: string;
    options: string[];
    selected: string | null;
  }[];
  vocabulary: {
    id: string;
    word: string;
    partOfSpeech: string | null;
    meaning: string;
    audioUrl?: string | null;
  }[];
  tip?: { title: string; content: string };
};

export type ReadingSubmitResult = {
  sessionId: string;
  score: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  earnedXp: number;
  isCompleted: boolean;
  alreadyCompleted: boolean;
  missionUpdated: boolean;
  resultUrl: string;
};

export type ReadingResultResponse = {
  summary: {
    sessionId: string;
    articleId: string;
    articleTitle: string;
    articleSlug: string;
    categoryName: string;
    categorySlug: string;
    difficultyText: string;
    readTimeText: string;
    wordCountText: string;
    xpReward: number;
    score: number;
    accuracy: number;
    correctAnswers: number;
    wrongAnswers: number;
    totalQuestions: number;
    answeredCount: number;
    spentTime: number;
    spentTimeText: string;
    completedAt: string | null;
    passedText: string;
  };
  comparison: {
    previousScore: number;
    currentScore: number;
    changePercent: number;
  };
  skillPerformance: { name: string; score: number }[];
  questions: {
    id: string;
    index: number;
    question: string;
    options: string[] | unknown;
    selected: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string | null;
  }[];
  vocabulary: {
    id: string;
    word: string;
    partOfSpeech: string | null;
    meaning: string;
    example: string | null;
    audioUrl: string | null;
  }[];
  improvementSkills: {
    title: string;
    description: string;
    type: string;
  }[];
  suggestions: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    categoryName: string;
    categorySlug: string;
    difficultyText: string;
    readTimeText: string;
    xpReward: number;
  }[];
};

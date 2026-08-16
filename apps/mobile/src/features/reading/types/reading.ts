export type ReadingDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ReadingStatus = 'COMPLETED' | 'LEARNING' | 'NOT_STARTED';
export type ReadingStatusFilter = 'ALL' | ReadingStatus;

export type ReadingArticleListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  categoryName: string;
  categorySlug: string;
  difficulty: ReadingDifficulty;
  difficultyText: string;
  level: string;
  readTime: number;
  readTimeText: string;
  wordCount: number;
  wordCountText: string;
  questionCount: number;
  xpReward: number;
  status: ReadingStatus;
  progressPercent: number;
  isLocked: boolean;
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
    difficulties: { label: string; value: 'ALL' | ReadingDifficulty }[];
    statuses: { label: string; value: ReadingStatusFilter }[];
  };
  articles: ReadingArticleListItem[];
  achievements: {
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
  }[];
};

export type ReadingQuestion = {
  id: string;
  index: number;
  question: string;
  options: string[] | unknown;
  selected: string | null;
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
    difficulty: ReadingDifficulty;
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
  questions: ReadingQuestion[];
  vocabulary: {
    id: string;
    word: string;
    partOfSpeech: string | null;
    meaning: string;
    audioUrl?: string | null;
  }[];
  tip?: { title: string; content: string };
};

export type StartReadingSessionResult = {
  sessionId: string;
  articleId: string;
  startedAt: string;
};

export type ReadingAnswerResult = {
  id: string;
  questionId: string;
  selected: string;
  isCorrect: boolean;
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

export type ReadingArticlesParams = {
  page?: number;
  limit?: number;
  category?: string;
  difficulty?: ReadingDifficulty;
  status?: ReadingStatusFilter;
  sort?: 'newest' | 'popular' | 'xp' | 'readTime';
  keyword?: string;
};

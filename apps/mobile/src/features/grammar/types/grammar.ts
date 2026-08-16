export type GrammarDashboard = {
  stats: {
    totalTopics: number;
    totalLessons: number;
    completedLessons: number;
    averageScore: number;
  };
  categories: Array<{
    id: string;
    slug?: string | null;
    title: string;
    icon?: string | null;
    color?: string | null;
    totalTopics: number;
    totalLessons: number;
    completedLessons: number;
    progress: number;
  }>;
  topics: GrammarTopic[];
  roadmap: {
    currentLevel: string;
    progress: number;
    items: Array<{
      id: string;
      title: string;
      total: number;
      completed: number;
      done: boolean;
      progress: number;
    }>;
  };
  recentLessons: Array<{
    id: string;
    title: string;
    topic: string;
    status: string;
    score: number;
  }>;
  recommend?: {
    title: string;
    description: string;
  };
};

export type GrammarTopic = {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  level?: string | null;
  category: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
};

export type GrammarLessonListItem = {
  id: string;
  title: string;
  duration: number | string;
  order: number;
  completed?: boolean;
  score?: number;
};

export type GrammarQuestion = {
  id: string;
  question: string;
  options: string[];
  difficulty?: string | null;
};

export type GrammarLessonLearning = {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  duration: string;
  rewardXp: number;
  rewardCoin: number;
  currentIndex: number;
  totalLessons: number;
  progress: number;
  completedLessons: number;
  completedExercises: number;
  totalExercises: number;
  earnedXp: number;
  completed?: boolean;
  note?: string;
  prevLessonId?: string | null;
  nextLessonId?: string | null;
  topic?: {
    id: string;
    title: string;
    level?: string | null;
    category?: {
      id: string;
      title: string;
    };
  };
  content: {
    overview?: string;
    summary?: string;
    structure: string[];
    notes: string[];
    examples: Array<{ en: string; vi: string }>;
    tips: string[];
  };
  lessons: Array<{
    id: string;
    order: number;
    title: string;
    duration: string;
    type: string;
    completed?: boolean;
    locked?: boolean;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED' | 'NOT_STARTED' | string;
  }>;
  attachments: Array<{
    id: string;
    title: string;
    meta: string;
    type: string;
    url?: string | null;
  }>;
  questions: GrammarQuestion[];
};

export type SubmitGrammarResult = {
  score: number;
  correct: number;
  total: number;
  missionUpdated?: boolean;
  completed: true;
  alreadyCompleted: boolean;
  completedAt?: string | null;
  results: Array<{
    questionId: string;
    question: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string | null;
  }>;
};

export type CompleteGrammarResult = {
  message: string;
  nextLessonId: string | null;
  completed: true;
  alreadyCompleted: boolean;
  missionUpdated?: boolean;
  progress?: {
    id: string;
    completed: boolean;
    score: number;
    completedAt?: string | null;
  } | null;
};

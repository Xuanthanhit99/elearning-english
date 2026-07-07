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
    week: {
      label: string;
      completed: boolean;
    }[];
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

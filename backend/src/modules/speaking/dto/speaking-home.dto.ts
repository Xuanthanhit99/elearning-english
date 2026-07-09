// src/modules/speaking/dto/speaking-home.dto.ts

export type SpeakingHomeResponse = {
  hero: {
    title: string;
    description: string;
  };
  streak: {
    days: number;
    week: {
      label: string;
      day: number;
      completed: boolean;
      active?: boolean;
    }[];
  };
  progress: {
    currentLevel: number;
    nextLevel: number;
    percent: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  categories: {
    id: string;
    title: string;
    slug: string;
    icon: string | null;
    color: string | null;
    topicCount: number;
  }[];
  practiceTypes: {
    key: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  }[];
  recommendedTopics: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string | null;
    difficulty: string;
    estimatedMinutes: number;
  }[];
  recentHistory: {
    id: string;
    title: string;
    category: string;
    type: string;
    score: number;
    level: string;
    date: string;
  }[];
};

import { api } from "./axios";

export type SpeakingHomeData = {
  hero: { title: string; description: string };
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

export type SpeakingCategoryItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  lessonCount: number;
  levelRange: string;
  progressPercent: number;
};

export type SpeakingCategoriesResponse = {
  filters: { label: string; value: string }[];
  categories: SpeakingCategoryItem[];
  progress: {
    overallPercent: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  topSkills: { title: string; description: string; icon: string }[];
  dailyGoal: {
    currentMinutes: number;
    targetMinutes: number;
    percent: number;
    description: string;
  };
};

export type SpeakingTopicItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  minLevel: string;
  maxLevel: string;
  levelRange: string;
  levelText: string;
  difficulty: string;
  lessonCount: number;
  progressPercent: number;
  category: { id: string; title: string; slug: string; icon: string | null };
};

export type SpeakingTopicsResponse = {
  topics: SpeakingTopicItem[];
  filters: {
    categories: { title: string; slug: string; icon: string; count: number }[];
    levels: { label: string; value: string }[];
    difficulties: { label: string; value: string }[];
  };
  progress: {
    overallPercent: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  difficultyGuide: { title: string; range: string; color: string }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type SpeakingTopicDetail = {
  topic: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    minLevel: string;
    maxLevel: string;
    levelRange: string;
    levelText: string;
    lessonCount: number;
    progressPercent: number;
    category: { id: string; title: string; slug: string; icon: string | null };
  };
  progress: {
    percent: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  improveSkills: { title: string; description: string; icon: string }[];
  relatedTopics: {
    id: string;
    title: string;
    slug: string;
    icon: string;
    lessonCount: number;
  }[];
  practiceTip: { title: string; description: string };
};

export type SpeakingLessonItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  icon: string;
  level: string;
  estimatedMinutes: number;
  order: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";
  sessionId: string | null;
};

export type SpeakingTopicLessonsResponse = {
  lessons: SpeakingLessonItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getSpeakingHome() {
  const res = await api.get("/speaking/home");
  return res.data.data as SpeakingHomeData;
}

export async function getSpeakingCategories(
  params?: { level?: string },
  signal?: AbortSignal,
) {
  const res = await api.get("/speaking/categories", { params, signal });
  return res.data.data as SpeakingCategoriesResponse;
}

export async function getSpeakingTopics(params?: {
  search?: string;
  category?: string;
  level?: string;
  difficulty?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get("/speaking/topics", { params });
  return res.data.data as SpeakingTopicsResponse;
}

export async function getSpeakingTopicDetail(slug: string) {
  const res = await api.get(`/speaking/topics/${slug}`);
  return res.data.data as SpeakingTopicDetail;
}

export async function getSpeakingTopicLessons(
  slug: string,
  params?: { sort?: string; page?: number; limit?: number },
) {
  const res = await api.get(`/speaking/topics/${slug}/lessons`, { params });
  return res.data.data as SpeakingTopicLessonsResponse;
}

export async function startSpeakingLesson(lessonId: string) {
  const res = await api.post(`/speaking/lessons/${lessonId}/start`);
  return res.data.data as {
    sessionId: string;
    lessonId?: string;
    topicSlug?: string;
    redirectUrl: string;
  };
}

// src/services/speaking-api.ts

export async function getSpeakingCategoryDetail(slug: string) {
  const res = await api.get(`/speaking/categories/${slug}`);
  return res.data.data;
}

export async function getSpeakingCategoryLessons(
  slug: string,
  params?: {
    sort?: string;
    page?: number;
    limit?: number;
  },
) {
  const res = await api.get(`/speaking/categories/${slug}/lessons`, {
    params,
  });

  return res.data.data;
}

export type SpeakingHistoryItem = {
  id: string;
  topicTitle: string;
  type: string;
  rawType: string;
  icon: string;
  score: number;
  scoreLabel: string;
  fluency: number;
  fluencyLabel: string;
  accuracy: number;
  accuracyLabel: string;
  completedAt: string;
};

export type SpeakingHistoryResponse = {
  histories: SpeakingHistoryItem[];
  filters: {
    types: {
      label: string;
      value: string;
    }[];
    categories: {
      label: string;
      value: string;
    }[];
  };
  progress: {
    overallPercent: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  summary: {
    sessions: number;
    avgScore: number;
    avgDurationText: string;
    improvementPercent: number;
  };
  recentActivity: {
    id: string;
    title: string;
    type: string;
    score: number;
    level: string;
    date: string;
    icon: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getSpeakingHistory(params?: {
  type?: string;
  category?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get('/speaking/history', {
    params,
  });

  return res.data.data as SpeakingHistoryResponse;
}

export type SpeakingHistoryDetailResponse = {
  session: {
    id: string;
    topicTitle: string;
    lessonTitle: string;
    practiceType: string;
    rawType: string;
    icon: string;
    completedAt: string;
    durationText: string;
    status: string;
  };
  scores: {
    overallScore: number;
    fluency: number;
    pronunciation: number;
    vocabulary: number;
    grammar: number;
    content: number;
    labels: {
      overallScore: string;
      fluency: string;
      pronunciation: string;
      vocabulary: string;
      grammar: string;
      content: string;
    };
  };
  answer: {
    question: string;
    expectedText: string;
    transcript: string;
    audioUrl: string | null;
    correctedText: string;
  };
  aiFeedback: {
    feedback: string;
    strengths: string[];
    areasToImprove: string[];
    details: {
      key: string;
      title: string;
      icon: string;
      comment: string;
    }[];
  };
  summary: {
    topic: string;
    practiceType: string;
    duration: string;
    completedAt: string;
  };
  progressChart: {
    date: string;
    score: number;
  }[];
};

export async function getSpeakingHistoryDetail(id: string) {
  const res = await api.get(`/speaking/history/${id}`);
  return res.data.data as SpeakingHistoryDetailResponse;
}

export async function practiceSpeakingAgain(id: string) {
  const res = await api.post(`/speaking/history/${id}/practice-again`);
  return res.data.data as {
    sessionId: string;
    redirectUrl: string;
  };
}

export type SpeakingPracticeTypeDetailResponse = {
  header: {
    sessionId: string;
    title: string;
    description: string;
    topicTitle: string;
    lessonTitle: string;
    icon: string;
    completedAt: string;
    durationText: string;
    status: string;
  };
  recording: {
    audioUrl: string | null;
    durationText: string;
  };
  passage: {
    title: string;
    text: string;
    icon: string;
  };
  transcript: {
    text: string;
    correctedText: string;
  };
  performance: {
    overallScore: number;
    message: string;
    description: string;
    scores: {
      fluency: number;
      pronunciation: number;
      accuracy: number;
      completeness: number;
    };
    labels: {
      fluency: string;
      pronunciation: string;
      accuracy: string;
      completeness: string;
    };
  };
  detailedFeedback: {
    strengths: string[];
    areasToImprove: string[];
  };
  vocabularyHighlight: {
    word: string;
    audioUrl: string | null;
  }[];
  nextSteps: {
    title: string;
    icon: string;
    action: string;
  }[];
};

export async function getSpeakingPracticeTypeDetail(id: string) {
  const res = await api.get(`/speaking/history/${id}/practice-type-detail`);
  return res.data.data as SpeakingPracticeTypeDetailResponse;
}

export type SpeakingPracticeSession = {
  session: {
    id: string;
    status: string;
    step: number;
    startedAt: string;
    duration: number;
  };
  topic: {
    id: string;
    title: string;
    slug: string;
    categoryTitle: string;
    icon: string;
  };
  lesson: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    type: string;
    level: string;
    estimatedMinutes: number;
    prompt: string | null;
    expectedText: string;
    icon: string;
  };
  latestAnswer: null | {
    id: string;
    transcript: string;
    audioUrl: string | null;
    overallScore: number;
    feedback: string | null;
  };
  steps: { order: number; title: string; description: string }[];
  focusSkills: { title: string; description: string; icon: string }[];
  tips: { title: string; description: string; icon: string }[];
};

export type SpeakingEvaluation = {
  overallScore: number;
  pronunciation: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  confidence: number;
  correctedText: string;
  feedback: string;
  suggestions: string[];
};

export async function getSpeakingPracticeSession(sessionId: string) {
  const res = await api.get(`/speaking-practice/sessions/${sessionId}`);
  return res.data.data as SpeakingPracticeSession;
}

export async function transcribeSpeakingAudio(
  sessionId: string,
  payload: { audioUrl: string },
) {
  const res = await api.post(`/speaking-practice/sessions/${sessionId}/transcribe`, payload);
  return res.data.data as { transcript: string; audioUrl: string };
}

export async function evaluateSpeakingPractice(
  sessionId: string,
  payload: { transcript: string; audioUrl?: string },
) {
  const res = await api.post(`/speaking-practice/sessions/${sessionId}/evaluate`, payload);
  return res.data.data as { answerId: string; evaluation: SpeakingEvaluation };
}

export async function finishSpeakingPractice(sessionId: string) {
  const res = await api.post(`/speaking-practice/sessions/${sessionId}/finish-practice`);
  return res.data.data;
}

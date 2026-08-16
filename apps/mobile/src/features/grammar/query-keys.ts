export const grammarKeys = {
  all: ['grammar'] as const,
  dashboard: (level = 'ALL') => [...grammarKeys.all, 'dashboard', level] as const,
  topicLessons: (topicId?: string | null) => [...grammarKeys.all, 'topic-lessons', topicId ?? 'none'] as const,
  lesson: (lessonId?: string | null) => [...grammarKeys.all, 'lesson', lessonId ?? 'none'] as const,
};

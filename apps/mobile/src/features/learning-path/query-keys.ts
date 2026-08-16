export const learningPathKeys = {
  all: ['learning-path'] as const,
  current: () => [...learningPathKeys.all, 'current'] as const,
  lesson: (lessonId?: string | null) => [...learningPathKeys.all, 'lesson', lessonId ?? 'none'] as const,
};

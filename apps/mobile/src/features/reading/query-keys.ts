import type { ReadingArticlesParams } from './types/reading';

export const readingKeys = {
  all: ['reading'] as const,
  articles: (params?: ReadingArticlesParams) => [...readingKeys.all, 'articles', params ?? {}] as const,
  lesson: (slug?: string | null) => [...readingKeys.all, 'lesson', slug ?? 'none'] as const,
  result: (sessionId?: string | null) => [...readingKeys.all, 'result', sessionId ?? 'none'] as const,
};

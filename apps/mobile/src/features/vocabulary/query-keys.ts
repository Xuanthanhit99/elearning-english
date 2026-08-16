export const vocabularyKeys = {
  all: ['vocabulary'] as const,
  today: () => [...vocabularyKeys.all, 'today'] as const,
  stats: () => [...vocabularyKeys.all, 'stats'] as const,
  dailyWords: (dayId?: string | null) => [...vocabularyKeys.all, 'daily-words', dayId ?? 'none'] as const,
};

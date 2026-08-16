import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '../../dashboard/query-keys';
import {
  completeDailyVocabulary,
  getDailyVocabularyWords,
  getTodayVocabulary,
  getVocabularyStats,
  markVocabularyWord,
} from '../api/vocabulary-api';
import { vocabularyKeys } from '../query-keys';
import type { VocabularyStatus } from '../types/vocabulary';

export function useTodayVocabularyQuery() {
  return useQuery({
    queryKey: vocabularyKeys.today(),
    queryFn: getTodayVocabulary,
  });
}

export function useVocabularyStatsQuery() {
  return useQuery({
    queryKey: vocabularyKeys.stats(),
    queryFn: getVocabularyStats,
  });
}

export function useDailyVocabularyWordsQuery(dayId?: string | null) {
  return useQuery({
    queryKey: vocabularyKeys.dailyWords(dayId),
    queryFn: () => getDailyVocabularyWords(dayId as string),
    enabled: Boolean(dayId),
  });
}

export function useMarkVocabularyWordMutation(dayId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wordId, status }: { wordId: string; status: Extract<VocabularyStatus, 'LEARNING' | 'KNOWN' | 'REVIEW'> }) =>
      markVocabularyWord(wordId, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: vocabularyKeys.dailyWords(dayId) }),
        queryClient.invalidateQueries({ queryKey: vocabularyKeys.today() }),
        queryClient.invalidateQueries({ queryKey: vocabularyKeys.stats() }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}

export function useCompleteDailyVocabularyMutation(dayId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeDailyVocabulary(dayId as string),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: vocabularyKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}

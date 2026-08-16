import { authenticatedApiClient } from '../../../services/api/client';
import type {
  CompleteDailyVocabularyResult,
  DailyVocabularyWords,
  TodayVocabulary,
  VocabularyStats,
  VocabularyStatus,
  WordProgressResult,
} from '../types/vocabulary';

export async function getTodayVocabulary() {
  const response = await authenticatedApiClient.get<TodayVocabulary>('/vocabulary/today');
  return response.data;
}

export async function getVocabularyStats() {
  const response = await authenticatedApiClient.get<VocabularyStats>('/vocabulary/me/stats');
  return response.data;
}

export async function getDailyVocabularyWords(dayId: string) {
  const response = await authenticatedApiClient.get<DailyVocabularyWords>(
    `/vocabulary/daily/${encodeURIComponent(dayId)}/words`,
  );
  return response.data;
}

export async function markVocabularyWord(wordId: string, status: Extract<VocabularyStatus, 'LEARNING' | 'KNOWN' | 'REVIEW'>) {
  const response = await authenticatedApiClient.post<WordProgressResult>(
    `/vocabulary/words/${encodeURIComponent(wordId)}/progress`,
    { status },
  );
  return response.data;
}

export async function completeDailyVocabulary(dayId: string) {
  const response = await authenticatedApiClient.post<CompleteDailyVocabularyResult>(
    `/vocabulary/daily/${encodeURIComponent(dayId)}/complete`,
  );
  return response.data;
}

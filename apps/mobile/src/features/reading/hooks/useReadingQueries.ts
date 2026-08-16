import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '../../dashboard/query-keys';
import {
  answerReadingQuestion,
  getReadingArticles,
  getReadingLesson,
  getReadingResult,
  startReadingArticle,
  submitReadingSession,
} from '../api/reading-api';
import { readingKeys } from '../query-keys';
import type { ReadingArticlesParams } from '../types/reading';

export function useReadingArticlesQuery(params: ReadingArticlesParams = {}) {
  return useQuery({
    queryKey: readingKeys.articles(params),
    queryFn: () => getReadingArticles(params),
  });
}

export function useReadingLessonQuery(slug?: string | null) {
  return useQuery({
    queryKey: readingKeys.lesson(slug),
    queryFn: () => getReadingLesson(slug as string),
    enabled: Boolean(slug),
  });
}

export function useReadingResultQuery(sessionId?: string | null) {
  return useQuery({
    queryKey: readingKeys.result(sessionId),
    queryFn: () => getReadingResult(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

export function useStartReadingArticleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: string) => startReadingArticle(articleId),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: readingKeys.all });
    },
  });
}

export function useAnswerReadingQuestionMutation(sessionId?: string | null, slug?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, selected }: { questionId: string; selected: string }) =>
      answerReadingQuestion(sessionId as string, questionId, selected),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: readingKeys.lesson(slug) }),
        queryClient.invalidateQueries({ queryKey: readingKeys.all }),
      ]);
    },
  });
}

export function useSubmitReadingSessionMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => submitReadingSession(sessionId as string),
    retry: false,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: readingKeys.all }),
        queryClient.invalidateQueries({ queryKey: readingKeys.result(result.sessionId) }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}

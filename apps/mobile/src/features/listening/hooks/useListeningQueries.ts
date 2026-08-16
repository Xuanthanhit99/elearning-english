import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '../../dashboard/query-keys';
import {
  finishListeningSession,
  getListeningHome,
  getListeningResult,
  skipListeningQuestion,
  startListeningPractice,
  submitListeningAnswer,
} from '../api/listening-api';
import { listeningKeys } from '../query-keys';
import type { StartListeningInput, SubmitListeningAnswerInput } from '../types/listening';

export function useListeningHomeQuery() {
  return useQuery({
    queryKey: listeningKeys.home(),
    queryFn: getListeningHome,
  });
}

export function useStartListeningMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartListeningInput) => startListeningPractice(input),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: listeningKeys.home() });
    },
  });
}

export function useListeningPracticeQuery(sessionId?: string | null, input?: StartListeningInput) {
  return useQuery({
    queryKey: listeningKeys.practice(sessionId),
    queryFn: () => startListeningPractice(input ?? {}),
    enabled: Boolean(sessionId && input),
  });
}

export function useSubmitListeningAnswerMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitListeningAnswerInput) => submitListeningAnswer(sessionId as string, input),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listeningKeys.practice(sessionId) }),
        queryClient.invalidateQueries({ queryKey: listeningKeys.home() }),
      ]);
    },
  });
}

export function useSkipListeningQuestionMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { questionId: string; timeSpent: number; listenedCount: number }) =>
      skipListeningQuestion(sessionId as string, input),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listeningKeys.practice(sessionId) }),
        queryClient.invalidateQueries({ queryKey: listeningKeys.home() }),
      ]);
    },
  });
}

export function useFinishListeningSessionMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => finishListeningSession(sessionId as string),
    retry: false,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listeningKeys.all }),
        queryClient.invalidateQueries({ queryKey: listeningKeys.result(result.sessionId) }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}

export function useListeningResultQuery(sessionId?: string | null) {
  return useQuery({
    queryKey: listeningKeys.result(sessionId),
    queryFn: () => getListeningResult(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

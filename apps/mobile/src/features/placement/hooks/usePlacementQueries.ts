import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '../../dashboard/query-keys';
import {
  answerPlacementQuestion,
  generatePlacementResult,
  getPlacementIntroduction,
  getPlacementProcessing,
  getPlacementResult,
  getPlacementRetakeStatus,
  getPlacementSession,
  retakePlacement,
  skipPlacementQuestion,
  skipPlacementSpeaking,
  startPlacementProcessing,
  startPlacementTest,
  submitPlacementSpeaking,
  submitPlacementWriting,
} from '../api/placement-api';
import { placementKeys } from '../query-keys';

export function usePlacementIntroductionQuery() {
  return useQuery({
    queryKey: placementKeys.introduction(),
    queryFn: getPlacementIntroduction,
  });
}

export function usePlacementRetakeStatusQuery() {
  return useQuery({
    queryKey: placementKeys.retakeStatus(),
    queryFn: getPlacementRetakeStatus,
  });
}

export function useStartPlacementMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startPlacementTest,
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: placementKeys.all });
    },
  });
}

export function useRetakePlacementMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (force: boolean) => retakePlacement(force),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: placementKeys.all });
    },
  });
}

export function usePlacementSessionQuery(sessionId?: string | null) {
  return useQuery({
    queryKey: placementKeys.session(sessionId),
    queryFn: () => getPlacementSession(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

export function useAnswerPlacementMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { questionId: string; answer: string; spentSeconds: number }) =>
      answerPlacementQuestion(sessionId as string, payload),
    retry: false,
    onSuccess: async (data) => {
      queryClient.setQueryData(placementKeys.session(sessionId), data);
      await queryClient.invalidateQueries({ queryKey: placementKeys.introduction() });
    },
  });
}

export function useSkipPlacementQuestionMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { questionId: string; spentSeconds: number }) => skipPlacementQuestion(sessionId as string, payload),
    retry: false,
    onSuccess: async (data) => {
      queryClient.setQueryData(placementKeys.session(sessionId), data);
      await queryClient.invalidateQueries({ queryKey: placementKeys.introduction() });
    },
  });
}

export function useSubmitPlacementWritingMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { questionId: string; content: string; spentSeconds: number }) =>
      submitPlacementWriting(sessionId as string, payload),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: placementKeys.session(sessionId) });
    },
  });
}

export function useSubmitPlacementSpeakingMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { questionId: string; audioUri: string; spentSeconds: number }) =>
      submitPlacementSpeaking(sessionId as string, payload),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: placementKeys.session(sessionId) });
    },
  });
}

export function useSkipPlacementSpeakingMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { questionId: string; action: 'SKIPPED' | 'DEFERRED'; spentSeconds: number }) =>
      skipPlacementSpeaking(sessionId as string, payload),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: placementKeys.session(sessionId) });
    },
  });
}

export function useStartPlacementProcessingMutation(testId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startPlacementProcessing(testId as string),
    retry: false,
    onSuccess: (data) => {
      queryClient.setQueryData(placementKeys.processing(testId), data);
    },
  });
}

export function usePlacementProcessingQuery(testId?: string | null) {
  return useQuery({
    queryKey: placementKeys.processing(testId),
    queryFn: () => getPlacementProcessing(testId as string),
    enabled: Boolean(testId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'WAITING' || status === 'PROCESSING' ? 1800 : false;
    },
  });
}

export function useGeneratePlacementResultMutation(testId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generatePlacementResult(testId as string),
    retry: false,
    onSuccess: async (data) => {
      queryClient.setQueryData(placementKeys.result(testId), data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: placementKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['learning-path'] }),
      ]);
    },
  });
}

export function usePlacementResultQuery(testId?: string | null) {
  return useQuery({
    queryKey: placementKeys.result(testId),
    queryFn: () => getPlacementResult(testId as string),
    enabled: Boolean(testId),
  });
}

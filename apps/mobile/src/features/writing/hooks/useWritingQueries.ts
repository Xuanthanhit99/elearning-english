import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '../../dashboard/query-keys';
import {
  getWritingHome,
  getWritingResult,
  getWritingSession,
  getWritingStatus,
  retryWritingProcessing,
  saveWritingDraft,
  startWritingLesson,
  submitWritingSession,
} from '../api/writing-api';
import { writingKeys } from '../query-keys';

export function useWritingHomeQuery() {
  return useQuery({
    queryKey: writingKeys.home(),
    queryFn: getWritingHome,
  });
}

export function useStartWritingLessonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => startWritingLesson(lessonId),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: writingKeys.home() });
    },
  });
}

export function useWritingSessionQuery(sessionId?: string | null) {
  return useQuery({
    queryKey: writingKeys.session(sessionId),
    queryFn: () => getWritingSession(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

export function useSaveWritingDraftMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, timeSpentSeconds }: { content: string; timeSpentSeconds: number }) =>
      saveWritingDraft(sessionId as string, content, timeSpentSeconds),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: writingKeys.session(sessionId) }),
        queryClient.invalidateQueries({ queryKey: writingKeys.home() }),
      ]);
    },
  });
}

export function useSubmitWritingMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, timeSpentSeconds }: { content: string; timeSpentSeconds: number }) =>
      submitWritingSession(sessionId as string, content, timeSpentSeconds),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: writingKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}

export function useWritingStatusQuery(sessionId?: string | null) {
  return useQuery({
    queryKey: writingKeys.status(sessionId),
    queryFn: () => getWritingStatus(sessionId as string),
    enabled: Boolean(sessionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'QUEUED' || status === 'PROCESSING') return 1800;
      return false;
    },
  });
}

export function useRetryWritingProcessingMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => retryWritingProcessing(sessionId as string),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: writingKeys.status(sessionId) });
    },
  });
}

export function useWritingResultQuery(sessionId?: string | null) {
  return useQuery({
    queryKey: writingKeys.result(sessionId),
    queryFn: () => getWritingResult(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCompanionSession,
  getCompanionMessages,
  getCompanionPetStatus,
  sendCompanionMessage,
} from '../api/companion-api';
import { companionKeys } from '../query-keys';
import type { SendCompanionMessageInput } from '../types/companion';
import {
  getStoredCompanionSessionId,
  setStoredCompanionSessionId,
} from '../utils/companion-session-storage';

export function useStoredCompanionSessionQuery() {
  return useQuery({
    queryKey: companionKeys.conversations(),
    queryFn: getStoredCompanionSessionId,
    staleTime: Infinity,
  });
}

export function useCompanionPetQuery() {
  return useQuery({
    queryKey: companionKeys.pet(),
    queryFn: getCompanionPetStatus,
  });
}

export function useCompanionMessagesQuery(sessionId?: string | null) {
  return useQuery({
    queryKey: companionKeys.messages(sessionId),
    queryFn: () => getCompanionMessages(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

export function useCreateCompanionSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCompanionSession,
    retry: false,
    onSuccess: async ({ id }) => {
      await setStoredCompanionSessionId(id);
      queryClient.setQueryData(companionKeys.conversations(), id);
    },
  });
}

export function useSendCompanionMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendCompanionMessageInput) => sendCompanionMessage(input),
    retry: false,
    onSuccess: async (response) => {
      await setStoredCompanionSessionId(response.sessionId);
      queryClient.setQueryData(companionKeys.conversations(), response.sessionId);
      queryClient.setQueryData(companionKeys.pet(), response.petStatus);
      await queryClient.invalidateQueries({
        queryKey: companionKeys.messages(response.sessionId),
      });
    },
  });
}

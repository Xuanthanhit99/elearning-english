import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getArenaLobby,
  getArenaRoom,
  getCurrentArenaSeason,
  joinArenaQueue,
  joinArenaRoom,
  leaveArenaQueue,
  leaveArenaRoom,
  retryArenaRoom,
  setArenaReady,
  submitArenaAnswer,
} from '../api/arena-api';
import { arenaKeys } from '../query-keys';
import type { ArenaQueueInput, ArenaRoom } from '../types/arena';

export function useArenaLobbyQuery() {
  return useQuery({
    queryKey: arenaKeys.lobby(),
    queryFn: getArenaLobby,
  });
}

export function useArenaSeasonQuery() {
  return useQuery({
    queryKey: arenaKeys.season(),
    queryFn: getCurrentArenaSeason,
    retry: false,
  });
}

export function useArenaRoomQuery(roomId?: string | null) {
  return useQuery({
    queryKey: arenaKeys.room(roomId),
    queryFn: () => getArenaRoom(roomId!),
    enabled: Boolean(roomId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PLAYING' || status === 'PREPARING' ? 10000 : false;
    },
  });
}

export function useJoinArenaQueueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ArenaQueueInput) => joinArenaQueue(input),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: arenaKeys.lobby() });
    },
  });
}

export function useLeaveArenaQueueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveArenaQueue,
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: arenaKeys.lobby() });
    },
  });
}

export function useJoinArenaRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinArenaRoom,
    retry: false,
    onSuccess: (room) => {
      cacheRoom(queryClient, room);
      void queryClient.invalidateQueries({ queryKey: arenaKeys.lobby() });
    },
  });
}

export function useSetArenaReadyMutation(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ready: boolean) => setArenaReady(roomId, ready),
    retry: false,
    onSuccess: (room) => cacheRoom(queryClient, room),
  });
}

export function useLeaveArenaRoomMutation(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveArenaRoom(roomId),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: arenaKeys.lobby() });
      void queryClient.invalidateQueries({ queryKey: arenaKeys.room(roomId) });
    },
  });
}

export function useRetryArenaRoomMutation(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => retryArenaRoom(roomId),
    retry: false,
    onSuccess: (room) => cacheRoom(queryClient, room),
  });
}

export function useSubmitArenaAnswerMutation(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      submitArenaAnswer(roomId, questionId, answer),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: arenaKeys.room(roomId) });
    },
  });
}

function cacheRoom(queryClient: ReturnType<typeof useQueryClient>, room: ArenaRoom) {
  queryClient.setQueryData(arenaKeys.room(room.id), room);
}

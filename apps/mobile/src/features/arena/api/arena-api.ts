import { authenticatedApiClient } from '../../../services/api/client';
import type {
  ArenaLobby,
  ArenaQueueInput,
  ArenaQueueResponse,
  ArenaRoom,
  ArenaSeason,
  SubmitArenaAnswerResponse,
} from '../types/arena';

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(response: { data: ApiResponse<T> | T }) {
  return ((response.data as ApiResponse<T>).data ?? response.data) as T;
}

export async function getArenaLobby() {
  return unwrap<ArenaLobby>(await authenticatedApiClient.get('/arena/lobby'));
}

export async function getCurrentArenaSeason() {
  return unwrap<ArenaSeason>(await authenticatedApiClient.get('/arena/season/current'));
}

export async function getArenaRoom(roomId: string) {
  return unwrap<ArenaRoom>(await authenticatedApiClient.get(`/arena/rooms/${roomId}`));
}

export async function joinArenaQueue(input: ArenaQueueInput) {
  return unwrap<ArenaQueueResponse>(await authenticatedApiClient.post('/arena/queue', input));
}

export async function leaveArenaQueue() {
  return unwrap<void>(await authenticatedApiClient.post('/arena/queue/leave', {}));
}

export async function joinArenaRoom(roomId: string) {
  return unwrap<ArenaRoom>(await authenticatedApiClient.post(`/arena/rooms/${roomId}/join`, {}));
}

export async function setArenaReady(roomId: string, ready: boolean) {
  return unwrap<ArenaRoom>(await authenticatedApiClient.post(`/arena/rooms/${roomId}/ready`, { ready }));
}

export async function leaveArenaRoom(roomId: string) {
  return unwrap<void>(await authenticatedApiClient.post(`/arena/rooms/${roomId}/leave`, {}));
}

export async function retryArenaRoom(roomId: string) {
  return unwrap<ArenaRoom>(await authenticatedApiClient.post(`/arena/rooms/${roomId}/retry`, {}));
}

export async function submitArenaAnswer(roomId: string, questionId: string, answer: string) {
  return unwrap<SubmitArenaAnswerResponse>(
    await authenticatedApiClient.post(`/arena/rooms/${roomId}/questions/${questionId}/answer`, {
      answer,
    }),
  );
}

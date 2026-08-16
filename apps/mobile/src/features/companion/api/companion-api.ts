import { authenticatedApiClient } from '../../../services/api/client';
import type {
  CompanionMessage,
  CompanionPetStatus,
  SendCompanionMessageInput,
  SendCompanionMessageResponse,
} from '../types/companion';

export async function createCompanionSession() {
  const response = await authenticatedApiClient.post<{ id: string }>('/chat-session/sessions');
  return response.data;
}

export async function getCompanionMessages(sessionId: string) {
  const response = await authenticatedApiClient.get<CompanionMessage[]>(
    `/chat-session/sessions/${encodeURIComponent(sessionId)}/messages`,
  );
  return response.data;
}

export async function sendCompanionMessage(input: SendCompanionMessageInput) {
  const response = await authenticatedApiClient.post<SendCompanionMessageResponse>(
    '/chat-session/message',
    input,
  );
  return response.data;
}

export async function getCompanionPetStatus() {
  const response = await authenticatedApiClient.get<CompanionPetStatus>('/chat-session/pet');
  return response.data;
}

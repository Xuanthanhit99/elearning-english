import { authenticatedApiClient } from '../../../services/api/client';
import type {
  ListeningAnswerResult,
  ListeningFinishResult,
  ListeningHomeResponse,
  ListeningPractice,
  ListeningResultResponse,
  ListeningSkipResult,
  StartListeningInput,
  SubmitListeningAnswerInput,
} from '../types/listening';

export async function getListeningHome() {
  const response = await authenticatedApiClient.get<ListeningHomeResponse>('/listening/home');
  return response.data;
}

export async function startListeningPractice(input: StartListeningInput = {}) {
  const response = await authenticatedApiClient.post<ListeningPractice>('/listening/practice/start', {
    level: input.level ?? undefined,
    topic: input.topic ?? undefined,
    limit: input.limit ?? undefined,
  });
  return response.data;
}

export async function submitListeningAnswer(sessionId: string, input: SubmitListeningAnswerInput) {
  const response = await authenticatedApiClient.post<ListeningAnswerResult>(
    `/listening/sessions/${encodeURIComponent(sessionId)}/answer`,
    input,
  );
  return response.data;
}

export async function skipListeningQuestion(
  sessionId: string,
  input: { questionId: string; timeSpent: number; listenedCount: number },
) {
  const response = await authenticatedApiClient.post<ListeningSkipResult>(
    `/listening/sessions/${encodeURIComponent(sessionId)}/skip`,
    input,
  );
  return response.data;
}

export async function finishListeningSession(sessionId: string) {
  const response = await authenticatedApiClient.post<ListeningFinishResult>(
    `/listening/sessions/${encodeURIComponent(sessionId)}/finish`,
  );
  return response.data;
}

export async function getListeningResult(sessionId: string) {
  const response = await authenticatedApiClient.get<ListeningResultResponse>(
    `/listening/sessions/${encodeURIComponent(sessionId)}/result`,
  );
  return response.data;
}

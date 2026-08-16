import { authenticatedApiClient } from '../../../services/api/client';
import type {
  CefrLevel,
  PlacementIntroduction,
  PlacementProcessingSnapshot,
  PlacementResult,
  PlacementRetakeStatus,
  PlacementSession,
  StartPlacementResult,
} from '../types/placement';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export async function getPlacementIntroduction() {
  const response = await authenticatedApiClient.get<ApiEnvelope<PlacementIntroduction>>('/placement/introduction');
  return response.data.data;
}

export async function getPlacementRetakeStatus() {
  const response = await authenticatedApiClient.get<ApiEnvelope<PlacementRetakeStatus>>('/placement/retake/status');
  return response.data.data;
}

export async function startPlacementTest() {
  const response = await authenticatedApiClient.post<ApiEnvelope<StartPlacementResult>>('/placement/session/start', {
    mode: 'ADAPTIVE',
  });
  return response.data.data;
}

export async function retakePlacement(force = false) {
  const response = await authenticatedApiClient.post<ApiEnvelope<StartPlacementResult | { testId: string; nextUrl: string }>>(
    '/placement/retake',
    { force },
  );
  return response.data.data;
}

export async function selectManualPlacementLevel(level: CefrLevel) {
  const response = await authenticatedApiClient.post('/placement/manual', { level });
  return response.data;
}

export async function getPlacementSession(sessionId: string) {
  const response = await authenticatedApiClient.get<ApiEnvelope<PlacementSession>>(`/placement-test/${encodeURIComponent(sessionId)}`);
  return response.data.data;
}

export async function answerPlacementQuestion(
  sessionId: string,
  payload: { questionId: string; answer: string; spentSeconds: number },
) {
  const response = await authenticatedApiClient.post<ApiEnvelope<PlacementSession>>(
    `/placement-test/${encodeURIComponent(sessionId)}/answer`,
    payload,
  );
  return response.data.data;
}

export async function skipPlacementQuestion(sessionId: string, payload: { questionId: string; spentSeconds: number }) {
  const response = await authenticatedApiClient.post<ApiEnvelope<PlacementSession>>(
    `/placement-test/${encodeURIComponent(sessionId)}/skip`,
    payload,
  );
  return response.data.data;
}

export async function submitPlacementWriting(
  sessionId: string,
  payload: { questionId: string; content: string; spentSeconds: number },
) {
  const response = await authenticatedApiClient.post(
    `/placement/tests/${encodeURIComponent(sessionId)}/writing`,
    payload,
  );
  return response.data;
}

export async function skipPlacementSpeaking(
  sessionId: string,
  payload: { questionId: string; action: 'SKIPPED' | 'DEFERRED'; spentSeconds: number },
) {
  const response = await authenticatedApiClient.post(
    `/placement/tests/${encodeURIComponent(sessionId)}/speaking/skip`,
    payload,
  );
  return response.data;
}

export async function submitPlacementSpeaking(
  sessionId: string,
  payload: { questionId: string; audioUri: string; spentSeconds: number },
) {
  const form = new FormData();
  form.append('questionId', payload.questionId);
  form.append('spentSeconds', String(payload.spentSeconds));
  form.append('audio', {
    uri: payload.audioUri,
    name: `placement-speaking-${Date.now()}.m4a`,
    type: 'audio/mp4',
  } as unknown as Blob);

  const response = await authenticatedApiClient.post(`/placement/tests/${encodeURIComponent(sessionId)}/speaking`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function startPlacementProcessing(testId: string) {
  const response = await authenticatedApiClient.post<ApiEnvelope<PlacementProcessingSnapshot>>(
    `/placement/tests/${encodeURIComponent(testId)}/processing/start`,
  );
  return response.data.data;
}

export async function getPlacementProcessing(testId: string) {
  const response = await authenticatedApiClient.get<ApiEnvelope<PlacementProcessingSnapshot>>(
    `/placement/tests/${encodeURIComponent(testId)}/processing`,
  );
  return response.data.data;
}

export async function generatePlacementResult(testId: string) {
  const response = await authenticatedApiClient.post<ApiEnvelope<PlacementResult>>(
    `/placement/tests/${encodeURIComponent(testId)}/result/generate`,
  );
  return response.data.data;
}

export async function getPlacementResult(testId: string) {
  const response = await authenticatedApiClient.get<ApiEnvelope<PlacementResult>>(
    `/placement/tests/${encodeURIComponent(testId)}/result`,
  );
  return response.data.data;
}

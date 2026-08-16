import { authenticatedApiClient } from '../../../services/api/client';
import type {
  StartWritingLessonResult,
  WritingHomeResponse,
  WritingProcessingStatus,
  WritingResultResponse,
  WritingSessionResponse,
  WritingSubmitResult,
} from '../types/writing';

export async function getWritingHome() {
  const response = await authenticatedApiClient.get<WritingHomeResponse>('/writing/home');
  return response.data;
}

export async function startWritingLesson(lessonId: string) {
  const response = await authenticatedApiClient.post<StartWritingLessonResult>(
    `/writing/lessons/${encodeURIComponent(lessonId)}/start`,
  );
  return response.data;
}

export async function getWritingSession(sessionId: string) {
  const response = await authenticatedApiClient.get<WritingSessionResponse>(
    `/writing/sessions/${encodeURIComponent(sessionId)}`,
  );
  return response.data;
}

export async function saveWritingDraft(sessionId: string, content: string, timeSpentSeconds: number) {
  const response = await authenticatedApiClient.post(
    `/writing/sessions/${encodeURIComponent(sessionId)}/save`,
    { content, timeSpentSeconds },
  );
  return response.data;
}

export async function submitWritingSession(sessionId: string, content: string, timeSpentSeconds: number) {
  const response = await authenticatedApiClient.post<WritingSubmitResult>(
    `/writing/sessions/${encodeURIComponent(sessionId)}/submit`,
    { content, timeSpentSeconds },
  );
  return response.data;
}

export async function getWritingStatus(sessionId: string) {
  const response = await authenticatedApiClient.get<WritingProcessingStatus>(
    `/writing/sessions/${encodeURIComponent(sessionId)}/status`,
  );
  return response.data;
}

export async function getWritingResult(sessionId: string) {
  const response = await authenticatedApiClient.get<WritingResultResponse>(
    `/writing/sessions/${encodeURIComponent(sessionId)}/result`,
  );
  return response.data;
}

export async function retryWritingProcessing(sessionId: string) {
  const response = await authenticatedApiClient.post<WritingSubmitResult>(
    `/writing/sessions/${encodeURIComponent(sessionId)}/retry-processing`,
  );
  return response.data;
}

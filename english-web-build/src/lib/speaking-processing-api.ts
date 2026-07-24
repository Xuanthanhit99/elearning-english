import { api } from '@/src/lib/axios';
import type { ApiEnvelope, SpeakingPracticeDetail, SpeakingProcessingStatus, SpeakingResultResponse, SpeakingRetryProcessingResponse, SpeakingUploadResponse } from './speaking-processing.types';

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  return typeof value === 'object' && value !== null && 'data' in value
    ? (value as ApiEnvelope<T>).data
    : (value as T);
}

export async function getSpeakingPractice(sessionId: string) {
  const response = await api.get(`/speaking/practice/${sessionId}`);
  return unwrap<SpeakingPracticeDetail>(response.data);
}

export async function uploadSpeakingAudio(input: {
  sessionId: string; audioBlob: Blob; question: string;
  expectedText?: string; duration: number;
}) {
  const formData = new FormData();
  formData.append('audio', input.audioBlob, 'speaking.webm');
  formData.append('question', input.question);
  if (input.expectedText) formData.append('expectedText', input.expectedText);
  formData.append('duration', String(input.duration));
  const response = await api.post(`/speaking/sessions/${input.sessionId}/upload`, formData);
  return unwrap<SpeakingUploadResponse>(response.data);
}

export async function getSpeakingProcessingStatus(
  sessionId: string,
  signal?: AbortSignal,
) {
  const response = await api.get(`/speaking/sessions/${sessionId}/status`, {
    signal,
  });
  return unwrap<SpeakingProcessingStatus>(response.data);
}

export async function retrySpeakingProcessing(sessionId: string) {
  const response = await api.post(`/speaking/sessions/${sessionId}/retry-processing`);
  return unwrap<SpeakingRetryProcessingResponse>(response.data);
}

export async function getSpeakingResult(sessionId: string) {
  const response = await api.get(`/speaking/sessions/${sessionId}/result`);
  return unwrap<SpeakingResultResponse>(response.data);
}

export async function practiceSpeakingAgain(sessionId: string) {
  const response = await api.post(`/speaking/history/${sessionId}/practice-again`);
  return unwrap<{ sessionId: string; redirectUrl: string }>(response.data);
}

import { api } from "./axios";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function submitPlacementSpeaking(
  sessionId: string,
  payload: {
    questionId: string;
    audio: Blob;
    spentSeconds: number;
  },
) {
  const formData = new FormData();

  formData.append('questionId', payload.questionId);
  formData.append('spentSeconds', String(payload.spentSeconds));
  formData.append(
    'audio',
    payload.audio,
    `placement-speaking-${Date.now()}.webm`,
  );

  const response = await api.post<
    ApiResponse<{
      questionId: string;
      audioUrl: string;
      evaluationStatus: 'PENDING';
      includedInOverallScore: true;
      nextQuestion: {
        questionId: string;
        order: number;
      } | null;
      savedAt: string;
    }>
  >(`/placement/tests/${sessionId}/speaking`, formData);

  return response.data.data;
}

export async function skipPlacementSpeaking(
  sessionId: string,
  payload: {
    questionId: string;
    action: 'SKIPPED' | 'DEFERRED';
    spentSeconds: number;
  },
) {
  const response = await api.post<
    ApiResponse<{
      questionId: string;
      action: 'SKIPPED' | 'DEFERRED';
      score: 0;
      evaluationStatus: 'NOT_EVALUATED';
      includedInOverallScore: false;
      pendingAssessment: boolean;
      nextQuestion: {
        questionId: string;
        order: number;
      } | null;
      savedAt: string;
    }>
  >(`/placement/tests/${sessionId}/speaking/skip`, payload);

  return response.data.data;
}

export async function submitPlacementWriting(
  sessionId: string,
  payload: {
    questionId: string;
    content: string;
    spentSeconds: number;
  },
) {
  const response = await api.post<
    ApiResponse<{
      questionId: string;
      wordCount: number;
      evaluationStatus: 'PENDING';
      includedInOverallScore: true;
      nextQuestion: {
        questionId: string;
        order: number;
      } | null;
      savedAt: string;
    }>
  >(`/placement/tests/${sessionId}/writing`, payload);

  return response.data.data;
}

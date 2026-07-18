import { api } from './axios';
import type { WritingProcessingStatus } from './writing-processing.types';

export async function getWritingProcessingStatus(sessionId: string) {
  const { data } = await api.get<WritingProcessingStatus>(
    `/writing/sessions/${sessionId}/status`,
  );

  return data;
}

export async function retryWritingProcessing(sessionId: string) {
  const { data } = await api.post<{
    sessionId: string;
    processingJobId?: string | null;
    status: string;
    processingUrl?: string | null;
    resultUrl?: string | null;
  }>(`/writing/sessions/${sessionId}/retry-processing`);

  return data;
}

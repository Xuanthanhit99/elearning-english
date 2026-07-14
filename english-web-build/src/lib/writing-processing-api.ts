import { api } from './axios';
import type { WritingProcessingStatus } from './writing-processing.types';

export async function getWritingProcessingStatus(sessionId: string) {
  const { data } = await api.get<WritingProcessingStatus>(
    `/writing/sessions/${sessionId}/status`,
  );

  return data;
}

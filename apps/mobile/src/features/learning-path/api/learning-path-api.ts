import { authenticatedApiClient } from '../../../services/api/client';
import type { LearningPathData, LearningPathLessonActionResult } from '../types/learning-path';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

export async function getLearningPath() {
  const response = await authenticatedApiClient.get<ApiEnvelope<LearningPathData>>('/learning-path');
  return response.data.data;
}

export async function startLearningPathLesson(lessonId: string) {
  const response = await authenticatedApiClient.post<ApiEnvelope<LearningPathLessonActionResult>>(
    `/learning-path/lessons/${encodeURIComponent(lessonId)}/start`,
  );
  return response.data.data;
}

export async function resumeLearningPathLesson(lessonId: string) {
  const response = await authenticatedApiClient.get<ApiEnvelope<LearningPathLessonActionResult>>(
    `/learning-path/lessons/${encodeURIComponent(lessonId)}/resume`,
  );
  return response.data.data;
}

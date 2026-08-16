import { authenticatedApiClient } from '../../../services/api/client';
import type {
  CompleteGrammarResult,
  GrammarDashboard,
  GrammarLessonLearning,
  GrammarLessonListItem,
  SubmitGrammarResult,
} from '../types/grammar';

export async function getGrammarDashboard(level = 'ALL') {
  const response = await authenticatedApiClient.get<GrammarDashboard>('/grammar/dashboard', {
    params: level === 'ALL' ? undefined : { level },
  });
  return response.data;
}

export async function getGrammarTopicLessons(topicId: string) {
  const response = await authenticatedApiClient.get<GrammarLessonListItem[]>(
    `/grammar/topics/${encodeURIComponent(topicId)}/lessons`,
  );
  return response.data;
}

export async function startGrammarLesson(lessonId: string) {
  const response = await authenticatedApiClient.post(`/grammar/lessons/${encodeURIComponent(lessonId)}/start`);
  return response.data;
}

export async function getGrammarLessonLearning(lessonId: string) {
  const response = await authenticatedApiClient.get<GrammarLessonLearning>(
    `/grammar/lessons/${encodeURIComponent(lessonId)}/learning`,
  );
  return response.data;
}

export async function submitGrammarLesson(
  lessonId: string,
  answers: Array<{ questionId: string; answer: string }>,
) {
  const response = await authenticatedApiClient.post<SubmitGrammarResult>(
    `/grammar/lessons/${encodeURIComponent(lessonId)}/submit`,
    { answers },
  );
  return response.data;
}

export async function completeGrammarLesson(lessonId: string) {
  const response = await authenticatedApiClient.post<CompleteGrammarResult>(
    `/grammar/lessons/${encodeURIComponent(lessonId)}/complete`,
  );
  return response.data;
}

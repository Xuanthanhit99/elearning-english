import { authenticatedApiClient } from '../../../services/api/client';
import type {
  ReadingAnswerResult,
  ReadingArticlesParams,
  ReadingArticlesResponse,
  ReadingLessonResponse,
  ReadingResultResponse,
  ReadingSubmitResult,
  StartReadingSessionResult,
} from '../types/reading';

export async function getReadingArticles(params: ReadingArticlesParams = {}) {
  const response = await authenticatedApiClient.get<ReadingArticlesResponse>('/reading/articles', {
    params,
  });
  return response.data;
}

export async function getReadingLesson(slug: string) {
  const response = await authenticatedApiClient.get<ReadingLessonResponse>(
    `/reading/articles/${encodeURIComponent(slug)}`,
  );
  return response.data;
}

export async function startReadingArticle(articleId: string) {
  const response = await authenticatedApiClient.post<StartReadingSessionResult>(
    `/reading/articles/${encodeURIComponent(articleId)}/start`,
  );
  return response.data;
}

export async function answerReadingQuestion(sessionId: string, questionId: string, selected: string) {
  const response = await authenticatedApiClient.post<ReadingAnswerResult>(
    `/reading/sessions/${encodeURIComponent(sessionId)}/answer`,
    { questionId, selected },
  );
  return response.data;
}

export async function submitReadingSession(sessionId: string) {
  const response = await authenticatedApiClient.post<ReadingSubmitResult>(
    `/reading/sessions/${encodeURIComponent(sessionId)}/submit`,
  );
  return response.data;
}

export async function getReadingResult(sessionId: string) {
  const response = await authenticatedApiClient.get<ReadingResultResponse>(
    `/reading/sessions/${encodeURIComponent(sessionId)}/result`,
  );
  return response.data;
}

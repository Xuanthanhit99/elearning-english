import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '../../dashboard/query-keys';
import {
  completeGrammarLesson,
  getGrammarDashboard,
  getGrammarLessonLearning,
  getGrammarTopicLessons,
  startGrammarLesson,
  submitGrammarLesson,
} from '../api/grammar-api';
import { grammarKeys } from '../query-keys';

export function useGrammarDashboardQuery(level = 'ALL') {
  return useQuery({
    queryKey: grammarKeys.dashboard(level),
    queryFn: () => getGrammarDashboard(level),
  });
}

export function useGrammarTopicLessonsQuery(topicId?: string | null) {
  return useQuery({
    queryKey: grammarKeys.topicLessons(topicId),
    queryFn: () => getGrammarTopicLessons(topicId as string),
    enabled: Boolean(topicId),
  });
}

export function useGrammarLessonQuery(lessonId?: string | null) {
  return useQuery({
    queryKey: grammarKeys.lesson(lessonId),
    queryFn: async () => {
      await startGrammarLesson(lessonId as string);
      return getGrammarLessonLearning(lessonId as string);
    },
    enabled: Boolean(lessonId),
  });
}

export function useSubmitGrammarLessonMutation(lessonId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (answers: Array<{ questionId: string; answer: string }>) =>
      submitGrammarLesson(lessonId as string, answers),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: grammarKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}

export function useCompleteGrammarLessonMutation(lessonId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeGrammarLesson(lessonId as string),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: grammarKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}

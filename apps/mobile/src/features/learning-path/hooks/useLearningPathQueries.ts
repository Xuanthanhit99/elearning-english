import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '../../dashboard/query-keys';
import { getLearningPath, resumeLearningPathLesson, startLearningPathLesson } from '../api/learning-path-api';
import { learningPathKeys } from '../query-keys';

export function useLearningPathQuery() {
  return useQuery({
    queryKey: learningPathKeys.current(),
    queryFn: getLearningPath,
  });
}

export function useStartLearningPathLessonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => startLearningPathLesson(lessonId),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: learningPathKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
}

export function useResumeLearningPathLessonQuery(lessonId?: string | null) {
  return useQuery({
    queryKey: learningPathKeys.lesson(lessonId),
    queryFn: () => resumeLearningPathLesson(lessonId as string),
    enabled: Boolean(lessonId),
  });
}

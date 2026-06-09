import axiosClient from "./axiosClient";

export const learningApi = {
  getLessonDetail: (lessonId: string) =>
    axiosClient.get(`/learning/lessons/${lessonId}`),

  completeLesson: (lessonId: string) =>
    axiosClient.post(`/progress/lessons/${lessonId}/complete`),
};
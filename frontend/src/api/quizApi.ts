import axiosClient from "./axiosClient";

export const quizApi = {
  createQuiz: (lessonId: string, data: any) =>
    axiosClient.post(`/lessons/${lessonId}/quizzes`, data),

  getLessonQuizzes: (lessonId: string) =>
    axiosClient.get(`/lessons/${lessonId}/quizzes`),

  submitQuiz: (data: any) => axiosClient.post("/quizzes/submit", data),
};
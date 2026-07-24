import { api } from "@/src/lib/axios";

export type BuilderForm = {
  goal: string;
  audienceAge?: string;
  level?: string;
  dailyMinutes?: number;
  totalDays?: number;
  interests?: string[];
  focusSkills?: string[];
};

export type BuilderLesson = {
  title: string;
  goal?: string;
  duration?: number;
  skills?: string[];
};

export type BuilderModule = {
  title: string;
  description?: string;
  lessons: BuilderLesson[];
};

export type BuilderOutline = {
  title: string;
  description: string;
  level: string;
  estimatedMinutes: number;
  modules: BuilderModule[];
};

export const lessonBuilderApi = {
  createOutline: (payload: BuilderForm) =>
    api.post("/lesson-builder/outline", payload),
  listProjects: () => api.get("/lesson-builder/projects"),
  getProject: (projectId: string) =>
    api.get(`/lesson-builder/projects/${projectId}`),
  updateOutline: (projectId: string, outline: BuilderOutline) =>
    api.patch(`/lesson-builder/projects/${projectId}/outline`, { outline }),
  confirmOutline: (projectId: string) =>
    api.post(`/lesson-builder/projects/${projectId}/confirm-outline`),
  generateContent: (projectId: string, lessonId?: string, signal?: AbortSignal) =>
    api.post(
      `/lesson-builder/projects/${projectId}/generate-content`,
      { lessonId },
      { signal },
    ),
  getCourse: (courseId: string) =>
    api.get(`/lesson-builder/courses/${courseId}`),
  getLessonQuizzes: (lessonId: string) =>
    api.get(`/lessons/${lessonId}/quizzes`),
  submitQuiz: (answers: Array<{ quizId: string; answer: string }>) =>
    api.post("/quizzes/submit", { answers }),
  completeLesson: (lessonId: string) =>
    api.post(`/progress/lessons/${lessonId}/complete`),
};

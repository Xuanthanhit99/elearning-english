import axiosClient from "./axiosClient";

export const courseApi = {
  getMyCourse: async () => {
    return axiosClient.get("/courses/my-courses");
  },

  createCourse: async (data: any) => {
    return axiosClient.post("/courses", data);
  },

  getCourseDetail: (id: string) => {
    return axiosClient.get(`/courses/${id}`)
  },

  createSection: async (courseId: string, data: any) => {
    return axiosClient.post(`/courses/${courseId}/sections`, data);
  },

  createLesson: async (sectionId: string, data: any) => {
    return axiosClient.post(`/sections/${sectionId}/lessons`, data);
  },

  submitCourse: async (courseId: string) => {
    return axiosClient.patch(`/courses/${courseId}/submit`);
  },

  updateCourse: async (courseId: string, data: any) => {
    return axiosClient.patch(`/courses/${courseId}`, data)
  },

  updateLesson: async (lessonId: string, data: any) => {
    return axiosClient.patch(`/lessons/${lessonId}`, data)
  },
};

import axiosClient from "./axiosClient";

export const enrollmentApi = {
  enrollFreeCourse: (courseId: string) =>
    axiosClient.post(`/enrollments/free/${courseId}`),

  getMyCourses: () => axiosClient.get("/enrollments/my-courses"),

  checkEnrollment: (courseId: string) =>
    axiosClient.get(`/enrollments/check/${courseId}`),
};
import axiosClient from "./axiosClient";

export const progressApi = {
  getCourseProgress: (courseId: string) =>
    axiosClient.get(`/progress/courses/${courseId}`),
};
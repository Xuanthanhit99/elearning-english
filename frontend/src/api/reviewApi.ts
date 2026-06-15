import axiosClient from "./axiosClient";

export const reviewApi = {
  createOrUpdate: (courseId: string, data: any) =>
    axiosClient.post(`/reviews/courses/${courseId}`, data),

  getCourseReviews: (courseId: string) =>
    axiosClient.get(`/reviews/courses/${courseId}`),
};
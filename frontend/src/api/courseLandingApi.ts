import axiosClient from './axiosClient';

export const courseLandingApi = {
  getLanding: (courseId: string) =>
    axiosClient.get(`/courses/${courseId}/landing`),

  updateLanding: (courseId: string, data: any) =>
    axiosClient.patch(`/courses/${courseId}/landing`, data),
};
import axiosClient from './axiosClient';

export const adminApi = {
  getPendingCourses: () => axiosClient.get('/courses/admin/pending'),

  approveCourse: (courseId: string) =>
    axiosClient.patch(`/courses/${courseId}/approve`),

  rejectCourse: (courseId: string) =>
    axiosClient.patch(`/courses/${courseId}/reject`),
};
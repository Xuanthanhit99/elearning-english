import axiosClient from './axiosClient';

export const publicCourseApi = {
  getCourses: () => axiosClient.get('/courses/public/list'),

  getCourseDetail: (slug: string) =>
    axiosClient.get(`/courses/public/${slug}`),
};
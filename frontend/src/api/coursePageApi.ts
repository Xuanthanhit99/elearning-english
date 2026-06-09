import axiosClient from './axiosClient';

export const coursePageApi = {
  getPage: (courseId: string) =>
    axiosClient.get(`/courses/${courseId}/page`),

  updatePage: (courseId: string, blocks: any[]) =>
    axiosClient.patch(`/courses/${courseId}/page`, {
      blocks,
    }),
};
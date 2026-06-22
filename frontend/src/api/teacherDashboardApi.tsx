import axiosClient from './axiosClient';

export const teacherDashboardApi = {
  getRevenue: () => axiosClient.get('/teacher-dashboard/revenue'),
};
import axiosClient from './axiosClient';

export const adminDashboardApi = {
  getRevenue: () => axiosClient.get('/admin-dashboard/revenue'),
};
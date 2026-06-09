import axiosClient from './axiosClient';

export const authApi = {
  logout: () => axiosClient.post('/auth/logout'),
};
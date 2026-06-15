import axiosClient from './axiosClient';

export const orderApi = {
  createOrder: (courseId: string) =>
    axiosClient.post(`/orders/courses/${courseId}`),

  getMyOrders: () => axiosClient.get('/orders/my'),
};
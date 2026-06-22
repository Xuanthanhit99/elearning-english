import axiosClient from "./axiosClient";

export const orderApi = {
  createOrder: (courseId: string, data?: any) =>
    axiosClient.post(`/orders/courses/${courseId}`, data),

  getMyOrders: () => axiosClient.get("/orders/my"),
};

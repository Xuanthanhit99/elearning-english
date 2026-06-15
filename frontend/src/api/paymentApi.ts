import axiosClient from './axiosClient';

export const paymentApi = {
  createVnpayUrl: (orderId: string) =>
    axiosClient.post(`/payments/orders/${orderId}/vnpay`),
};
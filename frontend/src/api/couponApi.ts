import axiosClient from "./axiosClient";

export const couponApi = {
  create: (data: any) => axiosClient.post("/coupons", data),
  getAll: () => axiosClient.get("/coupons"),
};
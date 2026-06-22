import axiosClient from "./axiosClient";

export const walletApi = {
  getTeacherWallet: () => axiosClient.get("/teacher-wallet"),

  createWithdraw: (data: any) =>
    axiosClient.post("/teacher-wallet/withdraw", data),

  getMyWithdraws: () =>
    axiosClient.get("/teacher-wallet/withdraws"),

  getAllWithdraws: () =>
    axiosClient.get("/admin-wallet/withdraws"),

  approveWithdraw: (id: string) =>
    axiosClient.patch(`/admin-wallet/withdraws/${id}/approve`),

  rejectWithdraw: (id: string) =>
    axiosClient.patch(`/admin-wallet/withdraws/${id}/reject`),

  markPaidWithdraw: (id: string) =>
    axiosClient.patch(`/admin-wallet/withdraws/${id}/paid`),
};
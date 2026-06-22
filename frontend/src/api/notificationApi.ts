import axiosClient from "./axiosClient";

export const notificationApi = {
  getMyNotifications: () => axiosClient.get("/notifications"),

  markAsRead: (id: string) =>
    axiosClient.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    axiosClient.patch("/notifications/read-all"),
};
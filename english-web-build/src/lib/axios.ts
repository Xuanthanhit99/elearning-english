// src/lib/axios.ts
import axios from "axios";
import { attachNormalizedApiError } from "./api-error";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002",
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

function rejectRefreshQueue(error: unknown) {
  refreshQueue.forEach(({ reject }) => reject(error));
  refreshQueue = [];
}

function resolveRefreshQueue() {
  refreshQueue.forEach(({ resolve }) => resolve());
  refreshQueue = [];
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/auth")) return;

  window.location.href = "/auth";
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !String(originalRequest.url || "").includes("/auth/refresh") &&
      !String(originalRequest.url || "").includes("/auth/login")
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        await new Promise<void>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });
        return api(originalRequest);
      }

      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        resolveRefreshQueue();
        return api(originalRequest);
      } catch (refreshError) {
        rejectRefreshQueue(refreshError);
        redirectToLogin();
        return Promise.reject(attachNormalizedApiError(refreshError as Error));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(attachNormalizedApiError(error));
  },
);

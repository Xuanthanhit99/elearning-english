// src/lib/axios.ts
import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { attachNormalizedApiError } from "./api-error";
import { useAuthStore } from "@/src/store/authStore";
import { buildLoginUrl } from "./auth-redirect";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002",
  withCredentials: true,
});

const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002",
  withCredentials: true,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<void> | null = null;

function isAuthEndpoint(url: string | undefined, endpoint: string) {
  return String(url || "").includes(endpoint);
}

function shouldAttemptRefresh(error: AxiosError) {
  const originalRequest = error.config as RetriableRequestConfig | undefined;
  const url = originalRequest?.url;

  return (
    error.response?.status === 401 &&
    Boolean(originalRequest) &&
    !originalRequest?._retry &&
    !isAuthEndpoint(url, "/auth/refresh") &&
    !isAuthEndpoint(url, "/auth/login") &&
    !isAuthEndpoint(url, "/auth/logout") &&
    !isAuthEndpoint(url, "/auth/register")
  );
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/auth")) return;

  window.location.href = buildLoginUrl(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = authApi
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function handleUnrecoverableAuthFailure() {
  useAuthStore.getState().setUser(null);

  try {
    await authApi.post("/auth/logout");
  } catch {
    // Best effort only: refresh may already be expired or cookies may be gone.
  }

  redirectToLogin();
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const axiosError = error as AxiosError;
    const originalRequest = axiosError.config as RetriableRequestConfig | undefined;

    if (shouldAttemptRefresh(axiosError) && originalRequest) {
      originalRequest._retry = true;

      try {
        await refreshSession();
        return api(originalRequest as AxiosRequestConfig);
      } catch (refreshError) {
        await handleUnrecoverableAuthFailure();
        return Promise.reject(attachNormalizedApiError(refreshError as Error));
      }
    }

    return Promise.reject(attachNormalizedApiError(error as Error));
  },
);

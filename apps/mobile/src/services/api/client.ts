import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { assertApiBaseUrl, env } from '../../config/env';
import { useAuthStore } from '../../stores/auth-store';
import { queryClient } from '../query/query-client';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../auth/token-storage';
import { normalizeApiError } from './errors';
import type { AuthTokens, RetriableRequestConfig } from './types';

const AUTH_TRANSPORT_HEADERS = {
  'X-BeaconVie-Auth-Transport': 'bearer',
} as const;

type RefreshResponse = AuthTokens;

type InternalRetriableConfig = InternalAxiosRequestConfig & RetriableRequestConfig;

let refreshPromise: Promise<AuthTokens> | null = null;
let authVersion = 0;

export function markAuthSessionChanged() {
  authVersion += 1;
}

export const publicApiClient = axios.create({
  baseURL: env.apiUrl,
  headers: AUTH_TRANSPORT_HEADERS,
});

export const authenticatedApiClient = axios.create({
  baseURL: env.apiUrl,
  headers: AUTH_TRANSPORT_HEADERS,
});

publicApiClient.interceptors.request.use((config) => {
  assertApiBaseUrl();
  return config;
});

authenticatedApiClient.interceptors.request.use(async (config) => {
  assertApiBaseUrl();
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

authenticatedApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalRetriableConfig | undefined;

    if (!shouldRefresh(error, originalRequest)) {
      return Promise.reject(normalizeApiError(error));
    }

    if (!originalRequest) {
      return Promise.reject(normalizeApiError(error));
    }

    originalRequest._retry = true;

    try {
      const tokens = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return authenticatedApiClient(originalRequest);
    } catch (refreshError) {
      await clearExpiredSession();
      return Promise.reject(normalizeApiError(refreshError));
    }
  },
);

function shouldRefresh(error: AxiosError, request?: InternalRetriableConfig) {
  const url = request?.url ?? '';

  return (
    error.response?.status === 401 &&
    Boolean(request) &&
    !request?._retry &&
    !url.includes('/auth/refresh') &&
    !url.includes('/auth/login') &&
    !url.includes('/auth/logout') &&
    !url.includes('/auth/register')
  );
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const startedAtVersion = authVersion;

    refreshPromise = getRefreshToken()
      .then(async (refreshToken) => {
        if (!refreshToken) {
          throw new Error('Phiên đăng nhập đã hết hạn.');
        }

        const response = await publicApiClient.post<RefreshResponse>('/auth/refresh', {
          refreshToken,
        });

        if (authVersion !== startedAtVersion) {
          throw new Error('Phiên đăng nhập đã thay đổi.');
        }

        await setTokens(response.data);
        return response.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function clearExpiredSession() {
  markAuthSessionChanged();
  await clearTokens();
  useAuthStore.getState().setUnauthenticated();
  queryClient.clear();
}

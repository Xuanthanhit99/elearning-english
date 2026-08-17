import { apiClient } from '@/lib/api/client';

import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
} from '../types/auth.types';

export const authApi = {
  login(data: LoginRequest) {
    return apiClient.post<LoginResponse>(
      '/auth/mobile/login',
      data,
    );
  },

  refresh(refreshToken: string) {
    return apiClient.post<RefreshResponse>(
      '/auth/mobile/refresh',
      {
        refreshToken,
      },
    );
  },

  logout(refreshToken: string) {
    return apiClient.post<{
      message: string;
    }>('/auth/mobile/logout', {
      refreshToken,
    });
  },
};
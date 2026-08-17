import { authApi } from '@/features/auth/api/authApi';
import type { AuthUser } from '@/features/auth/types/auth.types';
import { tokenStorage } from '@/lib/storage/tokenStorage';

import { tokenManager } from './tokenManager';

function mapRefreshUser(
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
  },
): AuthUser {
  return {
    id: user.id,
    fullname: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export const sessionManager = {
  async login(
    email: string,
    password: string,
    otp?: string,
  ) {
    const response = await authApi.login({
      email,
      password,
      otp,
    });

    if (!response.success) {
      return response;
    }

    tokenManager.setAccessToken(
      response.accessToken,
    );

    await tokenStorage.setRefreshToken(
      response.refreshToken,
    );

    return response;
  },

  async restore() {
    const refreshToken =
      await tokenStorage.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response =
        await authApi.refresh(refreshToken);

      tokenManager.setAccessToken(
        response.accessToken,
      );

      await tokenStorage.setRefreshToken(
        response.refreshToken,
      );

      return mapRefreshUser(
        response.data.user,
      );
    } catch {
      tokenManager.clearAccessToken();

      await tokenStorage.removeRefreshToken();

      return null;
    }
  },

  async logout() {
    const refreshToken =
      await tokenStorage.getRefreshToken();

    try {
      if (refreshToken) {
        await authApi.logout(
          refreshToken,
        );
      }
    } finally {
      tokenManager.clearAccessToken();

      await tokenStorage.removeRefreshToken();
    }
  },
};
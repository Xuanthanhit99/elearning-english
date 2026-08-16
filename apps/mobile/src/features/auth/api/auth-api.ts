import { authenticatedApiClient, publicApiClient } from '../../../services/api/client';
import type { AuthTokens } from '../../../services/api/types';
import type { LoginRequest, LoginResponse, MeResponse, RegisterRequest, RegisterResponse } from '../types';

export async function login(request: LoginRequest) {
  const response = await publicApiClient.post<LoginResponse>('/auth/login', request);
  return response.data;
}

export async function register(request: RegisterRequest) {
  const response = await publicApiClient.post<RegisterResponse>('/auth/register', request);
  return response.data;
}

export async function getCurrentUser() {
  const response = await authenticatedApiClient.get<MeResponse>('/auth/me');
  return response.data.data.getUser;
}

export async function logout(refreshToken?: string | null) {
  await publicApiClient.post('/auth/logout', refreshToken ? { refreshToken } : {});
}

export async function refresh(refreshToken: string) {
  const response = await publicApiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
  return response.data;
}

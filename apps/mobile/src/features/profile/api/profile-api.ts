import { authenticatedApiClient } from '../../../services/api/client';
import type { AchievementOverview, ProfileUser, UpdateProfileInput } from '../types/profile';

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(response: { data: ApiResponse<T> | T }) {
  return ((response.data as ApiResponse<T>).data ?? response.data) as T;
}

export async function getProfile() {
  const response = await authenticatedApiClient.get<{
    success: boolean;
    data: { getUser: ProfileUser };
  }>('/auth/me');
  return response.data.data.getUser;
}

export async function updateProfile(input: UpdateProfileInput) {
  return unwrap<ProfileUser>(await authenticatedApiClient.patch('/auth/me/profile', input));
}

export async function checkUsername(username: string) {
  return unwrap<{ username: string; available: boolean }>(
    await authenticatedApiClient.get('/auth/check-username', { params: { username } }),
  );
}

export async function getAchievementOverview() {
  return unwrap<AchievementOverview>(
    await authenticatedApiClient.get('/achievements/overview'),
  );
}

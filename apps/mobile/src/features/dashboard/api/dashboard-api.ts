import { authenticatedApiClient } from '../../../services/api/client';
import type { DashboardData, LeaderboardMe } from '../types';

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(response: { data: ApiResponse<T> | T }) {
  return ((response.data as ApiResponse<T>).data ?? response.data) as T;
}

export async function getDashboard() {
  return unwrap<DashboardData>(await authenticatedApiClient.get('/dashboard'));
}

export async function getLeaderboardMe() {
  return unwrap<LeaderboardMe>(await authenticatedApiClient.get('/leaderboards/me'));
}

import { authenticatedApiClient } from '../../../services/api/client';
import type {
  LeaderboardQuery,
  LeaderboardResponse,
  LeaderboardTab,
} from '../types/leaderboard';

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(response: { data: ApiResponse<T> | T }) {
  return ((response.data as ApiResponse<T>).data ?? response.data) as T;
}

export async function getLeaderboard(tab: LeaderboardTab, query: LeaderboardQuery = {}) {
  const endpoint = `/leaderboards/${tab}`;
  return unwrap<LeaderboardResponse>(
    await authenticatedApiClient.get(endpoint, {
      params: {
        page: query.page ?? 1,
        limit: query.limit ?? 30,
      },
    }),
  );
}

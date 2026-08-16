import { useQuery } from '@tanstack/react-query';

import { getDashboard, getLeaderboardMe } from '../api/dashboard-api';
import { dashboardKeys } from '../query-keys';

export function useDashboardQuery() {
  return useQuery({
    queryKey: dashboardKeys.home(),
    queryFn: getDashboard,
  });
}

export function useLeaderboardMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.leaderboardMe(),
    queryFn: getLeaderboardMe,
    enabled,
    retry: false,
  });
}

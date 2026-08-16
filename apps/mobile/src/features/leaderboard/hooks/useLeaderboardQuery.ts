import { InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { getLeaderboard } from '../api/leaderboard-api';
import { leaderboardKeys } from '../query-keys';
import type { LeaderboardEntry, LeaderboardResponse, LeaderboardTab } from '../types/leaderboard';

const PAGE_SIZE = 30;

export function useLeaderboardQuery(tab: LeaderboardTab) {
  return useInfiniteQuery({
    queryKey: leaderboardKeys.list(tab),
    queryFn: ({ pageParam }) => getLeaderboard(tab, { page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.entries.length >= PAGE_SIZE ? pages.length + 1 : undefined,
  });
}

export function replaceLeaderboardGroup(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
  entries: LeaderboardEntry[],
) {
  queryClient.setQueriesData<InfiniteData<LeaderboardResponse>>(
    { queryKey: leaderboardKeys.lists() },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) =>
          page.groupId === groupId
            ? {
                ...page,
                entries,
              }
            : page,
        ),
      };
    },
  );
}

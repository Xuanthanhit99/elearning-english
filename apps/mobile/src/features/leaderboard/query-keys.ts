import type { LeaderboardTab } from './types/leaderboard';

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  lists: () => [...leaderboardKeys.all, 'list'] as const,
  list: (tab: LeaderboardTab) => [...leaderboardKeys.lists(), tab] as const,
};

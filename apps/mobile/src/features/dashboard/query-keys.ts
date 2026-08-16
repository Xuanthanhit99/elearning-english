export const dashboardKeys = {
  all: ['dashboard'] as const,
  home: () => [...dashboardKeys.all, 'home'] as const,
  leaderboardMe: () => [...dashboardKeys.all, 'leaderboard-me'] as const,
};

export type LeaderboardTab = 'weekly' | 'monthly' | 'friends';

export type LeaderboardUser = {
  id: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  level?: number | null;
  cefrLevel?: string | null;
  streak?: number | null;
};

export type LeaderboardEntry = {
  rank: number;
  periodXp?: number;
  xp?: number;
  zone?: string | null;
  isCurrentUser?: boolean;
  user: LeaderboardUser;
};

export type LeaderboardCurrentUser = {
  rank?: number | null;
  periodXp?: number;
  xpToNextRank?: number | null;
  zone?: string | null;
};

export type LeaderboardResponse = {
  period?: string;
  groupId?: string | null;
  league?: string | null;
  currentUser?: LeaderboardCurrentUser | null;
  entries: LeaderboardEntry[];
};

export type LeaderboardQuery = {
  page?: number;
  limit?: number;
};

export type LeaderboardRealtimeEvent = {
  groupId?: string;
};

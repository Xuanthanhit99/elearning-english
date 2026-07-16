export type LeagueTier =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'MASTER'
  | 'LEGEND';

export type LeaderboardZone = 'PROMOTION' | 'SAFE' | 'RELEGATION';
export type LeaderboardTab = 'weekly' | 'monthly' | 'friends' | 'club' | 'skill';

export interface LeaderboardUser {
  id: string;
  displayName?: string;
  fullname?: string;
  username?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  level: number;
  cefrLevel?: string | null;
  englishLevel?: string | null;
  streak?: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number | null;
  periodXp: number;
  zone?: LeaderboardZone;
  user: LeaderboardUser | null;
}

export interface LeaderboardResponse {
  period: {
    id?: string;
    name?: string;
    type?: string;
    startsAt: string;
    endsAt: string;
  } | null;
  groupId?: string;
  league?: LeagueTier | null;
  config?: {
    groupSize: number;
    promotionCount: number;
    relegationCount: number;
  };
  currentUser: {
    rank: number | null;
    periodXp: number;
    xpToNextRank?: number;
    zone?: LeaderboardZone | null;
  } | LeaderboardEntry | null;
  entries: LeaderboardEntry[];
  message?: string;
}

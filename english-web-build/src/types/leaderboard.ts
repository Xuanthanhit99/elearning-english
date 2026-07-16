export type LeaderboardScope =
  | 'GLOBAL'
  | 'FRIENDS'
  | 'CLUB';

export type LeagueTier =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'MASTER'
  | 'LEGEND';

export type LeaderboardZone =
  | 'PROMOTION'
  | 'SAFE'
  | 'RELEGATION';

export type LeaderboardEntry = {
  rank: number;
  previousRank?: number | null;
  periodXp: number;
  zone?: LeaderboardZone;
  promoted?: boolean;
  relegated?: boolean;
  isCurrentUser: boolean;
  user: {
    id: string;
    displayName: string;
    username?: string | null;
    avatarUrl?: string | null;
    level?: number | null;
    streak?: number | null;
    learnedToday?: boolean;
  };
};

export type LeaderboardResponse = {
  scope: LeaderboardScope;
  period: {
    seasonId?: string | null;
    name?: string | null;
    startsAt: string;
    endsAt: string;
    league?: LeagueTier | null;
    groupId?: string | null;
  };
  currentUser: LeaderboardEntry | null;
  entries: LeaderboardEntry[];
  message?: string;
};

export type WeeklyResultPayload = {
  seasonId: string;
  rank: number;
  periodXp: number;
  league: LeagueTier;
  nextLeague: LeagueTier;
  promoted: boolean;
  relegated: boolean;
  zone: LeaderboardZone;
};

export type ClubSummary = {
  id: string;
  name: string;
  iconUrl?: string | null;
  coverUrl?: string | null;
  memberCount: number;
};

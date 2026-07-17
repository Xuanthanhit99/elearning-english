export type LeaderboardScope = 'GLOBAL' | 'FRIENDS' | 'CLUB';
export type LeaderboardTab = 'weekly' | 'monthly' | 'friends' | 'club' | 'skill';
export type LeagueTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'LEGEND';
export type LeaderboardZone = 'PROMOTION' | 'SAFE' | 'RELEGATION';
export type RewardStatus = 'AVAILABLE' | 'CLAIMED' | 'EXPIRED' | 'REVOKED';

export type ClubSummary = {
  id: string;
  name: string;
  iconUrl?: string | null;
  coverUrl?: string | null;
  memberCount: number;
};

export type LeaderboardEntry = {
  rank: number;
  previousRank?: number | null;
  periodXp: number;
  zone?: LeaderboardZone;
  promoted?: boolean;
  relegated?: boolean;
  isCurrentUser?: boolean;
  user: {
    id: string;
    displayName: string;
    fullname?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    avatar?: string | null;
    level?: number | null;
    streak?: number | null;
    learnedToday?: boolean;
  };
};

export type LeaderboardPeriod = {
  seasonId?: string | null;
  name?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  league?: LeagueTier | null;
  groupId?: string | null;
};

export type LeaderboardResponse = {
  scope: LeaderboardScope;
  groupId?: string | null;
  league?: LeagueTier | string | null;
  config?: {
    promotionCount?: number | null;
    [key: string]: unknown;
  } | null;
  period?: LeaderboardPeriod | null;
  currentUser: LeaderboardEntry | null;
  entries: LeaderboardEntry[];
  message?: string;
};

export type LeaderboardReward = {
  id: string;
  seasonId?: string | null;
  league?: LeagueTier | null;
  minRank?: number;
  maxRank?: number;
  title: string;
  description?: string | null;
  rewardType: string;
  icon?: string | null;
  status: RewardStatus;
  claimedAt?: string | null;
  expiresAt?: string | null;
  payload: {
    xp?: number;
    coins?: number;
    food?: number;
    energy?: number;
    happiness?: number;
    badgeId?: string;
    avatarFrameId?: string;
    titleId?: string;
    [key: string]: unknown;
  };
  season?: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
  } | null;
};

export type LeaderboardHistoryItem = {
  id: string;
  seasonId: string;
  seasonName?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  league: LeagueTier;
  finalRank: number;
  periodXp: number;
  promoted: boolean;
  relegated: boolean;
  createdAt: string;
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

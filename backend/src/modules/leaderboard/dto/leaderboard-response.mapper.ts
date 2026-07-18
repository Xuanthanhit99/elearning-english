type RawLeaderboardEntry = {
  rank: number;
  previousRank?: number | null;
  periodXp: number;
  zone?: string | null;
  promoted?: boolean;
  relegated?: boolean;
  user: {
    id: string;
    fullname?: string | null;
    username?: string | null;
    avatar?: string | null;
    level?: number | null;
  };
};

export function mapLeaderboardEntries(
  entries: RawLeaderboardEntry[],
  currentUserId: string,
) {
  return entries.map((entry) => ({
    rank: entry.rank,
    previousRank: entry.previousRank ?? null,
    periodXp: entry.periodXp,
    zone: entry.zone ?? 'SAFE',
    promoted: Boolean(entry.promoted),
    relegated: Boolean(entry.relegated),
    isCurrentUser: entry.user.id === currentUserId,
    user: {
      id: entry.user.id,
      displayName: entry.user.username ?? entry.user.fullname ?? 'Người học',
      username: entry.user.username ?? null,
      avatarUrl: entry.user.avatar ?? null,
      level: entry.user.level ?? null,
    },
  }));
}

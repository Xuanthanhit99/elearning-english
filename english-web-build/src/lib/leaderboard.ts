import { LeaderboardEntry, LeaderboardZone, LeagueTier } from "../types/leaderboard";


export const leagueLabels: Record<LeagueTier, string> = {
  BRONZE: 'Đồng',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
  PLATINUM: 'Bạch kim',
  DIAMOND: 'Kim cương',
  MASTER: 'Bậc thầy',
  LEGEND: 'Huyền thoại',
};

export const leagueIcons: Record<LeagueTier, string> = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '🛡️',
  DIAMOND: '💎',
  MASTER: '👑',
  LEGEND: '🏆',
};

export function movementLabel(entry: LeaderboardEntry) {
  if (
    entry.previousRank == null ||
    entry.previousRank === entry.rank
  ) {
    return { text: '—', direction: 'same' as const };
  }

  if (entry.rank < entry.previousRank) {
    return {
      text: `+${entry.previousRank - entry.rank}`,
      direction: 'up' as const,
    };
  }

  return {
    text: `-${entry.rank - entry.previousRank}`,
    direction: 'down' as const,
  };
}

export function zoneLabel(zone?: LeaderboardZone) {
  if (zone === 'PROMOTION') return 'Vùng thăng hạng';
  if (zone === 'RELEGATION') return 'Vùng xuống hạng';
  return 'Vùng an toàn';
}

export function formatXp(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

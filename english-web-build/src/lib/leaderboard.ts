import type {
  LeaderboardEntry,
  LeaderboardZone,
  LeagueTier,
} from '@/src/types/leaderboard';

export const leagueLabels: Record<LeagueTier, string> = {
  BRONZE: 'Äá»“ng',
  SILVER: 'Báº¡c',
  GOLD: 'VÃ ng',
  PLATINUM: 'Báº¡ch kim',
  DIAMOND: 'Kim cÆ°Æ¡ng',
  MASTER: 'Báº­c tháº§y',
  LEGEND: 'Huyá»n thoáº¡i',
};

export const leagueIcons: Record<LeagueTier, string> = {
  BRONZE: 'ðŸ¥‰',
  SILVER: 'ðŸ¥ˆ',
  GOLD: 'ðŸ¥‡',
  PLATINUM: 'ðŸ›¡ï¸',
  DIAMOND: 'ðŸ’Ž',
  MASTER: 'ðŸ‘‘',
  LEGEND: 'ðŸ†',
};

export function movementLabel(entry: LeaderboardEntry) {
  if (
    entry.previousRank == null ||
    entry.previousRank === entry.rank
  ) {
    return { text: 'â€”', direction: 'same' as const };
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
  if (zone === 'PROMOTION') return 'VÃ¹ng thÄƒng háº¡ng';
  if (zone === 'RELEGATION') return 'VÃ¹ng xuá»‘ng háº¡ng';
  return 'VÃ¹ng an toÃ n';
}

export function formatXp(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

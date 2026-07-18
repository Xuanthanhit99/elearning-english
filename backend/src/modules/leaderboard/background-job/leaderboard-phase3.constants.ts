import { LeaderboardZone, LeagueTier } from '@prisma/client';

export const LEADERBOARD_WEEKLY_CLOSE_QUEUE = 'leaderboard-weekly-close';

export const LEADERBOARD_WEEKLY_CLOSE_JOB = 'close-expired-weekly-season';

export const LEAGUE_ORDER: LeagueTier[] = [
  LeagueTier.BRONZE,
  LeagueTier.SILVER,
  LeagueTier.GOLD,
  LeagueTier.PLATINUM,
  LeagueTier.DIAMOND,
  LeagueTier.MASTER,
  LeagueTier.LEGEND,
];

export type LeagueRule = {
  promotionCount: number;
  relegationCount: number;
  maxMembers: number;
};

export const LEAGUE_RULES: Record<LeagueTier, LeagueRule> = {
  [LeagueTier.BRONZE]: {
    promotionCount: 10,
    relegationCount: 0,
    maxMembers: 30,
  },
  [LeagueTier.SILVER]: {
    promotionCount: 8,
    relegationCount: 5,
    maxMembers: 30,
  },
  [LeagueTier.GOLD]: {
    promotionCount: 7,
    relegationCount: 5,
    maxMembers: 30,
  },
  [LeagueTier.PLATINUM]: {
    promotionCount: 6,
    relegationCount: 6,
    maxMembers: 30,
  },
  [LeagueTier.DIAMOND]: {
    promotionCount: 5,
    relegationCount: 7,
    maxMembers: 30,
  },
  [LeagueTier.MASTER]: {
    promotionCount: 3,
    relegationCount: 8,
    maxMembers: 30,
  },
  [LeagueTier.LEGEND]: {
    promotionCount: 0,
    relegationCount: 10,
    maxMembers: 30,
  },
};

export function resolveZone(input: {
  rank: number;
  total: number;
  league: LeagueTier;
}): LeaderboardZone {
  const rule = LEAGUE_RULES[input.league];

  if (
    rule.promotionCount > 0 &&
    input.rank <= Math.min(rule.promotionCount, input.total)
  ) {
    return LeaderboardZone.PROMOTION;
  }

  const relegationStart = input.total - rule.relegationCount + 1;

  if (rule.relegationCount > 0 && input.rank >= Math.max(1, relegationStart)) {
    return LeaderboardZone.RELEGATION;
  }

  return LeaderboardZone.SAFE;
}

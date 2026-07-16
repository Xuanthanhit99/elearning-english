import { LeagueTier, XpSourceType } from '@prisma/client';

export const LEADERBOARD_QUEUE = 'leaderboard';
export const LEADERBOARD_REDIS = Symbol('LEADERBOARD_REDIS');

export const LEAGUE_ORDER: LeagueTier[] = [
  LeagueTier.BRONZE,
  LeagueTier.SILVER,
  LeagueTier.GOLD,
  LeagueTier.PLATINUM,
  LeagueTier.DIAMOND,
  LeagueTier.MASTER,
  LeagueTier.LEGEND,
];

export const LEAGUE_CONFIG = {
  groupSize: 30,
  promotionCount: 5,
  relegationCount: 5,
} as const;

export const DAILY_XP_LIMITS: Partial<Record<XpSourceType, number>> = {
  VOCABULARY: 300,
  SPEAKING: 400,
  WRITING: 300,
  LISTENING: 300,
  READING: 300,
  GRAMMAR: 300,
  COMMUNITY: 100,
  STREAK: 30,
  ARENA: 300,
};

export const XP_RULES: Record<string, number> = {
  VOCABULARY_LESSON: 15,
  VOCABULARY_REVIEW: 7,
  SPEAKING_SESSION: 25,
  WRITING_SUBMISSION: 30,
  LISTENING_SESSION: 20,
  READING_SESSION: 20,
  GRAMMAR_LESSON: 20,
  LESSON_COMPLETED: 20,
  QUIZ_COMPLETED: 15,
  MISSION_COMPLETED: 25,
  PLACEMENT_COMPLETED: 50,
  COMMUNITY_HELPFUL: 5,
  CLUB_EVENT_COMPLETED: 40,
  REALTIME_ROOM_COMPLETED: 25,
  ARENA_MATCH: 20,
};

export const weeklyRedisKey = (seasonId: string, groupId: string) =>
  `leaderboard:weekly:${seasonId}:${groupId}`;

export const monthlyRedisKey = (year: number, month: number) =>
  `leaderboard:monthly:${year}:${month}`;

export const skillRedisKey = (skill: string, periodKey: string) =>
  `leaderboard:skill:${skill}:${periodKey}`;

export const clubRedisKey = (clubId: string, periodKey: string) =>
  `leaderboard:club:${clubId}:${periodKey}`;

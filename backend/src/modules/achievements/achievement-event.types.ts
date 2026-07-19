import type { LearningActivityCode } from '../learning-xp/learning-xp.constants';

export type AchievementActivityEvent = {
  eventId: string;
  eventType: LearningActivityCode;
  eventVersion: 1;
  occurredAt: string;
  userId: string;
  sourceId: string;
  score?: number | null;
  completionRate?: number | null;
  rewardXp?: number | null;
  metadata?: Record<string, unknown>;
};

export type AchievementUnlockedEvent = {
  eventId: string;
  eventType: 'achievement.unlocked';
  eventVersion: 1;
  occurredAt: string;
  userId: string;
  achievementId: string;
  achievementCode: string;
  achievementTitle: string;
  rewardXp: number;
  rewardCoins: number;
};

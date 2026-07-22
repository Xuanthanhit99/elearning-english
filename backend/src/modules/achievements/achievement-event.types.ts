import type { LearningActivityCode } from '../learning-xp/learning-xp.constants';

/**
 * Widened from `LearningActivityCode` (Phase F1) so non-learning-xp domains
 * (Arena progression) can supply their own `eventType` strings (e.g.
 * `ARENA_MATCH_COMPLETED`) without being forced into `LearningActivityCode`
 * — that union is tied to `LEARNING_XP_RULES`'s fixed per-activity XP
 * table, which doesn't fit Arena's variable, match-outcome-derived
 * rewards. `processActivityEvent` only ever compares `eventType` as a
 * plain string against `Achievement.eventType` catalog rows, so this
 * widening is behavior-preserving for every existing caller — every
 * `LearningActivityCode` value already satisfies `string`.
 */
export type AchievementActivityEvent = {
  eventId: string;
  eventType: LearningActivityCode | string;
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

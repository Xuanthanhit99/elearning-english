import { LearningSkill, XpSourceType } from '@prisma/client';

export type LearningActivityCode =
  | 'SPEAKING_COMPLETED'
  | 'WRITING_COMPLETED'
  | 'VOCABULARY_COMPLETED'
  | 'LISTENING_COMPLETED'
  | 'READING_COMPLETED'
  | 'GRAMMAR_COMPLETED'
  | 'LESSON_COMPLETED'
  | 'QUIZ_COMPLETED'
  | 'MISSION_CLAIMED'
  | 'PLACEMENT_COMPLETED'
  | 'CONVERSATION_COMPLETED'
  | 'CLUB_CHALLENGE_COMPLETED'
  | 'STUDY_ROOM_SESSION_COMPLETED';

export interface LearningXpRule {
  sourceType: XpSourceType;
  skill?: LearningSkill;
  baseXp: number;
  maxBonusXp: number;
}

export const LEARNING_XP_RULES: Record<LearningActivityCode, LearningXpRule> = {
  SPEAKING_COMPLETED: {
    sourceType: XpSourceType.SPEAKING,
    skill: LearningSkill.SPEAKING,
    baseXp: 25,
    maxBonusXp: 15,
  },
  WRITING_COMPLETED: {
    sourceType: XpSourceType.WRITING,
    skill: LearningSkill.WRITING,
    baseXp: 30,
    maxBonusXp: 20,
  },
  VOCABULARY_COMPLETED: {
    sourceType: XpSourceType.VOCABULARY,
    skill: LearningSkill.VOCABULARY,
    baseXp: 15,
    maxBonusXp: 10,
  },
  LISTENING_COMPLETED: {
    sourceType: XpSourceType.LISTENING,
    skill: LearningSkill.LISTENING,
    baseXp: 20,
    maxBonusXp: 10,
  },
  READING_COMPLETED: {
    sourceType: XpSourceType.READING,
    skill: LearningSkill.READING,
    baseXp: 20,
    maxBonusXp: 10,
  },
  GRAMMAR_COMPLETED: {
    sourceType: XpSourceType.GRAMMAR,
    skill: LearningSkill.GRAMMAR,
    baseXp: 20,
    maxBonusXp: 10,
  },
  LESSON_COMPLETED: {
    sourceType: XpSourceType.LESSON,
    baseXp: 20,
    maxBonusXp: 10,
  },
  QUIZ_COMPLETED: {
    sourceType: XpSourceType.QUIZ,
    baseXp: 15,
    maxBonusXp: 10,
  },
  MISSION_CLAIMED: {
    sourceType: XpSourceType.MISSION,
    baseXp: 0,
    maxBonusXp: 500,
  },
  PLACEMENT_COMPLETED: {
    sourceType: XpSourceType.PLACEMENT,
    baseXp: 50,
    maxBonusXp: 0,
  },
  // Reuses the existing SPEAKING XpSourceType/LearningSkill — conversation
  // practice is a speaking activity, and this avoids a Prisma enum migration
  // (XpSourceType/LearningSkill have no CONVERSATION value) for what would
  // otherwise be the exact same XP-ledger/skill-radar behavior.
  CONVERSATION_COMPLETED: {
    sourceType: XpSourceType.SPEAKING,
    skill: LearningSkill.SPEAKING,
    baseXp: 25,
    maxBonusXp: 20,
  },
  // Reward-amount style, same as MISSION_CLAIMED — `rewardXp` carries the
  // exact amount (creator-set on the challenge, DTO-capped at 500), clamped
  // again here as defense in depth against a user creating their own
  // high-reward challenge and self-completing it.
  CLUB_CHALLENGE_COMPLETED: {
    sourceType: XpSourceType.COMMUNITY,
    baseXp: 0,
    maxBonusXp: 500,
  },
  // Group XP for a completed Study Room session — reuses the standard
  // score/completionRate bonus curve (completionRate = % of the session's
  // shared goal reached).
  STUDY_ROOM_SESSION_COMPLETED: {
    sourceType: XpSourceType.REALTIME_ROOM,
    baseXp: 10,
    maxBonusXp: 25,
  },
};

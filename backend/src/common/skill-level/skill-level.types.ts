import { CefrLevel, LearningSkill } from '@prisma/client';

/**
 * Where a resolved skill level actually came from — surfaced to the
 * frontend so it can distinguish "this is your assessed level" from
 * "you haven't been assessed yet, here's the foundation".
 */
export type SkillLevelSource =
  | 'PLACEMENT'
  | 'DEFAULT_FOUNDATION'
  | 'MANUAL_LEVEL'
  | 'PROGRESS';

export type ResolvedSkillLevel = {
  skill: LearningSkill;
  level: CefrLevel;
  source: SkillLevelSource;
  /** The raw placement-assessed level for this skill, if one exists — null otherwise. */
  assessedLevel: CefrLevel | null;
};

export const ALL_LEARNING_SKILLS: LearningSkill[] = [
  LearningSkill.VOCABULARY,
  LearningSkill.GRAMMAR,
  LearningSkill.READING,
  LearningSkill.LISTENING,
  LearningSkill.SPEAKING,
  LearningSkill.WRITING,
];

/**
 * The lowest level every skill's curriculum genuinely supports today.
 * Not a CEFR-completeness statement — a product-content statement.
 */
export const FOUNDATION_LEVEL: CefrLevel = CefrLevel.A1;

/**
 * Highest level any job/loop in this codebase should generate for. Every
 * enum (GrammarLevel/ReadingLevel/SpeakingLevel/CefrLevel) technically goes
 * to C2, but no job/seed/curriculum has real C1/C2 coverage today (Writing's
 * own enum doesn't even define C2). Keeping generation bounded to what the
 * product actually supports avoids inventing content nobody asked for and
 * avoids unbounded Gemini cost growth.
 */
export const SUPPORTED_CONTENT_LEVELS: CefrLevel[] = [
  CefrLevel.A1,
  CefrLevel.A2,
  CefrLevel.B1,
  CefrLevel.B2,
];

export type ArenaQuestionType =
  | 'MULTIPLE_CHOICE'
  | 'FILL_BLANK'
  | 'ORDER_SENTENCE'
  | 'LISTENING_PLACEHOLDER'
  | 'PRONUNCIATION_PLACEHOLDER'
  | 'FLASH'
  | 'MATCHING_PLACEHOLDER';

export const ARENA_QUESTION_TYPES: ArenaQuestionType[] = [
  'MULTIPLE_CHOICE',
  'FILL_BLANK',
  'ORDER_SENTENCE',
  'LISTENING_PLACEHOLDER',
  'PRONUNCIATION_PLACEHOLDER',
  'FLASH',
  'MATCHING_PLACEHOLDER',
];

/** Types that must have >=2 unique, non-empty options and answer ∈ options. */
export const ARENA_OPTION_REQUIRED_TYPES: ArenaQuestionType[] = [
  'MULTIPLE_CHOICE',
  'FILL_BLANK',
  'ORDER_SENTENCE',
  'LISTENING_PLACEHOLDER',
  'PRONUNCIATION_PLACEHOLDER',
  'FLASH',
  'MATCHING_PLACEHOLDER',
];

/** Raw, untrusted shape straight out of JSON.parse — every field `unknown` until validated. */
export type ArenaQuestionRawCandidate = {
  type?: unknown;
  prompt?: unknown;
  question?: unknown;
  skill?: unknown;
  topic?: unknown;
  options?: unknown;
  choices?: unknown;
  answer?: unknown;
  correctAnswer?: unknown;
  explanation?: unknown;
  points?: unknown;
};

/** Validated shape — safe to persist. */
export type ArenaQuestionCandidate = {
  type: ArenaQuestionType;
  skill: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation?: string;
  points: number;
};

export type ArenaQuestionRejection = { reason: string; item: unknown };

export type ArenaQuestionValidationResult = {
  valid: ArenaQuestionCandidate[];
  rejected: ArenaQuestionRejection[];
};

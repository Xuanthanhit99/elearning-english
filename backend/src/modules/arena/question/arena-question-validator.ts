import {
  ARENA_QUESTION_TYPES,
  ArenaQuestionCandidate,
  ArenaQuestionRawCandidate,
  ArenaQuestionRejection,
  ArenaQuestionType,
  ArenaQuestionValidationResult,
} from './arena-question.types';

const DEFAULT_POINTS = 10;

/**
 * Manual, field-by-field runtime validation of AI-generated question
 * candidates — mirrors the hand-rolled convention already established by
 * `placement-ai.service.ts`'s `validateQuestions` (no schema-validation
 * library exists anywhere in this codebase; this follows the same style
 * rather than introducing one). TypeScript types alone are not enough since
 * these candidates come from `JSON.parse`-ing untrusted AI output.
 *
 * Partial batches are supported on purpose: one malformed candidate must
 * not throw away the rest of an otherwise-usable batch.
 */
export function validateArenaQuestionCandidates(
  items: ArenaQuestionRawCandidate[],
): ArenaQuestionValidationResult {
  const valid: ArenaQuestionCandidate[] = [];
  const rejected: ArenaQuestionRejection[] = [];

  for (const item of items) {
    const result = validateOne(item);
    if (result.ok) {
      valid.push(result.candidate);
    } else {
      rejected.push({ reason: result.reason, item });
    }
  }

  return { valid, rejected };
}

type ValidationOutcome =
  | { ok: true; candidate: ArenaQuestionCandidate }
  | { ok: false; reason: string };

function validateOne(item: ArenaQuestionRawCandidate): ValidationOutcome {
  if (!item || typeof item !== 'object') {
    return { ok: false, reason: 'not_an_object' };
  }

  const type = item.type;
  if (typeof type !== 'string' || !ARENA_QUESTION_TYPES.includes(type as ArenaQuestionType)) {
    return { ok: false, reason: 'missing_or_invalid_type' };
  }

  const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
  if (!prompt) {
    return { ok: false, reason: 'empty_prompt' };
  }

  const answerRaw = item.answer;
  const answer = typeof answerRaw === 'string' ? answerRaw.trim() : '';
  if (!answer) {
    return { ok: false, reason: 'empty_answer' };
  }

  const skill = typeof item.skill === 'string' && item.skill.trim() ? item.skill.trim() : null;
  if (!skill) {
    return { ok: false, reason: 'missing_skill' };
  }

  const optionsResult = normalizeOptions(item.options, answer);
  if (!optionsResult.ok) {
    return optionsResult;
  }

  const explanation =
    typeof item.explanation === 'string' && item.explanation.trim()
      ? item.explanation.trim()
      : undefined;

  const points =
    typeof item.points === 'number' && Number.isFinite(item.points) && item.points > 0
      ? Math.round(item.points)
      : DEFAULT_POINTS;

  return {
    ok: true,
    candidate: {
      type: type as ArenaQuestionType,
      skill,
      prompt,
      options: optionsResult.options,
      answer,
      explanation,
      points,
    },
  };
}

type OptionsOutcome = { ok: true; options: string[] } | { ok: false; reason: string };

function normalizeOptions(raw: unknown, answer: string): OptionsOutcome {
  if (raw === undefined || raw === null) {
    // Options are optional at the schema level (e.g. free-text types), but
    // when present they must be structurally valid — see below.
    return { ok: true, options: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, reason: 'options_not_array' };
  }

  const options = raw
    .filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    .map((option) => option.trim());

  if (options.length !== raw.length) {
    return { ok: false, reason: 'options_contain_empty_or_non_string' };
  }

  const unique = new Set(options.map((option) => option.toLowerCase()));
  if (unique.size !== options.length) {
    return { ok: false, reason: 'duplicate_options' };
  }

  if (options.length > 0 && !options.some((option) => option.toLowerCase() === answer.toLowerCase())) {
    return { ok: false, reason: 'answer_not_in_options' };
  }

  return { ok: true, options };
}

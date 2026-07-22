import { ArenaQuestionRawCandidate } from './arena-question.types';

/**
 * Controlled parsing of an AI response into an array of raw (untrusted)
 * candidates — strips ```` ```json ```` fences, accepts a bare top-level
 * array or a `{questions:[...]}`/`{data:[...]}` wrapper, and applies known
 * field aliases. Never invents a required field that's missing — that's the
 * validator's job to reject.
 */
export function parseArenaQuestionResponse(rawText: string): ArenaQuestionRawCandidate[] {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned) {
    throw new Error('Empty AI response');
  }

  const parsed: unknown = JSON.parse(cleaned);
  const list = extractList(parsed);
  if (!list) {
    throw new Error('AI response is not an array, {questions:[...]}, or {data:[...]}');
  }

  return list.map((item) => applyAliases(item));
}

function extractList(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.questions)) return obj.questions;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return null;
}

const FIELD_ALIASES: Record<string, string> = {
  question: 'prompt',
  correctAnswer: 'answer',
  choices: 'options',
};

function applyAliases(item: unknown): ArenaQuestionRawCandidate {
  if (!item || typeof item !== 'object') return item as ArenaQuestionRawCandidate;
  const source = item as Record<string, unknown>;
  const result: Record<string, unknown> = { ...source };

  for (const [alias, canonical] of Object.entries(FIELD_ALIASES)) {
    if (result[canonical] === undefined && source[alias] !== undefined) {
      result[canonical] = source[alias];
    }
  }

  return result as ArenaQuestionRawCandidate;
}

import crypto from 'crypto';
import { ArenaQuestionCandidate } from './arena-question.types';

/** Mirrors `../../grammar/utils/hash.util.ts`'s normalize-then-SHA-256 convention. */
export function normalizeQuestionContent(
  candidate: Pick<ArenaQuestionCandidate, 'type' | 'prompt' | 'options' | 'answer'>,
): string {
  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^\w\s']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedOptions = [...candidate.options]
    .map((option) => normalizeText(option))
    .sort()
    .join('|');

  return [
    candidate.type,
    normalizeText(candidate.prompt),
    normalizedOptions,
    normalizeText(candidate.answer),
  ].join('::');
}

export function createQuestionContentHash(
  candidate: Pick<ArenaQuestionCandidate, 'type' | 'prompt' | 'options' | 'answer'>,
): string {
  return crypto.createHash('sha256').update(normalizeQuestionContent(candidate)).digest('hex');
}

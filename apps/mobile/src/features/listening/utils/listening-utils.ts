import { env } from '../../../config/env';
import type { ListeningOption, ListeningQuestion } from '../types/listening';

export const LISTENING_SPEEDS = [0.75, 1, 1.25] as const;

export function clampPercent(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

export function normalizeListeningOptions(options: ListeningQuestion['options']): ListeningOption[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      if (!option || typeof option !== 'object') return null;
      const candidate = option as Partial<ListeningOption>;
      if (!candidate.label || !candidate.text) return null;
      if (!['A', 'B', 'C', 'D'].includes(candidate.label)) return null;
      return {
        label: candidate.label as ListeningOption['label'],
        text: String(candidate.text),
      };
    })
    .filter((option): option is ListeningOption => Boolean(option));
}

export function formatListeningSeconds(seconds?: number | null) {
  const safeSeconds = Math.max(0, Math.floor(seconds ?? 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remain = safeSeconds % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

export function resolveListeningAudioUrl(audioUrl?: string | null) {
  const trimmed = audioUrl?.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('file://')) {
    return trimmed;
  }

  if (!env.apiUrl) return trimmed;

  try {
    const base = new URL(env.apiUrl);
    return new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, base.origin).toString();
  } catch {
    return trimmed;
  }
}

export function getQuestionTimeSpent(startedAt: number) {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function getFirstIncompleteQuestionIndex(questions: ListeningQuestion[]) {
  const index = questions.findIndex((question) => !question.answered);
  return index >= 0 ? index : 0;
}

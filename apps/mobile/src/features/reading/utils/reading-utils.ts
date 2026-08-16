import type { ReadingQuestion } from '../types/reading';

export function clampPercent(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

export function normalizeOptions(options: ReadingQuestion['options']) {
  return Array.isArray(options) ? options.map(String) : [];
}

export function splitReadingContent(content?: string | null) {
  return (content ?? '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function countAnswers(answers: Record<string, string | undefined>) {
  return Object.values(answers).filter(Boolean).length;
}

export function getReadingCta(status: string) {
  if (status === 'COMPLETED') return 'Xem lai ket qua';
  if (status === 'LEARNING') return 'Tiep tuc doc';
  return 'Bat dau doc';
}

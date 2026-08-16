import type { LearningSkill, PlacementQuestion } from '../types/placement';

export function skillLabel(skill?: LearningSkill | string | null) {
  const labels: Record<string, string> = {
    VOCABULARY: 'Tu vung',
    GRAMMAR: 'Ngu phap',
    LISTENING: 'Nghe',
    READING: 'Doc',
    SPEAKING: 'Noi',
    WRITING: 'Viet',
  };

  return skill ? labels[skill] ?? skill : 'Placement';
}

export function countPlacementWords(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

export function placementProgressText(question?: PlacementQuestion | null) {
  if (!question) return 'Hoan thanh';
  return `Cau ${question.globalOrder}`;
}

export function isObjectivePlacementQuestion(type?: string | null) {
  return type === 'MULTIPLE_CHOICE' || type === 'FILL_BLANK' || type === 'LISTENING' || type === 'READING';
}

export function clampPercent(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

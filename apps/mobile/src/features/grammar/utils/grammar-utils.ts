import type { GrammarDashboard, GrammarLessonLearning } from '../types/grammar';

export function clampPercent(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

export function findContinueTopic(data?: GrammarDashboard | null) {
  if (!data?.topics.length) return null;
  return data.topics.find((topic) => topic.progress > 0 && topic.progress < 100) ?? data.topics[0] ?? null;
}

export function lessonHasExercises(lesson?: GrammarLessonLearning | null) {
  return Boolean(lesson?.questions?.length);
}

export function answeredCount(answers: Record<string, string>) {
  return Object.values(answers).filter(Boolean).length;
}

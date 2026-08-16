import type { Href } from 'expo-router';

import type { LearningPathLesson, LearningPathStartingLesson } from '../types/learning-path';

type PathStep = LearningPathLesson | NonNullable<LearningPathStartingLesson> | null | undefined;

export function resolveLearningPathRoute(step: PathStep): Href | null {
  const href = step?.href?.toLowerCase() ?? '';
  const title = step?.title ?? '';

  if (!href) return null;

  if (href.includes('/vocabulary')) {
    return '/learning/vocabulary';
  }

  if (href.includes('/grammar/lesson/')) {
    const id = lastSegment(href);
    return id ? { pathname: '/learning/grammar/[lessonId]', params: { lessonId: id } } : '/learning/grammar';
  }

  if (href.includes('/grammar')) {
    return '/learning/grammar';
  }

  if (href.includes('/reading/articles/')) {
    const id = lastSegment(href);
    return id ? { pathname: '/learning/reading/[readingId]', params: { readingId: id } } : '/learning/reading';
  }

  if (href.includes('/reading')) {
    return '/learning/reading';
  }

  if (href.includes('/listening')) {
    return '/learning/listening';
  }

  if (href.includes('/writing')) {
    return '/learning/writing';
  }

  if (step && 'id' in step && step.id) {
    return { pathname: '/learning/path/[stepId]', params: { stepId: step.id, title } };
  }

  return null;
}

function lastSegment(value: string) {
  return value.split('?')[0].split('/').filter(Boolean).pop() ?? null;
}

export function pathStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    COMPLETED: 'Hoan thanh',
    IN_PROGRESS: 'Dang hoc',
    AVAILABLE: 'San sang',
    LOCKED: 'Sap toi',
  };

  return status ? labels[status] ?? status : 'San sang';
}

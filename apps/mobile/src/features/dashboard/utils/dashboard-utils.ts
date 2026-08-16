import type { DashboardData, DashboardLesson, DashboardSkillProgress } from '../types';

const MODULE_LABELS: Record<string, string> = {
  VOCABULARY: 'Từ vựng',
  GRAMMAR: 'Ngữ pháp',
  READING: 'Luyện đọc',
  LISTENING: 'Luyện nghe',
  WRITING: 'Luyện viết',
};

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
  if (hour >= 12 && hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function firstName(fullname?: string | null) {
  const trimmed = fullname?.trim();
  if (!trimmed) return 'bạn';
  return trimmed.split(/\s+/).slice(-1)[0] ?? trimmed;
}

export function clampPercent(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

export function selectPrimaryLesson(data?: DashboardData | null): DashboardLesson | null {
  if (!data) return null;
  return data.currentLesson ?? data.continueLearning.items[0] ?? data.recommendedLesson ?? null;
}

export function selectSkillModules(data?: DashboardData | null): DashboardSkillProgress[] {
  if (!data) return [];

  const dashboardProgress = data.skillProgress.filter((item) => item.key in MODULE_LABELS);
  if (dashboardProgress.length > 0) {
    return dashboardProgress.map((item) => ({
      ...item,
      label: MODULE_LABELS[item.key] ?? item.label,
      percent: clampPercent(item.percent),
    }));
  }

  const breakdown = data.analytics?.skillBreakdown;
  if (!breakdown) return [];

  return Object.entries(MODULE_LABELS)
    .map(([key, label]) => ({
      key,
      label,
      percent: clampPercent(breakdown[key.toLowerCase()]?.percent),
      href: `/${key.toLowerCase()}`,
    }))
    .filter((item) => item.percent > 0);
}

export function toTabRoute(href?: string | null) {
  const route = href?.toLowerCase() ?? '';

  if (route.includes('community') || route.includes('leaderboard') || route.includes('club')) {
    return '/(tabs)/community' as const;
  }

  if (route.includes('placement')) {
    return '/placement' as const;
  }

  if (route.includes('learning-path') || route.includes('learning/path')) {
    return '/learning/path' as const;
  }

  if (
    route.includes('grammar') ||
    route.includes('ngữ pháp') ||
    route.includes('ngu-phap')
  ) {
    return '/learning/grammar' as const;
  }

  if (
    route.includes('reading') ||
    route.includes('luyện đọc') ||
    route.includes('luyen-doc')
  ) {
    return '/learning/reading' as const;
  }

  if (
    route.includes('listening') ||
    route.includes('luyện nghe') ||
    route.includes('luyen-nghe')
  ) {
    return '/learning/listening' as const;
  }

  if (
    route.includes('writing') ||
    route.includes('luyện viết') ||
    route.includes('luyen-viet')
  ) {
    return '/learning/writing' as const;
  }

  if (
    route.includes('review') ||
    route.includes('practice') ||
    route.includes('speaking')
  ) {
    return '/(tabs)/practice' as const;
  }

  return '/(tabs)/learn' as const;
}

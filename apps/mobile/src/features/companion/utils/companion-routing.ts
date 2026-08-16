import type { Href } from 'expo-router';

export function resolveCompanionActionRoute(path?: string | null): Href | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;

  if (path === '/placement') return '/placement';
  if (path === '/community') return '/(tabs)/community';
  if (path === '/courses' || path === '/learn') return '/(tabs)/learn';
  if (path === '/speaking') return '/(tabs)/practice';
  if (path === '/pet') return '/(tabs)/profile';

  return null;
}

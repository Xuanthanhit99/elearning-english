import type { Href } from 'expo-router';

import type { NotificationItem } from '../types/notifications';

export function resolveNotificationRoute(notification: NotificationItem): Href | null {
  const href = safeInternalHref(notification.href);
  if (!href) return null;

  if (href === '/notifications') return null;
  if (href === '/dashboard' || href === '/') return '/(tabs)';
  if (href === '/learn') return '/(tabs)/learn';
  if (href === '/community') return '/(tabs)/community';
  if (href === '/learning-path') return '/learning/path';
  if (href === '/placement') return '/placement';
  if (href.startsWith('/community/posts/')) {
    const postId = href.split('/').filter(Boolean).at(2);
    return postId ? (`/community/${encodeURIComponent(postId)}` as Href) : '/(tabs)/community';
  }
  if (href.startsWith('/community/')) return '/(tabs)/community';
  if (href.startsWith('/writing')) return '/learning/writing';
  if (href.startsWith('/reading')) return '/learning/reading';
  if (href.startsWith('/listening')) return '/learning/listening';
  if (href.startsWith('/grammar')) return '/learning/grammar';
  if (href.startsWith('/vocabulary')) return '/learning/vocabulary';

  return null;
}

function safeInternalHref(href?: string | null) {
  if (!href) return null;
  const value = href.trim();
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.toLowerCase().startsWith('/javascript:') ||
    value.toLowerCase().startsWith('/data:') ||
    value.toLowerCase().startsWith('/file:')
  ) {
    return null;
  }
  return value;
}

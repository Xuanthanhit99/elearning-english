import { env } from '../../../config/env';
import type { CommunityAuthor, CommunityPost } from '../types/community';

export function communityAuthorName(author?: CommunityAuthor | null) {
  return author?.fullname || author?.name || author?.username || 'BeaconVie learner';
}

export function communityViewerReaction(post: CommunityPost) {
  return post.viewerReaction ?? post.myReaction ?? null;
}

export function communityBookmarked(post: CommunityPost) {
  return Boolean(post.bookmarked ?? post.isBookmarked);
}

export function communityTypeLabel(type: string) {
  const labels: Record<string, string> = {
    SHARE: 'Chia se',
    QUESTION: 'Hoi dap',
    SPEAKING: 'Luyen noi',
    WRITING: 'Luyen viet',
    IMAGE: 'Goc hoc tap',
    ACHIEVEMENT: 'Thanh tich',
    POLL: 'Khao sat',
  };
  return labels[type] ?? type;
}

export function resolveCommunityMediaUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${env.apiUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

export function formatCommunityTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

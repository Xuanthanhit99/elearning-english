import type { CommunityFeedTab } from './types/community';

export const communityKeys = {
  all: ['community'] as const,
  feeds: () => [...communityKeys.all, 'feed'] as const,
  feed: (tab: CommunityFeedTab) => [...communityKeys.feeds(), tab] as const,
  post: (postId?: string | null) => [...communityKeys.all, 'post', postId ?? 'none'] as const,
  comments: (postId?: string | null) => [...communityKeys.post(postId), 'comments'] as const,
};

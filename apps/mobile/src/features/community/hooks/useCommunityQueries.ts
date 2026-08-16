import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  bookmarkCommunityPost,
  createCommunityComment,
  createCommunityPost,
  getCommunityComments,
  getCommunityFeed,
  getCommunityPost,
  reactCommunityPost,
  removeCommunityReaction,
} from '../api/community-api';
import { communityKeys } from '../query-keys';
import type { CommunityFeedResponse, CommunityFeedTab, CommunityPost, CreateCommunityPostInput } from '../types/community';

export function useCommunityFeedQuery(tab: CommunityFeedTab) {
  return useInfiniteQuery({
    queryKey: communityKeys.feed(tab),
    queryFn: ({ pageParam }) => getCommunityFeed({ tab, cursor: pageParam, limit: 10 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useCommunityPostQuery(postId?: string | null) {
  return useQuery({
    queryKey: communityKeys.post(postId),
    queryFn: () => getCommunityPost(postId as string),
    enabled: Boolean(postId),
  });
}

export function useCommunityCommentsQuery(postId?: string | null) {
  return useQuery({
    queryKey: communityKeys.comments(postId),
    queryFn: () => getCommunityComments(postId as string),
    enabled: Boolean(postId),
  });
}

export function useReactCommunityPostMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hasReaction: boolean) => (hasReaction ? removeCommunityReaction(postId) : reactCommunityPost(postId, 'LIKE')),
    retry: false,
    onSuccess: (summary) => {
      updatePostInCaches(queryClient, postId, (post) => ({
        ...post,
        reactionsCount: summary.total,
        viewerReaction: summary.viewerReaction,
        myReaction: summary.viewerReaction,
      }));
    },
  });
}

export function useBookmarkCommunityPostMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookmarked: boolean) => bookmarkCommunityPost(postId, bookmarked),
    retry: false,
    onSuccess: (result) => {
      updatePostInCaches(queryClient, postId, (post) => ({
        ...post,
        bookmarked: result.bookmarked,
        isBookmarked: result.bookmarked,
      }));
    },
  });
}

export function useCreateCommunityCommentMutation(postId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string | null }) =>
      createCommunityComment(postId as string, content, parentId),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: communityKeys.comments(postId) }),
        queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) }),
        queryClient.invalidateQueries({ queryKey: communityKeys.feeds() }),
      ]);
    },
  });
}

export function useCreateCommunityPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCommunityPostInput) => createCommunityPost(payload),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
    },
  });
}

function updatePostInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (post: CommunityPost) => CommunityPost,
) {
  queryClient.setQueriesData<CommunityPost>({ queryKey: communityKeys.all }, (old) => {
    if (!old || old.id !== postId) return old;
    return updater(old);
  });

  queryClient.setQueriesData<InfiniteData<CommunityFeedResponse>>({ queryKey: communityKeys.feeds() }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((post) => (post.id === postId ? updater(post) : post)),
      })),
    };
  });
}

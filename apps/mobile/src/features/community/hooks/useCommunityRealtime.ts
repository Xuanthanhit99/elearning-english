import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { socketNamespaces } from '../../../services/socket/namespaces';
import { getAuthenticatedSocket } from '../../../services/socket/socket-manager';
import { communityKeys } from '../query-keys';
import type { CommunityFeedResponse, CommunityPost, CommunityReactionSummary } from '../types/community';

export function useCommunityRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    void getAuthenticatedSocket(socketNamespaces.community).then((socket) => {
      if (!active || !socket) return;

      const onPostCreated = (post: CommunityPost) => upsertFeedPost(queryClient, post);
      const onPostUpdated = (post: CommunityPost) => {
        upsertFeedPost(queryClient, post);
        queryClient.setQueryData(communityKeys.post(post.id), post);
      };
      const onPostDeleted = ({ postId }: { postId: string }) => {
        removeFeedPost(queryClient, postId);
        queryClient.removeQueries({ queryKey: communityKeys.post(postId) });
      };
      const onCommentChanged = (comment: { postId?: string }) => {
        if (!comment.postId) return;
        void queryClient.invalidateQueries({ queryKey: communityKeys.comments(comment.postId) });
        void queryClient.invalidateQueries({ queryKey: communityKeys.post(comment.postId) });
        void queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      };
      const onCommentDeleted = (payload: { postId?: string }) => {
        if (!payload.postId) {
          void queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
          return;
        }
        void queryClient.invalidateQueries({ queryKey: communityKeys.comments(payload.postId) });
        void queryClient.invalidateQueries({ queryKey: communityKeys.post(payload.postId) });
        void queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      };
      const onReactionUpdated = (summary: CommunityReactionSummary) => {
        if (!summary.postId) return;
        patchPost(queryClient, summary.postId, (post) => ({
          ...post,
          reactionsCount: summary.total,
          viewerReaction: summary.viewerReaction,
          myReaction: summary.viewerReaction,
        }));
      };

      socket.on('community:post-created', onPostCreated);
      socket.on('community:post-updated', onPostUpdated);
      socket.on('community:post-deleted', onPostDeleted);
      socket.on('community:comment-created', onCommentChanged);
      socket.on('community:comment-updated', onCommentChanged);
      socket.on('community:comment-deleted', onCommentDeleted);
      socket.on('community:reaction-updated', onReactionUpdated);

      cleanup = () => {
        socket.off('community:post-created', onPostCreated);
        socket.off('community:post-updated', onPostUpdated);
        socket.off('community:post-deleted', onPostDeleted);
        socket.off('community:comment-created', onCommentChanged);
        socket.off('community:comment-updated', onCommentChanged);
        socket.off('community:comment-deleted', onCommentDeleted);
        socket.off('community:reaction-updated', onReactionUpdated);
      };
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [queryClient]);
}

function upsertFeedPost(
  queryClient: ReturnType<typeof useQueryClient>,
  post: CommunityPost,
) {
  queryClient.setQueriesData<InfiniteData<CommunityFeedResponse>>(
    { queryKey: communityKeys.feeds() },
    (old) => {
      if (!old) return old;
      const exists = old.pages.some((page) => page.items.some((item) => item.id === post.id));
      return {
        ...old,
        pages: old.pages.map((page, index) => {
          const items = page.items.map((item) => (item.id === post.id ? post : item));
          if (index === 0 && !exists) items.unshift(post);
          return { ...page, items: dedupePosts(items) };
        }),
      };
    },
  );
}

function removeFeedPost(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
) {
  queryClient.setQueriesData<InfiniteData<CommunityFeedResponse>>(
    { queryKey: communityKeys.feeds() },
    (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== postId),
            })),
          }
        : old,
  );
}

function patchPost(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (post: CommunityPost) => CommunityPost,
) {
  queryClient.setQueryData<CommunityPost>(communityKeys.post(postId), (old) =>
    old ? updater(old) : old,
  );
  queryClient.setQueriesData<InfiniteData<CommunityFeedResponse>>(
    { queryKey: communityKeys.feeds() },
    (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((post) => (post.id === postId ? updater(post) : post)),
            })),
          }
        : old,
  );
}

function dedupePosts(items: CommunityPost[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

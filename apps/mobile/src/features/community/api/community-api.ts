import { authenticatedApiClient } from '../../../services/api/client';
import type {
  CommunityComment,
  CommunityFeedResponse,
  CommunityFeedTab,
  CommunityPost,
  CommunityReactionSummary,
  CommunityReactionType,
  CreateCommunityPostInput,
} from '../types/community';

function unwrap<T>(value: unknown): T {
  const wrapped = value as { data?: T };
  return (wrapped?.data ?? value) as T;
}

export async function getCommunityFeed({
  cursor,
  limit = 10,
  tab,
}: {
  cursor?: string | null;
  limit?: number;
  tab: CommunityFeedTab;
}) {
  const response = await authenticatedApiClient.get('/community/feed', {
    params: { tab, cursor: cursor ?? undefined, limit },
  });
  return unwrap<CommunityFeedResponse>(response.data);
}

export async function getCommunityPost(postId: string) {
  const response = await authenticatedApiClient.get(`/community/posts/${encodeURIComponent(postId)}`);
  return unwrap<CommunityPost>(response.data);
}

export async function createCommunityPost(payload: CreateCommunityPostInput) {
  const response = await authenticatedApiClient.post('/community/posts', payload);
  return unwrap<CommunityPost>(response.data);
}

export async function reactCommunityPost(postId: string, type: CommunityReactionType) {
  const response = await authenticatedApiClient.post(`/community/posts/${encodeURIComponent(postId)}/reactions`, { type });
  return unwrap<CommunityReactionSummary>(response.data);
}

export async function removeCommunityReaction(postId: string) {
  const response = await authenticatedApiClient.delete(`/community/posts/${encodeURIComponent(postId)}/reactions`);
  return unwrap<CommunityReactionSummary>(response.data);
}

export async function bookmarkCommunityPost(postId: string, bookmarked: boolean) {
  const response = bookmarked
    ? await authenticatedApiClient.delete(`/community/posts/${encodeURIComponent(postId)}/bookmark`)
    : await authenticatedApiClient.post(`/community/posts/${encodeURIComponent(postId)}/bookmark`);
  return unwrap<{ bookmarked: boolean }>(response.data);
}

export async function getCommunityComments(postId: string) {
  const response = await authenticatedApiClient.get(`/community/posts/${encodeURIComponent(postId)}/comments`);
  return unwrap<CommunityComment[]>(response.data);
}

export async function createCommunityComment(postId: string, content: string, parentId?: string | null) {
  const response = await authenticatedApiClient.post(`/community/posts/${encodeURIComponent(postId)}/comments`, {
    content,
    parentId: parentId ?? undefined,
  });
  return unwrap<CommunityComment>(response.data);
}

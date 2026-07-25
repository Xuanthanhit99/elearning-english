import type {
  CommunityPost,
  CommunityReactionType,
  CreateCommunityPostInput,
} from '../types/community';
import { api } from './axios';

type CommunityFeedParams = {
  tab?: string;
  cursor?: string;
  limit?: number;
  type?: string;
  search?: string;
};

type CommunityFeedResponse = {
  items: CommunityPost[];
  nextCursor: string | null;
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string | string[];
          };
        };
      }
    ).response;

    const message = response?.data?.message;

    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.trim()) return message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function getCommunityFeed(
  params: CommunityFeedParams,
): Promise<CommunityFeedResponse> {
  try {
    const { data } = await api.get('/community/feed', { params });
    return (data?.data ?? data) as CommunityFeedResponse;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'KhÃ´ng thá»ƒ táº£i báº£ng tin cá»™ng Ä‘á»“ng'),
    );
  }
}

export async function createCommunityPost(
  payload: CreateCommunityPostInput,
): Promise<CommunityPost> {
  try {
    const { data } = await api.post('/community/posts', payload);
    return (data?.data ?? data) as CommunityPost;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'KhÃ´ng thá»ƒ táº¡o bÃ i viáº¿t'));
  }
}

export async function reactCommunityPost(
  postId: string,
  type: CommunityReactionType,
) {
  try {
    const { data } = await api.post(
      `/community/posts/${postId}/reactions`,
      { type },
    );
    return data?.data ?? data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'KhÃ´ng thá»ƒ cáº­p nháº­t cáº£m xÃºc'),
    );
  }
}

export async function removeCommunityReaction(postId: string) {
  try {
    const { data } = await api.delete(
      `/community/posts/${postId}/reactions`,
    );
    return data?.data ?? data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'KhÃ´ng thá»ƒ xÃ³a cáº£m xÃºc'));
  }
}

export async function toggleCommunityBookmark(
  postId: string,
  bookmarked: boolean,
) {
  try {
    const { data } = bookmarked
      ? await api.delete(`/community/posts/${postId}/bookmark`)
      : await api.post(`/community/posts/${postId}/bookmark`);

    return data?.data ?? data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'KhÃ´ng thá»ƒ cáº­p nháº­t bÃ i viáº¿t Ä‘Ã£ lÆ°u'),
    );
  }
}

export async function createCommunityComment(
  postId: string,
  content: string,
  parentId?: string,
) {
  try {
    const payload: {
      content: string;
      parentId?: string;
    } = { content };

    if (parentId) payload.parentId = parentId;

    const { data } = await api.post(
      `/community/posts/${postId}/comments`,
      payload,
    );

    return data?.data ?? data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        parentId
          ? 'KhÃ´ng thá»ƒ tráº£ lá»i bÃ¬nh luáº­n'
          : 'KhÃ´ng thá»ƒ gá»­i bÃ¬nh luáº­n',
      ),
    );
  }
}

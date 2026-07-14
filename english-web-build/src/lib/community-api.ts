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
      getApiErrorMessage(error, 'Không thể tải bảng tin cộng đồng'),
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
    throw new Error(getApiErrorMessage(error, 'Không thể tạo bài viết'));
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
      getApiErrorMessage(error, 'Không thể cập nhật cảm xúc'),
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
    throw new Error(getApiErrorMessage(error, 'Không thể xóa cảm xúc'));
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
      getApiErrorMessage(error, 'Không thể cập nhật bài viết đã lưu'),
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
          ? 'Không thể trả lời bình luận'
          : 'Không thể gửi bình luận',
      ),
    );
  }
}

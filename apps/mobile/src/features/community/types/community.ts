export type CommunityFeedTab = 'FOR_YOU' | 'FOLLOWING' | 'LATEST' | 'POPULAR';
export type CommunityPostType = 'SHARE' | 'QUESTION' | 'SPEAKING' | 'WRITING' | 'IMAGE' | 'ACHIEVEMENT' | 'POLL';
export type CommunityReactionType = 'LIKE' | 'USEFUL' | 'GREAT' | 'HELPFUL' | 'INSPIRED';

export type CommunityAuthor = {
  id: string;
  name?: string | null;
  fullname?: string | null;
  username?: string | null;
  avatar?: string | null;
  level?: number | null;
  xp?: number | null;
  isFollowing?: boolean | null;
};

export type CommunityMedia = {
  type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
  url: string;
  thumbnailUrl?: string | null;
  name?: string | null;
  duration?: number | null;
};

export type CommunityComment = {
  id: string;
  postId: string;
  parentId?: string | null;
  content: string;
  createdAt: string;
  isEdited?: boolean;
  author: CommunityAuthor;
  replies?: CommunityComment[];
  _count?: { replies: number };
};

export type CommunityPost = {
  id: string;
  type: CommunityPostType;
  title?: string | null;
  content: string;
  category?: string | null;
  level?: string | null;
  tags: string[];
  media?: CommunityMedia[] | null;
  author: CommunityAuthor;
  createdAt: string;
  isEdited: boolean;
  comments?: CommunityComment[];
  commentsCount: number;
  reactionsCount: number;
  bookmarksCount: number;
  viewerReaction?: CommunityReactionType | null;
  myReaction?: CommunityReactionType | null;
  bookmarked?: boolean;
  isBookmarked?: boolean;
};

export type CommunityFeedResponse = {
  items: CommunityPost[];
  nextCursor: string | null;
};

export type CommunityReactionSummary = {
  postId: string;
  total: number;
  byType: Record<string, number>;
  viewerReaction: CommunityReactionType | null;
};

export type CreateCommunityPostInput = {
  type: CommunityPostType;
  title?: string;
  content: string;
  category?: string;
  level?: string;
  tags?: string[];
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'CLUB' | 'PRIVATE';
};

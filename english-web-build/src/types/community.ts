export type CommunityPostType = 'SHARE' | 'QUESTION' | 'SPEAKING' | 'WRITING' | 'IMAGE' | 'ACHIEVEMENT' | 'POLL';
export type CommunityReactionType = 'LIKE' | 'USEFUL' | 'GREAT' | 'HELPFUL' | 'INSPIRED';

export interface CommunityAuthor {
  id: string;
  name: string;
  username?: string | null;
  fullname?: string | null;
  avatar?: string | null;
  level?: number | null;
  isFollowing?: boolean | null;
}

export interface CommunityPost {
  id: string;
  type: CommunityPostType;
  title?: string | null;
  content: string;
  category?: string | null;
  level?: string | null;
  tags: string[];
  media?: Array<{ type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'; url: string; thumbnailUrl?: string; name?: string; duration?: number }>;
  author: CommunityAuthor;
  createdAt: string;
  isEdited: boolean;
  commentsCount: number;
  reactionsCount: number;
  bookmarksCount: number;
  viewerReaction?: CommunityReactionType | null;
  bookmarked: boolean;
}

export interface CreateCommunityPostInput {
  type: CommunityPostType;
  title?: string;
  content: string;
  category?: string;
  level?: string;
  tags?: string[];
  media?: CommunityPost['media'];
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'CLUB' | 'PRIVATE';
}

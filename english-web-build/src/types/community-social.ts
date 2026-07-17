export type CommunityUserCard = {
  id: string;
  fullname: string;
  username?: string | null;
  avatar?: string | null;
  level: number;
  xp: number;
  englishLevel?: string | null;
};

export type CommunityCommentItem = {
  id: string;
  postId: string;
  parentId?: string | null;
  content: string;
  createdAt: string;
  author: CommunityUserCard;
  replies: CommunityCommentItem[];
  _count?: { replies: number };
};

export type CommunityUserSearchItem = CommunityUserCard & {
  relationship:
    | 'NONE'
    | 'FRIEND'
    | 'REQUEST_SENT'
    | 'REQUEST_RECEIVED';
  requestId?: string | null;
};

export type CommunityFriendRequestItem = {
  id: string;
  requester: CommunityUserCard;
  createdAt: string;
};

export type CommunityClubItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  iconUrl?: string | null;
  privacy: 'PUBLIC' | 'PRIVATE';
  category?: string | null;
  tags: string[];
  memberCount: number;
  postCount: number;
  joined: boolean;
  myRole?: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' | null;
  owner: CommunityUserCard;
};

export type CommunityChallengeItem = {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  rewardXp: number;
  startsAt: string;
  endsAt: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  participantCount: number;
  joined: boolean;
  myProgress?: {
    id: string;
    progress: number;
    status: 'JOINED' | 'COMPLETED' | 'LEFT';
  } | null;
  creator: CommunityUserCard;
};

export type CommunityLeaderboardItem = {
  rank: number;
  points: number;
  user: CommunityUserCard;
};

export type CommunityMessageItem = {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  sender: CommunityUserCard;
};

export type CommunityConversationItem = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  title?: string | null;
  avatarUrl?: string | null;
  lastMessageAt?: string | null;
  members: CommunityUserCard[];
  lastMessage?: CommunityMessageItem | null;
};

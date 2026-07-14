export type ClubUser = {
  id: string;
  fullname: string;
  username?: string | null;
  avatar?: string | null;
  level: number;
  xp: number;
  englishLevel?: string | null;
};

export type ClubRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export type CommunityClubDetail = {
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
  myRole?: ClubRole | null;
  owner: ClubUser;
  _count: {
    members: number;
    posts: number;
    messages: number;
    events: number;
    resources: number;
  };
  ownerId: string;
  isOwner?: boolean;
};

export type ClubMember = {
  id: string;
  role: ClubRole;
  joinedAt: string;
  user: ClubUser;
};

export type ClubMessage = {
  id: string;
  clubId: string;
  content: string;
  media?: {
    type?: string;
    url?: string;
    name?: string;
  } | null;
  createdAt: string;
  sender: ClubUser;
};

export type ClubEvent = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  meetingUrl?: string | null;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  attendeeCount: number;
  creator: ClubUser;
  attendees: { id: string }[];
};

export type ClubResource = {
  id: string;
  title: string;
  description?: string | null;
  type:
    | 'PDF'
    | 'DOCUMENT'
    | 'LINK'
    | 'AUDIO'
    | 'VIDEO'
    | 'IMAGE'
    | 'OTHER';
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt: string;
  uploader: ClubUser;
};

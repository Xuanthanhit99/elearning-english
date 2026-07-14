import { api } from './axios';
import type {
  ClubEvent,
  ClubMember,
  ClubMessage,
  ClubResource,
  ClubUser,
  CommunityClubDetail,
} from '@/src/types/community-club';
import type { CommunityPost } from '@/src/types/community';

function unwrap<T>(data: unknown): T {
  const value = data as { data?: T };
  return (value?.data ?? data) as T;
}

export async function followCommunityUser(userId: string) {
  const { data } = await api.post(`/community/follows/${userId}`);
  return unwrap<{ following: boolean }>(data);
}

export async function unfollowCommunityUser(userId: string) {
  const { data } = await api.delete(`/community/follows/${userId}`);
  return unwrap<{ following: boolean }>(data);
}

export async function getFollowingUsers() {
  const { data } = await api.get('/community/follows/following');
  return unwrap<ClubUser[]>(data);
}

export async function getFollowerUsers() {
  const { data } = await api.get('/community/follows/followers');
  return unwrap<ClubUser[]>(data);
}

export async function getCommunityClub(clubId: string) {
  const { data } = await api.get(`/community/clubs/${clubId}`);
  return unwrap<CommunityClubDetail>(data);
}

export async function joinCommunityClub(
  clubId: string,
  message?: string,
) {
  const { data } = await api.post(
    `/community/clubs/${clubId}/join`,
    { message },
  );
  return unwrap<{ status: 'ACTIVE' | 'PENDING' }>(data);
}

export async function leaveCommunityClub(clubId: string) {
  const { data } = await api.delete(
    `/community/clubs/${clubId}/leave`,
  );
  return unwrap<{ joined: boolean }>(data);
}

export async function getClubMembers(clubId: string) {
  const { data } = await api.get(
    `/community/clubs/${clubId}/members`,
  );
  return unwrap<ClubMember[]>(data);
}

export async function updateClubMemberRole(
  clubId: string,
  memberId: string,
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER',
) {
  const { data } = await api.patch(
    `/community/clubs/${clubId}/members/${memberId}`,
    { role },
  );
  return unwrap<ClubMember>(data);
}

export async function removeClubMember(
  clubId: string,
  memberId: string,
) {
  const { data } = await api.delete(
    `/community/clubs/${clubId}/members/${memberId}`,
  );
  return unwrap<{ removed: boolean }>(data);
}

export async function getClubPosts(
  clubId: string,
  cursor?: string,
) {
  const { data } = await api.get(
    `/community/clubs/${clubId}/posts`,
    { params: { cursor } },
  );

  return unwrap<{
    items: CommunityPost[];
    nextCursor: string | null;
  }>(data);
}

export async function createClubPost(
  clubId: string,
  payload: {
    type: string;
    title?: string;
    content: string;
    tags?: string[];
    media?: unknown;
  },
) {
  const { data } = await api.post(
    `/community/clubs/${clubId}/posts`,
    payload,
  );
  return unwrap<CommunityPost>(data);
}

export async function getClubMessages(
  clubId: string,
  cursor?: string,
) {
  const { data } = await api.get(
    `/community/clubs/${clubId}/messages`,
    { params: { cursor } },
  );

  return unwrap<{
    items: ClubMessage[];
    nextCursor: string | null;
  }>(data);
}

export async function sendClubMessage(
  clubId: string,
  content: string,
  media?: unknown,
) {
  const { data } = await api.post(
    `/community/clubs/${clubId}/messages`,
    { content, media },
  );
  return unwrap<ClubMessage>(data);
}

export async function getClubEvents(clubId: string) {
  const { data } = await api.get(
    `/community/clubs/${clubId}/events`,
  );
  return unwrap<ClubEvent[]>(data);
}

export async function createClubEvent(
  clubId: string,
  payload: {
    title: string;
    description?: string;
    startsAt: string;
    endsAt?: string;
    meetingUrl?: string;
  },
) {
  const { data } = await api.post(
    `/community/clubs/${clubId}/events`,
    payload,
  );
  return unwrap<ClubEvent>(data);
}

export async function attendClubEvent(
  clubId: string,
  eventId: string,
) {
  const { data } = await api.post(
    `/community/clubs/${clubId}/events/${eventId}/attend`,
  );
  return unwrap<{ attending: boolean }>(data);
}

export async function getClubResources(clubId: string) {
  const { data } = await api.get(
    `/community/clubs/${clubId}/resources`,
  );
  return unwrap<ClubResource[]>(data);
}

export async function createClubResource(
  clubId: string,
  payload: {
    title: string;
    description?: string;
    type: string;
    url: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
  },
) {
  const { data } = await api.post(
    `/community/clubs/${clubId}/resources`,
    payload,
  );
  return unwrap<ClubResource>(data);
}



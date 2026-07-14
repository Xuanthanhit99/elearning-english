import { api } from "./axios";
import type {
  CommunityChallengeItem,
  CommunityClubItem,
  CommunityCommentItem,
  CommunityConversationItem,
  CommunityFriendRequestItem,
  CommunityLeaderboardItem,
  CommunityMessageItem,
  CommunityUserCard,
  CommunityUserSearchItem,
} from "@/src/types/community-social";

function unwrap<T>(data: unknown): T {
  const value = data as { data?: T };
  return (value?.data ?? data) as T;
}

export async function getPostComments(postId: string) {
  const { data } = await api.get(`/community/posts/${postId}/comments`);
  return unwrap<CommunityCommentItem[]>(data);
}

export async function searchCommunityUsers(q: string) {
  const { data } = await api.get("/community/users/search", {
    params: { q },
  });
  return unwrap<CommunityUserSearchItem[]>(data);
}

export async function getCommunityFriends() {
  const { data } = await api.get("/community/friends");
  return unwrap<CommunityUserCard[]>(data);
}

export async function getCommunityFriendRequests() {
  const { data } = await api.get("/community/friend-requests");
  return unwrap<CommunityFriendRequestItem[]>(data);
}

export async function sendCommunityFriendRequest(userId: string) {
  const { data } = await api.post(`/community/friends/requests/${userId}`);
  return unwrap(data);
}

export async function acceptCommunityFriendRequest(requestId: string) {
  const { data } = await api.patch(
    `/community/friends/requests/${requestId}/accept`,
  );
  return unwrap(data);
}

export async function rejectCommunityFriendRequest(requestId: string) {
  const { data } = await api.patch(
    `/community/friends/requests/${requestId}/reject`,
  );
  return unwrap(data);
}

export async function removeCommunityFriend(friendId: string) {
  const { data } = await api.delete(`/community/friends/${friendId}`);
  return unwrap(data);
}

export async function getCommunityClubs(search?: string) {
  const { data } = await api.get("/community/clubs", {
    params: { search },
  });
  return unwrap<CommunityClubItem[]>(data);
}

export async function joinCommunityClub(clubId: string) {
  const { data } = await api.post(`/community/clubs/${clubId}/join`);
  return unwrap<{ joined: boolean }>(data);
}

export async function leaveCommunityClub(clubId: string) {
  const { data } = await api.delete(`/community/clubs/${clubId}/leave`);
  return unwrap<{ joined: boolean }>(data);
}

export async function getCommunityChallenges() {
  const { data } = await api.get("/community/challenges");
  return unwrap<CommunityChallengeItem[]>(data);
}

export async function joinCommunityChallenge(challengeId: string) {
  const { data } = await api.post(`/community/challenges/${challengeId}/join`);
  return unwrap<{ joined: boolean }>(data);
}

export async function updateCommunityChallengeProgress(
  challengeId: string,
  progress: number,
) {
  const { data } = await api.patch(
    `/community/challenges/${challengeId}/progress`,
    { progress },
  );
  return unwrap<NonNullable<CommunityChallengeItem["myProgress"]>>(data);
}

export async function getCommunityLeaderboard(
  period: "WEEKLY" | "MONTHLY" | "ALL_TIME",
) {
  const { data } = await api.get("/community/leaderboard", {
    params: { period },
  });
  return unwrap<CommunityLeaderboardItem[]>(data);
}

export async function getCommunityConversations() {
  const { data } = await api.get("/community/conversations");
  return unwrap<CommunityConversationItem[]>(data);
}

export async function openCommunityDirectConversation(userId: string) {
  const { data } = await api.post(`/community/conversations/direct/${userId}`);
  return unwrap<{ id: string }>(data);
}

export async function getCommunityMessages(
  conversationId: string,
  cursor?: string,
) {
  const { data } = await api.get(
    `/community/conversations/${conversationId}/messages`,
    { params: { cursor } },
  );
  return unwrap<{
    items: CommunityMessageItem[];
    nextCursor: string | null;
  }>(data);
}

export async function sendCommunityMessage(
  conversationId: string,
  content: string,
  media?: {
    type: "IMAGE" | "AUDIO" | "FILE";
    url: string;
    name: string;
  },
) {
  const { data } = await api.post(
    `/community/conversations/${conversationId}/messages`,
    {
      content,
      media,
    },
  );

  return unwrap<CommunityMessageItem>(data);
}

export async function createCommunityClub(payload: {
  name: string;
  description?: string;
  privacy?: "PUBLIC" | "PRIVATE";
  category?: string;
  tags?: string[];
  coverUrl?: string;
  iconUrl?: string;
}) {
  const { data } = await api.post("/community/clubs", payload);
  return unwrap<CommunityClubItem>(data);
}

export async function uploadCommunityFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/community/uploads", formData);

  return (data?.data ?? data) as {
    type: "IMAGE" | "AUDIO" | "FILE";
    name: string;
    fileName: string;
    relativeUrl: string;
    url: string;
  };
}

export async function createCommunityChallenge(payload: {
  title: string;
  description: string;
  target: number;
  unit: string;
  rewardXp?: number;
  startsAt: string;
  endsAt: string;
  clubId?: string;
  challengeType?: string;
  audience?: string;
  maxParticipants?: number;
  badge?: string;
  coverUrl?: string;
}) {
  const { data } = await api.post("/community/challenges", payload);
  return unwrap<CommunityChallengeItem>(data);
}

import { api } from '@/src/lib/axios';

function unwrap<T>(data: unknown): T {
  const value = data as { data?: T };
  return (value?.data ?? data) as T;
}

export async function getClubManagement(clubId: string) {
  const { data } = await api.get(`/community/clubs/${clubId}/management`);
  return unwrap<any>(data);
}

export async function requestJoinClub(clubId: string, message?: string) {
  const { data } = await api.post(`/community/clubs/${clubId}/join-request`, {
    message,
  });
  return unwrap(data);
}

export async function approveClubJoinRequest(clubId: string, requestId: string) {
  const { data } = await api.patch(
    `/community/clubs/${clubId}/join-requests/${requestId}/approve`,
  );
  return unwrap(data);
}

export async function rejectClubJoinRequest(clubId: string, requestId: string) {
  const { data } = await api.patch(
    `/community/clubs/${clubId}/join-requests/${requestId}/reject`,
  );
  return unwrap(data);
}

export async function inviteClubMember(
  clubId: string,
  inviteeUserId: string,
  message?: string,
) {
  const { data } = await api.post(`/community/clubs/${clubId}/invites`, {
    inviteeUserId,
    message,
  });
  return unwrap(data);
}

export async function transferClubOwnership(
  clubId: string,
  newOwnerUserId: string,
) {
  const { data } = await api.patch(
    `/community/clubs/${clubId}/transfer-ownership`,
    { newOwnerUserId },
  );
  return unwrap(data);
}

export async function updateClubMemberRole(
  clubId: string,
  memberId: string,
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER',
) {
  const { data } = await api.patch(
    `/community/clubs/${clubId}/members/${memberId}/role`,
    { role },
  );
  return unwrap(data);
}

export async function kickClubMember(clubId: string, memberId: string) {
  const { data } = await api.delete(
    `/community/clubs/${clubId}/members/${memberId}/kick`,
  );
  return unwrap(data);
}

export async function leaveClubSafely(clubId: string) {
  const { data } = await api.delete(`/community/clubs/${clubId}/leave-safe`);
  return unwrap(data);
}

export async function deleteClubSafely(clubId: string) {
  const { data } = await api.delete(`/community/clubs/${clubId}/delete-safe`);
  return unwrap(data);
}

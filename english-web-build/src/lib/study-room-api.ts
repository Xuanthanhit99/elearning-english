import { api } from "@/src/lib/axios";

export type StudyRoomVisibility = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
export type StudyRoomStatus = "WAITING" | "IN_SESSION" | "ENDED";
export type StudyRoomMemberRole = "HOST" | "MEMBER";
export type StudyRoomMemberStatus = "ACTIVE" | "MUTED" | "KICKED" | "BANNED" | "LEFT";

export type StudyRoomUser = {
  id: string;
  fullname: string | null;
  username: string | null;
  avatar: string | null;
  level?: number;
};

export type StudyRoomMember = {
  id: string;
  roomId: string;
  userId: string;
  role: StudyRoomMemberRole;
  status: StudyRoomMemberStatus;
  ready: boolean;
  joinedAt: string;
  leftAt: string | null;
  user: StudyRoomUser;
};

export type StudyRoomSummary = {
  id: string;
  name: string;
  topic: string | null;
  visibility: StudyRoomVisibility;
  status: StudyRoomStatus;
  goalMinutes: number;
  maxMembers: number;
  memberCount: number;
  host: StudyRoomUser;
  scheduledStartAt: string | null;
  createdAt: string;
};

export type StudySession = {
  id: string;
  roomId: string;
  goalMinutes: number;
  startedAt: string;
  endsAt: string;
  endedAt: string | null;
  participantCount: number;
  summary: string | null;
};

export type StudyRoomDetail = {
  id: string;
  hostId: string;
  name: string;
  description: string | null;
  topic: string | null;
  visibility: StudyRoomVisibility;
  inviteCode: string | null;
  goalMinutes: number;
  maxMembers: number;
  status: StudyRoomStatus;
  scheduledStartAt: string | null;
  createdAt: string;
  members: StudyRoomMember[];
  activeSession: StudySession | null;
};

export type StudySessionHistoryItem = StudySession & {
  participants: Array<{ userId: string; minutesPresent: number; xpAwarded: number }>;
};

export async function listStudyRooms(
  params: { status?: StudyRoomStatus; search?: string; cursor?: string; limit?: number } = {},
) {
  const response = await api.get<{ items: StudyRoomSummary[]; nextCursor: string | null }>(
    "/study-rooms",
    { params },
  );
  return response.data;
}

export async function myStudyRooms() {
  const response = await api.get<StudyRoomSummary[]>("/study-rooms/mine");
  return response.data;
}

export async function getStudyRoom(roomId: string) {
  const response = await api.get<StudyRoomDetail>(`/study-rooms/${roomId}`);
  return response.data;
}

export async function getStudyRoomHistory(roomId: string) {
  const response = await api.get<StudySessionHistoryItem[]>(`/study-rooms/${roomId}/history`);
  return response.data;
}

export async function createStudyRoom(payload: {
  name: string;
  description?: string;
  topic?: string;
  visibility?: StudyRoomVisibility;
  goalMinutes?: number;
  maxMembers?: number;
  scheduledStartAt?: string;
}) {
  const response = await api.post<StudyRoomDetail>("/study-rooms", payload);
  return response.data;
}

export async function joinStudyRoom(roomId: string) {
  const response = await api.post<StudyRoomDetail>(`/study-rooms/${roomId}/join`);
  return response.data;
}

export async function joinStudyRoomByCode(inviteCode: string) {
  const response = await api.post<StudyRoomDetail>("/study-rooms/join-by-code", { inviteCode });
  return response.data;
}

export async function leaveStudyRoom(roomId: string) {
  const response = await api.delete<{ left: boolean }>(`/study-rooms/${roomId}/leave`);
  return response.data;
}

export async function startStudySession(roomId: string) {
  const response = await api.post<StudySession>(`/study-rooms/${roomId}/start`);
  return response.data;
}

export async function endStudySession(roomId: string) {
  const response = await api.post<StudySession>(`/study-rooms/${roomId}/end`);
  return response.data;
}

export async function kickStudyRoomMember(roomId: string, userId: string) {
  const response = await api.post<{ removed: boolean }>(
    `/study-rooms/${roomId}/members/${userId}/kick`,
  );
  return response.data;
}

export async function banStudyRoomMember(roomId: string, userId: string) {
  const response = await api.post<{ removed: boolean }>(
    `/study-rooms/${roomId}/members/${userId}/ban`,
  );
  return response.data;
}

export async function muteStudyRoomMember(roomId: string, userId: string, muted: boolean) {
  const response = await api.post<{ status: StudyRoomMemberStatus }>(
    `/study-rooms/${roomId}/members/${userId}/${muted ? "mute" : "unmute"}`,
  );
  return response.data;
}

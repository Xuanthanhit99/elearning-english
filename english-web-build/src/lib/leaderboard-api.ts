import { LeaderboardResponse } from '../types/leaderboard';
import { api } from './axios';

const unwrap = <T>(response: any): T => response.data?.data ?? response.data;

export async function getWeeklyLeaderboard() {
  return unwrap<LeaderboardResponse>(await api.get('/leaderboards/weekly'));
}

export async function getMonthlyLeaderboard() {
  return unwrap<LeaderboardResponse>(await api.get('/leaderboards/monthly'));
}

export async function getFriendsLeaderboard() {
  return unwrap<LeaderboardResponse>(await api.get('/leaderboards/friends'));
}

export async function getClubLeaderboard(clubId: string) {
  return unwrap<LeaderboardResponse>(await api.get(`/leaderboards/clubs/${clubId}`));
}

export async function getSkillLeaderboard(skill: string) {
  return unwrap<LeaderboardResponse>(await api.get(`/leaderboards/skills/${skill}`));
}

export async function getLeaderboardHistory() {
  return unwrap<any[]>(await api.get('/leaderboards/history'));
}

export async function getLeaderboardRewards() {
  return unwrap<any[]>(await api.get('/leaderboards/rewards'));
}

export async function claimLeaderboardReward(assignmentId: string) {
  return unwrap(await api.post(`/leaderboards/rewards/${assignmentId}/claim`));
}

export async function updateLeaderboardPrivacy(payload: Record<string, unknown>) {
  return unwrap(await api.patch('/leaderboards/privacy', payload));
}

export async function getMyLeaderboardClubs() {
  return unwrap<
    Array<{
      id: string;
      name: string;
      iconUrl?: string | null;
      memberCount: number;
    }>
  >(
    await api.get('/leaderboards/my-clubs'),
  );
}

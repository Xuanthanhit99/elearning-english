import { api } from "./axios";

export async function getMyLeaderboardRewards() {
  const response = await api.get('/leaderboard/rewards');
  return response.data;
}

export async function claimLeaderboardReward(id: string) {
  const response = await api.post(`/leaderboard/rewards/${id}/claim`);
  return response.data;
}

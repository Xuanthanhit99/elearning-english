'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { LeaderboardResponse, LeaderboardScope } from '../types/leaderboard';
import { getClubLeaderboard, getFriendsLeaderboard, getGlobalLeaderboard } from '../lib/leaderboard-api';

export function useLeaderboard(input: {
  scope: LeaderboardScope;
  clubId?: string;
}) {
  const [data, setData] =
    useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (input.scope === 'FRIENDS') {
        setData(await getFriendsLeaderboard());
        return;
      }

      if (input.scope === 'CLUB') {
        if (!input.clubId) {
          setData(null);
          return;
        }

        setData(
          await getClubLeaderboard(input.clubId),
        );
        return;
      }

      setData(await getGlobalLeaderboard());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Không thể tải bảng xếp hạng.',
      );
    } finally {
      setLoading(false);
    }
  }, [input.scope, input.clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    loading,
    error,
    refetch: load,
  };
}

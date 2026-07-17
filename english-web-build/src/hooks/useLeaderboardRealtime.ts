'use client';

import { useEffect } from 'react';
import { getLeaderboardSocket } from '@/src/lib/leaderboard-socket';
import type { WeeklyResultPayload } from '@/src/types/leaderboard';

export function useLeaderboardRealtime(input: {
  groupId?: string | null;
  onLeaderboardUpdated?: () => void;
  onWeeklyResult?: (
    result: WeeklyResultPayload,
  ) => void;
  onRewardAvailable?: () => void;
  onSeasonStarted?: () => void;
}) {
  useEffect(() => {
    const socket = getLeaderboardSocket();

    if (input.groupId) {
      socket.emit('leaderboard:join-group', {
        groupId: input.groupId,
      });
    }

    const updated = () =>
      input.onLeaderboardUpdated?.();

    const weekly = (
      payload: WeeklyResultPayload,
    ) => input.onWeeklyResult?.(payload);

    const reward = () =>
      input.onRewardAvailable?.();

    const season = () =>
      input.onSeasonStarted?.();

    socket.on(
      'leaderboard:group-updated',
      updated,
    );
    socket.on(
      'leaderboard:weekly-result',
      weekly,
    );
    socket.on(
      'leaderboard:reward-available',
      reward,
    );
    socket.on(
      'leaderboard:season-started',
      season,
    );

    return () => {
      if (input.groupId) {
        socket.emit('leaderboard:leave-group', {
          groupId: input.groupId,
        });
      }

      socket.off(
        'leaderboard:group-updated',
        updated,
      );
      socket.off(
        'leaderboard:weekly-result',
        weekly,
      );
      socket.off(
        'leaderboard:reward-available',
        reward,
      );
      socket.off(
        'leaderboard:season-started',
        season,
      );
    };
  }, [
    input.groupId,
    input.onLeaderboardUpdated,
    input.onWeeklyResult,
    input.onRewardAvailable,
    input.onSeasonStarted,
  ]);
}

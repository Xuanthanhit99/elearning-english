'use client';

import { useEffect } from 'react';
import { getLeaderboardSocket } from '../lib/leaderboard-socket';
import { WeeklyResultPayload } from '../types/leaderboard';

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
    const socket =
      getLeaderboardSocket();

    if (input.groupId) {
      socket.emit(
        'leaderboard:join-group',
        {
          groupId: input.groupId,
        },
      );
    }

    const onUpdated = () =>
      input.onLeaderboardUpdated?.();

    const onWeekly = (
      payload: WeeklyResultPayload,
    ) =>
      input.onWeeklyResult?.(payload);

    const onReward = () =>
      input.onRewardAvailable?.();

    const onSeason = () =>
      input.onSeasonStarted?.();

    socket.on(
      'leaderboard:group-updated',
      onUpdated,
    );

    socket.on(
      'leaderboard:weekly-result',
      onWeekly,
    );

    socket.on(
      'leaderboard:reward-available',
      onReward,
    );

    socket.on(
      'leaderboard:season-started',
      onSeason,
    );

    return () => {
      if (input.groupId) {
        socket.emit(
          'leaderboard:leave-group',
          {
            groupId: input.groupId,
          },
        );
      }

      socket.off(
        'leaderboard:group-updated',
        onUpdated,
      );

      socket.off(
        'leaderboard:weekly-result',
        onWeekly,
      );

      socket.off(
        'leaderboard:reward-available',
        onReward,
      );

      socket.off(
        'leaderboard:season-started',
        onSeason,
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

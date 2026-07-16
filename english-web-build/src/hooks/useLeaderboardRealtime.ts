'use client';

import {
  useEffect,
  useRef,
} from 'react';
import {
  connectLeaderboardSocket,
} from '@/lib/leaderboard-realtime';

type GroupUpdate = {
  userId: string;
  periodXp: number;
  rank?: number;
};

export function useLeaderboardRealtime(input: {
  userId: string;
  groupId?: string;
  onGroupUpdated?: (
    payload: GroupUpdate,
  ) => void;
  onWeeklyResult?: (
    payload: unknown,
  ) => void;
  onSeasonStarted?: (
    payload: unknown,
  ) => void;
}) {
  const handlers = useRef(input);
  handlers.current = input;

  useEffect(() => {
    if (!input.userId) {
      return;
    }

    const socket =
      connectLeaderboardSocket(
        input.userId,
      );

    if (input.groupId) {
      socket.emit(
        'leaderboard:join-group',
        {
          groupId: input.groupId,
        },
      );
    }

    const onGroup = (
      payload: GroupUpdate,
    ) => {
      handlers.current
        .onGroupUpdated?.(payload);
    };

    const onWeekly = (
      payload: unknown,
    ) => {
      handlers.current
        .onWeeklyResult?.(payload);
    };

    const onSeason = (
      payload: unknown,
    ) => {
      handlers.current
        .onSeasonStarted?.(payload);
    };

    socket.on(
      'leaderboard:group-updated',
      onGroup,
    );

    socket.on(
      'leaderboard:weekly-result',
      onWeekly,
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
        onGroup,
      );

      socket.off(
        'leaderboard:weekly-result',
        onWeekly,
      );

      socket.off(
        'leaderboard:season-started',
        onSeason,
      );
    };
  }, [
    input.userId,
    input.groupId,
  ]);
}

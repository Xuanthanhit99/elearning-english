import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { socketNamespaces } from '../../../services/socket/namespaces';
import { getAuthenticatedSocket } from '../../../services/socket/socket-manager';
import { leaderboardKeys } from '../query-keys';
import type { LeaderboardEntry, LeaderboardRealtimeEvent } from '../types/leaderboard';
import { replaceLeaderboardGroup } from './useLeaderboardQuery';

type GroupUpdatedPayload = LeaderboardRealtimeEvent & {
  entries?: LeaderboardEntry[];
};

export function useLeaderboardRealtime(groupId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return undefined;

    let active = true;
    let cleanup: (() => void) | undefined;

    void getAuthenticatedSocket(socketNamespaces.leaderboard).then((socket) => {
      if (!active || !socket) return;

      const joinGroup = () => {
        socket.emit('leaderboard:join-group', { groupId });
      };
      const onGroupUpdated = (payload: GroupUpdatedPayload) => {
        if (payload.groupId !== groupId) return;
        if (payload.entries?.length) {
          replaceLeaderboardGroup(queryClient, groupId, payload.entries);
        }
        void queryClient.invalidateQueries({ queryKey: leaderboardKeys.lists() });
      };
      const onRefresh = () => {
        void queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
      };

      if (socket.connected) joinGroup();
      socket.on('connect', joinGroup);
      socket.on('leaderboard:group-updated', onGroupUpdated);
      socket.on('leaderboard:weekly-result', onRefresh);
      socket.on('leaderboard:reward-available', onRefresh);
      socket.on('leaderboard:season-started', onRefresh);

      cleanup = () => {
        socket.emit('leaderboard:leave-group', { groupId });
        socket.off('connect', joinGroup);
        socket.off('leaderboard:group-updated', onGroupUpdated);
        socket.off('leaderboard:weekly-result', onRefresh);
        socket.off('leaderboard:reward-available', onRefresh);
        socket.off('leaderboard:season-started', onRefresh);
      };
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [groupId, queryClient]);
}

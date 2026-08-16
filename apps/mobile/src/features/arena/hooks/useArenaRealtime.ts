import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { socketNamespaces } from '../../../services/socket/namespaces';
import { getAuthenticatedSocket } from '../../../services/socket/socket-manager';
import { arenaKeys } from '../query-keys';
import type { ArenaRoom } from '../types/arena';

export function useArenaRoomRealtime(roomId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roomId) return undefined;

    let active = true;
    let cleanup: (() => void) | undefined;
    let lastRevision = -1;

    void getAuthenticatedSocket(socketNamespaces.arena).then((socket) => {
      if (!active || !socket) return;

      const joinRoom = () => {
        socket.emit('arena:room:join', { roomId });
        socket.emit('arena:resume', { roomId });
      };
      const onSnapshot = (room: ArenaRoom) => {
        if (room.id !== roomId) return;
        const revision = room.activeMatch?.revision ?? 0;
        if (revision < lastRevision) return;
        lastRevision = revision;
        queryClient.setQueryData(arenaKeys.room(roomId), room);
      };
      const onRefresh = () => {
        void queryClient.invalidateQueries({ queryKey: arenaKeys.room(roomId) });
      };

      if (socket.connected) joinRoom();
      socket.on('connect', joinRoom);
      socket.on('arena:room:snapshot', onSnapshot);
      socket.on('arena:connected', onRefresh);
      socket.on('arena:unauthorized', onRefresh);

      cleanup = () => {
        socket.emit('arena:room:leave', { roomId });
        socket.off('connect', joinRoom);
        socket.off('arena:room:snapshot', onSnapshot);
        socket.off('arena:connected', onRefresh);
        socket.off('arena:unauthorized', onRefresh);
      };
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [queryClient, roomId]);
}

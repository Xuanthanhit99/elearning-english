"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectArenaSocket,
  joinArenaRoom,
  leaveArenaRoom,
  resumeArenaRoom,
} from "@/src/lib/arena-socket";

/*
 * Drives the Arena room socket lifecycle for a given roomId: joins the
 * room's private channel on connect, applies pushed snapshots (ignoring any
 * with a `revision` older than the last one applied, since Socket.IO/Redis
 * fan-out doesn't guarantee ordering across reconnects), and exposes
 * `connected` so callers can pause their REST polling fallback while the
 * socket is live.
 */
export function useArenaRealtime<TSnapshot extends { revision?: number }>(
  roomId: string | undefined,
  onSnapshot: (snapshot: TSnapshot) => void,
) {
  const [connected, setConnected] = useState(false);
  const lastRevisionRef = useRef<number>(-Infinity);
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  const applySnapshot = useCallback((snapshot: TSnapshot) => {
    const revision = typeof snapshot?.revision === "number" ? snapshot.revision : undefined;
    if (revision !== undefined) {
      if (revision < lastRevisionRef.current) return;
      lastRevisionRef.current = revision;
    }
    onSnapshotRef.current(snapshot);
  }, []);

  useEffect(() => {
    if (!roomId) return undefined;
    const socket = connectArenaSocket();
    if (!socket) return undefined;

    let cancelled = false;

    const handleConnect = () => {
      if (cancelled) return;
      setConnected(true);
      void joinArenaRoom(roomId);
    };
    const handleDisconnect = () => {
      if (cancelled) return;
      setConnected(false);
    };
    const handleSnapshot = (snapshot: TSnapshot) => {
      if (cancelled) return;
      applySnapshot(snapshot);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("arena:room:snapshot", handleSnapshot);

    if (socket.connected) {
      setConnected(true);
      void joinArenaRoom(roomId);
    }

    return () => {
      cancelled = true;
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("arena:room:snapshot", handleSnapshot);
      leaveArenaRoom(roomId);
    };
  }, [roomId, applySnapshot]);

  const resume = useCallback(() => {
    if (!roomId) return Promise.resolve({ joined: false });
    return resumeArenaRoom(roomId);
  }, [roomId]);

  return { connected, resume };
}

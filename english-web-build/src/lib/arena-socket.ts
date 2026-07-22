"use client";

import { io, Socket } from "socket.io-client";
import { refreshSession } from "@/src/lib/axios";

let socket: Socket | null = null;
let refreshing = false;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export type ArenaUnauthorizedCode = "TOKEN_EXPIRED" | "INVALID_SESSION";

export function connectArenaSocket() {
  if (typeof window === "undefined") return null;
  if (socket?.connected || socket?.active) return socket;

  socket = io(`${API_BASE_URL}/arena`, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  });

  socket.on("arena:unauthorized", (payload: { code?: ArenaUnauthorizedCode }) => {
    void handleUnauthorized(payload?.code);
  });

  return socket;
}

// Mirrors the single-flight `refreshSession()` mutex the REST axios
// interceptor already uses: whichever caller (this socket, or a REST 401
// elsewhere) hits it first, everyone else awaits the same in-flight
// `/auth/refresh` call instead of firing N parallel refreshes.
async function handleUnauthorized(code?: ArenaUnauthorizedCode) {
  const current = socket;

  if (code !== "TOKEN_EXPIRED") {
    disconnectArenaSocket();
    return;
  }

  if (refreshing) return;
  refreshing = true;

  current?.disconnect();

  try {
    await refreshSession();
    // Cookie was rotated by /auth/refresh — drop the old client and open a
    // fresh connection so the new access_token cookie is actually sent.
    socket = null;
    connectArenaSocket();
  } catch {
    disconnectArenaSocket();
  } finally {
    refreshing = false;
  }
}

export function disconnectArenaSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function joinArenaRoom(roomId: string) {
  return new Promise<{ joined: boolean }>((resolve) => {
    const current = connectArenaSocket();
    if (!current) {
      resolve({ joined: false });
      return;
    }
    if (current.connected) {
      current.emit("arena:room:join", { roomId }, resolve);
    } else {
      current.once("connect", () => current.emit("arena:room:join", { roomId }, resolve));
    }
  });
}

export function leaveArenaRoom(roomId: string) {
  socket?.emit("arena:room:leave", { roomId });
}

export function resumeArenaRoom(roomId: string) {
  return new Promise<{ joined: boolean }>((resolve) => {
    if (!socket?.connected) {
      resolve({ joined: false });
      return;
    }
    socket.emit("arena:resume", { roomId }, resolve);
  });
}

export function getArenaSocket() {
  return socket;
}

export type ArenaPowerUpType = "DOUBLE_SCORE" | "SHIELD" | "TIME_BOOST" | "FREEZE";

export type ArenaPowerUpAck =
  | { ok: true; type: ArenaPowerUpType; status: "APPLIED" | "BLOCKED"; targetUserId: string }
  | { error: string };

export function usePowerUpAction(roomId: string, type: ArenaPowerUpType) {
  return new Promise<ArenaPowerUpAck>((resolve) => {
    const current = socket;
    if (!current?.connected) {
      resolve({ error: "ARENA_MATCH_NOT_PLAYING" });
      return;
    }
    const clientRequestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    current.emit("arena:power-up:use", { roomId, type, clientRequestId }, resolve);
  });
}

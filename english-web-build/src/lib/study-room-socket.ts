"use client";

import { io, Socket } from "socket.io-client";
import { refreshSession } from "@/src/lib/axios";

let socket: Socket | null = null;
let refreshing = false;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export type StudyRoomUnauthorizedCode = "TOKEN_EXPIRED" | "INVALID_SESSION";

// Mirrors arena-socket.ts's connection/reconnect/token-refresh handling —
// deliberately not community-socket.ts's bare `io()` call (flagged in the
// Step 0 audit as the weakest of the 4 existing socket clients: no
// reconnection options, no unauthorized handling at all).
export function connectStudyRoomSocket() {
  if (typeof window === "undefined") return null;
  if (socket?.connected || socket?.active) return socket;

  socket = io(`${API_BASE_URL}/study-room`, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  });

  socket.on("study-room:unauthorized", (payload: { code?: StudyRoomUnauthorizedCode }) => {
    void handleUnauthorized(payload?.code);
  });

  return socket;
}

async function handleUnauthorized(code?: StudyRoomUnauthorizedCode) {
  const current = socket;

  if (code !== "TOKEN_EXPIRED") {
    disconnectStudyRoomSocket();
    return;
  }

  if (refreshing) return;
  refreshing = true;

  current?.disconnect();

  try {
    await refreshSession();
    socket = null;
    connectStudyRoomSocket();
  } catch {
    disconnectStudyRoomSocket();
  } finally {
    refreshing = false;
  }
}

export function disconnectStudyRoomSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function getStudyRoomSocket() {
  return socket;
}

export function joinStudyRoomSocket(roomId: string) {
  return new Promise<{ joined: boolean }>((resolve) => {
    const current = connectStudyRoomSocket();
    if (!current) {
      resolve({ joined: false });
      return;
    }
    if (current.connected) {
      current.emit("study-room:join", { roomId }, resolve);
    } else {
      current.once("connect", () => current.emit("study-room:join", { roomId }, resolve));
    }
  });
}

export function resumeStudyRoomSocket(roomId: string) {
  return new Promise<{ joined: boolean }>((resolve) => {
    const current = connectStudyRoomSocket();
    if (!current) {
      resolve({ joined: false });
      return;
    }
    if (current.connected) {
      current.emit("study-room:resume", { roomId }, resolve);
    } else {
      current.once("connect", () => current.emit("study-room:resume", { roomId }, resolve));
    }
  });
}

export function leaveStudyRoomSocket(roomId: string) {
  socket?.emit("study-room:leave", { roomId });
}

export function setStudyRoomReady(roomId: string, ready: boolean) {
  return new Promise<{ updated: boolean }>((resolve) => {
    if (!socket?.connected) {
      resolve({ updated: false });
      return;
    }
    socket.emit("study-room:ready", { roomId, ready }, resolve);
  });
}

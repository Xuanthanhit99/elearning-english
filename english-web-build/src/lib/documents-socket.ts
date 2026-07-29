"use client";

import { io, Socket } from "socket.io-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export type DocumentProcessingProgressEvent = {
  documentId: string;
  versionId: string | null;
  status: string;
  progress: number;
  currentStep: string | null;
};

export type DocumentProcessingFailedEvent = {
  documentId: string;
  versionId: string | null;
  message: string;
};

export type DocumentPublishedEvent = {
  documentId: string;
  versionId: string;
  slug: string;
};

let socket: Socket | null = null;

/** Lazily connects (or reuses) the shared `/documents` realtime namespace,
 * mirroring notification-socket.ts's cookie-auth pattern. Callers subscribe
 * to specific document rooms with `subscribeToDocument` and should attach
 * their own `.on(...)` listeners on the returned socket. */
export function connectDocumentsSocket() {
  if (typeof window === "undefined") return null;
  if (socket?.connected || socket?.active) return socket;

  socket = io(`${API_BASE_URL}/documents`, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function subscribeToDocument(documentId: string) {
  const current = connectDocumentsSocket();
  if (!current) return;
  if (current.connected) {
    current.emit("document:subscribe", { documentId });
  } else {
    current.once("connect", () => current.emit("document:subscribe", { documentId }));
  }
}

export function unsubscribeFromDocument(documentId: string) {
  if (!socket) return;
  socket.emit("document:unsubscribe", { documentId });
}

export function disconnectDocumentsSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

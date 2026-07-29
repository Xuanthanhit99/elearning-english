"use client";

// Socket.IO client for the `/documents` namespace (cookie-auth, same shape
// as src/lib/notification-socket.ts). Used by the admin moderation queue and
// the Gemini generator progress view to live-update instead of polling.
//
// Unlike the notification socket there is no dedicated Zustand store for
// document events — callers subscribe directly with `onDocumentEvent`
// and manage `document:subscribe` / `document:unsubscribe` per documentId
// they currently have open on screen.
import { io, Socket } from "socket.io-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

let socket: Socket | null = null;
let refCount = 0;

export type DocumentProcessingProgressEvent = {
  documentId: string;
  versionId: string;
  status: string;
  progress: number;
  currentStep?: string | null;
};

export type DocumentProcessingFailedEvent = {
  documentId: string;
  versionId: string;
  message: string;
};

export type DocumentModerationUpdatedEvent = {
  documentId: string;
  [key: string]: unknown;
};

export type DocumentPublishedEvent = {
  documentId: string;
  [key: string]: unknown;
};

export type AdminDocumentSocketEventMap = {
  "document.processing.progress": DocumentProcessingProgressEvent;
  "document.processing.failed": DocumentProcessingFailedEvent;
  "document.moderation.updated": DocumentModerationUpdatedEvent;
  "document.published": DocumentPublishedEvent;
};

/**
 * Connects (or reuses) the shared `/documents` socket. Reference-counted so
 * multiple components mounting/unmounting on the same page don't tear the
 * connection down from under each other — call `releaseDocumentSocket()`
 * on cleanup instead of disconnecting directly.
 */
export function connectDocumentSocket() {
  if (typeof window === "undefined") return null;
  refCount += 1;

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

export function releaseDocumentSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToDocument(documentId: string) {
  socket?.emit("document:subscribe", { documentId });
}

export function unsubscribeFromDocument(documentId: string) {
  socket?.emit("document:unsubscribe", { documentId });
}

// `Socket.on`/`.off` overloads resolve through a conditional type keyed on
// their event-name generic; called with our own generic `K` (not a
// concrete literal at this call site) that conditional never simplifies,
// so TS can't prove a plain listener is assignable no matter how it's
// cast. Sidestep it by calling through this minimal untyped-emitter shape
// instead of the full `Socket` type — there is no server-defined event
// map for this namespace anyway.
type UntypedEmitter = {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function onDocumentEvent<K extends keyof AdminDocumentSocketEventMap>(
  event: K,
  handler: (payload: AdminDocumentSocketEventMap[K]) => void,
) {
  const emitter = socket as unknown as UntypedEmitter | null;
  const looseHandler = handler as (...args: unknown[]) => void;
  emitter?.on(event, looseHandler);
  return () => {
    emitter?.off(event, looseHandler);
  };
}

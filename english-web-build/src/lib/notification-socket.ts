"use client";

import { io, Socket } from "socket.io-client";
import { NotificationItem } from "@/src/lib/notifications-api";
import { useNotificationStore } from "@/src/store/notificationStore";

let socket: Socket | null = null;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export function connectNotificationSocket() {
  if (typeof window === "undefined") return null;
  if (socket?.connected || socket?.active) return socket;

  socket = io(`${API_BASE_URL}/notifications`, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    void useNotificationStore.getState().load(1);
    void useNotificationStore.getState().refreshUnread();
  });

  socket.on("reconnect", () => {
    void useNotificationStore.getState().load(1);
    void useNotificationStore.getState().refreshUnread();
  });

  socket.on("notification:created", (item: NotificationItem) => {
    useNotificationStore.getState().mergeRealtime(item);
  });

  socket.on("notification:updated", (item: NotificationItem) => {
    useNotificationStore.setState((state) => ({
      items: state.items.map((current) =>
        current.id === item.id ? item : current,
      ),
    }));
    void useNotificationStore.getState().refreshUnread();
  });

  socket.on("notification:archived", (item: NotificationItem) => {
    useNotificationStore.setState((state) => ({
      items: state.items.filter((current) => current.id !== item.id),
    }));
    void useNotificationStore.getState().refreshUnread();
  });

  socket.on("notification:unread-count", ({ unreadCount }: { unreadCount: number }) => {
    useNotificationStore.getState().setUnreadCount(unreadCount);
  });

  socket.on("notification:unauthorized", () => {
    disconnectNotificationSocket();
  });

  return socket;
}

export function disconnectNotificationSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

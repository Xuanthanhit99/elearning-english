"use client";

import {
  archiveNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationItem,
} from "@/src/lib/notifications-api";
import { create } from "zustand";

type NotificationState = {
  items: NotificationItem[];
  page: number;
  hasMore: boolean;
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  load: (page?: number) => Promise<void>;
  refreshUnread: () => Promise<void>;
  mergeRealtime: (item: NotificationItem) => void;
  setUnreadCount: (count: number) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
  clear: () => void;
};

function upsertNotification(items: NotificationItem[], item: NotificationItem) {
  const exists = items.some((current) => current.id === item.id);
  const next = exists
    ? items.map((current) => (current.id === item.id ? item : current))
    : [item, ...items];

  return next.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      b.id.localeCompare(a.id),
  );
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  page: 1,
  hasMore: false,
  unreadCount: 0,
  loading: false,
  loadingMore: false,
  error: "",

  async load(page = 1) {
    try {
      set({ [page === 1 ? "loading" : "loadingMore"]: true, error: "" });
      const data = await getNotifications({ page, limit: page === 1 ? 8 : 20 });
      set((state) => ({
        items: page === 1 ? data.items : [...state.items, ...data.items],
        page,
        hasMore: data.meta.hasMore,
        unreadCount: data.meta.unreadCount,
        error: "",
      }));
    } catch {
      set({ error: "Chua tai duoc thong bao." });
    } finally {
      set({ loading: false, loadingMore: false });
    }
  },

  async refreshUnread() {
    try {
      const unreadCount = await getUnreadNotificationCount();
      set({ unreadCount });
    } catch {
      set({ unreadCount: 0 });
    }
  },

  mergeRealtime(item) {
    set((state) => ({
      items: upsertNotification(state.items, item),
      unreadCount: item.isRead ? state.unreadCount : state.unreadCount + 1,
    }));
  },

  setUnreadCount(unreadCount) {
    set({ unreadCount });
  },

  async markRead(id) {
    const previous = get().items;
    const wasUnread = previous.some((item) => item.id === id && !item.isRead);
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, isRead: true, read: true } : item,
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));

    try {
      const updated = await markNotificationRead(id);
      set((state) => ({ items: upsertNotification(state.items, updated) }));
      await get().refreshUnread();
    } catch (error) {
      set({ items: previous });
      await get().refreshUnread();
      throw error;
    }
  },

  async markAllRead() {
    const previous = get().items;
    set((state) => ({
      items: state.items.map((item) => ({ ...item, isRead: true, read: true })),
      unreadCount: 0,
    }));

    try {
      await markAllNotificationsRead();
      await get().refreshUnread();
    } catch (error) {
      set({ items: previous });
      await get().refreshUnread();
      throw error;
    }
  },

  async archive(id) {
    const previous = get().items;
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      unreadCount: previous.some((item) => item.id === id && !item.isRead)
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));

    try {
      await archiveNotification(id);
      await get().refreshUnread();
    } catch (error) {
      set({ items: previous });
      await get().refreshUnread();
      throw error;
    }
  },

  clear() {
    set({
      items: [],
      page: 1,
      hasMore: false,
      unreadCount: 0,
      loading: false,
      loadingMore: false,
      error: "",
    });
  },
}));

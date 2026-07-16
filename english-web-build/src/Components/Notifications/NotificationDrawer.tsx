"use client";

import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationItem,
} from "@/src/lib/notifications-api";
import {
  Bell,
  BookOpen,
  CheckCheck,
  Flame,
  GraduationCap,
  Loader2,
  Target,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const iconMap = {
  MISSION: Target,
  ACHIEVEMENT: Trophy,
  LEARNING_REMINDER: Bell,
  DAILY_GOAL: Flame,
  WEEKLY_GOAL: CheckCheck,
  LEARNING_PATH: GraduationCap,
  COMMUNITY: Users,
  SYSTEM: BookOpen,
};

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

export default function NotificationDrawer({
  onUnreadChange,
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  async function load(silent = false) {
    try {
      if (!silent) setLoading(true);
      const data = await getNotifications({ limit: 8 });
      setItems(data.items);
      onUnreadChange?.(data.meta.unreadCount);
      setMessage("");
    } catch {
      if (!silent) setMessage("Chưa tải được thông báo.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30000);
    const onFocus = () => void load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [onUnreadChange, unreadCount]);

  async function readOne(id: string) {
    await markNotificationRead(id);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true, read: true } : item)),
    );
  }

  async function removeOne(id: string) {
    await deleteNotification(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function readAll() {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, isRead: true, read: true })));
    onUnreadChange?.(0);
  }

  return (
    <>
      {open && <button aria-label="Đóng thông báo" className="fixed inset-0 z-40 bg-slate-950/30 sm:hidden" onClick={onClose} />}
      <aside
        className={[
          "fixed right-0 top-0 z-50 h-dvh w-full max-w-md border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div>
            <h2 className="text-lg font-black text-slate-950">Thông báo</h2>
            <p className="text-xs font-bold text-slate-500">{unreadCount} chưa đọc</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={readAll}
              className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700"
            >
              Đọc tất cả
            </button>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="h-[calc(100dvh-4rem)] overflow-y-auto p-4">
          {loading ? (
            <div className="grid h-40 place-items-center text-violet-600">
              <Loader2 className="animate-spin" />
            </div>
          ) : message ? (
            <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">{message}</div>
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((item) => {
                const Icon = iconMap[item.type] ?? Bell;
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-4 transition ${item.isRead ? "border-slate-100 bg-white" : "border-violet-100 bg-violet-50"}`}
                  >
                    <div className="flex gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm">
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={item.href}
                          onClick={() => {
                            void readOne(item.id);
                            onClose();
                          }}
                          className="block"
                        >
                          <h3 className="line-clamp-1 font-black text-slate-950">{item.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-500">{item.message}</p>
                        </Link>
                        <p className="mt-2 text-xs font-bold text-slate-400">{timeAgo(item.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeOne(item.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
              <Link
                href="/notifications"
                onClick={onClose}
                className="flex h-12 items-center justify-center rounded-2xl border border-violet-200 font-black text-violet-700"
              >
                Xem tất cả
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Bell className="mx-auto text-slate-300" size={42} />
              <h3 className="mt-4 font-black text-slate-950">Chưa có thông báo</h3>
              <p className="mt-2 text-sm font-bold text-slate-500">Khi có nhiệm vụ, thành tích hoặc nhắc học mới, bạn sẽ thấy ở đây.</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}


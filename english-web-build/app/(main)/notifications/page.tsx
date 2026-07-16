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
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState("");

  async function load(nextPage = 1) {
    try {
      nextPage === 1 ? setLoading(true) : setLoadingMore(true);
      const data = await getNotifications({ page: nextPage, limit: 20 });
      setItems((current) => (nextPage === 1 ? data.items : [...current, ...data.items]));
      setPage(nextPage);
      setHasMore(data.meta.hasMore);
      setUnreadCount(data.meta.unreadCount);
      setMessage("");
    } catch {
      setMessage("Chưa tải được thông báo.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function readOne(id: string) {
    await markNotificationRead(id);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true, read: true } : item)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function removeOne(id: string) {
    await deleteNotification(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function readAll() {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, isRead: true, read: true })));
    setUnreadCount(0);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-violet-600">Notification Center</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Thông báo</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            Mission, thành tích, nhắc học, mục tiêu và cộng đồng đều ở đây.
          </p>
        </div>
        <button
          type="button"
          onClick={readAll}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white shadow-sm"
        >
          <CheckCheck size={18} />
          Đọc tất cả ({unreadCount})
        </button>
      </header>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
        {loading ? (
          <div className="grid min-h-80 place-items-center text-violet-600">
            <Loader2 className="animate-spin" />
          </div>
        ) : message ? (
          <div className="rounded-2xl bg-rose-50 p-5 font-bold text-rose-600">{message}</div>
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const Icon = iconMap[item.type] ?? Bell;
              return (
                <article key={item.id} className={`grid gap-4 py-4 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:items-center ${item.isRead ? "" : "bg-violet-50/50"}`}>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                    <Icon size={22} />
                  </span>
                  <Link href={item.href} onClick={() => void readOne(item.id)} className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-black text-slate-950">{item.title}</h2>
                      {!item.isRead && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">Mới</span>}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{item.type}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-500">{item.message}</p>
                    <p className="mt-2 text-xs font-bold text-slate-400">{timeAgo(item.createdAt)}</p>
                  </Link>
                  <div className="flex gap-2 sm:justify-end">
                    {!item.isRead && (
                      <button type="button" onClick={() => void readOne(item.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-violet-700">
                        Đã đọc
                      </button>
                    )}
                    <button type="button" onClick={() => void removeOne(item.id)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <Bell className="mx-auto text-slate-300" size={48} />
            <h2 className="mt-4 text-xl font-black text-slate-950">Chưa có thông báo</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">Hoàn thành bài học hoặc nhiệm vụ để nhận cập nhật mới.</p>
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void load(page + 1)}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 font-black text-violet-700 disabled:opacity-60"
          >
            {loadingMore ? <Loader2 className="animate-spin" size={18} /> : "Tải thêm"}
          </button>
        )}
      </section>
    </main>
  );
}


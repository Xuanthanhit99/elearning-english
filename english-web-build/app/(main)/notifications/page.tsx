"use client";

import { safeNotificationHref } from "@/src/lib/notification-navigation";
import { useNotificationStore } from "@/src/store/notificationStore";
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
import { useEffect } from "react";

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
  if (minutes < 60) return `${minutes} phut truoc`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} gio truoc`;
  return `${Math.round(hours / 24)} ngay truoc`;
}

export default function NotificationsPage() {
  const {
    items,
    page,
    hasMore,
    unreadCount,
    loading,
    loadingMore,
    error,
    load,
    markRead,
    markAllRead,
    archive,
  } = useNotificationStore();

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-violet-600">
            Notification Center
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Thong bao
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            Mission, thanh tich, nhac hoc, muc tieu va cong dong deu o day.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white shadow-sm"
        >
          <CheckCheck size={18} />
          Doc tat ca ({unreadCount})
        </button>
      </header>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-50 p-5 font-bold text-rose-600">
            {error}
          </div>
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const Icon = iconMap[item.type] ?? Bell;
              return (
                <article
                  key={item.id}
                  className={`grid gap-4 py-4 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:items-center ${
                    item.isRead ? "" : "bg-violet-50/50"
                  }`}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                    <Icon size={22} />
                  </span>
                  <Link
                    href={safeNotificationHref(item.href)}
                    onClick={() => void markRead(item.id)}
                    className="min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-black text-slate-950">{item.title}</h2>
                      {!item.isRead && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                          Moi
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-500">
                      {item.message}
                    </p>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      {timeAgo(item.createdAt)}
                    </p>
                  </Link>
                  <div className="flex gap-2 sm:justify-end">
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={() => void markRead(item.id)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-violet-700"
                      >
                        Da doc
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void archive(item.id)}
                      className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
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
            <h2 className="mt-4 text-xl font-black text-slate-950">
              Chua co thong bao
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Hoan thanh bai hoc hoac nhiem vu de nhan cap nhat moi.
            </p>
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void load(page + 1)}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 font-black text-violet-700 disabled:opacity-60"
          >
            {loadingMore ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              "Tai them"
            )}
          </button>
        )}
      </section>
    </main>
  );
}

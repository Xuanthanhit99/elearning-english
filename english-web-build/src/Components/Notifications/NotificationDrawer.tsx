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
  X,
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

export default function NotificationDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    items,
    loading,
    error,
    unreadCount,
    load,
    markRead,
    markAllRead,
    archive,
  } = useNotificationStore();

  useEffect(() => {
    void load(1);
    const onFocus = () => void load(1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return (
    <>
      {open && (
        <button
          aria-label="Dong thong bao"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm sm:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={[
          "fixed right-0 top-0 z-50 h-dvh w-full max-w-md border-l border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] shadow-2xl backdrop-blur-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--lumiverse-border)] px-5">
          <div>
            <h2 className="text-lg font-black text-[var(--lumiverse-ink)]">Thong bao</h2>
            <p className="text-xs font-bold text-[var(--lumiverse-muted)]">
              {unreadCount} chua doc
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="rounded-xl bg-[var(--lumiverse-card-soft)] px-3 py-2 text-xs font-black text-[var(--lumiverse-primary)] transition hover:bg-[var(--lumiverse-hover-tint)]"
            >
              Doc tat ca
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--lumiverse-border)] text-[var(--lumiverse-muted)] transition hover:bg-[var(--lumiverse-card-soft)] hover:text-[var(--lumiverse-ink)]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="h-[calc(100dvh-4rem)] overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl bg-[var(--lumiverse-card-soft)]"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : items.length ? (
            <div className="space-y-3">
              {items.slice(0, 8).map((item) => {
                const Icon = iconMap[item.type] ?? Bell;
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-4 transition ${
                      item.isRead
                        ? "border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)]"
                        : "border-violet-200 bg-violet-50 dark:border-violet-400/30 dark:bg-violet-500/10"
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm dark:bg-violet-500/15 dark:text-violet-200">
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={safeNotificationHref(item.href)}
                          onClick={() => {
                            void markRead(item.id);
                            onClose();
                          }}
                          className="block"
                        >
                          <h3 className="line-clamp-1 font-black text-[var(--lumiverse-ink)]">
                            {item.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm font-bold text-[var(--lumiverse-muted)]">
                            {item.message}
                          </p>
                        </Link>
                        <p className="mt-2 text-xs font-bold text-[var(--lumiverse-muted)]">
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Luu tru thong bao"
                        onClick={() => void archive(item.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[var(--lumiverse-muted)] transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
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
                className="flex h-12 items-center justify-center rounded-2xl border border-[var(--lumiverse-border)] font-black text-[var(--lumiverse-primary)] transition hover:bg-[var(--lumiverse-card-soft)]"
              >
                Xem tat ca
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--lumiverse-border)] bg-[var(--lumiverse-card-soft)] p-8 text-center">
              <Bell className="mx-auto text-[var(--lumiverse-muted)]" size={42} />
              <h3 className="mt-4 font-black text-[var(--lumiverse-ink)]">
                Chua co thong bao
              </h3>
              <p className="mt-2 text-sm font-bold text-[var(--lumiverse-muted)]">
                Khi co nhiem vu, thanh tich hoac nhac hoc moi, ban se thay o day.
              </p>
            </div>
          )}
          {loading && (
            <div className="mt-4 grid place-items-center text-violet-600">
              <Loader2 className="animate-spin" size={18} />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

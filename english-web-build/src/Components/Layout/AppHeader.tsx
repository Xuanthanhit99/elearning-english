"use client";

/* eslint-disable @next/next/no-img-element */

import { api } from "@/src/lib/axios";
import NotificationDrawer from "@/src/Components/Notifications/NotificationDrawer";
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from "@/src/lib/notification-socket";
import { useAuthStore } from "@/src/store/authStore";
import { useNotificationStore } from "@/src/store/notificationStore";
import { settingsApi } from "@/src/lib/settings-api";
import { useTranslation } from "@/src/hooks/useTranslation";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import {
  Bell,
  ChevronDown,
  Flame,
  LogOut,
  Menu,
  Search,
  Settings,
  Star,
  Trophy,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type AppHeaderProps = {
  sidebarCollapsed: boolean;
  onOpenMobileMenu: () => void;
};

function getInitials(name?: string | null) {
  const parts = (name || "User").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function AppHeader({
  onOpenMobileMenu,
  sidebarCollapsed,
}: AppHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadNotifications = useNotificationStore((state) => state.unreadCount);
  const refreshUnread = useNotificationStore((state) => state.refreshUnread);
  const loadNotifications = useNotificationStore((state) => state.load);
  const clearNotifications = useNotificationStore((state) => state.clear);

  const displayUser = user as
    | (typeof user & {
        xp?: number;
        level?: number;
        currentLevel?: number;
        streak?: number;
        englishLevel?: string;
      })
    | null;

  const fullname = displayUser?.fullname || t("header.defaultUser");
  const level =
    displayUser?.englishLevel ||
    `Level ${displayUser?.currentLevel || displayUser?.level || 1}`;
  const xp = displayUser?.xp ?? 0;
  const streak = displayUser?.streak ?? 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadUnread() {
      try {
        if (active) await refreshUnread();
      } catch {
        if (active) clearNotifications();
      }
    }

    void loadUnread();
    void loadNotifications(1);
    connectNotificationSocket();
    const onFocus = () => {
      void loadUnread();
      void loadNotifications(1);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [clearNotifications, loadNotifications, refreshUnread]);

  async function persistPreference(payload: { language?: string; theme?: string }) {
    if (!user) return;
    try {
      await settingsApi.update(payload);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error(error);
    } finally {
      setUser(null);
      disconnectNotificationSocket();
      clearNotifications();
      setProfileOpen(false);
      router.push("/auth");
    }
  }

  return (
    <header
      className={[
        "fixed right-0 top-0 z-30 h-16 border-b border-slate-200 bg-white/90 backdrop-blur-xl transition-[left] duration-300",
        sidebarCollapsed ? "lg:left-[84px]" : "lg:left-[264px]",
        "left-0",
      ].join(" ")}
    >
      <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-7">
        <button
          type="button"
          aria-label={t("header.openMenu")}
          onClick={onOpenMobileMenu}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="hidden min-w-[190px] lg:block">
          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
            {t("header.greeting", { name: fullname.split(" ").slice(-1)[0] })}
          </p>
          <p className="truncate text-xs font-bold text-slate-500">
            {t("header.readyToday")}
          </p>
        </div>

        <label className="relative min-w-0 flex-1 lg:max-w-[520px]">
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4"
            size={18}
          />
          <input
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white sm:pl-11 sm:pr-4 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            placeholder={t("header.searchPlaceholder")}
          />
        </label>

        <div className="hidden items-center gap-2 md:flex">
          <HeaderStat icon={<Flame size={18} />} label={t("header.streak")} value={streak} />
          <HeaderStat icon={<Star size={18} />} label={t("header.xp")} value={xp} />
        </div>

        <LanguageSwitcher onChange={(locale) => persistPreference({ language: locale.toUpperCase() })} />
        <ThemeToggle onChange={(theme) => persistPreference({ theme })} />

        <button
          type="button"
          aria-label={t("header.notifications")}
          onClick={() => setNotificationsOpen(true)}
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-violet-600 dark:border-slate-700 dark:bg-slate-900"
        >
          <Bell size={19} />
          {unreadNotifications > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          )}
        </button>

        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={profileOpen}
            aria-label={t("header.account")}
            onClick={() => setProfileOpen((open) => !open)}
            className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 text-left dark:border-slate-700 dark:bg-slate-900"
          >
            {displayUser?.avatar ? (
              <img
                src={displayUser.avatar}
                alt={fullname}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">
                {getInitials(fullname)}
              </span>
            )}
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[110px] truncate text-sm font-black text-slate-950 dark:text-white">
                {fullname}
              </span>
              <span className="block truncate text-xs font-bold text-slate-500">
                {level}
              </span>
            </span>
            <ChevronDown
              size={16}
              className={`hidden text-slate-400 transition sm:block ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-13 z-50 w-[min(14rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <DropdownLink href="/profile" icon={<User size={16} />}>
                {t("header.profile")}
              </DropdownLink>
              <DropdownLink href="/profile" icon={<Trophy size={16} />}>
                {t("header.achievements")}
              </DropdownLink>
              <DropdownLink href="/settings" icon={<Settings size={16} />}>
                {t("header.settings")}
              </DropdownLink>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <LogOut size={16} />
                {t("header.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </header>
  );
}

function HeaderStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex h-11 items-center gap-2 rounded-2xl bg-slate-50 px-3">
      <span className="text-amber-500">{icon}</span>
      <span>
        <span className="block text-sm font-black text-slate-950">
          {value.toLocaleString()}
        </span>
        <span className="block text-[11px] font-bold text-slate-500">
          {label}
        </span>
      </span>
    </div>
  );
}

function DropdownLink({
  children,
  href,
  icon,
}: {
  children: React.ReactNode;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black text-slate-700 hover:bg-violet-50 hover:text-violet-700"
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

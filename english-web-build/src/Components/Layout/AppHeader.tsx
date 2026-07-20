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
import { getSearchSuggestions, Suggestion } from "@/src/lib/search-api";
import { useTranslation } from "@/src/hooks/useTranslation";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import {
  Bell,
  ChevronDown,
  Flame,
  Loader2,
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
import type { FormEvent } from "react";
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
  const searchRef = useRef<HTMLFormElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
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
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const normalized = searchQuery.trim();
    let active = true;

    if (normalized.length < 2) {
      return;
    }

    const handle = window.setTimeout(() => {
      getSearchSuggestions(normalized, 6)
        .then((result) => {
          if (!active) return;
          setSuggestions(result.suggestions);
          setSuggestionsOpen(true);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        })
        .finally(() => {
          if (active) setSuggestionsLoading(false);
        });
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [searchQuery]);

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

  function submitSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalized = searchQuery.trim();
    if (normalized.length < 2) return;
    setSuggestionsOpen(false);
    router.push(`/search?q=${encodeURIComponent(normalized)}`);
  }

  return (
    <header
      className={[
        "fixed right-0 top-0 z-30 h-[76px] border-b border-[var(--lumiverse-border)] bg-white/78 shadow-[0_10px_34px_rgba(24,50,118,0.08)] backdrop-blur-2xl transition-[left] duration-300 dark:bg-slate-950/78",
        sidebarCollapsed ? "lg:left-[96px]" : "lg:left-[280px]",
        "left-0",
      ].join(" ")}
    >
      <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-7">
        <button
          type="button"
          aria-label={t("header.openMenu")}
          onClick={onOpenMobileMenu}
          className="lumiverse-button-soft h-11 w-11 shrink-0 p-0 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <Link
          href="/search"
          aria-label={t("header.searchPlaceholder")}
          className="lumiverse-button-soft h-11 w-11 shrink-0 p-0 md:hidden"
        >
          <Search size={18} />
        </Link>

        <div className="hidden min-w-[190px] lg:block">
          <p className="truncate text-sm font-black text-[var(--lumiverse-ink)]">
            {t("header.greeting", { name: fullname.split(" ").slice(-1)[0] })}
          </p>
          <p className="truncate text-xs font-bold text-[var(--lumiverse-muted)]">
            {t("header.readyToday")}
          </p>
        </div>

        <form
          ref={searchRef}
          onSubmit={submitSearch}
          className="relative hidden min-w-0 flex-1 md:block lg:max-w-[520px]"
        >
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--lumiverse-muted)] sm:left-4"
            size={18}
          />
          <input
            value={searchQuery}
            onChange={(event) => {
              const value = event.target.value;
              setSearchQuery(value);
              if (value.trim().length >= 2) {
                setSuggestionsLoading(true);
              } else {
                setSuggestions([]);
                setSuggestionsOpen(false);
                setSuggestionsLoading(false);
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) setSuggestionsOpen(true);
            }}
            className="lumiverse-input h-12 w-full pl-10 pr-3 text-sm font-bold outline-none transition placeholder:text-slate-400 sm:pl-11 sm:pr-4"
            placeholder={t("header.searchPlaceholder")}
            aria-label={t("header.searchPlaceholder")}
          />
          {suggestionsLoading && (
            <Loader2
              aria-hidden
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--lumiverse-primary)]"
            />
          )}
          {suggestionsOpen && suggestions.length > 0 && (
            <div
              id="global-search-suggestions"
              role="listbox"
              className="lumiverse-surface absolute left-0 right-0 top-14 z-50 overflow-hidden rounded-3xl"
            >
              {suggestions.map((item) => (
                <Link
                  key={`${item.type}:${item.id}`}
                  href={item.href}
                  role="option"
                  onClick={() => setSuggestionsOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[var(--lumiverse-muted)] hover:bg-blue-50 hover:text-[var(--lumiverse-primary)] dark:hover:bg-white/8"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-black">{item.title}</span>
                    <span className="block truncate text-xs text-slate-400">
                      {item.subtitle ?? item.type}
                    </span>
                  </span>
                    <Search size={15} className="shrink-0 text-[var(--lumiverse-cyan)]" />
                </Link>
              ))}
              <button
                type="button"
                onClick={() => submitSearch()}
                className="flex w-full items-center justify-center border-t border-[var(--lumiverse-border)] px-4 py-3 text-sm font-black text-[var(--lumiverse-primary)]"
              >
                Search all results
              </button>
            </div>
          )}
        </form>

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
          className="lumiverse-button-soft relative h-11 w-11 shrink-0 p-0 text-[var(--lumiverse-primary)]"
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
            className="lumiverse-button-soft h-12 gap-2 px-2.5 text-left"
          >
            {displayUser?.avatar ? (
              <img
                src={displayUser.avatar}
                alt={fullname}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-[var(--lumiverse-primary)]">
                {getInitials(fullname)}
              </span>
            )}
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[110px] truncate text-sm font-black text-[var(--lumiverse-ink)]">
                {fullname}
              </span>
              <span className="block truncate text-xs font-bold text-[var(--lumiverse-muted)]">
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
            <div className="lumiverse-surface absolute right-0 top-14 z-50 w-[min(14rem,calc(100vw-1.5rem))] rounded-3xl p-2">
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
    <div className="flex h-12 items-center gap-2 rounded-2xl border border-[var(--lumiverse-border)] bg-white/62 px-3 shadow-sm dark:bg-white/8">
      <span className="text-[var(--lumiverse-gold)]">{icon}</span>
      <span>
        <span className="block text-sm font-black text-[var(--lumiverse-ink)]">
          {value.toLocaleString()}
        </span>
        <span className="block text-[11px] font-bold text-[var(--lumiverse-muted)]">
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
      className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black text-[var(--lumiverse-muted)] hover:bg-blue-50 hover:text-[var(--lumiverse-primary)] dark:hover:bg-white/8"
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

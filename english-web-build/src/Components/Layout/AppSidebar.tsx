"use client";

import AppLogo from "@/src/Components/UI/AppLogo";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Bell,
  CheckCircle2,
  Compass,
  Headphones,
  History,
  Home,
  Landmark,
  MessageCircle,
  Mic2,
  NotebookPen,
  PawPrint,
  Settings,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "@/src/hooks/useTranslation";

type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type SidebarGroup = {
  title: string;
  items: SidebarItem[];
};

type AppSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: (value: boolean) => void;
  onMobileOpenChange: (value: boolean) => void;
};

function buildGroups(t: (key: string) => string): SidebarGroup[] {
  return [
    {
      title: "Main",
      items: [
        { label: t("sidebar.home"), href: "/dashboard", icon: Home },
        { label: t("sidebar.todayLesson"), href: "/learn", icon: BookOpen },
        { label: t("sidebar.learningPath"), href: "/learning-path", icon: Compass },
      ],
    },
    {
      title: t("sidebar.groupSkills"),
      items: [
        { label: t("sidebar.vocabulary"), href: "/vocabulary", icon: BookOpen },
        { label: "Grammar", href: "/grammar", icon: CheckCircle2 },
        { label: t("sidebar.listening"), href: "/listening", icon: Headphones },
        { label: t("sidebar.speaking"), href: "/speaking", icon: Mic2 },
        { label: t("sidebar.reading"), href: "/reading", icon: Landmark },
        { label: t("sidebar.writing"), href: "/writing", icon: NotebookPen },
      ],
    },
    {
      title: "Engagement",
      items: [
        { label: t("sidebar.missions"), href: "/missions", icon: Trophy },
        { label: t("sidebar.community"), href: "/community", icon: Users },
        { label: t("sidebar.leaderboard"), href: "/leaderboard", icon: Trophy },
        { label: t("header.achievements"), href: "/achievements", icon: CheckCircle2 },
      ],
    },
    {
      title: "Companion",
      items: [
        { label: "Pet", href: "/pet", icon: PawPrint },
        { label: t("sidebar.discover"), href: "/discover", icon: Compass },
        { label: t("sidebar.studyRooms"), href: "/study-rooms", icon: MessageCircle },
      ],
    },
    {
      title: t("sidebar.groupSystem"),
      items: [
        { label: t("sidebar.analytics"), href: "/analytics", icon: BarChart3 },
        { label: t("sidebar.progress"), href: "/progress", icon: TrendingUp },
        { label: t("sidebar.history"), href: "/history", icon: History },
        { label: t("header.notifications"), href: "/notifications", icon: Bell },
        { label: t("sidebar.settings"), href: "/settings", icon: Settings },
        { label: t("sidebar.admin"), href: "/admin", icon: ShieldCheck },
      ],
    },
  ];
}

function isActive(pathname: string, item: SidebarItem) {
  return (
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(`${item.href}/`))
  );
}

export default function AppSidebar({
  collapsed,
  mobileOpen,
  onCollapsedChange,
  onMobileOpenChange,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const groups = buildGroups(t);

  useEffect(() => {
    onMobileOpenChange(false);
  }, [pathname, onMobileOpenChange]);

  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onMobileOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onMobileOpenChange]);

  return (
    <>
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 hidden border-r border-[var(--lumiverse-border)] bg-white/78 shadow-[12px_0_44px_rgba(22,45,100,0.08)] backdrop-blur-2xl transition-[width] duration-300 dark:bg-slate-950/78 lg:block",
          collapsed ? "w-[96px]" : "w-[280px]",
        ].join(" ")}
      >
        <SidebarContent
          collapsed={collapsed}
          groups={groups}
          t={t}
          pathname={pathname}
          onCloseMobile={() => onMobileOpenChange(false)}
          onToggleCollapsed={() => onCollapsedChange(!collapsed)}
        />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label={t("sidebar.closeMenu")}
          onClick={() => onMobileOpenChange(false)}
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[330px] border-r border-[var(--lumiverse-border)] bg-white/92 shadow-2xl backdrop-blur-2xl transition-transform duration-300 dark:bg-slate-950/92 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SidebarContent
          collapsed={false}
          mobile
          groups={groups}
          t={t}
          pathname={pathname}
          onCloseMobile={() => onMobileOpenChange(false)}
          onToggleCollapsed={() => onCollapsedChange(!collapsed)}
        />
      </aside>
    </>
  );
}

function SidebarContent({
  collapsed,
  mobile = false,
  groups,
  t,
  onCloseMobile,
  onToggleCollapsed,
  pathname,
}: {
  collapsed: boolean;
  mobile?: boolean;
  groups: SidebarGroup[];
  t: (key: string) => string;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
  pathname: string;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div
        className={`flex h-[76px] items-center border-b border-[var(--lumiverse-border)] px-4 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {collapsed ? (
          <Link
            href="/"
            aria-label="Lumiverse"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] text-lg font-black text-white shadow-[0_16px_34px_rgba(23,70,255,0.24)]"
          >
            L
          </Link>
        ) : (
          <AppLogo href="/" />
        )}
        {mobile ? (
          <button
            type="button"
            aria-label={t("sidebar.closeMenu")}
            onClick={onCloseMobile}
            className="lumiverse-button-soft h-10 w-10 shrink-0 p-0 text-[var(--lumiverse-muted)]"
          >
            <X size={18} />
          </button>
        ) : (
          !collapsed && (
            <button
              type="button"
              aria-label={t("sidebar.collapse")}
              onClick={onToggleCollapsed}
              className="lumiverse-button-soft h-10 w-10 shrink-0 p-0 text-[var(--lumiverse-muted)]"
            >
              <ChevronLeft size={18} />
            </button>
          )
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lumiverse-muted)]">
                {group.title}
              </p>
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "flex h-12 min-w-0 items-center rounded-2xl text-sm font-black transition duration-200",
                      collapsed ? "justify-center px-0" : "gap-3 px-3",
                      active
                        ? "bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] text-white shadow-[0_16px_34px_rgba(23,70,255,0.24)]"
                        : "text-[var(--lumiverse-muted)] hover:-translate-y-0.5 hover:bg-white/76 hover:text-[var(--lumiverse-primary)] dark:hover:bg-white/8",
                    ].join(" ")}
                  >
                    <Icon size={19} strokeWidth={2.5} className="shrink-0" />
                    {!collapsed && (
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!mobile && collapsed ? (
        <div className="border-t border-[var(--lumiverse-border)] p-3">
          <button
            type="button"
            aria-label={t("sidebar.expand")}
            onClick={onToggleCollapsed}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)] dark:bg-white/8"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="border-t border-[var(--lumiverse-border)] p-4">
          <div className="overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-4 shadow-[0_14px_32px_rgba(23,70,255,0.12)] dark:border-white/10 dark:from-blue-950/50 dark:via-slate-950 dark:to-violet-950/50">
            <p className="font-black text-[var(--lumiverse-primary)]">{t("sidebar.premiumTitle")}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--lumiverse-muted)]">
              {t("sidebar.premiumDesc")}
            </p>
            <Link href="/courses" className="lumiverse-button-primary mt-3 w-full text-sm">
              {t("sidebar.upgradeNow")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

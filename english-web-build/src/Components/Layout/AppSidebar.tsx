"use client";

import AppLogo from "@/src/Components/UI/AppLogo";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Headphones,
  Home,
  LayoutDashboard,
  MessageCircle,
  Mic2,
  NotebookPen,
  Settings,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

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

const groups: SidebarGroup[] = [
  {
    title: "Học tập",
    items: [
      { label: "Trang chủ", href: "/", icon: Home },
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Lộ trình học", href: "/learning-path", icon: Compass },
      { label: "Học hôm nay", href: "/learn", icon: ClipboardCheck },
    ],
  },
  {
    title: "Kỹ năng",
    items: [
      { label: "Từ vựng", href: "/vocabulary", icon: BookOpen },
      { label: "Nghe", href: "/listening", icon: Headphones },
      { label: "Nói", href: "/speaking", icon: Mic2 },
      { label: "Đọc", href: "/reading", icon: LayoutDashboard },
      { label: "Viết", href: "/writing", icon: NotebookPen },
    ],
  },
  {
    title: "Khám phá",
    items: [
      { label: "Cộng đồng", href: "/community", icon: Users },
      { label: "Phòng học", href: "/study-rooms", icon: MessageCircle },
      { label: "Nhiệm vụ", href: "/missions", icon: Trophy },
      { label: "Bảng xếp hạng", href: "/leaderboard", icon: Trophy },
    ],
  },
  {
    title: "Hệ thống",
    items: [{ label: "Cài đặt", href: "/settings", icon: Settings }],
  },
];

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

  useEffect(() => {
    onMobileOpenChange(false);
  }, [pathname, onMobileOpenChange]);

  return (
    <>
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white transition-[width] duration-300 lg:block",
          collapsed ? "w-[84px]" : "w-[264px]",
        ].join(" ")}
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          onCloseMobile={() => onMobileOpenChange(false)}
          onToggleCollapsed={() => onCollapsedChange(!collapsed)}
        />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => onMobileOpenChange(false)}
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] border-r border-slate-200 bg-white transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SidebarContent
          collapsed={false}
          mobile
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
  onCloseMobile,
  onToggleCollapsed,
  pathname,
}: {
  collapsed: boolean;
  mobile?: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
  pathname: string;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div
        className={`flex h-16 items-center border-b border-slate-100 px-4 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {collapsed ? (
          <Link
            href="/"
            aria-label="PoppyLingo"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white"
          >
            P
          </Link>
        ) : (
          <AppLogo compact href="/" />
        )}
        {mobile ? (
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={onCloseMobile}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
          >
            <X size={18} />
          </button>
        ) : (
          !collapsed && (
            <button
              type="button"
              aria-label="Thu gọn sidebar"
              onClick={onToggleCollapsed}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
            >
              <ChevronLeft size={18} />
            </button>
          )
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-black uppercase tracking-wider text-slate-400">
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
                    title={collapsed ? item.label : undefined}
                    className={[
                      "flex h-11 min-w-0 items-center rounded-2xl text-sm font-black transition",
                      collapsed ? "justify-center px-0" : "gap-3 px-3",
                      active
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-100"
                        : "text-slate-600 hover:bg-violet-50 hover:text-violet-700",
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
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            aria-label="Mở rộng sidebar"
            onClick={onToggleCollapsed}
            className="flex h-11 w-full items-center justify-center rounded-2xl bg-violet-50 text-violet-700"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-2xl bg-violet-50 p-4">
            <p className="font-black text-violet-700">Premium</p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              Học không giới hạn, mở khóa thêm bài học cá nhân hóa.
            </p>
            <button className="mt-3 min-h-10 w-full rounded-xl bg-violet-600 px-3 py-2 text-sm font-black text-white">
              Nâng cấp ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

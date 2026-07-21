"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppLogo from "@/src/Components/UI/AppLogo";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";

type NavItem = {
  icon: AppIconName;
  label: string;
  href: string;
  match?: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  { icon: "home", label: "Trang chủ", href: "/dashboard", match: (path) => path === "/dashboard" },
  { icon: "book", label: "Khóa học", href: "/courses" },
  { icon: "book", label: "Từ vựng", href: "/vocabulary" },
  { icon: "graduation", label: "Ngữ pháp", href: "/grammar" },
  { icon: "volume", label: "Nghe", href: "/listening" },
  { icon: "mic", label: "Nói", href: "/speaking" },
  { icon: "book", label: "Đọc", href: "/reading" },
  { icon: "pen", label: "Viết", href: "/writing" },
  { icon: "star", label: "Flashcards", href: "/flashcards" },
  { icon: "users", label: "Cộng đồng", href: "/community" },
  { icon: "shop", label: "Pet", href: "/pet" },
  { icon: "settings", label: "Hồ sơ", href: "/profile" },
];

function isActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function MobileStudyNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8e9f5] bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur xl:hidden">
      <div className="flex items-center justify-between gap-3">
        <AppLogo compact className="h-10 shrink-0" />
        <Link
          href="/profile"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e8e9f5] bg-[#f7f5ff] text-[#652cff]"
          aria-label="Mở hồ sơ"
        >
          <AppIcon name="settings" tone="purple" bare size={18} />
        </Link>
      </div>

      <nav className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-0.5" aria-label="Điều hướng học tập">
        {navItems.map((item) => {
          const active = isActive(item, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${
                active
                  ? "border-[#d9ccff] bg-[#efe9ff] text-[#652cff]"
                  : "border-[#e8e9f5] bg-white text-[#5d6587]"
              }`}
            >
              <AppIcon name={item.icon} tone={active ? "purple" : "slate"} bare size={15} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

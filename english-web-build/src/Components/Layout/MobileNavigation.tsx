"use client";

import { BookOpen, Compass, Home, Menu, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryItems = [
  { label: "Hôm nay", href: "/dashboard", icon: Home },
  { label: "Lộ trình", href: "/learning-path", icon: Compass },
  { label: "Luyện tập", href: "/learn", icon: BookOpen },
  { label: "Cộng đồng", href: "/community", icon: Users },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export default function MobileNavigation({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      data-testid="app-bottom-nav"
      aria-label="Điều hướng chính trên di động"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-shell-surface)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_38px_rgba(24,50,118,0.12)] backdrop-blur-2xl lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-black transition",
                active
                  ? "bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]"
                  : "text-[var(--BeaconVie-muted)] hover:bg-[var(--BeaconVie-hover-tint)] hover:text-[var(--BeaconVie-primary)]",
              ].join(" ")}
            >
              <Icon aria-hidden className="h-5 w-5" strokeWidth={2.5} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          aria-label="Mở toàn bộ menu"
          onClick={onOpenMenu}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-black text-[var(--BeaconVie-muted)] transition hover:bg-[var(--BeaconVie-hover-tint)] hover:text-[var(--BeaconVie-primary)]"
        >
          <Menu aria-hidden className="h-5 w-5" strokeWidth={2.5} />
          <span>Thêm</span>
        </button>
      </div>
    </nav>
  );
}

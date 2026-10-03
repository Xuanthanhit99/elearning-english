"use client";

import { BookOpen, Home, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryItems = [
  { label: "Trang chủ", href: "/dashboard", icon: Home },
  { label: "Học", href: "/learning-path", icon: BookOpen },
  { label: "Luyện tập", href: "/learn", icon: BookOpen },
  { label: "Cộng đồng", href: "/community", icon: Users },
  { label: "Hồ sơ", href: "/profile", icon: UserRound },
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
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-[var(--BeaconVie-border)] bg-white/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(24,50,118,0.10)] supports-[backdrop-filter]:backdrop-blur-xl lg:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
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
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--BeaconVie-primary)] focus-visible:ring-offset-2",
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
      </div>
    </nav>
  );
}

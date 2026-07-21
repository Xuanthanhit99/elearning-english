"use client";

import Image from "next/image";
import Link from "next/link";

type AppLogoProps = {
  compact?: boolean;
  className?: string;
  href?: string;
};

// Icon mark is a square crop derived from public/loho/app-icon.png (see
// scripts/generate-brand-assets.js) — always 1:1, safe to scale by height.
const ICON_SIZE = 512;

export default function AppLogo({ compact = false, className = "", href = "/" }: AppLogoProps) {
  return (
    <Link
      href={href}
      aria-label="Lumiverse - Learn, Explore, Grow, Together"
      className={`group inline-flex min-w-0 shrink-0 items-center gap-2 transition group-hover:-translate-y-0.5 ${className}`}
    >
      <Image
        src="/loho/icon.png"
        alt=""
        width={ICON_SIZE}
        height={ICON_SIZE}
        className={`shrink-0 rounded-[22%] object-contain ${compact ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"}`}
      />
      <span className={`truncate font-black leading-none tracking-tight ${compact ? "text-lg" : "text-xl sm:text-2xl"}`}>
        <span className="text-[var(--lumiverse-ink)]">Lumi</span>
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--lumiverse-primary), var(--lumiverse-violet) 55%, var(--lumiverse-rose) 80%, var(--lumiverse-gold))",
          }}
        >
          verse
        </span>
      </span>
    </Link>
  );
}

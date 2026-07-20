"use client";

import Image from "next/image";
import Link from "next/link";

type AppLogoProps = {
  compact?: boolean;
  className?: string;
  href?: string;
};

// Source file is a full horizontal lockup (icon + "Lumiverse" wordmark + tagline
// baked into one 1983x793 image) — never crop it into a square, just scale by height.
const LOGO_WIDTH = 1983;
const LOGO_HEIGHT = 793;

export default function AppLogo({ compact = false, className = "", href = "/" }: AppLogoProps) {
  return (
    <Link
      href={href}
      className={`group inline-flex min-w-0 shrink-0 items-center transition group-hover:-translate-y-0.5 ${className}`}
    >
      <Image
        src="/poppylingo-logo.png"
        alt="Lumiverse - Learn. Explore. Grow. Together."
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={`w-auto max-w-none object-contain ${compact ? "h-8" : "h-10 sm:h-11"}`}
      />
    </Link>
  );
}

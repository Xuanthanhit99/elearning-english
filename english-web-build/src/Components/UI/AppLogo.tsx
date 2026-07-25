"use client";

import Image from "next/image";
import Link from "next/link";

type AppLogoProps = {
  compact?: boolean;
  className?: string;
  href?: string;
};

// Icon mark is a square BeaconVie asset, always 1:1 and safe to scale by height.
const ICON_SIZE = 512;

export default function AppLogo({ compact = false, className = "", href = "/" }: AppLogoProps) {
  return (
    <Link
      href={href}
      aria-label="BeaconVie - Dẫn đường, Kết nối, Phát triển"
      className={`group inline-flex min-w-0 shrink-0 items-center gap-2 transition group-hover:-translate-y-0.5 ${className}`}
    >
      <Image
        src="/brand/beaconvie-app-icon.png"
        alt=""
        width={ICON_SIZE}
        height={ICON_SIZE}
        className={`shrink-0 rounded-[22%] object-contain ${compact ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"}`}
      />
      <span className={`truncate font-black leading-none tracking-tight ${compact ? "text-lg" : "text-xl sm:text-2xl"}`}>
        <span className="text-[var(--BeaconVie-ink)]">Beacon</span>
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--BeaconVie-primary), var(--BeaconVie-violet) 55%, var(--BeaconVie-rose) 80%, var(--BeaconVie-gold))",
          }}
        >
          Vie
        </span>
      </span>
    </Link>
  );
}

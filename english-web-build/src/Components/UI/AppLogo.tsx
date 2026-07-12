"use client";

import Link from "next/link";

type AppLogoProps = {
  compact?: boolean;
  className?: string;
  href?: string;
};

export default function AppLogo({ compact = false, className = "", href = "/" }: AppLogoProps) {
  return (
    <Link href={href} className={`flex min-w-0 items-center ${className}`}>
      <img
        src="/poppylingo-logo.png"
        alt="PoppyLingo"
        className={`shrink-0 object-contain object-left ${
          compact ? "h-10 w-auto max-w-[150px]" : "h-16 w-auto max-w-[190px]"
        }`}
      />
    </Link>
  );
}

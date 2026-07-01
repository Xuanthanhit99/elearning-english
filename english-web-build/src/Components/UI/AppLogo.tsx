"use client";

import Link from "next/link";

type AppLogoProps = {
  compact?: boolean;
  className?: string;
  href?: string;
};

export default function AppLogo({ compact = false, className = "", href = "/" }: AppLogoProps) {
  return (
    <Link href={href} className={`inline-flex min-w-0 items-center ${className}`}>
      <img
        src="/poppylingo-logo.png"
        alt="PoppyLingo"
        className={`${compact ? "h-39 w-39" : "h-39 w-39"} shrink-0 object-contain object-left`}
      />
    </Link>
  );
}

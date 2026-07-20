// src/Components/Footer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import AppLogo from "@/src/Components/UI/AppLogo";
import { useTranslation } from "@/src/hooks/useTranslation";

export default function Footer() {
  const { dict } = useTranslation();
  const footer = dict.footer;
  return (
   <footer className="bg-gradient-to-b from-[#fffaf5] via-[#fff1e3] to-[#1f2a44] pt-20">
  <div className="mx-auto max-w-7xl px-4">
    <div className="mx-1 relative overflow-hidden rounded-[40px] bg-gradient-to-r from-[#1f2a44] via-[#31425f] to-[#d96a28] px-8 py-16 shadow-[0_30px_90px_rgba(31,42,68,0.18)] lg:px-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white">
                {footer.ctaBadge}
              </span>

              <h2 className="mt-6 whitespace-pre-line text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                {footer.title}
              </h2>

              <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">
                {footer.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="rounded-2xl bg-[#ff6b00] px-8 py-4 font-bold text-white shadow-lg shadow-orange-950/20 hover:bg-[#e85f00]"
                >
                  {footer.ctaRegister}
                </Link>

                <Link
                  href="/courses"
                  className="rounded-2xl border border-white/20 bg-white/10 px-8 py-4 font-bold text-white hover:bg-white/20"
                >
                  {footer.ctaCourses}
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="rounded-[34px] border border-white/20 bg-white/10 p-5 backdrop-blur">
                <Image
                  src="/cat-home.jpg"
                  alt="Lumi mascot"
                  width={220}
                  height={220}
                  className="rounded-[28px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>

         <div className="flex flex-col items-center justify-between gap-4 py-10 text-white/70 md:flex-row">
      <div className="rounded-2xl bg-white/95 px-3 py-2">
        <AppLogo compact />
      </div>

      <p>{footer.copyright}</p>
    </div>
  </div>
</footer>
  );
}

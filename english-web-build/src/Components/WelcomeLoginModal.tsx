// src/Components/WelcomeLoginModal.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppIcon } from "@/src/Components/UI/AppIcon";

type Props = {
  open: boolean;
  fullname?: string;
  avatar?: string;
  onClose: () => void;
};

export default function WelcomeLoginModal({
  open,
  fullname = "bạn",
  avatar = "/brand/beaconvie-ai-mascot.webp",
  onClose,
}: Props) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!open) return;

    const resetTimer = window.setTimeout(() => setCountdown(10), 0);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          setTimeout(() => {
            onClose();
          }, 0);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearTimeout(resetTimer);
      clearInterval(timer);
    };
  }, [open, onClose]);

  if (!open) return null;


  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[36px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-6 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white backdrop-blur hover:bg-white/30"
        >
          <span aria-hidden>×</span>
        </button>

        <div className="relative h-[300px] overflow-hidden bg-gradient-to-br from-[#8b73bd] via-[#7b63ad] to-[#5b438c] px-8 py-8">
          <div className="absolute right-24 top-12 h-52 w-52 rounded-[40px] border border-white/30 bg-white/10" />

          <div className="absolute right-64 top-12 flex h-16 w-16 animate-bounce items-center justify-center rounded-full border border-white/30 bg-white/20">
            <AppIcon name="fire" tone="orange" size={28} bare />
          </div>

          <div className="absolute right-20 top-24 flex h-16 w-16 animate-pulse items-center justify-center rounded-full border border-white/30 bg-white/20 text-3xl">
            🎉
          </div>

          <div className="absolute right-80 bottom-16 flex h-16 w-16 animate-bounce items-center justify-center rounded-full border border-white/30 bg-white/20">
            <AppIcon name="star" tone="yellow" size={28} bare />
          </div>

          <div className="relative z-10 max-w-md rounded-[22px] border border-white/40 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-950/88">
            <h2 className="text-2xl font-extrabold text-[#ff6b00]">
              Chào mừng trở lại, {fullname}!
            </h2>

            <div className="mt-2 text-3xl">👋</div>

            <p className="mt-3 text-lg font-bold leading-8 text-[var(--BeaconVie-muted)]">
              Beacon đã chuẩn bị nhiệm vụ nhẹ nhàng để bạn giữ chuỗi học hôm nay.
            </p>

            <div className="absolute -bottom-4 right-10 h-8 w-8 rotate-45 bg-white dark:bg-slate-950/88" />
          </div>

          <div className="absolute bottom-0 right-20 z-10 animate-[miuFloat_2s_ease-in-out_infinite]">
            <Image
              src={avatar}
              alt="Beacon mascot"
              width={230}
              height={230}
              className="rounded-[32px] object-cover drop-shadow-2xl"
            />
          </div>
        </div>

        <div className="px-8 py-8">
          <div className="rounded-[24px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-5">
            <p className="text-lg font-bold leading-7 text-[var(--BeaconVie-ink)]">
              Ghé trang tổng quan để xem chuỗi ngày học, XP và nhiệm vụ hôm nay
              của bạn.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] px-7 py-4 font-extrabold text-white shadow-lg shadow-blue-200/40 transition hover:opacity-95 dark:shadow-black/20"
            >
              Xem trang tổng quan
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] px-7 py-4 font-extrabold text-[var(--BeaconVie-ink)] transition hover:bg-[var(--BeaconVie-card)]"
            >
              Để sau
            </button>

            <span className="ml-auto font-bold text-[var(--BeaconVie-muted)]">
              Tự đóng sau {countdown}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

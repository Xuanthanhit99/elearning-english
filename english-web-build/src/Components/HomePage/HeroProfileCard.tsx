"use client";

import Image from "next/image";
import { useAuthStore } from "@/src/store/authStore";

export default function HeroProfileCard() {
  const user = useAuthStore((state) => state.user);

  const level = 12;
  const streak = 12;
  const xp = 320;
  const weeklyProgress = 68;

  const isLoggedIn = !!user;

  return (
    <div className="relative w-full overflow-hidden rounded-[34px] border border-[#ead8c2] bg-gradient-to-br from-[#fffaf5] via-white to-[#f7f1fb] p-6 shadow-xl">
      <div className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-[#ffedd5]/70 blur-3xl" />
      <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-[#fff0dc]" />
      <div className="absolute bottom-20 right-10 h-44 w-44 rounded-full bg-[#ede9fe]/70 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="rounded-2xl bg-white px-4 py-3 font-extrabold text-[#ff6b00] shadow">
          {isLoggedIn ? `👋 Chào ${user.fullname}` : "🇬🇧 Hello"}
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 font-extrabold text-emerald-500 shadow">
          +80 XP
        </div>
      </div>

      <div className="relative z-10 mt-8 flex flex-col items-center text-center">
        {isLoggedIn ? (
          <AvatarFrame
            avatar={user.avatar || "/cat-home.jpg"}
            name={user.fullname || "User"}
            streak={streak}
          />
        ) : (
          <GuestMascot />
        )}

        {isLoggedIn && (
          <>
            <h2 className="mt-8 text-3xl font-extrabold text-[#1f2a44]">
              Chào mừng quay lại!
            </h2>

            <p className="mt-3 max-w-sm leading-7 text-[#5b6b85]">
              Hôm nay Lumi đã chuẩn bị một nhiệm vụ ngắn để bạn giữ nhịp học đều
              đặn.
            </p>
          </>
        )}
      </div>

      {isLoggedIn ? (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat value={`🔥 ${streak}`} label="ngày liên tiếp" />
            <Stat value={`${xp}`} label="XP tích lũy" />
            <Stat value={`${weeklyProgress}%`} label="tiến độ tuần" />
          </div>

          <AdvancedMissionBox level={level} streak={streak} />
        </>
      ) : (
        <GuestMissionBox />
      )}
    </div>
  );
}

function GuestMascot() {
  return (
    <div className="flex justify-center pt-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-[#ff6b00]/15 blur-3xl" />

        <Image
          src="/cat-home.jpg"
          alt="Lumi mascot"
          width={320}
          height={320}
          className="relative z-10 h-[320px] w-[320px] rounded-full object-cover drop-shadow-2xl"
          priority
        />
      </div>
    </div>
  );
}

function AvatarFrame({
  avatar,
  name,
  streak,
}: {
  avatar: string;
  name: string;
  streak: number;
}) {
  return (
    <div className="relative mt-2 h-[240px] w-[240px]">
      <div className="absolute inset-8 z-0 animate-pulse rounded-full bg-[#ff6b00]/20 blur-3xl" />

      <div className="absolute inset-3 z-0 animate-[slowSpin_10s_linear_infinite] rounded-full border-2 border-dashed border-[#ffb347]/80" />

      <div className="absolute left-4 top-12 z-20 animate-bounce rounded-full border-4 border-white bg-white px-3 py-2 text-xl shadow-xl">
        🔥
      </div>

      <div className="absolute right-3 top-16 z-20 animate-[orbitFloat_2.8s_ease-in-out_infinite] rounded-full border-4 border-white bg-white px-3 py-2 text-xl shadow-xl">
        ✨
      </div>

      <div className="absolute bottom-12 left-5 z-20 animate-pulse rounded-full border-4 border-white bg-white px-3 py-2 text-xl shadow-xl">
        ⭐
      </div>

      <div className="absolute inset-9 z-10 flex animate-[avatarFloat_3s_ease-in-out_infinite] items-center justify-center rounded-full bg-gradient-to-br from-[#ffb347] via-[#ff8c42] to-[#ff6b00] p-[6px] shadow-2xl">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-[6px]">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-[#fff4e8]">
            <Image
              src={avatar}
              alt={name}
              fill
              sizes="170px"
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-1 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border-4 border-white bg-gradient-to-r from-[#ff6b00] to-[#ffb000] px-5 py-2 text-sm font-extrabold text-white shadow-xl">
        <span className="animate-bounce">🔥</span>
        <span>Chuỗi ngày</span>
      </div>

      <div className="absolute bottom-1 right-5 z-30 rounded-2xl border-4 border-white bg-[#1f2a44] px-3 py-1 text-xs font-extrabold text-white shadow-xl">
        {streak} ngày
      </div>
    </div>
  );
}

function GuestMissionBox() {
  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-extrabold text-[#1f2a44]">
          Nhiệm vụ hôm nay
        </h3>

        <span className="rounded-full bg-[#fff0dc] px-3 py-1 font-bold text-[#ff6b00]">
          Level 04
        </span>
      </div>

      <div className="space-y-3">
        <Mission icon="🎧" title="Nghe 3 câu hội thoại" status="Done" />
        <Mission icon="🧩" title="Ghép 5 từ mới" status="Done" />
        <Mission icon="🎙️" title="Nói lại mẫu câu" status="Next" />
      </div>
    </div>
  );
}

function AdvancedMissionBox({
  level,
  streak,
}: {
  level: number;
  streak: number;
}) {
  return (
    <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-2xl font-extrabold text-[#1f2a44]">
          Nhiệm vụ hôm nay
        </h3>

        <span className="rounded-full bg-[#fff0dc] px-4 py-2 font-extrabold text-[#ff6b00]">
          Level {String(level).padStart(2, "0")}
        </span>
      </div>

      <div className="space-y-3">
        <Mission icon="🎧" title="Nghe 3 câu hội thoại" status="Done" />
        <Mission icon="🧩" title="Ghép 5 từ mới" status="Done" />
        <Mission icon="🎙️" title="Nói lại mẫu câu" status="Next" />
      </div>

      <button className="mt-4 w-full rounded-2xl bg-[#1f2a44] py-4 font-extrabold text-white">
        Bắt đầu nhiệm vụ
      </button>

      <div className="mt-4 rounded-2xl bg-[#f7f1fb] p-4 text-left font-bold leading-7 text-[#6b5796]">
        💡 Gợi ý: học 10 phút hôm nay để giữ chuỗi {streak + 1} ngày liên tiếp.
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-3 text-center">
      <div className="text-xl font-extrabold text-[#ff6b00]">{value}</div>
      <p className="mt-1 text-xs font-extrabold text-[#5b6b85]">{label}</p>
    </div>
  );
}

function Mission({
  icon,
  title,
  status,
}: {
  icon: string;
  title: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 font-extrabold text-[#1f2a44]">
      <span>
        {icon} {title}
      </span>

      <span
        className={status === "Done" ? "text-emerald-500" : "text-[#1f2a44]"}
      >
        {status}
      </span>
    </div>
  );
}
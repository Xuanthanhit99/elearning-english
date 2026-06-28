"use client";

import { useMemo } from "react";

type SpiritPetAvatarProps = {
  petType?: string;
  level?: number;
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  showLevelBadge?: boolean;
};

const PET_CONFIG: Record<
  string,
  {
    base: string;
    name: string;
    from: string;
    to: string;
    gem: string;
  }
> = {
  cat: { base: "🐱", name: "Mèo linh quang", from: "#fff7ad", to: "#ff8a00", gem: "✦" },
  dog: { base: "🐶", name: "Cún hộ vệ", from: "#fde68a", to: "#d97706", gem: "◆" },
  panda: { base: "🐼", name: "Gấu trúc tinh tú", from: "#e0f2fe", to: "#475569", gem: "✧" },
  fox: { base: "🦊", name: "Hồ ly ánh sao", from: "#fed7aa", to: "#ea580c", gem: "✹" },
  penguin: { base: "🐧", name: "Băng linh", from: "#bae6fd", to: "#0284c7", gem: "✺" },
  rabbit: { base: "🐰", name: "Thỏ nguyệt", from: "#fbcfe8", to: "#db2777", gem: "✷" },
  pending: { base: "🐾", name: "Linh thú chưa thức tỉnh", from: "#fef3c7", to: "#ff6b00", gem: "?" },
};

const SIZE_CLASS = {
  sm: "h-16 w-16 text-4xl rounded-[22px]",
  md: "h-20 w-20 text-5xl rounded-[26px]",
  lg: "h-28 w-28 text-6xl rounded-[32px]",
  xl: "h-36 w-36 text-7xl rounded-[38px]",
};

function getStage(level = 1) {
  if (level >= 20) {
    return {
      name: "Thần thoại",
      aura: "from-fuchsia-300 via-amber-200 to-cyan-300",
      ring: "ring-fuchsia-200",
      crown: "♛",
      wings: true,
      tail: true,
      sparkles: 8,
    };
  }

  if (level >= 10) {
    return {
      name: "Tinh tú",
      aura: "from-cyan-200 via-violet-200 to-orange-200",
      ring: "ring-cyan-200",
      crown: "✦",
      wings: true,
      tail: true,
      sparkles: 6,
    };
  }

  if (level >= 5) {
    return {
      name: "Linh quang",
      aura: "from-amber-200 via-orange-100 to-pink-200",
      ring: "ring-amber-200",
      crown: "✧",
      wings: false,
      tail: true,
      sparkles: 5,
    };
  }

  return {
    name: "Ấu linh",
    aura: "from-orange-100 via-white to-yellow-100",
    ring: "ring-orange-100",
    crown: "•",
    wings: false,
    tail: false,
    sparkles: 3,
  };
}

export default function SpiritPetAvatar({
  petType = "pending",
  level = 1,
  size = "lg",
  animated = true,
  showLevelBadge = true,
}: SpiritPetAvatarProps) {
  const config = PET_CONFIG[petType] || PET_CONFIG.pending;
  const stage = getStage(level);
  const sparkles = useMemo(
    () => Array.from({ length: stage.sparkles }, (_, index) => index),
    [stage.sparkles],
  );

  return (
    <div className="relative inline-flex flex-col items-center gap-2" title={`${config.name} - ${stage.name}`}>
      <div
        className={`relative isolate flex items-center justify-center overflow-visible bg-gradient-to-br ${stage.aura} ${SIZE_CLASS[size]} shadow-[0_22px_55px_rgba(31,42,68,0.22)] ring-4 ${stage.ring}`}
      >
        <span
          className="absolute -inset-3 -z-20 rounded-[42px] opacity-60 blur-xl"
          style={{ background: `radial-gradient(circle, ${config.from}, ${config.to}88, transparent 68%)` }}
        />
        <span className={`absolute -inset-2 -z-10 rounded-[38px] bg-gradient-to-br from-white/80 to-transparent ${animated ? "animate-[spiritPulse_2.8s_ease-in-out_infinite]" : ""}`} />

        {stage.wings && (
          <>
            <span className={`absolute -left-5 top-1/2 -z-10 h-12 w-8 -translate-y-1/2 rotate-[-22deg] rounded-full bg-white/75 shadow-lg ${animated ? "animate-[wingLeft_2s_ease-in-out_infinite]" : ""}`} />
            <span className={`absolute -right-5 top-1/2 -z-10 h-12 w-8 -translate-y-1/2 rotate-[22deg] rounded-full bg-white/75 shadow-lg ${animated ? "animate-[wingRight_2s_ease-in-out_infinite]" : ""}`} />
          </>
        )}

        {stage.tail && (
          <span
            className={`absolute -right-3 bottom-4 -z-10 h-10 w-10 rounded-full border-[10px] border-white/80 border-l-transparent border-t-transparent ${animated ? "animate-[spiritTail_2.6s_ease-in-out_infinite]" : ""}`}
            style={{ boxShadow: `0 0 18px ${config.to}55` }}
          />
        )}

        <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-lg font-black text-[#ff6b00] shadow-md">
          {stage.crown}
        </span>

        {sparkles.map((item) => (
          <span
            key={item}
            className={`absolute text-sm font-black text-white drop-shadow ${animated ? "animate-[sparkleFloat_2.4s_ease-in-out_infinite]" : ""}`}
            style={{
              left: `${12 + ((item * 19) % 72)}%`,
              top: `${8 + ((item * 29) % 76)}%`,
              animationDelay: `${item * 0.22}s`,
              color: item % 2 ? config.from : config.to,
            }}
          >
            {config.gem}
          </span>
        ))}

        <span className={`relative z-10 drop-shadow-sm ${animated ? "animate-[spiritFloat_2.5s_ease-in-out_infinite]" : ""}`}>
          {config.base}
        </span>

        <span className="absolute inset-x-5 bottom-2 h-2 rounded-full bg-black/10 blur-sm" />
      </div>

      {showLevelBadge && (
        <div className="rounded-full bg-[#1f2a44] px-3 py-1 text-xs font-black text-white shadow-lg">
          Lv {level} · {stage.name}
        </div>
      )}

      <style jsx>{`
        @keyframes spiritFloat {
          0%, 100% { transform: translateY(0) scale(1) rotate(-2deg); }
          50% { transform: translateY(-8px) scale(1.06) rotate(2deg); }
        }

        @keyframes spiritPulse {
          0%, 100% { transform: scale(0.94); opacity: 0.5; }
          50% { transform: scale(1.08); opacity: 0.95; }
        }

        @keyframes sparkleFloat {
          0%, 100% { transform: translateY(0) scale(0.85); opacity: 0.35; }
          50% { transform: translateY(-10px) scale(1.25); opacity: 1; }
        }

        @keyframes wingLeft {
          0%, 100% { transform: translateY(-50%) rotate(-22deg) scaleY(1); }
          50% { transform: translateY(-56%) rotate(-34deg) scaleY(1.12); }
        }

        @keyframes wingRight {
          0%, 100% { transform: translateY(-50%) rotate(22deg) scaleY(1); }
          50% { transform: translateY(-56%) rotate(34deg) scaleY(1.12); }
        }

        @keyframes spiritTail {
          0%, 100% { transform: rotate(8deg); }
          50% { transform: rotate(25deg); }
        }
      `}</style>
    </div>
  );
}

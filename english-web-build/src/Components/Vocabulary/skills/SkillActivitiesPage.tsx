"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/src/lib/axios";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";

type SkillFilter = "all" | "vocabulary" | "grammar" | "listening" | "speaking" | "reading" | "writing";

type SkillActivity = {
  id: string;
  skillKey: SkillFilter;
  skill: string;
  badge: string;
  title: string;
  subtitle: string;
  time: string;
  xp: number;
  coins: number;
  percent: number;
  icon: AppIconName;
  tone: "blue" | "cyan" | "emerald" | "orange" | "pink" | "purple" | "red" | "slate" | "yellow";
  href: string;
};

type SkillRow = {
  key: SkillFilter;
  label: string;
  percent: number;
  status: string;
  icon: AppIconName;
  tone: SkillActivity["tone"];
};

type SkillActivitiesData = {
  summary: {
    totalActivities: number;
    streakDays: number;
    totalStudyTime: string;
    rangeLabel: string;
    activityGrowth: number;
  };
  skills: SkillRow[];
  activities: SkillActivity[];
  hasMore: boolean;
};

const filters: Array<{ key: SkillFilter; label: string; icon: AppIconName; tone: SkillActivity["tone"] }> = [
  { key: "all", label: "Tất cả", icon: "sparkles", tone: "purple" },
  { key: "vocabulary", label: "Từ vựng", icon: "pen", tone: "emerald" },
  { key: "grammar", label: "Ngữ pháp", icon: "exercise", tone: "purple" },
  { key: "listening", label: "Nghe", icon: "headphones", tone: "blue" },
  { key: "speaking", label: "Nói", icon: "mic", tone: "orange" },
  { key: "reading", label: "Đọc", icon: "book", tone: "pink" },
  { key: "writing", label: "Viết", icon: "pen", tone: "cyan" },
];

const rangeOptions = [
  { value: "7d", label: "7 ngày qua" },
  { value: "14d", label: "14 ngày qua" },
  { value: "30d", label: "30 ngày qua" },
];

const toneText: Record<string, string> = {
  blue: "text-blue-600",
  cyan: "text-cyan-600",
  emerald: "text-emerald-600",
  orange: "text-orange-500",
  pink: "text-pink-500",
  purple: "text-[#6d35ff]",
  red: "text-red-500",
  slate: "text-slate-600",
  yellow: "text-amber-500",
};

const toneBadge: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  cyan: "bg-cyan-50 text-cyan-600",
  emerald: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-500",
  pink: "bg-pink-50 text-pink-500",
  purple: "bg-violet-50 text-[#6d35ff]",
  red: "bg-red-50 text-red-500",
  slate: "bg-slate-50 text-slate-600",
  yellow: "bg-amber-50 text-amber-500",
};

export default function SkillActivitiesPage() {
  const [data, setData] = useState<SkillActivitiesData | null>(null);
  const [skill, setSkill] = useState<SkillFilter>("all");
  const [range, setRange] = useState("7d");
  const [limit, setLimit] = useState(8);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setMessage("");
        const res = await api.get<SkillActivitiesData>("/vocabulary/overview/skills/activities", {
          params: { skill, range, limit },
        });
        if (active) setData(res.data);
      } catch {
        if (active) setMessage("Chưa tải được hoạt động kỹ năng gần đây.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [skill, range, limit]);

  const featuredSkills = useMemo(() => data?.skills || [], [data?.skills]);

  return (
    <div className="px-4 py-7 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#73799b]">
            <Link href="/">Trang chủ</Link>
            <ChevronRight size={16} />
            <Link href="/vocabulary/skills">Tiến độ kỹ năng</Link>
            <ChevronRight size={16} />
            <span className="text-[#101733]">Hoạt động gần đây</span>
          </div>
          <h1 className="text-3xl font-black text-[#101733]">Hoạt động gần đây theo kỹ năng</h1>
          <p className="mt-3 text-base font-bold text-[#69708b]">
            Theo dõi quá trình học tập của bạn trong thời gian gần nhất
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {rangeOptions.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setRange(item.value);
                setLimit(8);
              }}
              className={`inline-flex h-12 items-center gap-3 rounded-xl border px-5 text-sm font-black ${
                range === item.value
                  ? "border-[#6d35ff] bg-[#6d35ff] text-white"
                  : "border-[#dfe2f3] bg-white text-[#27245f]"
              }`}
            >
              {item.label}
              <ChevronDown size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        {filters.map((item) => {
          const active = skill === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                setSkill(item.key);
                setLimit(8);
              }}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-sm font-black ${
                active
                  ? "border-[#6d35ff] bg-[#6d35ff] text-white shadow-lg shadow-violet-100"
                  : "border-[#dfe2f3] bg-white text-[#27245f] hover:border-[#bfaeff]"
              }`}
            >
              <AppIcon name={item.icon} bare size={16} className={active ? "text-white" : toneText[item.tone]} />
              {item.label}
            </button>
          );
        })}
      </div>

      {message && (
        <section className="rounded-3xl border border-red-100 bg-red-50 p-6 font-bold text-red-600">
          {message}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <section className="rounded-3xl border border-[#ebeaf6] bg-white shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
          {loading ? (
            <div className="space-y-5 p-6">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : data?.activities.length ? (
            <div className="divide-y divide-[#ebeaf6]">
              {data.activities.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-[360px] place-items-center p-8 text-center">
              <div>
                <AppIcon name="calendar" tone="purple" className="mx-auto mb-4 h-16 w-16" size={28} />
                <h2 className="text-2xl font-black text-[#101733]">Chưa có hoạt động</h2>
                <p className="mt-2 font-bold text-[#69708b]">Hãy học một bài mới để bắt đầu ghi nhận tiến độ.</p>
              </div>
            </div>
          )}

          {!!data?.activities.length && (
            <button
              disabled={!data.hasMore || loading}
              onClick={() => setLimit((value) => value + 8)}
              className="m-5 flex h-12 w-[calc(100%-40px)] items-center justify-center gap-2 rounded-xl border border-[#dfe2f3] bg-white text-sm font-black text-[#27245f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xem thêm <ChevronDown size={17} />
            </button>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-5 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="mb-4 text-xl font-black text-[#101733]">Tóm tắt hoạt động</h2>
            <SummaryCard icon="sparkles" tone="purple" value={data?.summary.totalActivities || 0} label="Hoạt động" sub={`▲ ${data?.summary.activityGrowth || 0}% so với tuần trước`} />
            <SummaryCard icon="calendar" tone="emerald" value={data?.summary.streakDays || 0} label="Ngày học liên tiếp" sub="Giữ vững phong độ!" />
            <SummaryCard icon="calendar" tone="orange" value={data?.summary.totalStudyTime || "0h 00m"} label="Tổng thời gian học" sub="Trong khoảng đã chọn" />
          </section>

          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-5 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="mb-5 text-xl font-black text-[#101733]">Kỹ năng nổi bật</h2>
            <div className="space-y-5">
              {featuredSkills.map((item) => (
                <div key={item.key} className="grid grid-cols-[88px_1fr_42px] items-center gap-4">
                  <div className="flex items-center gap-2 font-black text-[#101733]">
                    <AppIcon name={item.icon} bare size={16} className={toneText[item.tone]} />
                    {item.label}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-bold text-[#69708b]">{item.status}</p>
                    <div className="h-2 rounded-full bg-[#eeeef8]">
                      <div className={`h-2 rounded-full ${barClass(item.tone)}`} style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                  <p className="text-right text-sm font-black text-[#101733]">{item.percent}%</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-[220px] items-center justify-between rounded-3xl bg-gradient-to-br from-[#f2edff] to-[#fff7ed] p-7">
            <div>
              <h2 className="text-xl font-black text-[#101733]">Bạn đang làm rất tốt!</h2>
              <p className="mt-3 max-w-[230px] text-sm font-bold leading-6 text-[#69708b]">
                Hãy tiếp tục duy trì thói quen học tập mỗi ngày để đạt mục tiêu của mình.
              </p>
              <Link href="/vocabulary/overview" className="mt-6 inline-flex rounded-xl bg-[#6d35ff] px-6 py-3 text-sm font-black text-white">
                Đặt mục tiêu mới
              </Link>
            </div>
            <AppIcon name="trophy" bare size={88} className="text-amber-400" />
          </section>
        </aside>
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: SkillActivity }) {
  return (
    <Link href={item.href} className="grid grid-cols-[92px_1fr_130px_24px] items-center gap-5 px-5 py-6 transition hover:bg-[#fbfaff]">
      <div className="relative flex justify-center">
        <AppIcon name={item.icon} tone={item.tone} className="h-16 w-16 rounded-2xl" size={30} />
        <span className={`absolute -right-1 top-1 h-3 w-3 rounded-full border-2 border-white ${dotClass(item.tone)}`} />
      </div>
      <div className="min-w-0">
        <span className={`mb-2 inline-flex rounded-md px-2 py-1 text-[11px] font-black ${toneBadge[item.tone]}`}>
          {item.badge}
        </span>
        <h3 className="truncate font-black text-[#101733]">{item.title}</h3>
        <p className="mt-1 truncate text-sm font-bold text-[#69708b]">{item.subtitle}</p>
      </div>
      <div className="text-right text-sm font-bold text-[#5d6480]">
        <p className="font-black text-[#101733]">
          {item.xp > 0 ? `⭐ +${item.xp} XP` : item.coins > 0 ? `🪙 +${item.coins} Xu` : `${item.percent}%`}
        </p>
        <p className="mt-1">{item.time}</p>
      </div>
      <ChevronRight size={20} className="text-[#9aa0bf]" />
    </Link>
  );
}

function SummaryCard({
  icon,
  tone,
  value,
  label,
  sub,
}: {
  icon: AppIconName;
  tone: SkillActivity["tone"];
  value: string | number;
  label: string;
  sub: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-4 rounded-2xl border border-[#ebeaf6] p-4">
      <AppIcon name={icon} tone={tone} className="h-16 w-16 rounded-2xl" size={28} />
      <div>
        <p className="text-2xl font-black text-[#101733]">{value}</p>
        <p className="text-sm font-black text-[#101733]">{label}</p>
        <p className="mt-1 text-xs font-bold text-emerald-600">{sub}</p>
      </div>
    </div>
  );
}

function barClass(tone: SkillActivity["tone"]) {
  const map: Record<SkillActivity["tone"], string> = {
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    orange: "bg-orange-500",
    pink: "bg-pink-500",
    purple: "bg-[#6d35ff]",
    red: "bg-red-500",
    slate: "bg-slate-500",
    yellow: "bg-amber-500",
  };
  return map[tone];
}

function dotClass(tone: SkillActivity["tone"]) {
  const map: Record<SkillActivity["tone"], string> = {
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    orange: "bg-orange-500",
    pink: "bg-pink-500",
    purple: "bg-[#6d35ff]",
    red: "bg-red-500",
    slate: "bg-slate-500",
    yellow: "bg-amber-500",
  };
  return map[tone];
}

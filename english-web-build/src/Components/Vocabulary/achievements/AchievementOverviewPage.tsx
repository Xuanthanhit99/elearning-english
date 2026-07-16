"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/src/lib/axios";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";

type AchievementItem = {
  key: string;
  title: string;
  description: string;
  tag: string;
  category: "learning" | "challenge" | "system";
  icon: AppIconName;
  tone: "blue" | "emerald" | "orange" | "pink" | "purple" | "yellow";
  xp: number;
  dateLabel: string;
};

type GoalItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: AppIconName;
  current: number;
  target: number;
  progressPercent?: number;
  locked?: boolean;
  unlocked?: boolean;
  claimable?: boolean;
  claimed?: boolean;
};

type AchievementData = {
  summary: {
    totalAchievements: number;
    xpEarned: number;
    completedChallenges: number;
    longestStreak: number;
  };
  recent: AchievementItem[];
  goals: GoalItem[];
  categories: Array<{ key: string; label: string }>;
};

function numberText(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

const tabStyles = "border-b-2 px-5 py-4 text-sm font-black transition";

export default function AchievementOverviewPage() {
  const [data, setData] = useState<AchievementData | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const res = await api.get<AchievementData>("/vocabulary/overview/achievements");
        if (active) setData(res.data);
      } catch {
        if (active) setMessage("Chưa tải được thành tích của bạn.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const achievements = useMemo(() => {
    if (!data) return [];
    if (activeTab === "all") return data.recent;
    return data.recent.filter((item) => item.category === activeTab);
  }, [activeTab, data]);

  if (loading) {
    return (
      <div className="px-4 py-7 lg:px-8">
        <div className="h-10 w-80 animate-pulse rounded-xl bg-[#efeaff]" />
        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-3xl bg-white" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  if (!data || message) {
    return (
      <div className="px-4 py-7 lg:px-8">
        <section className="rounded-3xl border border-red-100 bg-red-50 p-6 font-bold text-red-600">
          {message || "Không có dữ liệu thành tích."}
        </section>
      </div>
    );
  }

  return (
    <div className="px-4 py-7 lg:px-8">
      <div className="mb-7">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#73799b]">
          <Link href="/">Trang chủ</Link>
          <ChevronRight size={16} />
          <Link href="/vocabulary/overview">Tổng quan</Link>
          <ChevronRight size={16} />
          <span className="text-[#101733]">Thành tích gần đây</span>
        </div>
        <h1 className="flex items-center gap-3 text-3xl font-black text-[#101733]">
          Thành tích gần đây
          <AppIcon name="star" tone="yellow" />
        </h1>
        <p className="mt-3 text-base font-bold text-[#69708b]">
          Theo dõi các hoạt động và thành tích nổi bật của bạn
        </p>
      </div>

      <div className="grid gap-7 xl:grid-cols-[1fr_420px]">
        <main>
          <div className="border-b border-[#e5e7f3]">
            {(data.categories || []).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`${tabStyles} ${
                  activeTab === tab.key
                    ? "border-[#6d35ff] text-[#6d35ff]"
                    : "border-transparent text-[#69708b] hover:text-[#101733]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {achievements.length ? (
              achievements.map((item) => <AchievementRow key={item.key} item={item} />)
            ) : (
              <section className="rounded-3xl border border-[#ebeaf6] bg-white p-8 text-center shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
                <AppIcon name="star" tone="yellow" className="mx-auto h-16 w-16" size={30} />
                <h2 className="mt-4 text-xl font-black text-[#101733]">Chưa có thành tích trong mục này</h2>
                <p className="mt-2 text-sm font-bold text-[#69708b]">
                  Hãy học thêm một bài để hệ thống ghi nhận thành tích mới cho bạn.
                </p>
              </section>
            )}
          </div>

          {achievements.length > 5 && (
            <button className="mx-auto mt-5 flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-xl border border-[#e0def1] bg-white text-sm font-black text-[#101733]">
              Xem thêm <ChevronDown size={16} />
            </button>
          )}
        </main>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="font-black text-[#101733]">Tổng quan thành tích</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <SummaryBox icon="star" tone="purple" value={data.summary.totalAchievements} label="Thành tích" />
              <SummaryBox icon="zap" tone="emerald" value={data.summary.xpEarned} label="XP nhận được" />
              <SummaryBox icon="target" tone="orange" value={data.summary.completedChallenges} label="Thử thách hoàn thành" />
              <SummaryBox icon="calendar" tone="pink" value={data.summary.longestStreak} label="Chuỗi dài nhất" />
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#ebeaf6] bg-[#fbf8ff] p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <div className="grid grid-cols-[1fr_150px] items-center gap-4">
              <div>
                <h2 className="font-black text-[#101733]">Bạn đang rất xuất sắc!</h2>
                <p className="mt-4 text-sm font-bold leading-6 text-[#4f5575]">
                  Hãy duy trì thói quen học tập để đạt được nhiều thành tích hơn nữa nhé!
                </p>
              </div>
              <img src="/poppylingo-logo.png" alt="Mascot" className="h-36 w-36 object-contain" />
            </div>
          </section>

          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-[#101733]">Thành tích gần đạt được</h2>
            </div>
            <div className="mt-5 space-y-5">
              {data.goals.map((goal) => <GoalProgress key={goal.key} goal={goal} />)}
            </div>
            <Link
              href="/missions"
              className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#fbfaff] text-sm font-black text-[#6d35ff]"
            >
              Xem tất cả thành tích <ChevronRight size={17} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function AchievementRow({ item }: { item: AchievementItem }) {
  return (
    <Link
      href={`/vocabulary/achievements/detail?key=${encodeURIComponent(item.key)}`}
      className="grid gap-4 rounded-3xl border border-[#ebeaf6] bg-white p-5 shadow-[0_12px_34px_rgba(35,35,80,0.06)] transition hover:-translate-y-0.5 hover:border-[#d7caff] md:grid-cols-[80px_minmax(0,1fr)_auto_auto] md:items-center"
    >
      <AppIcon name={item.icon} tone={item.tone} className="h-20 w-20 rounded-full" size={34} />
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-black text-[#101733]">{item.title}</h2>
          <span className="rounded-full bg-[#f1ecff] px-3 py-1 text-xs font-black text-[#6d35ff]">
            {item.tag}
          </span>
        </div>
        <p className="mt-2 text-sm font-bold text-[#69708b]">{item.description}</p>
      </div>
      <span className="text-lg font-black text-[#6d35ff]">+ {numberText(item.xp)} XP</span>
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-xl bg-[#f7f5ff] px-4 py-2 text-sm font-bold text-[#69708b]">
          {item.dateLabel || "Gần đây"}
        </span>
        <ChevronRight className="text-[#8b91aa]" size={20} />
      </div>
    </Link>
  );
}

function SummaryBox({
  icon,
  label,
  tone,
  value,
}: {
  icon: AppIconName;
  label: string;
  tone: "emerald" | "orange" | "pink" | "purple";
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-[#fbfaff] p-5">
      <AppIcon name={icon} tone={tone} />
      <p className="mt-4 text-2xl font-black text-[#101733]">{numberText(value)}</p>
      <p className="mt-1 text-sm font-bold text-[#69708b]">{label}</p>
    </div>
  );
}

function GoalProgress({ goal }: { goal: GoalItem }) {
  const percent = goal.progressPercent ?? (goal.target ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0);
  const statusLabel = goal.claimed
    ? "Đã nhận"
    : goal.claimable || goal.unlocked
      ? "Có thể nhận"
      : "Đang khóa";
  return (
    <div className="grid grid-cols-[64px_1fr] gap-4">
      <AppIcon
        name={goal.locked ? "lock" : goal.icon}
        tone={goal.locked ? "slate" : "purple"}
        className={`h-16 w-16 rounded-full ${goal.unlocked ? "animate-pulse" : ""}`}
        size={28}
      />
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-black text-[#101733]">{goal.title}</h3>
            <p className="mt-1 text-sm font-bold text-[#69708b]">{goal.subtitle}</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-[#6d35ff]">
              {goal.current}/{goal.target}
            </span>
            <p className={`mt-1 text-[11px] font-black ${goal.locked ? "text-[#8b91aa]" : "text-emerald-600"}`}>
              {statusLabel}
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[#e7e3f6]">
          <div className="h-2 rounded-full bg-[#6d35ff]" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

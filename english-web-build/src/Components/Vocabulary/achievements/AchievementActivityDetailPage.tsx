"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { api } from "@/src/lib/axios";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";

type Tone = "blue" | "emerald" | "orange" | "pink" | "purple" | "slate" | "yellow";

type ActivityDetail = {
  header: {
    title: string;
    subtitle: string;
    tag: string;
    icon: AppIconName;
    tone: Tone;
    completedAt: string;
    xp: number;
  };
  stats: Array<{ label: string; value: string; sub: string; icon: AppIconName; tone: Tone }>;
  content: {
    title: string;
    description: string;
    level: string;
    topic: string;
    duration: string;
    mediaUrl?: string;
    actionLabel: string;
    actionHref: string;
  };
  timeline: Array<{ time: string; title: string; xp: number; icon: AppIconName; done: boolean }>;
  rewards: Array<{ label: string; reward: string; required: number; claimed: boolean; locked: boolean }>;
  suggestions: Array<{ title: string; subtitle: string; href: string; icon: AppIconName }>;
};

export default function AchievementActivityDetailPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const type = searchParams.get("type") || "";
  const id = searchParams.get("id") || "";
  const [data, setData] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!key || !type || !id) {
        setMessage("Thiếu thông tin hoạt động.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.get<ActivityDetail>(`/vocabulary/overview/achievements/${key}/activity`, {
          params: { type, id },
        });
        if (active) setData(res.data);
      } catch {
        if (active) setMessage("Chưa tải được chi tiết hoạt động.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, key, type]);

  if (loading) {
    return (
      <div className="px-4 py-7 lg:px-8">
        <div className="h-10 w-96 animate-pulse rounded-xl bg-[#efeaff]" />
        <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <div className="h-28 animate-pulse rounded-3xl bg-white" />
            <div className="h-44 animate-pulse rounded-3xl bg-white" />
            <div className="h-72 animate-pulse rounded-3xl bg-white" />
          </div>
          <div className="h-96 animate-pulse rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  if (!data || message) {
    return (
      <div className="px-4 py-7 lg:px-8">
        <section className="rounded-3xl border border-red-100 bg-red-50 p-6 font-bold text-red-600">
          {message || "Không có dữ liệu hoạt động."}
        </section>
      </div>
    );
  }

  return (
    <div className="px-4 py-7 lg:px-8">
      <div className="mb-7 flex items-center gap-2 text-sm font-bold text-[#73799b]">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={16} />
        <Link href="/vocabulary/overview">Tổng quan</Link>
        <ChevronRight size={16} />
        <Link href="/vocabulary/achievements">Thành tích gần đây</Link>
        <ChevronRight size={16} />
        <span className="text-[#101733]">Chi tiết hoạt động</span>
      </div>

      <div className="grid gap-7 xl:grid-cols-[1fr_420px]">
        <main className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <Link
                href={`/vocabulary/achievements/detail?key=${encodeURIComponent(key)}`}
                className="grid h-12 w-12 place-items-center rounded-xl border border-[#dfe2f3] text-[#6d35ff]"
              >
                <AppIcon name="chevronLeft" bare size={20} />
              </Link>
              <AppIcon name={data.header.icon} tone={data.header.tone} className="h-28 w-28 rounded-full" size={44} />
              <div>
                <h1 className="text-3xl font-black text-[#101733]">{data.header.title}</h1>
                <span className="mt-3 inline-flex rounded-full bg-[#f1ecff] px-3 py-1 text-xs font-black text-[#6d35ff]">
                  {data.header.tag}
                </span>
                <p className="mt-3 font-bold text-[#69708b]">{data.header.subtitle}</p>
                <p className="mt-3 inline-flex rounded-full bg-[#f7f5ff] px-3 py-1 text-xs font-black text-[#69708b]">
                  {data.header.completedAt}
                </p>
              </div>
            </div>
            <div className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#cdbdff] px-5 text-sm font-black text-[#6d35ff]">
              <AppIcon name="star" bare size={17} /> +{data.header.xp} XP
            </div>
          </header>

          <section className="grid gap-4 rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)] md:grid-cols-4">
            {data.stats.map((stat) => (
              <div key={stat.label} className="border-[#ebeaf6] px-4 py-3 text-center md:border-r md:last:border-r-0">
                <AppIcon name={stat.icon} tone={stat.tone} className="mx-auto h-14 w-14 rounded-full" size={24} />
                <p className="mt-4 text-sm font-black text-[#101733]">{stat.label}</p>
                <p className="mt-2 text-3xl font-black text-[#6d35ff]">{stat.value}</p>
                <p className="mt-1 text-sm font-bold text-[#69708b]">{stat.sub}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="text-xl font-black text-[#101733]">Nội dung hoạt động</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-[280px_1fr]">
              <div className="relative grid min-h-[150px] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100">
                <AppIcon name={data.header.icon} bare size={54} className="text-[#6d35ff]" />
                <span className="absolute bottom-3 right-3 rounded-lg bg-[#101733]/80 px-3 py-1 text-xs font-black text-white">
                  {data.content.duration}
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#101733]">{data.content.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-[#f1ecff] px-3 py-1 text-xs font-black text-[#6d35ff]">{data.content.level}</span>
                  <span className="rounded-lg bg-[#f7f5ff] px-3 py-1 text-xs font-black text-[#69708b]">{data.content.topic}</span>
                </div>
                <p className="mt-4 text-sm font-bold leading-6 text-[#4f5575]">{data.content.description}</p>
                <Link href={data.content.actionHref} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#6d35ff]">
                  <AppIcon name="sparkles" bare size={17} /> {data.content.actionLabel}
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="text-xl font-black text-[#101733]">Quá trình của bạn</h2>
            <div className="mt-5 space-y-1">
              {data.timeline.map((item, index) => (
                <div key={`${item.title}-${index}`} className={`grid grid-cols-[28px_80px_1fr_auto] items-center gap-4 rounded-2xl px-3 py-4 ${index === data.timeline.length - 1 ? "bg-[#f7f1ff]" : ""}`}>
                  <span className={`grid h-7 w-7 place-items-center rounded-full ${item.done ? "bg-[#6d35ff] text-white" : "bg-[#edeaf8] text-[#8b91aa]"}`}>
                    <AppIcon name={item.icon} bare size={14} />
                  </span>
                  <span className="text-sm font-bold text-[#69708b]">{item.time}</span>
                  <span className={`font-black ${index === data.timeline.length - 1 ? "text-[#6d35ff]" : "text-[#101733]"}`}>{item.title}</span>
                  <span className="font-black text-[#6d35ff]">+{item.xp} XP</span>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="text-xl font-black text-[#101733]">Phần thưởng mốc tiến độ</h2>
            <div className="mt-5 space-y-3">
              {data.rewards.map((reward) => (
                <div key={reward.label} className={`flex items-center gap-4 rounded-2xl border p-4 ${reward.claimed ? "border-orange-200 bg-orange-50/40" : "border-[#ebeaf6] bg-[#fbfaff]"}`}>
                  <AppIcon name={reward.claimed ? "star" : "lock"} tone={reward.claimed ? "yellow" : "slate"} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-[#101733]">{reward.label}</h3>
                    <p className="text-sm font-bold text-[#69708b]">{reward.claimed ? "Đã nhận" : `Cần đạt ${reward.required}`}</p>
                  </div>
                  <span className="font-black text-[#6d35ff]">{reward.reward}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="text-xl font-black text-[#101733]">Gợi ý cho bạn</h2>
            <div className="mt-5 space-y-4">
              {data.suggestions.map((item) => (
                <Link key={item.title} href={item.href} className="flex gap-4 rounded-2xl border border-[#ebeaf6] bg-white p-4 hover:bg-[#fbfaff]">
                  <AppIcon name={item.icon} tone="purple" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-[#101733]">{item.title}</h3>
                    <p className="mt-1 text-sm font-bold text-[#69708b]">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="text-[#6d35ff]" size={18} />
                </Link>
              ))}
            </div>
            <Link href="/vocabulary" className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#6d35ff] text-sm font-black text-white">
              Xem tất cả bài học <ChevronRight size={17} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

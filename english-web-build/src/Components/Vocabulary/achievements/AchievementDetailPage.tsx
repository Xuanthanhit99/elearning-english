"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Share2 } from "lucide-react";
import { api } from "@/src/lib/axios";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";

type DetailData = {
  achievement: {
    key: string;
    title: string;
    description: string;
    tag: string;
    icon: AppIconName;
    tone: "blue" | "emerald" | "orange" | "pink" | "purple" | "yellow";
    xp: number;
    achievedAt: string;
  };
  overview: {
    title: string;
    description: string;
    current: number;
    target: number;
    unit: string;
    tip: string;
    progressSteps: Array<{ label: string; date?: string; done: boolean; value: number }>;
  };
  rewards: Array<{ label: string; reward: string; required: number; claimed: boolean; locked: boolean }>;
  activities: Array<{ id?: string; type?: string; title: string; subtitle: string; time: string; xp: number; icon: AppIconName }>;
  suggestions: Array<{ title: string; subtitle: string; icon: AppIconName }>;
};

export default function AchievementDetailPage() {
  const searchParams = useSearchParams();
  const achievementKey = searchParams.get("key") || "";
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!achievementKey) {
        setMessage("Thiếu mã thành tích.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.get<DetailData>(`/vocabulary/overview/achievements/${achievementKey}`);
        if (active) setData(res.data);
      } catch {
        if (active) setMessage("Chưa tải được chi tiết thành tích.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [achievementKey]);

  if (loading) {
    return (
      <div className="px-4 py-7 lg:px-8">
        <div className="h-10 w-96 animate-pulse rounded-xl bg-[#efeaff]" />
        <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <div className="h-28 animate-pulse rounded-3xl bg-white" />
            <div className="h-80 animate-pulse rounded-3xl bg-white" />
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

  const progressPercent = data.overview.target
    ? Math.min(100, Math.round((data.overview.current / data.overview.target) * 100))
    : 0;
  const firstActivity = data.activities.find((item) => item.id && item.type);

  return (
    <div className="px-4 py-7 lg:px-8">
      <div className="mb-7 flex items-center gap-2 text-sm font-bold text-[#73799b]">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={16} />
        <Link href="/vocabulary/overview">Tổng quan</Link>
        <ChevronRight size={16} />
        <Link href="/vocabulary/achievements">Thành tích gần đây</Link>
        <ChevronRight size={16} />
        <span className="text-[#101733]">Chi tiết thành tích</span>
      </div>

      <div className="grid gap-7 xl:grid-cols-[1fr_420px]">
        <main className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <Link className="grid h-12 w-12 place-items-center rounded-xl border border-[#dfe2f3] text-[#6d35ff]" href="/vocabulary/achievements">
                <AppIcon name="chevronLeft" bare size={20} />
              </Link>
              <AppIcon name={data.achievement.icon} tone={data.achievement.tone} className="h-28 w-28 rounded-full" size={44} />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-black text-[#101733]">{data.achievement.title}</h1>
                  <span className="rounded-full bg-[#f1ecff] px-3 py-1 text-xs font-black text-[#6d35ff]">
                    {data.achievement.tag}
                  </span>
                </div>
                <p className="mt-3 font-bold text-[#69708b]">{data.achievement.description}</p>
                <p className="mt-3 inline-flex rounded-full bg-[#f7f5ff] px-3 py-1 text-xs font-black text-[#69708b]">
                  Đạt được: {data.achievement.achievedAt}
                </p>
              </div>
            </div>
            <button className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#cdbdff] px-5 text-sm font-black text-[#6d35ff]">
              <Share2 size={17} /> Chia sẻ
            </button>
          </header>

          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-7 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="text-xl font-black text-[#101733]">{data.overview.title}</h2>
            <p className="mt-3 text-sm font-bold text-[#4f5575]">{data.overview.description}</p>
            <div className="mt-9 grid gap-7 lg:grid-cols-[150px_1fr] lg:items-center">
              <div>
                <p className="text-4xl font-black text-[#101733]">
                  {data.overview.current} / {data.overview.target} {data.overview.unit}
                </p>
                <p className="mt-3 font-bold text-[#69708b]">Tiến độ của bạn</p>
                <div className="mt-4 h-2 rounded-full bg-[#ece9f9]">
                  <div className="h-2 rounded-full bg-[#6d35ff]" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <div className="flex min-w-0 items-center">
                {data.overview.progressSteps.map((step, index) => (
                  <div key={step.label} className="flex flex-1 items-center">
                    <div className="text-center">
                      <span className={`mx-auto grid h-11 w-11 place-items-center rounded-full border-2 text-sm font-black ${step.done ? "border-orange-400 bg-orange-400 text-white" : "border-[#ccd0e9] bg-[#f7f8ff] text-[#8b91aa]"}`}>
                        {step.done ? step.value : <AppIcon name="lock" bare size={17} />}
                      </span>
                      <p className="mt-3 text-sm font-black text-[#27245f]">{step.label}</p>
                      {step.date && <p className="mt-1 text-xs font-black text-orange-500">{step.date}</p>}
                    </div>
                    {index < data.overview.progressSteps.length - 1 && <div className="h-0.5 flex-1 bg-[#dfe2f3]" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 rounded-2xl bg-[#fbf8ff] p-5 text-sm font-bold text-[#4f5575]">
              <AppIcon name="sparkles" tone="purple" className="mr-3" />
              Mẹo: {data.overview.tip}
            </div>
          </section>

          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-7 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="text-xl font-black text-[#101733]">Lịch sử hoạt động</h2>
            <p className="mt-2 text-sm font-bold text-[#69708b]">Các hoạt động học tập liên quan đến thành tích này</p>
            <div className="mt-5 divide-y divide-[#ebeaf6]">
              {data.activities.map((item, index) => (
                <div key={`${item.title}-${index}`} className="grid gap-4 py-4 md:grid-cols-[48px_1fr_auto_auto] md:items-center">
                  <AppIcon name={item.icon} tone="purple" />
                  <div>
                    <h3 className="font-black text-[#101733]">{item.title}</h3>
                    <p className="mt-1 text-sm font-bold text-[#69708b]">{item.subtitle}</p>
                  </div>
                  <span className="text-sm font-bold text-[#69708b]">{item.time || "Gần đây"}</span>
                  <span className="font-black text-[#6d35ff]">+{item.xp} XP</span>
                </div>
              ))}
            </div>
            {firstActivity && (
              <Link
                href={`/vocabulary/achievements/activity?key=${encodeURIComponent(data.achievement.key)}&type=${encodeURIComponent(firstActivity.type || "")}&id=${encodeURIComponent(firstActivity.id || "")}`}
                className="mx-auto mt-6 flex h-12 w-fit min-w-[220px] items-center justify-center rounded-xl border border-[#d8d4ee] px-6 text-sm font-black text-[#27245f] hover:bg-[#fbfaff]"
              >
                Xem chi tiết hoạt động
              </Link>
            )}
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h2 className="text-xl font-black text-[#101733]">Phần thưởng</h2>
            <p className="mt-2 text-sm font-bold text-[#4f5575]">Nhận khi hoàn thành các mốc thành tích</p>
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
                <div key={item.title} className="flex gap-4 rounded-2xl bg-[#fbfaff] p-4">
                  <AppIcon name={item.icon} tone="purple" />
                  <div>
                    <h3 className="font-black text-[#101733]">{item.title}</h3>
                    <p className="mt-1 text-sm font-bold text-[#69708b]">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/vocabulary" className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#6d35ff] text-sm font-black text-white">
              Bắt đầu học ngay <ChevronRight size={17} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

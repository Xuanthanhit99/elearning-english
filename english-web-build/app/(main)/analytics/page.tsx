"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, CalendarDays, RefreshCcw, Sparkles, TrendingUp } from "lucide-react";
import {
  AnalyticsOverview,
  AnalyticsRange,
  getAnalyticsOverview,
} from "@/src/lib/analytics-api";

const ranges: Array<{ label: string; value: AnalyticsRange }> = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsOverview(range));
    } catch {
      setError("Không tải được dữ liệu phân tích. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getAnalyticsOverview(range)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("Không tải được dữ liệu phân tích. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  const maxXp = useMemo(
    () => Math.max(...(data?.activityTrend.map((item) => item.xp) ?? [0]), 1),
    [data],
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-36 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl bg-slate-200" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="font-black text-rose-700">{error ?? "Không có dữ liệu."}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-black text-white"
        >
          <RefreshCcw size={18} />
          Thử lại
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[2rem] bg-gradient-to-br from-violet-600 to-sky-500 p-6 text-white shadow-lg shadow-violet-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
              <BarChart3 size={16} />
              Learning analytics
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">Phân tích học tập</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85">
              Theo dõi XP, thời gian học, kỹ năng và các hoạt động gần đây của bạn.
            </p>
          </div>
          <div className="flex gap-2 rounded-2xl bg-white/15 p-1">
            {ranges.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setRange(item.value);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-black ${
                  range === item.value ? "bg-white text-violet-700" : "text-white/80"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["XP", data.summary.xp],
          ["Phút học", data.summary.studyMinutes],
          ["Hoạt động", data.summary.completedActivities],
          ["Ngày học", data.summary.activeDays],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-3xl font-black text-slate-950">{value}</p>
            <p className="text-sm font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Xu hướng XP</h2>
              <p className="text-sm font-bold text-slate-500">
                {data.range.from} - {data.range.to}
              </p>
            </div>
            <TrendingUp className="text-violet-600" />
          </div>
          <div className="grid h-64 grid-cols-7 items-end gap-2 overflow-x-auto sm:gap-3">
            {data.activityTrend.map((item) => (
              <div key={item.date} className="flex h-full min-w-10 flex-col justify-end gap-2">
                <div className="flex flex-1 items-end rounded-2xl bg-slate-50 px-2 pb-2">
                  <div
                    className="w-full rounded-xl bg-gradient-to-t from-violet-600 to-cyan-400"
                    style={{ height: `${Math.max(8, (item.xp / maxXp) * 100)}%` }}
                    title={`${item.date}: ${item.xp} XP`}
                  />
                </div>
                <p className="text-center text-[11px] font-bold text-slate-500">
                  {item.date.slice(5)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-violet-100 bg-violet-50 p-5">
            <div className="flex items-center gap-2 text-sm font-black text-violet-700">
              <Sparkles size={17} />
              Báo cáo thông minh
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-950">{data.aiReport.title}</h2>
            <div className="mt-4 space-y-2">
              {data.aiReport.insights.map((item) => (
                <p key={item} className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-600">
                  {item}
                </p>
              ))}
            </div>
            <Link
              href={data.aiReport.nextAction.href}
              className="mt-4 flex items-center justify-between rounded-2xl bg-violet-600 px-4 py-3 font-black text-white"
            >
              {data.aiReport.nextAction.title}
              <span>→</span>
            </Link>
          </section>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-black text-slate-950">Tiến độ kỹ năng</h2>
          <div className="space-y-3">
            {data.skills.map((skill) => (
              <Link key={skill.key} href={skill.href} className="block rounded-2xl border border-slate-100 p-4 hover:bg-violet-50">
                <div className="mb-2 flex items-center justify-between font-black">
                  <span>{skill.label}</span>
                  <span>{skill.sampleStatus === "READY" ? `${skill.percent}%` : "Chưa đủ dữ liệu"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(skill.percent, 100)}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-black text-slate-950">Hoạt động gần đây</h2>
          {data.recentActivities.length ? (
            <div className="divide-y divide-slate-100">
              {data.recentActivities.map((activity) => (
                <Link key={activity.id} href={activity.actionUrl} className="flex items-center gap-3 py-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <CalendarDays size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-950">{activity.title}</p>
                    <p className="truncate text-sm font-bold text-slate-500">{activity.description}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-black text-amber-700">
                    +{activity.xp} XP
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
              Chưa có hoạt động trong khoảng thời gian này.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

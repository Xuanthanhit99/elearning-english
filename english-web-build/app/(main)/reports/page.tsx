"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, RefreshCcw, Sparkles } from "lucide-react";
import {
  AnalyticsReport,
  getMonthlyReport,
  getWeeklyReport,
} from "@/src/lib/analytics-api";

type ReportMode = "weekly" | "monthly";

export default function ReportsPage() {
  const [mode, setMode] = useState<ReportMode>("weekly");
  const [data, setData] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(mode === "weekly" ? await getWeeklyReport() : await getMonthlyReport());
    } catch {
      setError("Không tải được báo cáo. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const request = mode === "weekly" ? getWeeklyReport() : getMonthlyReport();
    request
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("Không tải được báo cáo. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl bg-slate-200" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="font-black text-rose-700">{error ?? "Không có dữ liệu báo cáo."}</p>
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
      <section className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-700">
              <FileText size={16} />
              Progress reports
            </div>
            <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">Báo cáo học tập</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold text-slate-500">
              Tổng hợp kết quả, điểm nổi bật và gợi ý tiếp theo từ dữ liệu học thật.
            </p>
          </div>
          <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
            {[
              ["weekly", "Tuần này"],
              ["monthly", "Tháng này"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setMode(value as ReportMode);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-black ${
                  mode === value ? "bg-violet-600 text-white" : "text-slate-500"
                }`}
              >
                {label}
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
          ["Thành tích", data.summary.achievementsUnlocked],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-3xl font-black text-slate-950">{value}</p>
            <p className="text-sm font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-black text-slate-950">Điểm nổi bật</h2>
          <div className="space-y-3">
            {data.highlights.map((item) => (
              <div key={item} className="rounded-2xl bg-violet-50 p-4 font-bold text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-black text-violet-100">
            <Sparkles size={17} />
            Gợi ý tiếp theo
          </div>
          <div className="mt-4 space-y-3">
            {data.recommendations.length ? (
              data.recommendations.slice(0, 4).map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-2xl bg-white/10 p-4 font-bold">
                  <p className="font-black">{item.title}</p>
                  {item.subtitle && <p className="mt-1 text-sm text-white/80">{item.subtitle}</p>}
                </Link>
              ))
            ) : (
              <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold text-white/80">
                Chưa có gợi ý phù hợp. Hãy hoàn thành thêm một hoạt động học.
              </p>
            )}
          </div>
        </aside>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-black text-slate-950">Kỹ năng trong kỳ</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.skillBreakdown.map((skill) => (
            <Link key={skill.key} href={skill.href} className="rounded-2xl border border-slate-100 p-4 hover:bg-violet-50">
              <div className="flex items-center justify-between font-black">
                <span>{skill.label}</span>
                <span>{skill.sampleStatus === "READY" ? `${skill.percent}%` : "Chưa đủ dữ liệu"}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(skill.percent, 100)}%` }} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

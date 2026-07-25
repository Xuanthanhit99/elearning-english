"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  GraduationCap,
  RefreshCcw,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  LearningActivity,
  ProgressOverview,
  getProgressOverview,
} from "@/src/lib/progress-api";

const skillLabels: Record<string, string> = {
  VOCABULARY: "Tá»« vá»±ng",
  GRAMMAR: "Ngá»¯ phÃ¡p",
  READING: "Äá»c",
  LISTENING: "Nghe",
  SPEAKING: "NÃ³i",
  WRITING: "Viáº¿t",
};

function formatDate(value?: string | null) {
  if (!value) return "ChÆ°a cÃ³";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ActivityRow({ item }: { item: LearningActivity }) {
  return (
    <Link
      href={`/history/${encodeURIComponent(item.activityKey)}`}
      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-violet-200 hover:bg-violet-50"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        <Activity size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-slate-950">{item.title}</p>
        <p className="truncate text-sm font-bold text-slate-500">
          {item.skill ? skillLabels[item.skill] ?? item.skill : "Lá»™ trÃ¬nh"} - {formatDate(item.occurredAt)}
        </p>
      </div>
      {typeof item.score === "number" && (
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
          {item.score}
        </span>
      )}
      <ArrowRight size={18} className="text-slate-300" />
    </Link>
  );
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getProgressOverview());
    } catch {
      setError("KhÃ´ng táº£i Ä‘Æ°á»£c tiáº¿n Ä‘á»™ há»c táº­p. Vui lÃ²ng thá»­ láº¡i.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getProgressOverview()
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("KhÃ´ng táº£i Ä‘Æ°á»£c tiáº¿n Ä‘á»™ há»c táº­p. Vui lÃ²ng thá»­ láº¡i.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const completion = useMemo(
    () => Math.min(data?.overview.overallCompletion ?? 0, 100),
    [data],
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
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
        <p className="font-black text-rose-700">{error ?? "KhÃ´ng cÃ³ dá»¯ liá»‡u tiáº¿n Ä‘á»™."}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-black text-white"
        >
          <RefreshCcw size={18} />
          Thá»­ láº¡i
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[2rem] bg-gradient-to-br from-violet-600 to-cyan-500 p-6 text-white shadow-lg shadow-violet-100">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
              <TrendingUp size={16} />
              Learning progress
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">Tiáº¿n Ä‘á»™ há»c táº­p</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85">
              Xem báº¡n Ä‘Ã£ Ä‘i Ä‘Æ°á»£c tá»›i Ä‘Ã¢u, ká»¹ nÄƒng nÃ o Ä‘ang máº¡nh lÃªn vÃ  bÃ i nÃ o cÃ³ thá»ƒ há»c tiáº¿p.
            </p>
          </div>
          <div className="rounded-3xl bg-white/15 p-5">
            <p className="text-sm font-black text-white/75">Lá»™ trÃ¬nh hiá»‡n táº¡i</p>
            <p className="mt-1 text-5xl font-black">{completion}%</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["XP", data.overview.totalXp, <Star key="xp" className="text-amber-600" />],
          ["PhÃºt há»c", data.overview.totalStudyMinutes, <Clock key="time" className="text-sky-600" />],
          ["Hoáº¡t Ä‘á»™ng", data.overview.totalCompletedActivities, <BookOpen key="activity" className="text-emerald-600" />],
          ["Streak", data.overview.currentStreak, <Flame key="streak" className="text-orange-600" />],
        ].map(([label, value, icon]) => (
          <div key={label as string} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50">
              {icon}
            </div>
            <p className="text-3xl font-black text-slate-950">{value}</p>
            <p className="text-sm font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Tiáº¿n Ä‘á»™ ká»¹ nÄƒng</h2>
                <p className="text-sm font-bold text-slate-500">Theo tá»«ng ká»¹ nÄƒng chÃ­nh</p>
              </div>
              <GraduationCap className="text-violet-600" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {data.skills.map((skill) => (
                <Link
                  key={skill.skill}
                  href={skill.nextAction.href}
                  className="rounded-2xl border border-slate-100 p-4 transition hover:border-violet-200 hover:bg-violet-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{skillLabels[skill.skill]}</p>
                      <p className="text-xs font-bold text-slate-500">
                        {skill.currentLevel ?? "ChÆ°a xÃ¡c Ä‘á»‹nh"} - {skill.status}
                      </p>
                    </div>
                    <p className="text-xl font-black text-violet-700">
                      {skill.status === "INSUFFICIENT_DATA" ? "--" : `${skill.progressPercent}%`}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-600"
                      style={{ width: `${Math.min(skill.progressPercent, 100)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    HoÃ n thÃ nh {skill.completedActivities} - Äang há»c {skill.inProgressActivities}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-950">HoÃ n thÃ nh gáº§n Ä‘Ã¢y</h2>
              <Link href="/history" className="text-sm font-black text-violet-600">
                Xem lá»‹ch sá»­
              </Link>
            </div>
            {data.recentlyCompleted.length ? (
              <div className="space-y-3">
                {data.recentlyCompleted.map((item) => (
                  <ActivityRow key={item.activityKey} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                ChÆ°a cÃ³ hoáº¡t Ä‘á»™ng hoÃ n thÃ nh gáº§n Ä‘Ã¢y.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Tiáº¿p tá»¥c há»c</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">CÃ¡c bÃ i Ä‘ang há»c dá»Ÿ</p>
            <div className="mt-4 space-y-3">
              {data.inProgress.length ? (
                data.inProgress.map((item) => (
                  <Link
                    key={item.activityKey}
                    href={item.resumeAction.href ?? "/progress"}
                    className="block rounded-2xl bg-violet-50 p-4 transition hover:bg-violet-100"
                  >
                    <p className="font-black text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {item.skill ? skillLabels[item.skill] : "Lá»™ trÃ¬nh"} - {formatDate(item.lastActivityAt)}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-black text-violet-700">
                      {item.resumeAction.label} <ArrowRight size={16} />
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  KhÃ´ng cÃ³ bÃ i Ä‘ang há»c dá»Ÿ.
                </div>
              )}
            </div>
          </section>

          {data.recommendation && (
            <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 to-slate-950 p-5 text-white">
              <div className="flex items-center gap-2 text-sm font-black text-violet-100">
                <Sparkles size={17} />
                Gá»£i Ã½ tiáº¿p theo
              </div>
              <h2 className="mt-4 text-2xl font-black">{data.recommendation.title}</h2>
              {data.recommendation.subtitle && (
                <p className="mt-2 text-sm font-bold text-white/75">{data.recommendation.subtitle}</p>
              )}
              <Link
                href={data.recommendation.href}
                className="mt-5 flex items-center justify-between rounded-2xl bg-white px-4 py-3 font-black text-violet-700"
              >
                Báº¯t Ä‘áº§u
                <ArrowRight size={18} />
              </Link>
            </section>
          )}
        </aside>
      </section>
    </div>
  );
}

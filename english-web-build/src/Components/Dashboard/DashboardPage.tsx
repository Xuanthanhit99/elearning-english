"use client";

import {
  Award,
  Bell,
  BookOpen,
  ChevronRight,
  Coins,
  Flame,
  Gem,
  GraduationCap,
  HeartPulse,
  PawPrint,
  Play,
  RefreshCcw,
  Sparkles,
  Star,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardData, getDashboard } from "@/src/lib/dashboard-api";
import { useTranslation } from "@/src/hooks/useTranslation";

const skillColors: Record<string, string> = {
  VOCABULARY: "bg-violet-500",
  GRAMMAR: "bg-emerald-500",
  LISTENING: "bg-blue-500",
  SPEAKING: "bg-orange-500",
  READING: "bg-pink-500",
  WRITING: "bg-cyan-500",
};

const dateLocales: Record<string, string> = {
  vi: "vi-VN",
  en: "en-US",
  zh: "zh-CN",
  de: "de-DE",
};

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(dateLocales[locale] ?? "vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function timeAgo(value: string, home: ReturnType<typeof useTranslation>["dict"]["dashboard"]) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return home.minutesAgo.replace("{n}", String(minutes));
  const hours = Math.round(minutes / 60);
  if (hours < 24) return home.hoursAgo.replace("{n}", String(hours));
  return home.daysAgo.replace("{n}", String(Math.round(hours / 24)));
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      <div className="h-56 animate-pulse rounded-[2rem] bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
          </div>
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
        </div>
        <div className="space-y-6">
          <div className="h-52 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { dict, locale } = useTranslation();
  const d = dict.dashboard;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboard());
    } catch {
      setError(d.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    getDashboard()
      .then((dashboard) => {
        if (!mounted) return;
        setData(dashboard);
        setError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setError(d.loadError);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxWeeklyXp = useMemo(() => {
    return Math.max(...(data?.weeklyActivity.map((item) => item.xp) ?? [0]), 1);
  }, [data]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="font-black text-rose-700">{error ?? d.noData}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 font-black text-white"
        >
          <RefreshCcw size={17} />
          {d.retry}
        </button>
      </div>
    );
  }

  const dailySummary = data.todayMissions.summary;
  const dailyPercent =
    dailySummary.total > 0
      ? Math.round((dailySummary.completed / dailySummary.total) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 p-5 text-white shadow-lg shadow-violet-200 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black backdrop-blur">
              <Sparkles size={16} />
              {d.badge}
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {d.greeting.replace("{name}", data.user.fullname.split(" ").slice(-1)[0])}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85 sm:text-base">
              {d.subtitle}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <Flame className="mb-2 text-orange-200" size={22} />
                <p className="text-xl font-black">{data.currentStreak}</p>
                <p className="text-xs font-bold text-white/75">{dict.header.streak}</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <Star className="mb-2 text-amber-200" size={22} />
                <p className="text-xl font-black">{data.xp.total}</p>
                <p className="text-xs font-bold text-white/75">{d.totalXp}</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <Coins className="mb-2 text-yellow-200" size={22} />
                <p className="text-xl font-black">{data.coins}</p>
                <p className="text-xs font-bold text-white/75">Coins</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <Zap className="mb-2 text-cyan-100" size={22} />
                <p className="text-xl font-black">{data.energy}</p>
                <p className="text-xs font-bold text-white/75">{d.energy}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/15 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-white/75">{d.todayGoal}</p>
                <p className="mt-1 text-4xl font-black">{dailyPercent}%</p>
                <p className="text-sm font-bold text-white/80">
                  {d.tasksDone.replace("{completed}", String(dailySummary.completed)).replace("{total}", String(dailySummary.total))}
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-violet-600">
                <GraduationCap size={34} />
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${Math.min(dailyPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Star className="text-violet-700" size={22} />}
          label={d.statXpToday}
          value={data.xp.today}
          tone="bg-violet-100"
        />
        <StatCard
          icon={<BookOpen className="text-emerald-700" size={22} />}
          label={d.statRecentSessions}
          value={data.recentSessions.length}
          tone="bg-emerald-100"
        />
        <StatCard
          icon={<Award className="text-amber-700" size={22} />}
          label={d.statNewAchievements}
          value={data.recentAchievements.length}
          tone="bg-amber-100"
        />
        <StatCard
          icon={<Bell className="text-sky-700" size={22} />}
          label={d.statNotifications}
          value={data.notificationsPreview.filter((item) => !item.read).length}
          tone="bg-sky-100"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {data.quickActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="group rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                {action.icon === "target" ? <Target size={20} /> : action.icon === "refresh" ? <RefreshCcw size={20} /> : <Play size={20} fill="currentColor" />}
              </div>
              <div className="min-w-0">
                <p className="font-black text-slate-950">{action.title}</p>
                <p className="line-clamp-1 text-sm font-bold text-slate-500">{action.description}</p>
              </div>
              <ChevronRight className="ml-auto shrink-0 text-slate-300 transition group-hover:text-violet-600" size={18} />
            </div>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{d.currentLesson}</h2>
                  <p className="text-sm font-bold text-slate-500">{d.currentLessonDesc}</p>
                </div>
                <BookOpen className="text-violet-500" />
              </div>
              {data.currentLesson ? (
                <Link href={data.currentLesson.href} className="block rounded-3xl bg-violet-50 p-5 transition hover:bg-violet-100">
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">
                    {data.currentLesson.type}
                  </span>
                  <h3 className="mt-3 text-2xl font-black text-slate-950">{data.currentLesson.title}</h3>
                  {data.currentLesson.subtitle && (
                    <p className="mt-1 text-sm font-bold text-slate-500">{data.currentLesson.subtitle}</p>
                  )}
                  {"progressPercent" in data.currentLesson && typeof data.currentLesson.progressPercent === "number" && (
                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-xs font-black text-slate-500">
                        <span>{d.skillProgress}</span>
                        <span>{data.currentLesson.progressPercent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(data.currentLesson.progressPercent, 100)}%` }} />
                      </div>
                    </div>
                  )}
                  <p className="mt-5 inline-flex items-center gap-1 text-sm font-black text-violet-700">
                    {d.continueCta} <ChevronRight size={16} />
                  </p>
                </Link>
              ) : (
                <EmptyState text={d.noCurrentLesson} />
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{d.continueLearning}</h2>
                  <p className="text-sm font-bold text-slate-500">{d.continueLearningDesc}</p>
                </div>
                <RefreshCcw className="text-violet-500" />
              </div>
              {data.continueLearning.items.length ? (
                <div className="space-y-3">
                  {data.continueLearning.items.map((item) => (
                    <Link key={`${item.type}-${item.id}`} href={item.href} className="block rounded-2xl border border-slate-100 p-3 transition hover:border-violet-200 hover:bg-violet-50/50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">{item.title}</p>
                          <p className="truncate text-xs font-bold text-slate-500">{item.type} {item.subtitle ? `- ${item.subtitle}` : ""}</p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-violet-600">{item.progressPercent}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(item.progressPercent, 100)}%` }} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState text={d.noContinueLearning} />
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{d.recommended}</h2>
                  <p className="text-sm font-bold text-slate-500">{d.recommendedDesc}</p>
                </div>
                <Sparkles className="text-violet-500" />
              </div>
              {data.recommendations.length ? (
                <Link
                  href={data.recommendations[0].href}
                  className="group block rounded-3xl bg-gradient-to-br from-violet-50 to-sky-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                        {data.recommendations[0].type}
                      </span>
                      <h3 className="mt-3 text-2xl font-black text-slate-950">{data.recommendations[0].title}</h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">{data.recommendations[0].subtitle}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white">
                      <Play size={22} fill="currentColor" />
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 text-sm font-black text-slate-600">
                    {data.recommendations[0].meta && (
                      <span className="rounded-full bg-white px-3 py-1">{data.recommendations[0].meta}</span>
                    )}
                    <span className="rounded-full bg-white px-3 py-1 text-violet-700">
                      {d.startNow} <ChevronRight className="inline" size={16} />
                    </span>
                  </div>
                </Link>
              ) : (
                <EmptyState text={d.noRecommendation} />
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{d.learningPath}</h2>
                  <p className="text-sm font-bold text-slate-500">{d.learningPathDesc}</p>
                </div>
                <Link href="/learning-path" className="text-sm font-black text-violet-600">
                  {d.view}
                </Link>
              </div>
              {data.learningPath ? (
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-500">{d.level}</p>
                      <p className="text-3xl font-black text-slate-950">{data.learningPath.overallLevel}</p>
                    </div>
                    <p className="text-3xl font-black text-violet-600">{data.learningPath.progressPercent}%</p>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-600"
                      style={{ width: `${Math.min(data.learningPath.progressPercent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    {data.learningPath.phases.slice(0, 3).map((phase) => (
                      <div key={phase.id} className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-slate-900">{phase.title}</p>
                          <p className="text-sm font-black text-violet-600">{phase.progress}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState text={d.noLearningPath} />
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">{d.weeklyActivity}</h2>
                <p className="text-sm font-bold text-slate-500">{d.weeklyActivityDesc}</p>
              </div>
            </div>
            <div className="grid h-56 grid-cols-7 items-end gap-2 sm:gap-4">
              {data.weeklyActivity.map((item) => (
                <div key={item.date} className="flex h-full flex-col justify-end gap-2">
                  <div className="flex min-h-0 flex-1 items-end rounded-2xl bg-slate-50 px-2 pb-2">
                    <div
                      className="w-full rounded-xl bg-gradient-to-t from-violet-600 to-sky-400"
                      style={{ height: `${Math.max(8, (item.xp / maxWeeklyXp) * 100)}%` }}
                      title={`${item.xp} XP`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-700">{item.xp}</p>
                    <p className="text-[11px] font-bold text-slate-400">{formatDate(item.date, locale)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{d.analytics}</h2>
                  <p className="text-sm font-bold text-slate-500">{d.analyticsDesc}</p>
                </div>
                <Sparkles className="text-violet-500" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-2xl font-black text-violet-700">{data.analytics.summary.xp}</p>
                  <p className="text-xs font-bold text-slate-500">{d.xp7Days}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-2xl font-black text-sky-700">{data.analytics.summary.studyTimeMinutes}p</p>
                  <p className="text-xs font-bold text-slate-500">{d.studyTime}</p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4">
                  <p className="text-2xl font-black text-orange-700">{data.analytics.summary.streak}</p>
                  <p className="text-xs font-bold text-slate-500">{d.currentStreak}</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {data.analytics.charts.skills.map((skill) => (
                  <div key={skill.key}>
                    <div className="mb-1 flex items-center justify-between text-sm font-black">
                      <span className="text-slate-700">{skill.label}</span>
                      <span className="text-slate-950">{skill.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${skillColors[skill.key] ?? "bg-violet-500"}`}
                        style={{ width: `${Math.min(skill.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 to-slate-950 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 text-sm font-black text-violet-100">
                <Sparkles size={17} />
                {d.aiReport}
              </div>
              <h2 className="mt-4 text-2xl font-black">{data.analytics.aiReport.title}</h2>
              <div className="mt-4 space-y-2">
                {data.analytics.aiReport.insights.map((insight) => (
                  <p key={insight} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-white/85">
                    {insight}
                  </p>
                ))}
              </div>
              <Link
                href={data.analytics.aiReport.nextAction.href}
                className="mt-5 flex items-center justify-between rounded-2xl bg-white px-4 py-3 font-black text-violet-700"
              >
                <span>{data.analytics.aiReport.nextAction.title}</span>
                <ChevronRight size={18} />
              </Link>
              <p className="mt-3 text-xs font-bold leading-5 text-violet-100">
                {data.analytics.aiReport.nextAction.reason}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">{d.skillProgress}</h2>
                <p className="text-sm font-bold text-slate-500">{d.skillProgressDesc}</p>
              </div>
              <Link href="/overview/skills" className="hidden text-sm font-black text-violet-600 sm:block">
                {d.details}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.skillProgress.map((skill) => (
                <Link key={skill.key} href={skill.href} className="rounded-2xl border border-slate-100 p-4 transition hover:border-violet-200 hover:bg-violet-50/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{skill.label}</p>
                      <p className="text-xs font-bold text-slate-500">{skill.level ?? d.undetermined}</p>
                    </div>
                    <p className="text-xl font-black text-slate-950">{skill.percent}%</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${skillColors[skill.key] ?? "bg-violet-500"}`}
                      style={{ width: `${Math.min(skill.percent, 100)}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-950">{d.recentSessions}</h2>
            </div>
            {data.recentSessions.length ? (
              <div className="divide-y divide-slate-100">
                {data.recentSessions.map((session) => (
                  <Link key={`${session.type}-${session.id}`} href={session.href} className="flex items-center gap-3 py-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <BookOpen size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-slate-950">{session.title}</p>
                      <p className="truncate text-sm font-bold text-slate-500">
                        {session.type} {session.subtitle ? `- ${session.subtitle}` : ""} - {timeAgo(session.completedAt, d)}
                      </p>
                    </div>
                    {typeof session.score === "number" && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                        {session.score}%
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState text={d.noRecentSessions} />
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">{d.yourPet}</h2>
                <p className="text-sm font-bold text-slate-500">{d.yourPetDesc}</p>
              </div>
              <PawPrint className="text-violet-600" />
            </div>
            {data.pet ? (
              <div className="mt-5 rounded-3xl bg-gradient-to-br from-violet-50 to-amber-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm">
                    🦊
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-950">{data.pet.petName}</p>
                    <p className="text-sm font-bold text-slate-500">{d.level} {data.pet.level} - {data.pet.petType}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-black">
                  <span className="rounded-2xl bg-white px-3 py-2 text-rose-600">
                    <HeartPulse className="mr-1 inline" size={15} /> {data.pet.hp} HP
                  </span>
                  <span className="rounded-2xl bg-white px-3 py-2 text-amber-600">
                    <Zap className="mr-1 inline" size={15} /> {data.pet.energy} {d.energy}
                  </span>
                </div>
              </div>
            ) : (
              <EmptyState text={d.noPet} />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-black text-slate-950">{d.todayMissions}</h2>
            {data.todayMissions.items.length ? (
              <div className="space-y-3">
                {data.todayMissions.items.slice(0, 5).map((mission) => (
                  <div key={mission.id} className="rounded-2xl border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{mission.title}</p>
                        <p className="text-xs font-bold text-slate-500">{mission.description}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                        +{mission.reward.xp} XP
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-violet-600" style={{ width: `${mission.progressPercent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text={d.noTodayMissions} />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-black text-slate-950">{d.recentAchievements}</h2>
            {data.recentAchievements.length ? (
              <div className="space-y-3">
                {data.recentAchievements.slice(0, 4).map((achievement) => (
                  <Link key={achievement.id} href={achievement.href} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Award size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-slate-950">{achievement.title}</p>
                      <p className="text-xs font-bold text-slate-500">+{achievement.xp} XP</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState text={d.noRecentAchievements} />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-black text-slate-950">{d.notifications}</h2>
            {data.notificationsPreview.length ? (
              <div className="space-y-3">
                {data.notificationsPreview.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    className="block rounded-2xl bg-slate-50 p-3"
                  >
                    <p className="font-black text-slate-950">{notification.title}</p>
                    <p className="line-clamp-2 text-sm font-bold text-slate-500">{notification.message}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState text={d.noNotifications} />
            )}
          </section>

          <Link
            href="/placement"
            className="flex items-center justify-between rounded-3xl bg-slate-950 p-5 font-black text-white shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Gem size={20} />
              {d.updateLevel}
            </span>
            <ChevronRight size={20} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

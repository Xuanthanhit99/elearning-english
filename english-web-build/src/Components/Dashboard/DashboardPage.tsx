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

const skillColors: Record<string, string> = {
  VOCABULARY: "bg-violet-500",
  GRAMMAR: "bg-emerald-500",
  LISTENING: "bg-blue-500",
  SPEAKING: "bg-orange-500",
  READING: "bg-pink-500",
  WRITING: "bg-cyan-500",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboard());
    } catch {
      setError("Chưa tải được dashboard. Vui lòng thử lại.");
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
        setError("Chưa tải được dashboard. Vui lòng thử lại.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
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
        <p className="font-black text-rose-700">{error ?? "Không có dữ liệu dashboard."}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 font-black text-white"
        >
          <RefreshCcw size={17} />
          Thử lại
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
              Dashboard hôm nay
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Chào {data.user.fullname.split(" ").slice(-1)[0]}!
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85 sm:text-base">
              Theo dõi nhiệm vụ, lộ trình và kỹ năng của bạn trong một nơi. Bắt đầu bằng bài học được gợi ý để giữ nhịp học thật mượt.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <Flame className="mb-2 text-orange-200" size={22} />
                <p className="text-xl font-black">{data.currentStreak}</p>
                <p className="text-xs font-bold text-white/75">Streak</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <Star className="mb-2 text-amber-200" size={22} />
                <p className="text-xl font-black">{data.xp.total}</p>
                <p className="text-xs font-bold text-white/75">Tổng XP</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <Coins className="mb-2 text-yellow-200" size={22} />
                <p className="text-xl font-black">{data.coins}</p>
                <p className="text-xs font-bold text-white/75">Coins</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <Zap className="mb-2 text-cyan-100" size={22} />
                <p className="text-xl font-black">{data.energy}</p>
                <p className="text-xs font-bold text-white/75">Energy</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/15 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-white/75">Mục tiêu hôm nay</p>
                <p className="mt-1 text-4xl font-black">{dailyPercent}%</p>
                <p className="text-sm font-bold text-white/80">
                  {dailySummary.completed}/{dailySummary.total} nhiệm vụ hoàn thành
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
          label="XP hôm nay"
          value={data.xp.today}
          tone="bg-violet-100"
        />
        <StatCard
          icon={<BookOpen className="text-emerald-700" size={22} />}
          label="Bài gần đây"
          value={data.recentSessions.length}
          tone="bg-emerald-100"
        />
        <StatCard
          icon={<Award className="text-amber-700" size={22} />}
          label="Thành tích mới"
          value={data.recentAchievements.length}
          tone="bg-amber-100"
        />
        <StatCard
          icon={<Bell className="text-sky-700" size={22} />}
          label="Thông báo"
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
                  <h2 className="text-xl font-black text-slate-950">Bài hiện tại</h2>
                  <p className="text-sm font-bold text-slate-500">Bài nên mở tiếp ngay bây giờ</p>
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
                        <span>Tiến độ</span>
                        <span>{data.currentLesson.progressPercent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(data.currentLesson.progressPercent, 100)}%` }} />
                      </div>
                    </div>
                  )}
                  <p className="mt-5 inline-flex items-center gap-1 text-sm font-black text-violet-700">
                    Tiếp tục <ChevronRight size={16} />
                  </p>
                </Link>
              ) : (
                <EmptyState text="Chưa có bài hiện tại. Hãy bắt đầu từ bài học gợi ý hoặc lộ trình học." />
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Tiếp tục học</h2>
                  <p className="text-sm font-bold text-slate-500">Các phiên đang học dở từ dữ liệu thật</p>
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
                <EmptyState text="Không có phiên học dở. Bạn đang rất gọn gàng, mở bài mới thôi." />
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Bài học gợi ý</h2>
                  <p className="text-sm font-bold text-slate-500">Tiếp tục từ dữ liệu học thật của bạn</p>
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
                      Học ngay <ChevronRight className="inline" size={16} />
                    </span>
                  </div>
                </Link>
              ) : (
                <EmptyState text="Chưa có bài học gợi ý. Hãy hoàn thành placement hoặc mở một kỹ năng để hệ thống đề xuất tốt hơn." />
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Lộ trình học</h2>
                  <p className="text-sm font-bold text-slate-500">Theo placement và tiến độ hiện tại</p>
                </div>
                <Link href="/learning-path" className="text-sm font-black text-violet-600">
                  Xem
                </Link>
              </div>
              {data.learningPath ? (
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-500">Trình độ</p>
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
                <EmptyState text="Chưa có lộ trình học. Làm placement để PoppyLingo xây lộ trình cá nhân hóa." />
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Hoạt động tuần này</h2>
                <p className="text-sm font-bold text-slate-500">XP, bài học và thời gian học trong 7 ngày gần nhất</p>
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
                    <p className="text-[11px] font-bold text-slate-400">{formatDate(item.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Analytics</h2>
                  <p className="text-sm font-bold text-slate-500">Tổng hợp XP, thời gian học, streak và kỹ năng</p>
                </div>
                <Sparkles className="text-violet-500" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-2xl font-black text-violet-700">{data.analytics.summary.xp}</p>
                  <p className="text-xs font-bold text-slate-500">XP 7 ngày</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-2xl font-black text-sky-700">{data.analytics.summary.studyTimeMinutes}p</p>
                  <p className="text-xs font-bold text-slate-500">Thời gian học</p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4">
                  <p className="text-2xl font-black text-orange-700">{data.analytics.summary.streak}</p>
                  <p className="text-xs font-bold text-slate-500">Streak hiện tại</p>
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
                AI REPORT
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
                <h2 className="text-xl font-black text-slate-950">Tiến độ kỹ năng</h2>
                <p className="text-sm font-bold text-slate-500">Dựa trên placement và kết quả học tập</p>
              </div>
              <Link href="/overview/skills" className="hidden text-sm font-black text-violet-600 sm:block">
                Chi tiết
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.skillProgress.map((skill) => (
                <Link key={skill.key} href={skill.href} className="rounded-2xl border border-slate-100 p-4 transition hover:border-violet-200 hover:bg-violet-50/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{skill.label}</p>
                      <p className="text-xs font-bold text-slate-500">{skill.level ?? "Chưa xác định"}</p>
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
              <h2 className="text-xl font-black text-slate-950">Phiên học gần đây</h2>
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
                        {session.type} {session.subtitle ? `- ${session.subtitle}` : ""} - {timeAgo(session.completedAt)}
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
              <EmptyState text="Chưa có phiên học gần đây. Bắt đầu một bài học để dashboard ghi nhận." />
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Pet của bạn</h2>
                <p className="text-sm font-bold text-slate-500">Bạn đồng hành học tập</p>
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
                    <p className="text-sm font-bold text-slate-500">Level {data.pet.level} - {data.pet.petType}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-black">
                  <span className="rounded-2xl bg-white px-3 py-2 text-rose-600">
                    <HeartPulse className="mr-1 inline" size={15} /> {data.pet.hp} HP
                  </span>
                  <span className="rounded-2xl bg-white px-3 py-2 text-amber-600">
                    <Zap className="mr-1 inline" size={15} /> {data.pet.energy} Energy
                  </span>
                </div>
              </div>
            ) : (
              <EmptyState text="Chưa có pet. Hãy chọn pet để đồng hành trong quá trình học." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-black text-slate-950">Nhiệm vụ hôm nay</h2>
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
              <EmptyState text="Chưa có nhiệm vụ hôm nay." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-black text-slate-950">Thành tích gần đây</h2>
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
              <EmptyState text="Chưa có thành tích mới." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-black text-slate-950">Thông báo</h2>
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
              <EmptyState text="Không có thông báo mới." />
            )}
          </section>

          <Link
            href="/placement"
            className="flex items-center justify-between rounded-3xl bg-slate-950 p-5 font-black text-white shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Gem size={20} />
              Cập nhật trình độ
            </span>
            <ChevronRight size={20} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

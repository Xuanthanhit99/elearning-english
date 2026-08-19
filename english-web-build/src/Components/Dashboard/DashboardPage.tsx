"use client";

import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  Headphones,
  Mic2,
  PawPrint,
  Play,
  RefreshCcw,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/src/lib/ga";
import { DashboardData, DashboardMission, getDashboard } from "@/src/lib/dashboard-api";
import { getWeeklyLeaderboard } from "@/src/lib/leaderboard-api";
import type { LeaderboardResponse } from "@/src/types/leaderboard";
import { useTranslation } from "@/src/hooks/useTranslation";
import {
  BeaconVieBadge,
  BeaconVieCard,
  BeaconVieProgress,
  BeaconVieSectionHeader,
  BeaconVieSkeleton,
  BeaconVieStatCard,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";
import {
  AiCoachPanel,
  SkillRadarPanel,
  StudyHeatmapPanel,
  useCoachHeadline,
} from "@/src/Components/Dashboard/AnalyticsCoachPanels";
import { AchievementCelebration } from "@/src/Components/Dashboard/AchievementCelebration";

const skillRoutes: Record<string, string> = {
  VOCABULARY: "/vocabulary",
  GRAMMAR: "/grammar",
  LISTENING: "/listening",
  SPEAKING: "/speaking",
  READING: "/reading",
  WRITING: "/writing",
};

const skillModules = [
  {
    key: "VOCABULARY",
    fallbackKey: "vocabulary",
    label: "Từ vựng",
    description: "Ôn từ theo chủ đề và lịch lặp lại ngắt quãng.",
    href: "/vocabulary",
    icon: BookOpen,
    accent: "from-emerald-500/16 via-teal-400/10 to-cyan-400/10",
    iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
  },
  {
    key: "GRAMMAR",
    fallbackKey: "grammar",
    label: "Ngữ pháp",
    description: "Luyện quy tắc ngữ pháp qua các bài học tập trung.",
    href: "/grammar",
    icon: CheckCircle2,
    accent: "from-blue-500/16 via-sky-400/10 to-cyan-400/10",
    iconClass: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200",
  },
  {
    key: "READING",
    fallbackKey: "reading",
    label: "Luyện đọc",
    description: "Đọc bài và nâng khả năng hiểu văn bản.",
    href: "/reading",
    icon: FileText,
    accent: "from-amber-500/16 via-orange-400/10 to-yellow-400/10",
    iconClass: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  },
  {
    key: "LISTENING",
    fallbackKey: "listening",
    label: "Luyện nghe",
    description: "Rèn kỹ năng nghe hiểu và nghe chép chính tả.",
    href: "/listening",
    icon: Headphones,
    accent: "from-violet-500/16 via-indigo-400/10 to-blue-400/10",
    iconClass: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
  },
  {
    key: "SPEAKING",
    fallbackKey: "speaking",
    label: "Luyện nói",
    description: "Luyện phát âm và sự trôi chảy khi nói.",
    href: "/speaking",
    icon: Mic2,
    accent: "from-fuchsia-500/16 via-pink-400/10 to-rose-400/10",
    iconClass: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-200",
  },
  {
    key: "WRITING",
    fallbackKey: "writing",
    label: "Luyện viết",
    description: "Cải thiện bài viết với góp ý có cấu trúc.",
    href: "/writing",
    icon: FileText,
    accent: "from-rose-500/16 via-orange-400/10 to-amber-400/10",
    iconClass: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200",
  },
] as const;

type LeaderboardState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: LeaderboardResponse; error: null }
  | { status: "empty"; data: null; error: null }
  | { status: "error"; data: null; error: string };

const dateLocales: Record<string, string> = {
  vi: "vi-VN",
  en: "en-US",
  zh: "zh-CN",
  de: "de-DE",
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(dateLocales[locale] ?? "en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function firstName(fullname: string) {
  return fullname.trim().split(/\s+/).slice(-1)[0] || fullname;
}

function dashboardCta(data: DashboardData) {
  if (data.currentLesson) return data.currentLesson;
  if (data.recommendedLesson) return data.recommendedLesson;
  if (data.recommendations[0]) return data.recommendations[0];
  return null;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      <BeaconVieSkeleton className="h-[360px] rounded-[2rem]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <BeaconVieSkeleton key={index} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <BeaconVieSkeleton className="h-72 rounded-3xl" />
          <BeaconVieSkeleton className="h-80 rounded-3xl" />
        </div>
        <div className="space-y-6">
          <BeaconVieSkeleton className="h-72 rounded-3xl" />
          <BeaconVieSkeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { dict, locale } = useTranslation();
  const d = dict.dashboard;
  const [data, setData] = useState<DashboardData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardState>({
    status: "loading",
    data: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    setLeaderboard({ status: "loading", data: null, error: null });
    try {
      const [dashboardResult, leaderboardResult] = await Promise.allSettled([
        getDashboard(),
        getWeeklyLeaderboard(),
      ]);

      if (dashboardResult.status === "fulfilled") {
        setData(dashboardResult.value);
      } else {
        setData(null);
        setError(d.loadError);
      }

      if (leaderboardResult.status === "fulfilled") {
        setLeaderboard(
          leaderboardResult.value.entries.length > 0 || leaderboardResult.value.currentUser
            ? { status: "ready", data: leaderboardResult.value, error: null }
            : { status: "empty", data: null, error: null },
        );
      } else {
        setLeaderboard({
          status: "error",
          data: null,
          error: "Bảng xếp hạng tạm thời chưa khả dụng.",
        });
      }
    } catch {
      setError(d.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([getDashboard(), getWeeklyLeaderboard()]).then(
      ([dashboardResult, leaderboardResult]) => {
        if (!mounted) return;

        if (dashboardResult.status === "fulfilled") {
          setData(dashboardResult.value);
          setError(null);
        } else {
          setData(null);
          setError(d.loadError);
        }

        if (leaderboardResult.status === "fulfilled") {
          setLeaderboard(
            leaderboardResult.value.entries.length > 0 ||
              leaderboardResult.value.currentUser
              ? { status: "ready", data: leaderboardResult.value, error: null }
              : { status: "empty", data: null, error: null },
          );
        } else {
          setLeaderboard({
            status: "error",
            data: null,
            error: "Bảng xếp hạng tạm thời chưa khả dụng.",
          });
        }

        setLoading(false);
      },
    );

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxWeeklyXp = useMemo(() => {
    return Math.max(...(data?.weeklyActivity.map((item) => item.xp) ?? [0]), 1);
  }, [data]);

  const prevGoalCompletedRef = useRef<boolean | null>(null);
  useEffect(() => {
    const isGoalCompleted = data?.today?.isGoalCompleted;
    if (isGoalCompleted === undefined) return;

    // Only fire on a false -> true transition observed while mounted, not
    // for a goal that was already complete on the first fetch (prevents
    // re-firing on every refetch/rerender once it's already true).
    if (prevGoalCompletedRef.current === false && isGoalCompleted === true) {
      trackEvent("daily_goal_complete");
    }

    prevGoalCompletedRef.current = isGoalCompleted;
  }, [data?.today?.isGoalCompleted]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <BeaconVieState
        title={error ?? d.noData}
        description="Phiên đăng nhập có thể đã hết hạn hoặc dịch vụ tạm thời gián đoạn."
        actionLabel={d.retry}
        onAction={loadDashboard}
        tone="error"
      />
    );
  }

  const dailySummary = data.todayMissions.summary;
  const dailyPercent =
    dailySummary.total > 0
      ? Math.round((dailySummary.completed / dailySummary.total) * 100)
      : data.today?.dailyGoalProgress ?? 0;
  const cta = dashboardCta(data);

  return (
    <div className="space-y-6 pb-10">
      <AchievementCelebration data={data} />
      <WelcomeHero data={data} dailyPercent={dailyPercent} cta={cta} />

      <section aria-label="Quick stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BeaconVieStatCard
          icon={<Flame aria-hidden className="h-5 w-5" />}
          label={dict.header.streak}
          value={data.currentStreak}
          detail={d.currentStreak}
        />
        <BeaconVieStatCard
          icon={<Star aria-hidden className="h-5 w-5" />}
          label={d.statXpToday}
          value={data.xp.today}
          detail={`${data.xp.total.toLocaleString()} ${d.totalXp}`}
        />
        <BeaconVieStatCard
          icon={<Trophy aria-hidden className="h-5 w-5" />}
          label={d.level}
          value={data.user.englishLevel || data.user.level}
          detail={data.user.learningGoal ?? undefined}
        />
        <BeaconVieStatCard
          icon={<Target aria-hidden className="h-5 w-5" />}
          label={d.todayGoal}
          value={`${clampPercent(dailyPercent)}%`}
          detail={d.tasksDone
            .replace("{completed}", String(dailySummary.completed))
            .replace("{total}", String(dailySummary.total))}
        />
      </section>

      {data.quickActions.length > 0 ? <QuickActions actions={data.quickActions} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <SkillsPanel data={data} />
          <SkillRadarPanel />
          <LearningPathPanel data={data} />
          <WeeklyActivityPanel data={data} locale={locale} maxWeeklyXp={maxWeeklyXp} />
          <StudyHeatmapPanel />
          <RecentActivityPanel data={data} locale={locale} />
        </div>

        <aside className="space-y-6">
          <AiCoachPanel />
          <MissionsPanel missions={data.todayMissions.items} summary={dailySummary} />
          <TodayGoalPanel data={data} dailyPercent={dailyPercent} />
          <LeaderboardPanel state={leaderboard} />
          <PetPanel data={data} />
          <AchievementsPanel data={data} />
          <NotificationsPanel data={data} />
        </aside>
      </div>
    </div>
  );
}

function WelcomeHero({
  data,
  dailyPercent,
  cta,
}: {
  data: DashboardData;
  dailyPercent: number;
  cta: DashboardData["currentLesson"] | DashboardData["recommendedLesson"] | DashboardData["recommendations"][number] | null;
}) {
  const { dict } = useTranslation();
  const d = dict.dashboard;
  const coachHeadline = useCoachHeadline();
  // A brand-new account has no lesson to resume and no englishLevel yet
  // (englishLevel is only set once a placement result exists). Point that
  // learner at the placement test instead of a generic learning-path link
  // with nothing behind it yet.
  const needsPlacement = !cta && !data.user.englishLevel;
  const title = needsPlacement
    ? "Kiểm tra trình độ"
    : (cta?.title ?? "Bắt đầu hoạt động học tiếp theo");
  const href = needsPlacement ? "/placement" : (cta?.href ?? "/learning-path");
  const subtitle = needsPlacement
    ? "Chỉ mất vài phút để biết trình độ thật của bạn và nhận lộ trình phù hợp."
    : (cta?.subtitle ?? data.learningPath?.currentPhase?.title ?? "Mở lộ trình học để tiếp tục.");

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/50 bg-[linear-gradient(135deg,var(--BeaconVie-primary-strong),var(--BeaconVie-primary)_48%,var(--BeaconVie-violet))] p-5 text-white shadow-[0_28px_80px_rgba(20,103,232,0.22)] sm:p-7">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,rgba(255,182,72,0.28),transparent_16rem),radial-gradient(circle_at_18%_20%,rgba(23,182,230,0.28),transparent_18rem)]" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="min-w-0">
          <BeaconVieBadge className="border-white/20 bg-white/12 text-white">
            {needsPlacement ? "Bắt đầu" : d.continueLearning}
          </BeaconVieBadge>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            {d.greeting.replace("{name}", firstName(data.user.fullname))}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/82 sm:text-base">
            {needsPlacement
              ? "Bạn chưa làm bài kiểm tra trình độ — đây là cách nhanh nhất để có lộ trình phù hợp với bạn."
              : `Trình độ ${data.user.englishLevel || data.user.level}. Trang tổng quan được sắp xếp quanh hoạt động tiếp theo, mục tiêu hôm nay, nhiệm vụ và tiến độ kỹ năng.`}
          </p>

          <div className="mt-6 max-w-3xl rounded-3xl border border-white/16 bg-white/12 p-4 backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                  {needsPlacement ? "Bắt đầu" : (cta?.type ?? d.learningPath)}
                </p>
                <h2 className="mt-1 truncate text-2xl font-black">{title}</h2>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-white/78">
                  {subtitle}
                </p>
              </div>
              <Link
                href={href}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[var(--BeaconVie-primary-strong)] transition hover:-translate-y-0.5"
              >
                <Play aria-hidden className="h-5 w-5" fill="currentColor" />
                {needsPlacement ? "Bắt đầu" : d.continueCta}
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/16 bg-white/12 p-4 backdrop-blur">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/beaconvie-ai-mascot.webp"
              alt="Linh vật BeaconVie"
              width={112}
              height={112}
              priority
              sizes="112px"
              className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white/18"
            />
            <div className="min-w-0">
              <p className="text-sm font-black text-cyan-100">Beacon Coach</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-white/78">
                {coachHeadline ?? "Đang phân tích tiến độ gần đây của bạn…"}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs font-black text-white/78">
              <span>{d.todayGoal}</span>
              <span>{clampPercent(dailyPercent)}%</span>
            </div>
            <BeaconVieProgress value={dailyPercent} className="bg-white/20 [&>div]:bg-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActions({ actions }: { actions: DashboardData["quickActions"] }) {
  return (
    <section aria-label="Thao tác nhanh" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className="group BeaconVie-card flex min-w-0 items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-blue-200"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]">
            {action.icon === "target" ? <Target size={20} /> : action.icon === "refresh" ? <RefreshCcw size={20} /> : <Play size={20} fill="currentColor" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-black text-[var(--BeaconVie-ink)]">{action.title}</span>
            <span className="block truncate text-sm font-bold text-[var(--BeaconVie-muted)]">
              {action.description}
            </span>
          </span>
          <ChevronRight className="shrink-0 text-[var(--BeaconVie-muted)] transition group-hover:text-[var(--BeaconVie-primary)]" size={18} />
        </Link>
      ))}
    </section>
  );
}

function SkillsPanel({ data }: { data: DashboardData }) {
  const progressByKey = new Map(
    data.skillProgress.map((skill) => [skill.key.toLowerCase(), skill]),
  );

  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader
        title="Các phần học"
        description="Sáu kỹ năng cốt lõi cùng tiến độ thực tế của bạn."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {skillModules.map((module) => {
          const skill =
            progressByKey.get(module.key.toLowerCase()) ??
            progressByKey.get(module.fallbackKey);
          const href = skill?.href || skillRoutes[module.key] || module.href;
          const Icon = module.icon;

          return (
            <Link
              key={module.key}
              href={href}
              className={`group rounded-3xl border border-[var(--BeaconVie-border)] bg-gradient-to-br ${module.accent} p-4 transition hover:-translate-y-0.5 hover:border-blue-200 dark:bg-white/6`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${module.iconClass}`}>
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <ChevronRight
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-[var(--BeaconVie-muted)] transition group-hover:text-[var(--BeaconVie-primary)]"
                />
              </div>
              <p className="mt-4 truncate text-lg font-black text-[var(--BeaconVie-ink)]">
                {skill?.label ?? module.label}
              </p>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[var(--BeaconVie-muted)]">
                {skill?.level ?? skill?.status ?? module.description}
              </p>
              {skill ? (
                <>
                  <div className="mt-4 flex items-center justify-between text-xs font-black text-[var(--BeaconVie-muted)]">
                    <span>Tiến độ</span>
                    <span>{clampPercent(skill.percent)}%</span>
                  </div>
                  <BeaconVieProgress value={skill.percent} className="mt-2 h-2" />
                </>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-[var(--BeaconVie-border)] px-3 py-2 text-xs font-black text-[var(--BeaconVie-muted)]">
                  Chưa có tiến độ
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </BeaconVieCard>
  );
}

function LearningPathPanel({ data }: { data: DashboardData }) {
  const { dict } = useTranslation();
  const d = dict.dashboard;

  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader
        title={d.learningPath}
        description={d.learningPathDesc}
        action={
          <Link href="/learning-path" className="BeaconVie-button-soft text-sm">
            {d.view}
          </Link>
        }
      />
      {data.learningPath ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-[var(--BeaconVie-primary-soft)] p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--BeaconVie-primary)]">
              {d.level}
            </p>
            <p className="mt-2 text-4xl font-black text-[var(--BeaconVie-ink)]">
              {data.learningPath.overallLevel}
            </p>
            <p className="mt-2 text-sm font-bold text-[var(--BeaconVie-muted)]">
              {data.learningPath.currentPhase?.title ?? "Chưa có giai đoạn nào đang học"}
            </p>
            <BeaconVieProgress value={data.learningPath.progressPercent} className="mt-5" />
          </div>
          <ol className="space-y-3">
            {data.learningPath.phases.slice(0, 4).map((phase) => (
              <li key={phase.id} className="rounded-2xl border border-[var(--BeaconVie-border)] bg-white/54 p-3 dark:bg-white/6">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-[var(--BeaconVie-ink)]">{phase.title}</p>
                    <p className="text-xs font-bold text-[var(--BeaconVie-muted)]">
                      Giai đoạn {phase.phase}{phase.targetLevel ? ` - ${phase.targetLevel}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-black text-[var(--BeaconVie-primary)]">
                    {phase.progress}%
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <BeaconVieState title={d.noLearningPath} tone="empty" />
      )}
    </BeaconVieCard>
  );
}

function WeeklyActivityPanel({
  data,
  locale,
  maxWeeklyXp,
}: {
  data: DashboardData;
  locale: string;
  maxWeeklyXp: number;
}) {
  const { dict } = useTranslation();
  const d = dict.dashboard;

  if (!data.weeklyActivity.length) {
    return (
      <BeaconVieCard className="p-5">
        <BeaconVieSectionHeader title={d.weeklyActivity} description={d.weeklyActivityDesc} />
        <BeaconVieState title="Chưa có hoạt động trong tuần này." tone="empty" />
      </BeaconVieCard>
    );
  }

  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader title={d.weeklyActivity} description={d.weeklyActivityDesc} />
      <div className="grid h-56 grid-cols-7 items-end gap-2 sm:gap-4">
        {data.weeklyActivity.map((item) => (
          <div key={item.date} className="flex h-full min-w-0 flex-col justify-end gap-2">
            <div className="flex min-h-0 flex-1 items-end rounded-2xl bg-[var(--BeaconVie-primary-soft)] px-2 pb-2">
              <div
                className="w-full rounded-xl bg-gradient-to-t from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-cyan)]"
                style={{ height: `${Math.max(8, (item.xp / maxWeeklyXp) * 100)}%` }}
                title={`${item.xp} XP`}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-[var(--BeaconVie-ink)]">{item.xp}</p>
              <p className="text-[11px] font-bold text-[var(--BeaconVie-muted)]">
                {formatDateTime(item.date, locale).split(",")[0]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </BeaconVieCard>
  );
}

function RecentActivityPanel({ data, locale }: { data: DashboardData; locale: string }) {
  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader title="Hoạt động gần đây" description="Các phiên học bạn đã hoàn thành." />
      {data.recentSessions.length > 0 ? (
        <div className="divide-y divide-[var(--BeaconVie-border)]">
          {data.recentSessions.map((session) => (
            <Link key={`${session.type}-${session.id}`} href={session.href} className="flex items-center gap-3 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]">
                <BookOpen size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black text-[var(--BeaconVie-ink)]">{session.title}</span>
                <span className="block truncate text-sm font-bold text-[var(--BeaconVie-muted)]">
                  {session.type} - {formatDateTime(session.completedAt, locale)}
                </span>
              </span>
              {typeof session.score === "number" ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                  {session.score}%
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <BeaconVieState title="Chưa có hoạt động gần đây." description="Bắt đầu một bài học, các phiên đã hoàn thành sẽ xuất hiện tại đây." tone="empty" />
      )}
    </BeaconVieCard>
  );
}

function MissionsPanel({
  missions,
  summary,
}: {
  missions: DashboardMission[];
  summary: DashboardData["todayMissions"]["summary"];
}) {
  const { dict } = useTranslation();
  const d = dict.dashboard;

  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader
        title={d.todayMissions}
        description={`${summary.completed}/${summary.total} hoàn thành`}
        action={<Link href="/missions" className="text-sm font-black text-[var(--BeaconVie-primary)]">{d.view}</Link>}
      />
      {missions.length > 0 ? (
        <div className="space-y-3">
          {missions.slice(0, 5).map((mission) => (
            <div key={mission.id} className="rounded-2xl border border-[var(--BeaconVie-border)] bg-white/54 p-3 dark:bg-white/6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-[var(--BeaconVie-ink)]">{mission.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-[var(--BeaconVie-muted)]">
                    {mission.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                  +{mission.reward.xp} XP
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <BeaconVieProgress value={mission.progressPercent} className="h-2 flex-1" />
                {mission.completed ? <CheckCircle2 aria-label="Đã hoàn thành" className="h-5 w-5 text-emerald-500" /> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <BeaconVieState title={d.noTodayMissions} tone="empty" />
      )}
    </BeaconVieCard>
  );
}

function TodayGoalPanel({
  data,
  dailyPercent,
}: {
  data: DashboardData;
  dailyPercent: number;
}) {
  const { dict } = useTranslation();
  const d = dict.dashboard;
  const targetMinutes = data.today?.targetStudyMinutes ?? 0;
  const studyMinutes = data.today?.studyMinutes ?? 0;
  const activeDays = data.week?.activeDays ?? 0;
  const targetDays = data.week?.targetDays ?? 0;

  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader
        title={d.todayGoal}
        description={
          targetMinutes > 0
            ? `Đã học ${studyMinutes}/${targetMinutes} phút`
            : "Mục tiêu hôm nay sẽ hiện sau khi bạn bắt đầu học."
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-3xl bg-[var(--BeaconVie-primary-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--BeaconVie-primary)] shadow-sm dark:bg-white/10">
              <Clock3 aria-hidden className="h-5 w-5" />
            </span>
            <span className="text-2xl font-black text-[var(--BeaconVie-ink)]">
              {clampPercent(dailyPercent)}%
            </span>
          </div>
          <BeaconVieProgress value={dailyPercent} className="mt-4" />
        </div>
        <div className="rounded-3xl border border-[var(--BeaconVie-border)] bg-white/54 p-4 dark:bg-white/6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
              <CalendarDays aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-black text-[var(--BeaconVie-ink)]">
                {targetDays > 0 ? `${activeDays}/${targetDays} ngày hoạt động` : `${activeDays} ngày hoạt động`}
              </p>
              <p className="text-xs font-bold text-[var(--BeaconVie-muted)]">
                Nhịp độ học trong tuần
              </p>
            </div>
          </div>
        </div>
      </div>
    </BeaconVieCard>
  );
}

function LeaderboardPanel({ state }: { state: LeaderboardState }) {
  const entries = state.status === "ready" ? state.data.entries.slice(0, 5) : [];
  const currentUser = state.status === "ready" ? state.data.currentUser : null;
  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader
        title="Bảng xếp hạng tuần"
        description="Những người học dẫn đầu trong kỳ xếp hạng hiện tại."
        action={
          <Link href="/leaderboard" className="text-sm font-black text-[var(--BeaconVie-primary)]">
            Xem tất cả
          </Link>
        }
      />
      {state.status === "loading" ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <BeaconVieSkeleton key={index} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : state.status === "error" ? (
        <BeaconVieState title="Bảng xếp hạng chưa khả dụng" description={state.error} tone="error" />
      ) : state.status === "empty" ? (
        <BeaconVieState title="Chưa có dữ liệu xếp hạng." tone="empty" />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={`${entry.rank}-${entry.user.id}`}
              className={[
                "flex items-center gap-3 rounded-2xl border p-3",
                entry.isCurrentUser
                  ? "border-[var(--BeaconVie-primary)]/25 bg-[var(--BeaconVie-primary-soft)]"
                  : "border-[var(--BeaconVie-border)] bg-white/54 dark:bg-white/6",
              ].join(" ")}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--BeaconVie-ranking-soft)] text-sm font-black text-[var(--BeaconVie-ranking)]">
                #{entry.rank}
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--BeaconVie-primary-soft)] text-xs font-black text-[var(--BeaconVie-primary)]">
                {entry.user.avatarUrl || entry.user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.user.avatarUrl ?? entry.user.avatar ?? ""}
                    alt={entry.user.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  entry.user.displayName.slice(0, 2).toUpperCase()
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black text-[var(--BeaconVie-ink)]">
                  {entry.user.displayName}
                </span>
                <span className="block text-xs font-bold text-[var(--BeaconVie-muted)]">
                  {entry.periodXp.toLocaleString()} XP
                </span>
              </span>
            </div>
          ))}
          {currentUser && !entries.some((entry) => entry.isCurrentUser) ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-sm font-black text-[var(--BeaconVie-primary)] dark:border-blue-400/30 dark:bg-blue-400/10">
              Hạng của bạn: #{currentUser.rank} · {currentUser.periodXp.toLocaleString()} XP
            </div>
          ) : null}
        </div>
      )}
    </BeaconVieCard>
  );
}

function PetPanel({ data }: { data: DashboardData }) {
  const { dict } = useTranslation();
  const d = dict.dashboard;
  const pet = data.pet;

  if (pet?.isChosen) {
    return (
      <BeaconVieCard className="p-5">
        <BeaconVieSectionHeader
          title={d.yourPet}
          description={d.yourPetDesc}
          action={
            <Link href="/profile" className="text-sm font-black text-[var(--BeaconVie-primary)]">
              Hồ sơ
            </Link>
          }
        />
        <div className="rounded-3xl border border-[var(--BeaconVie-border)] bg-white/54 p-4 dark:bg-white/6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]">
              <PawPrint size={30} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-[var(--BeaconVie-ink)]">
                {pet.petName}
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--BeaconVie-muted)]">
                Cấp {pet.level} · {pet.xp.toLocaleString()} XP
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black text-[var(--BeaconVie-muted)]">
            <span className="rounded-2xl bg-emerald-50 px-2 py-2 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
              Năng lượng {pet.energy}
            </span>
            <span className="rounded-2xl bg-pink-50 px-2 py-2 text-pink-700 dark:bg-pink-400/15 dark:text-pink-200">
              Vui vẻ {pet.happiness}
            </span>
            <span className="rounded-2xl bg-amber-50 px-2 py-2 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
              HP {pet.hp}
            </span>
          </div>
        </div>
      </BeaconVieCard>
    );
  }

  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader
        title={d.yourPet}
        description="Tính năng bạn đồng hành đang được chuẩn bị."
        action={
          <Link href="/profile" className="text-sm font-black text-[var(--BeaconVie-primary)]">
            Hồ sơ
          </Link>
        }
      />
      <div className="rounded-3xl border border-dashed border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-primary-soft)] p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[var(--BeaconVie-primary)] shadow-sm dark:bg-white/10">
            <PawPrint size={30} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-[var(--BeaconVie-ink)]">
              Sắp ra mắt
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--BeaconVie-muted)]">
              Bạn chưa cần làm gì ở đây.
            </p>
          </div>
        </div>
      </div>
    </BeaconVieCard>
  );
}

function AchievementsPanel({ data }: { data: DashboardData }) {
  const { dict } = useTranslation();
  const d = dict.dashboard;

  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader title={d.recentAchievements} description="Huy hiệu và phần thưởng vừa đạt được." />
      {data.recentAchievements.length > 0 ? (
        <div className="space-y-3">
          {data.recentAchievements.slice(0, 4).map((achievement) => (
            <Link key={achievement.id} href={achievement.href} className="flex items-center gap-3 rounded-2xl bg-[var(--BeaconVie-ranking-soft)] p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--BeaconVie-card)] text-[var(--BeaconVie-ranking)]">
                <Award size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black text-[var(--BeaconVie-ink)]">{achievement.title}</span>
                <span className="block text-xs font-bold text-[var(--BeaconVie-muted)]">+{achievement.xp} XP</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <BeaconVieState title={d.noRecentAchievements} tone="empty" />
      )}
    </BeaconVieCard>
  );
}

function NotificationsPanel({ data }: { data: DashboardData }) {
  const { dict } = useTranslation();
  const d = dict.dashboard;

  return (
    <BeaconVieCard className="p-5">
      <BeaconVieSectionHeader
        title={d.notifications}
        description="Thông báo gần đây từ hệ thống."
        action={<Link href="/notifications" className="text-sm font-black text-[var(--BeaconVie-primary)]">Mở</Link>}
      />
      {data.notificationsPreview.length > 0 ? (
        <div className="space-y-3">
          {data.notificationsPreview.map((notification) => (
            <Link key={notification.id} href={notification.href} className="block rounded-2xl bg-white/54 p-3 dark:bg-white/6">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[var(--BeaconVie-primary)]" />
                <span className="min-w-0">
                  <span className="block truncate font-black text-[var(--BeaconVie-ink)]">{notification.title}</span>
                  <span className="line-clamp-2 text-sm font-bold text-[var(--BeaconVie-muted)]">
                    {notification.message}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <BeaconVieState title={d.noNotifications} tone="empty" />
      )}
    </BeaconVieCard>
  );
}

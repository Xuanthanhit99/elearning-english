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
import { useEffect, useMemo, useState } from "react";
import { DashboardData, DashboardMission, getDashboard } from "@/src/lib/dashboard-api";
import { getWeeklyLeaderboard } from "@/src/lib/leaderboard-api";
import type { LeaderboardResponse } from "@/src/types/leaderboard";
import { useTranslation } from "@/src/hooks/useTranslation";
import {
  LumiverseBadge,
  LumiverseCard,
  LumiverseProgress,
  LumiverseSectionHeader,
  LumiverseSkeleton,
  LumiverseStatCard,
  LumiverseState,
} from "@/src/Components/UI/Lumiverse";
import {
  AiCoachPanel,
  SkillRadarPanel,
  StudyHeatmapPanel,
  useCoachHeadline,
} from "@/src/Components/Dashboard/AnalyticsCoachPanels";

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
    label: "Vocabulary",
    description: "Review words, SRS and topic vocabulary.",
    href: "/vocabulary",
    icon: BookOpen,
    accent: "from-emerald-500/16 via-teal-400/10 to-cyan-400/10",
    iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
  },
  {
    key: "GRAMMAR",
    fallbackKey: "grammar",
    label: "Grammar",
    description: "Practice rules through focused lessons.",
    href: "/grammar",
    icon: CheckCircle2,
    accent: "from-blue-500/16 via-sky-400/10 to-cyan-400/10",
    iconClass: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200",
  },
  {
    key: "READING",
    fallbackKey: "reading",
    label: "Reading",
    description: "Read and strengthen comprehension.",
    href: "/reading",
    icon: FileText,
    accent: "from-amber-500/16 via-orange-400/10 to-yellow-400/10",
    iconClass: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  },
  {
    key: "LISTENING",
    fallbackKey: "listening",
    label: "Listening",
    description: "Train active listening and dictation.",
    href: "/listening",
    icon: Headphones,
    accent: "from-violet-500/16 via-indigo-400/10 to-blue-400/10",
    iconClass: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
  },
  {
    key: "SPEAKING",
    fallbackKey: "speaking",
    label: "Speaking",
    description: "Practice pronunciation and fluency.",
    href: "/speaking",
    icon: Mic2,
    accent: "from-fuchsia-500/16 via-pink-400/10 to-rose-400/10",
    iconClass: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-200",
  },
  {
    key: "WRITING",
    fallbackKey: "writing",
    label: "Writing",
    description: "Improve writing with structured feedback.",
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
      <LumiverseSkeleton className="h-[360px] rounded-[2rem]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LumiverseSkeleton key={index} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <LumiverseSkeleton className="h-72 rounded-3xl" />
          <LumiverseSkeleton className="h-80 rounded-3xl" />
        </div>
        <div className="space-y-6">
          <LumiverseSkeleton className="h-72 rounded-3xl" />
          <LumiverseSkeleton className="h-64 rounded-3xl" />
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
          error: "Leaderboard is unavailable right now.",
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
            error: "Leaderboard is unavailable right now.",
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

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <LumiverseState
        title={error ?? d.noData}
        description="Your session may have expired or the dashboard service may be unavailable."
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
      <WelcomeHero data={data} dailyPercent={dailyPercent} cta={cta} />

      <section aria-label="Quick stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LumiverseStatCard
          icon={<Flame aria-hidden className="h-5 w-5" />}
          label={dict.header.streak}
          value={data.currentStreak}
          detail={d.currentStreak}
        />
        <LumiverseStatCard
          icon={<Star aria-hidden className="h-5 w-5" />}
          label={d.statXpToday}
          value={data.xp.today}
          detail={`${data.xp.total.toLocaleString()} ${d.totalXp}`}
        />
        <LumiverseStatCard
          icon={<Trophy aria-hidden className="h-5 w-5" />}
          label={d.level}
          value={data.user.englishLevel || data.user.level}
          detail={data.user.learningGoal ?? undefined}
        />
        <LumiverseStatCard
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
  const coachHeadline = useCoachHeadline();
  const title = cta?.title ?? "Start your next English activity";
  const href = cta?.href ?? "/learning-path";
  const subtitle = cta?.subtitle ?? data.learningPath?.currentPhase?.title ?? "Open your learning path to continue.";

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/50 bg-[linear-gradient(135deg,var(--lumiverse-primary-strong),var(--lumiverse-primary)_48%,var(--lumiverse-violet))] p-5 text-white shadow-[0_28px_80px_rgba(20,103,232,0.22)] sm:p-7">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,rgba(255,182,72,0.28),transparent_16rem),radial-gradient(circle_at_18%_20%,rgba(23,182,230,0.28),transparent_18rem)]" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="min-w-0">
          <LumiverseBadge className="border-white/20 bg-white/12 text-white">
            Continue learning
          </LumiverseBadge>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Hi {firstName(data.user.fullname)}, ready for your next step?
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/82 sm:text-base">
            Level {data.user.englishLevel || data.user.level}. Your dashboard is organized around the next real activity, daily goal, missions and skill progress.
          </p>

          <div className="mt-6 max-w-3xl rounded-3xl border border-white/16 bg-white/12 p-4 backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                  {cta?.type ?? "Learning path"}
                </p>
                <h2 className="mt-1 truncate text-2xl font-black">{title}</h2>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-white/78">
                  {subtitle}
                </p>
              </div>
              <Link
                href={href}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[var(--lumiverse-primary-strong)] transition hover:-translate-y-0.5"
              >
                <Play aria-hidden className="h-5 w-5" fill="currentColor" />
                Continue
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/16 bg-white/12 p-4 backdrop-blur">
          <div className="flex items-center gap-4">
            <Image
              src="/cat-home.jpg"
              alt="Lumiverse mascot"
              width={112}
              height={112}
              priority
              sizes="112px"
              className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white/18"
            />
            <div className="min-w-0">
              <p className="text-sm font-black text-cyan-100">Lumi Coach</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-white/78">
                {coachHeadline ?? "Analyzing your recent progress…"}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs font-black text-white/78">
              <span>Daily goal</span>
              <span>{clampPercent(dailyPercent)}%</span>
            </div>
            <LumiverseProgress value={dailyPercent} className="bg-white/20 [&>div]:bg-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActions({ actions }: { actions: DashboardData["quickActions"] }) {
  return (
    <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className="group lumiverse-card flex min-w-0 items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-blue-200"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
            {action.icon === "target" ? <Target size={20} /> : action.icon === "refresh" ? <RefreshCcw size={20} /> : <Play size={20} fill="currentColor" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-black text-[var(--lumiverse-ink)]">{action.title}</span>
            <span className="block truncate text-sm font-bold text-[var(--lumiverse-muted)]">
              {action.description}
            </span>
          </span>
          <ChevronRight className="shrink-0 text-[var(--lumiverse-muted)] transition group-hover:text-[var(--lumiverse-primary)]" size={18} />
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
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader
        title="Learning modules"
        description="Six core skills with progress from real learning results when available."
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
              className={`group rounded-3xl border border-[var(--lumiverse-border)] bg-gradient-to-br ${module.accent} p-4 transition hover:-translate-y-0.5 hover:border-blue-200 dark:bg-white/6`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${module.iconClass}`}>
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <ChevronRight
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-[var(--lumiverse-muted)] transition group-hover:text-[var(--lumiverse-primary)]"
                />
              </div>
              <p className="mt-4 truncate text-lg font-black text-[var(--lumiverse-ink)]">
                {skill?.label ?? module.label}
              </p>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[var(--lumiverse-muted)]">
                {skill?.level ?? skill?.status ?? module.description}
              </p>
              {skill ? (
                <>
                  <div className="mt-4 flex items-center justify-between text-xs font-black text-[var(--lumiverse-muted)]">
                    <span>Progress</span>
                    <span>{clampPercent(skill.percent)}%</span>
                  </div>
                  <LumiverseProgress value={skill.percent} className="mt-2 h-2" />
                </>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-[var(--lumiverse-border)] px-3 py-2 text-xs font-black text-[var(--lumiverse-muted)]">
                  No progress yet
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </LumiverseCard>
  );
}

function LearningPathPanel({ data }: { data: DashboardData }) {
  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader
        title="Learning path"
        description="Current stage and nearby phases from your real learning path."
        action={
          <Link href="/learning-path" className="lumiverse-button-soft text-sm">
            View path
          </Link>
        }
      />
      {data.learningPath ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-[var(--lumiverse-primary-soft)] p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lumiverse-primary)]">
              Current level
            </p>
            <p className="mt-2 text-4xl font-black text-[var(--lumiverse-ink)]">
              {data.learningPath.overallLevel}
            </p>
            <p className="mt-2 text-sm font-bold text-[var(--lumiverse-muted)]">
              {data.learningPath.currentPhase?.title ?? "No active phase yet"}
            </p>
            <LumiverseProgress value={data.learningPath.progressPercent} className="mt-5" />
          </div>
          <ol className="space-y-3">
            {data.learningPath.phases.slice(0, 4).map((phase) => (
              <li key={phase.id} className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/54 p-3 dark:bg-white/6">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-[var(--lumiverse-ink)]">{phase.title}</p>
                    <p className="text-xs font-bold text-[var(--lumiverse-muted)]">
                      Phase {phase.phase}{phase.targetLevel ? ` - ${phase.targetLevel}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-black text-[var(--lumiverse-primary)]">
                    {phase.progress}%
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <LumiverseState title="No learning path yet." description="Take the placement test to build a personalized route." tone="empty" />
      )}
    </LumiverseCard>
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
  if (!data.weeklyActivity.length) {
    return (
      <LumiverseCard className="p-5">
        <LumiverseSectionHeader title="Weekly activity" description="XP and activity will appear after you complete lessons." />
        <LumiverseState title="No weekly activity yet." tone="empty" />
      </LumiverseCard>
    );
  }

  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader title="Weekly activity" description="XP, lessons and study time over the last 7 days." />
      <div className="grid h-56 grid-cols-7 items-end gap-2 sm:gap-4">
        {data.weeklyActivity.map((item) => (
          <div key={item.date} className="flex h-full min-w-0 flex-col justify-end gap-2">
            <div className="flex min-h-0 flex-1 items-end rounded-2xl bg-[var(--lumiverse-primary-soft)] px-2 pb-2">
              <div
                className="w-full rounded-xl bg-gradient-to-t from-[var(--lumiverse-primary)] to-[var(--lumiverse-cyan)]"
                style={{ height: `${Math.max(8, (item.xp / maxWeeklyXp) * 100)}%` }}
                title={`${item.xp} XP`}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-[var(--lumiverse-ink)]">{item.xp}</p>
              <p className="text-[11px] font-bold text-[var(--lumiverse-muted)]">
                {formatDateTime(item.date, locale).split(",")[0]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </LumiverseCard>
  );
}

function RecentActivityPanel({ data, locale }: { data: DashboardData; locale: string }) {
  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader title="Recent activity" description="Completed sessions from your real learning history." />
      {data.recentSessions.length > 0 ? (
        <div className="divide-y divide-[var(--lumiverse-border)]">
          {data.recentSessions.map((session) => (
            <Link key={`${session.type}-${session.id}`} href={session.href} className="flex items-center gap-3 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
                <BookOpen size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black text-[var(--lumiverse-ink)]">{session.title}</span>
                <span className="block truncate text-sm font-bold text-[var(--lumiverse-muted)]">
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
        <LumiverseState title="No recent activity yet." description="Start a lesson and completed sessions will appear here." tone="empty" />
      )}
    </LumiverseCard>
  );
}

function MissionsPanel({
  missions,
  summary,
}: {
  missions: DashboardMission[];
  summary: DashboardData["todayMissions"]["summary"];
}) {
  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader
        title="Daily missions"
        description={`${summary.completed}/${summary.total} completed`}
        action={<Link href="/missions" className="text-sm font-black text-[var(--lumiverse-primary)]">View</Link>}
      />
      {missions.length > 0 ? (
        <div className="space-y-3">
          {missions.slice(0, 5).map((mission) => (
            <div key={mission.id} className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/54 p-3 dark:bg-white/6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-[var(--lumiverse-ink)]">{mission.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-[var(--lumiverse-muted)]">
                    {mission.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                  +{mission.reward.xp} XP
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <LumiverseProgress value={mission.progressPercent} className="h-2 flex-1" />
                {mission.completed ? <CheckCircle2 aria-label="Completed" className="h-5 w-5 text-emerald-500" /> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <LumiverseState title="No missions today." tone="empty" />
      )}
    </LumiverseCard>
  );
}

function TodayGoalPanel({
  data,
  dailyPercent,
}: {
  data: DashboardData;
  dailyPercent: number;
}) {
  const targetMinutes = data.today?.targetStudyMinutes ?? 0;
  const studyMinutes = data.today?.studyMinutes ?? 0;
  const activeDays = data.week?.activeDays ?? 0;
  const targetDays = data.week?.targetDays ?? 0;

  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader
        title="Today's goal"
        description={
          targetMinutes > 0
            ? `${studyMinutes}/${targetMinutes} minutes studied`
            : "Daily goal data appears after settings and study activity are available."
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-3xl bg-[var(--lumiverse-primary-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--lumiverse-primary)] shadow-sm dark:bg-white/10">
              <Clock3 aria-hidden className="h-5 w-5" />
            </span>
            <span className="text-2xl font-black text-[var(--lumiverse-ink)]">
              {clampPercent(dailyPercent)}%
            </span>
          </div>
          <LumiverseProgress value={dailyPercent} className="mt-4" />
        </div>
        <div className="rounded-3xl border border-[var(--lumiverse-border)] bg-white/54 p-4 dark:bg-white/6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
              <CalendarDays aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-black text-[var(--lumiverse-ink)]">
                {targetDays > 0 ? `${activeDays}/${targetDays} active days` : `${activeDays} active days`}
              </p>
              <p className="text-xs font-bold text-[var(--lumiverse-muted)]">
                Weekly rhythm from real activity
              </p>
            </div>
          </div>
        </div>
      </div>
    </LumiverseCard>
  );
}

function LeaderboardPanel({ state }: { state: LeaderboardState }) {
  const entries = state.status === "ready" ? state.data.entries.slice(0, 5) : [];
  const currentUser = state.status === "ready" ? state.data.currentUser : null;
  console.log("entries", entries);
  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader
        title="Weekly leaderboard"
        description="Top learners from the current leaderboard period."
        action={
          <Link href="/leaderboard" className="text-sm font-black text-[var(--lumiverse-primary)]">
            View all
          </Link>
        }
      />
      {state.status === "loading" ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <LumiverseSkeleton key={index} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : state.status === "error" ? (
        <LumiverseState title="Leaderboard unavailable" description={state.error} tone="error" />
      ) : state.status === "empty" ? (
        <LumiverseState title="No leaderboard entries yet." tone="empty" />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={`${entry.rank}-${entry.user.id}`}
              className={[
                "flex items-center gap-3 rounded-2xl border p-3",
                entry.isCurrentUser
                  ? "border-[var(--lumiverse-primary)]/25 bg-[var(--lumiverse-primary-soft)]"
                  : "border-[var(--lumiverse-border)] bg-white/54 dark:bg-white/6",
              ].join(" ")}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--lumiverse-ranking-soft)] text-sm font-black text-[var(--lumiverse-ranking)]">
                #{entry.rank}
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--lumiverse-primary-soft)] text-xs font-black text-[var(--lumiverse-primary)]">
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
                <span className="block truncate font-black text-[var(--lumiverse-ink)]">
                  {entry.user.displayName}
                </span>
                <span className="block text-xs font-bold text-[var(--lumiverse-muted)]">
                  {entry.periodXp.toLocaleString()} XP
                </span>
              </span>
            </div>
          ))}
          {currentUser && !entries.some((entry) => entry.isCurrentUser) ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-sm font-black text-[var(--lumiverse-primary)] dark:border-blue-400/30 dark:bg-blue-400/10">
              Your rank: #{currentUser.rank} · {currentUser.periodXp.toLocaleString()} XP
            </div>
          ) : null}
        </div>
      )}
    </LumiverseCard>
  );
}

function PetPanel({ data }: { data: DashboardData }) {
  const pet = data.pet;

  if (pet?.isChosen) {
    return (
      <LumiverseCard className="p-5">
        <LumiverseSectionHeader
          title="Lumiverse companion"
          description="Real companion data from your account."
          action={
            <Link href="/profile" className="text-sm font-black text-[var(--lumiverse-primary)]">
              Profile
            </Link>
          }
        />
        <div className="rounded-3xl border border-[var(--lumiverse-border)] bg-white/54 p-4 dark:bg-white/6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
              <PawPrint size={30} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-[var(--lumiverse-ink)]">
                {pet.petName}
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--lumiverse-muted)]">
                Level {pet.level} · {pet.xp.toLocaleString()} XP
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black text-[var(--lumiverse-muted)]">
            <span className="rounded-2xl bg-emerald-50 px-2 py-2 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
              Energy {pet.energy}
            </span>
            <span className="rounded-2xl bg-pink-50 px-2 py-2 text-pink-700 dark:bg-pink-400/15 dark:text-pink-200">
              Happy {pet.happiness}
            </span>
            <span className="rounded-2xl bg-amber-50 px-2 py-2 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
              HP {pet.hp}
            </span>
          </div>
        </div>
      </LumiverseCard>
    );
  }

  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader
        title="Lumiverse companion"
        description="This companion experience is planned, but it is not active yet."
        action={
          <Link href="/profile" className="text-sm font-black text-[var(--lumiverse-primary)]">
            Profile
          </Link>
        }
      />
      <div className="rounded-3xl border border-dashed border-[var(--lumiverse-border)] bg-[var(--lumiverse-primary-soft)] p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[var(--lumiverse-primary)] shadow-sm dark:bg-white/10">
            <PawPrint size={30} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-[var(--lumiverse-ink)]">
              Coming soon
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--lumiverse-muted)]">
              No pet selection, pet API, or required setup is used here.
            </p>
          </div>
        </div>
      </div>
    </LumiverseCard>
  );
}

function AchievementsPanel({ data }: { data: DashboardData }) {
  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader title="Achievements" description="Recently earned badges and rewards." />
      {data.recentAchievements.length > 0 ? (
        <div className="space-y-3">
          {data.recentAchievements.slice(0, 4).map((achievement) => (
            <Link key={achievement.id} href={achievement.href} className="flex items-center gap-3 rounded-2xl bg-[var(--lumiverse-ranking-soft)] p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--lumiverse-card)] text-[var(--lumiverse-ranking)]">
                <Award size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black text-[var(--lumiverse-ink)]">{achievement.title}</span>
                <span className="block text-xs font-bold text-[var(--lumiverse-muted)]">+{achievement.xp} XP</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <LumiverseState title="No new achievements yet." tone="empty" />
      )}
    </LumiverseCard>
  );
}

function NotificationsPanel({ data }: { data: DashboardData }) {
  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader
        title="Notifications"
        description="Recent messages from the platform."
        action={<Link href="/notifications" className="text-sm font-black text-[var(--lumiverse-primary)]">Open</Link>}
      />
      {data.notificationsPreview.length > 0 ? (
        <div className="space-y-3">
          {data.notificationsPreview.map((notification) => (
            <Link key={notification.id} href={notification.href} className="block rounded-2xl bg-white/54 p-3 dark:bg-white/6">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lumiverse-primary)]" />
                <span className="min-w-0">
                  <span className="block truncate font-black text-[var(--lumiverse-ink)]">{notification.title}</span>
                  <span className="line-clamp-2 text-sm font-bold text-[var(--lumiverse-muted)]">
                    {notification.message}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <LumiverseState title="No new notifications." tone="empty" />
      )}
    </LumiverseCard>
  );
}

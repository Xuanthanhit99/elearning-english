"use client";

import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Flame,
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

const skillRoutes: Record<string, string> = {
  VOCABULARY: "/vocabulary",
  GRAMMAR: "/grammar",
  LISTENING: "/listening",
  SPEAKING: "/speaking",
  READING: "/reading",
  WRITING: "/writing",
};

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
          <LearningPathPanel data={data} />
          <WeeklyActivityPanel data={data} locale={locale} maxWeeklyXp={maxWeeklyXp} />
          <RecentActivityPanel data={data} locale={locale} />
        </div>

        <aside className="space-y-6">
          <MissionsPanel missions={data.todayMissions.items} summary={dailySummary} />
          <PetPanel />
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
  const title = cta?.title ?? "Start your next English activity";
  const href = cta?.href ?? "/learning-path";
  const subtitle = cta?.subtitle ?? data.learningPath?.currentPhase?.title ?? "Open your learning path to continue.";

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/50 bg-[linear-gradient(135deg,#071a88,#1746ff_48%,#7c3cff)] p-5 text-white shadow-[0_28px_80px_rgba(23,70,255,0.22)] sm:p-7">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,rgba(255,191,36,0.28),transparent_16rem),radial-gradient(circle_at_18%_20%,rgba(18,183,255,0.28),transparent_18rem)]" />
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
              <p className="mt-1 text-sm font-semibold text-white/78">
                A learning companion is being prepared for a future release.
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
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)] dark:bg-white/8">
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
  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader
        title="Skill progress"
        description="Progress comes from placement and real learning results."
      />
      {data.skillProgress.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.skillProgress.map((skill) => {
            const href = skill.href || skillRoutes[skill.key] || "/learn";
            return (
              <Link
                key={skill.key}
                href={href}
                className="rounded-3xl border border-[var(--lumiverse-border)] bg-white/54 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 dark:bg-white/6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-[var(--lumiverse-ink)]">{skill.label}</p>
                    <p className="mt-1 truncate text-xs font-bold text-[var(--lumiverse-muted)]">
                      {skill.level ?? skill.status ?? "Not determined"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xl font-black text-[var(--lumiverse-primary)]">
                    {skill.percent}%
                  </span>
                </div>
                <LumiverseProgress value={skill.percent} className="mt-4 h-2" />
              </Link>
            );
          })}
        </div>
      ) : (
        <LumiverseState title="No skill progress yet." description="Complete placement or a lesson to begin tracking skills." tone="empty" />
      )}
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
          <div className="rounded-3xl bg-blue-50/70 p-5 dark:bg-white/8">
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
            <div className="flex min-h-0 flex-1 items-end rounded-2xl bg-blue-50/80 px-2 pb-2 dark:bg-white/8">
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
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)] dark:bg-white/8">
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

function PetPanel() {
  return (
    <LumiverseCard className="p-5">
      <LumiverseSectionHeader
        title="Learning companion"
        description="This companion experience is planned, but it is not active yet."
      />
      <div className="rounded-3xl border border-dashed border-[var(--lumiverse-border)] bg-blue-50/60 p-4 dark:bg-white/6">
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
            <Link key={achievement.id} href={achievement.href} className="flex items-center gap-3 rounded-2xl bg-amber-50/70 p-3 dark:bg-white/8">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-600 dark:bg-white/10">
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

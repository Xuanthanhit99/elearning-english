"use client";

import {
  Award,
  Compass,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  Headphones,
  Gamepad2,
  MessageCircle,
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
    <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-10">
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
    <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-10">
      <AchievementCelebration data={data} />
      <WelcomeHero data={data} dailyPercent={dailyPercent} cta={cta} />
      <BeaconTrailPanel data={data} cta={cta} />

      <section aria-label="Chỉ số nhanh" className="hidden grid-cols-2 gap-3 lg:grid xl:grid-cols-4">
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

      <section aria-labelledby="today-intents-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--BeaconVie-primary)]">Luyện nhanh</p>
            <h2 id="today-intents-title" className="mt-1 text-xl font-black text-[var(--BeaconVie-ink)]">
              Chọn một hoạt động
            </h2>
            <p className="mt-1 text-sm font-bold text-[var(--BeaconVie-muted)]">
              Lộ trình vẫn là trung tâm; các hoạt động này hỗ trợ mục tiêu học hôm nay.
            </p>
          </div>
        </div>
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
          {[
            { title: "Tiếp tục lộ trình", description: "Học bài tiếp theo theo kế hoạch cá nhân.", href: "/learning-path", icon: Compass },
            { title: "Luyện tập kỹ năng", description: "Chọn kỹ năng để luyện nhanh theo nhu cầu.", href: "/learn", icon: Headphones },
            { title: "Game tiếng Anh", description: "Học qua thử thách và chế độ chơi hiện có.", href: "/arena", icon: Gamepad2 },
            { title: "Học cùng nhau", description: "Tham gia phòng học và luyện tập cùng người khác.", href: "/study-rooms", icon: MessageCircle },
          ].map((intent) => {
            const Icon = intent.icon;
            return (
              <Link
                key={intent.href}
                href={intent.href}
                className="group BeaconVie-card flex min-h-0 w-[152px] shrink-0 snap-start flex-col items-start gap-3 p-3.5 transition hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--BeaconVie-primary)] focus-visible:ring-offset-2 sm:w-auto sm:min-w-0 sm:flex-row sm:p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]">
                  <Icon aria-hidden size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-[var(--BeaconVie-ink)]">{intent.title}</span>
                  <span className="mt-1 hidden text-sm font-bold leading-5 text-[var(--BeaconVie-muted)] sm:block">{intent.description}</span>
                </span>
                <ChevronRight aria-hidden className="hidden shrink-0 text-[var(--BeaconVie-muted)] transition group-hover:text-[var(--BeaconVie-primary)] sm:mt-1 sm:block" size={18} />
              </Link>
            );
          })}
        </div>
      </section>

      {data.quickActions.length > 0 ? (
        <section aria-labelledby="today-recommendations-title" className="hidden sm:block">
          <div className="mb-3">
            <h2 id="today-recommendations-title" className="text-xl font-black text-[var(--BeaconVie-ink)]">
              Đề xuất hôm nay cho bạn
            </h2>
            <p className="mt-1 text-sm font-bold text-[var(--BeaconVie-muted)]">
              Dựa trên các hành động học mà hệ thống hiện có cho tài khoản của bạn.
            </p>
          </div>
          <QuickActions actions={data.quickActions} />
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
        <div className="space-y-6">
          <SkillsPanel data={data} />
          <div className="hidden sm:block"><RecentActivityPanel data={data} locale={locale} /></div>
        </div>
        <aside className="hidden space-y-5 sm:block xl:space-y-6">
          <TodayGoalPanel data={data} dailyPercent={dailyPercent} />
          <MissionsPanel missions={data.todayMissions.items} summary={dailySummary} />
        </aside>
      </div>

      <details className="BeaconVie-card group hidden p-4 sm:block sm:p-5">
        <summary className="cursor-pointer list-none font-black text-[var(--BeaconVie-ink)]">
          Xem thêm tiến độ và hoạt động
          <span className="ml-2 text-sm font-bold text-[var(--BeaconVie-muted)]">Analytics · cộng đồng · thành tích</span>
        </summary>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <SkillRadarPanel />
          <WeeklyActivityPanel data={data} locale={locale} maxWeeklyXp={maxWeeklyXp} />
          <StudyHeatmapPanel />
          <AiCoachPanel />
          <LeaderboardPanel state={leaderboard} />
          <PetPanel data={data} />
          <AchievementsPanel data={data} />
          <NotificationsPanel data={data} />
          <LearningPathPanel data={data} />
        </div>
      </details>
    </div>
  );
}

function BeaconTrailPanel({
  data,
  cta,
}: {
  data: DashboardData;
  cta: DashboardData["currentLesson"] | DashboardData["recommendedLesson"] | DashboardData["recommendations"][number] | null;
}) {
  const level = (data.learningPath?.overallLevel || data.user.englishLevel || "A1").toUpperCase();
  const progress = clampPercent(data.learningPath?.progressPercent ?? 0);
  const cefr = ["A1", "A2", "B1", "B2", "C1"];
  const activeIndex = Math.max(0, cefr.indexOf(level));
  const nodes = data.learningPath?.phases?.slice(0, 5) ?? [];

  return (
    <section aria-labelledby="beacon-trail-title" className="overflow-hidden rounded-[2rem] border border-[var(--BeaconVie-border)] bg-white shadow-[var(--BeaconVie-soft-shadow)]">
      <div className="border-b border-[var(--BeaconVie-border)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--BeaconVie-primary)]">Beacon Trail · CEFR</p>
            <h2 id="beacon-trail-title" className="mt-1 text-2xl font-black tracking-[-0.025em] text-[var(--BeaconVie-ink)]">Hành trình học của bạn</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--BeaconVie-muted)]">Biết bạn đang ở đâu, hôm nay học gì và điểm đến tiếp theo.</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--BeaconVie-ink)]">{level}</span>
            <span className="text-sm font-bold text-[var(--BeaconVie-muted)]">{progress}% hoàn thành</span>
          </div>
        </div>

        <div className="mt-5 flex w-full items-center" aria-label="Thang CEFR">
          {cefr.map((item, index) => (
            <div key={item} className="flex min-w-0 flex-1 items-center">
              <div className={`relative z-10 mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${index < activeIndex ? "bg-[var(--BeaconVie-primary)] text-white" : index === activeIndex ? "border-2 border-[var(--BeaconVie-primary)] bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]" : "bg-slate-100 text-slate-400"}`}>{item}</div>
              {index < cefr.length - 1 ? <div aria-hidden className={`-ml-1 h-0.5 flex-1 ${index < activeIndex ? "bg-[var(--BeaconVie-primary)]" : "bg-slate-200"}`} /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:gap-4">
          {(nodes.length ? nodes : [1,2,3,4,5].map((phase) => ({ id: String(phase), title: `Unit ${phase}`, phase, progress: phase < 3 ? 100 : phase === 3 ? progress : 0, targetLevel: null }))).map((node, index) => {
            const done = node.progress >= 100;
            const active = !done && (index === 0 || (nodes[index - 1]?.progress ?? 100) >= 100);
            return (
              <div key={node.id} className={`relative w-[132px] shrink-0 snap-center rounded-[1.2rem] border p-3 sm:w-auto sm:rounded-[1.35rem] sm:p-4 ${active ? "border-blue-300 bg-[var(--BeaconVie-primary-soft)]" : "border-[var(--BeaconVie-border)] bg-[#fbfdff]"}`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${done ? "bg-[var(--BeaconVie-primary)] text-white" : active ? "border-2 border-[var(--BeaconVie-primary)] bg-white text-[var(--BeaconVie-primary)]" : "bg-slate-100 text-slate-400"}`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.1em] text-[var(--BeaconVie-muted)]">Unit {node.phase}</p>
                <p className="mt-1 line-clamp-1 text-sm font-black text-[var(--BeaconVie-ink)] sm:line-clamp-2">{node.title}</p>
                <p className="mt-2 text-xs font-bold text-[var(--BeaconVie-muted)]">{done ? "Hoàn thành" : active ? "Đang học" : "Chưa mở"}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-[1.4rem] bg-[#f7faff] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-primary)]">Điểm tiếp theo</p>
            <p className="mt-1 font-black text-[var(--BeaconVie-ink)]">{cta?.title ?? data.learningPath?.currentPhase?.title ?? "Tiếp tục lộ trình cá nhân"}</p>
          </div>
          <Link href={cta?.href ?? "/learning-path"} className="BeaconVie-button-primary min-h-11 shrink-0 px-5">Tiếp tục <ChevronRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
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
    <section className="relative overflow-hidden rounded-[1.5rem] border border-[var(--BeaconVie-border)] bg-white p-4 shadow-[var(--BeaconVie-soft-shadow)] sm:rounded-[2rem] sm:p-7">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
        <div className="min-w-0">
          <BeaconVieBadge className="border-blue-100 bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]">
            {needsPlacement ? "Bắt đầu hành trình" : d.continueLearning}
          </BeaconVieBadge>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] text-[var(--BeaconVie-ink)] sm:mt-4 sm:text-4xl">
            {d.greeting.replace("{name}", firstName(data.user.fullname))}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)] sm:text-base">
            {needsPlacement
              ? "Làm bài kiểm tra ngắn để BeaconVie đặt bạn vào đúng điểm bắt đầu trên lộ trình."
              : "Hôm nay học một chút, bạn sẽ tiến gần hơn đến mục tiêu tiếng Anh của mình."}
          </p>

          <div className="mt-3 rounded-[1.25rem] border border-blue-100 bg-[#f7faff] p-3.5 sm:mt-6 sm:rounded-[1.5rem] sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--BeaconVie-primary)]">
              {needsPlacement ? "Bước đầu tiên" : "Bài học tiếp theo"}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-[var(--BeaconVie-ink)] sm:text-2xl">{title}</h2>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">{subtitle}</p>
              </div>
              <Link href={href} className="BeaconVie-button-primary min-h-11 shrink-0 px-5 sm:min-h-12">
                <Play aria-hidden className="h-5 w-5" fill="currentColor" />
                {needsPlacement ? "Kiểm tra trình độ" : "Tiếp tục học"}
              </Link>
            </div>
          </div>
        </div>

        <div className="relative min-h-[170px] overflow-hidden rounded-[1.25rem] border border-[var(--BeaconVie-border)] bg-[#eaf3ff] sm:min-h-[220px] sm:rounded-[1.5rem]">
          <Image
            src="https://images.unsplash.com/photo-1770235622269-bf3124d85032?auto=format&fit=crop&fm=jpg&q=78&w=1200"
            alt="Sinh viên học tập trong không gian lớp học hiện đại"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1023px) 100vw, 300px"
          />
          <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/70 bg-white/92 p-3 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--BeaconVie-primary)]">Beacon Trail</p>
                <p className="mt-0.5 text-lg font-black text-[var(--BeaconVie-ink)]">{data.user.englishLevel || data.user.level}</p>
              </div>
              <span className="rounded-full bg-[var(--BeaconVie-primary-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--BeaconVie-primary)]">CEFR</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-bold text-[var(--BeaconVie-muted)]">
              <span>Mục tiêu {clampPercent(dailyPercent)}%</span>
              <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" /> {data.currentStreak} ngày</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActions({ actions }: { actions: DashboardData["quickActions"] }) {
  return (
    <section aria-label="Thao tác nhanh" className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
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
      <div data-mobile-grid="keep" className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3">
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
              className={`group min-w-0 rounded-[1.25rem] border border-[var(--BeaconVie-border)] bg-gradient-to-br ${module.accent} p-3 transition hover:border-blue-200 dark:bg-white/6 sm:rounded-3xl sm:p-4`}
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
              <p className="mt-3 truncate text-sm font-black text-[var(--BeaconVie-ink)] sm:mt-4 sm:text-lg">
                {skill?.label ?? module.label}
              </p>
              <p className="mt-1 hidden min-h-10 text-sm font-bold leading-5 text-[var(--BeaconVie-muted)] sm:line-clamp-2">
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

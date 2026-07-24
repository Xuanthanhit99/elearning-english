"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCcw, Sparkles, TrendingUp } from "lucide-react";
import {
  LumiverseBadge,
  LumiverseButton,
  LumiverseCard,
  LumiverseSectionHeader,
  LumiverseSkeleton,
  LumiverseState,
} from "@/src/Components/UI/Lumiverse";
import {
  AnalyticsSkill,
  CoachAdvice,
  ProgressTimeline,
  SkillRadar,
  getAiCoachAdvice,
  getProgressTimeline,
  getSkillRadar,
} from "@/src/lib/analytics-api";

const skillRoutes: Record<string, string> = {
  VOCABULARY: "/vocabulary",
  GRAMMAR: "/grammar",
  LISTENING: "/listening",
  SPEAKING: "/speaking",
  READING: "/reading",
  WRITING: "/writing",
};

const RADAR_ORDER: AnalyticsSkill[] = [
  "VOCABULARY",
  "GRAMMAR",
  "LISTENING",
  "SPEAKING",
  "READING",
  "WRITING",
];

function radarPoints(scores: number[]) {
  return scores
    .map((score, index) => {
      const angle = (-90 + index * 60) * (Math.PI / 180);
      const radius = (Math.max(0, Math.min(100, score)) / 100) * 84;
      return `${110 + Math.cos(angle) * radius},${110 + Math.sin(angle) * radius}`;
    })
    .join(" ");
}

function basisLabel(basis: string) {
  if (basis === "RECENT_PERFORMANCE") return "Recent";
  if (basis === "LIFETIME_AVERAGE") return "Lifetime avg";
  return "No data yet";
}

/** Skill Radar — recency-weighted, not a lifetime flat average. */
export function SkillRadarPanel() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; data: SkillRadar }
  >({ status: "loading" });

  async function load() {
    setState({ status: "loading" });
    try {
      const data = await getSkillRadar();
      setState({ status: "ready", data });
    } catch {
      setState({ status: "error" });
    }
  }

  useEffect(() => {
    let mounted = true;
    getSkillRadar()
      .then((data) => {
        if (mounted) setState({ status: "ready", data });
      })
      .catch(() => {
        if (mounted) setState({ status: "error" });
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return <LumiverseSkeleton className="h-[360px]" />;
  }
  if (state.status === "error") {
    return (
      <LumiverseState
        title="Couldn't load your skill radar"
        description="Something went wrong while analyzing your recent performance."
        actionLabel="Retry"
        onAction={load}
        tone="error"
      />
    );
  }

  const { data } = state;
  const bySkill = new Map(data.skills.map((item) => [item.skill, item]));
  const orderedSkills = RADAR_ORDER.map((key) => bySkill.get(key)).filter(
    (item): item is SkillRadar["skills"][number] => !!item,
  );
  const points = radarPoints(orderedSkills.map((item) => item.score));

  return (
    <LumiverseCard className="p-6">
      <LumiverseSectionHeader
        eyebrow="Skill Radar"
        title="How you're doing lately"
        description={`Weighted toward your last ${data.windowDays} days, not your all-time average.`}
      />
      <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
        <svg
          viewBox="0 0 220 220"
          className="mx-auto h-[220px] w-[220px]"
          role="img"
          aria-label={`Skill radar. Overall score ${data.overall} out of 100.`}
        >
          {[84, 64, 44, 24].map((radius) => (
            <polygon
              key={radius}
              points={Array.from({ length: 6 })
                .map((_, index) => {
                  const angle = (-90 + index * 60) * (Math.PI / 180);
                  return `${110 + Math.cos(angle) * radius},${110 + Math.sin(angle) * radius}`;
                })
                .join(" ")}
              fill="none"
              stroke="var(--lumiverse-border)"
            />
          ))}
          <polygon
            points={points}
            fill="rgba(23,70,255,0.16)"
            stroke="var(--lumiverse-primary)"
            strokeWidth="3"
          />
          <circle cx="110" cy="110" r="28" fill="var(--lumiverse-card)" />
          <text x="110" y="106" textAnchor="middle" fontSize="11" fill="var(--lumiverse-muted)">
            Overall
          </text>
          <text
            x="110"
            y="128"
            textAnchor="middle"
            fontSize="20"
            fontWeight="800"
            fill="var(--lumiverse-primary)"
          >
            {data.overall}
          </text>
        </svg>

        <ul className="space-y-2">
          {orderedSkills.map((item) => (
            <li
              key={item.skill}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--lumiverse-border)] px-3 py-2"
            >
              <span className="font-bold text-[var(--lumiverse-ink)]">{item.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-black text-[var(--lumiverse-primary)]">
                  {item.score}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--lumiverse-muted)]">
                  {basisLabel(item.basis)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </LumiverseCard>
  );
}

/** Study Heatmap — a GitHub-style contribution grid built from real Progress Timeline days. */
export function StudyHeatmapPanel() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; data: ProgressTimeline }
  >({ status: "loading" });

  function load() {
    setState({ status: "loading" });
    getProgressTimeline({ range: "90d" })
      .then((data) => setState({ status: "ready", data }))
      .catch(() => setState({ status: "error" }));
  }

  useEffect(() => {
    let mounted = true;
    getProgressTimeline({ range: "90d" })
      .then((data) => {
        if (mounted) setState({ status: "ready", data });
      })
      .catch(() => {
        if (mounted) setState({ status: "error" });
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return <LumiverseSkeleton className="h-[180px]" />;
  }
  if (state.status === "error") {
    return (
      <LumiverseState
        title="Couldn't load your study heatmap"
        actionLabel="Retry"
        onAction={load}
        tone="error"
      />
    );
  }

  const { days } = state.data;
  const maxMinutes = Math.max(...days.map((d) => d.studyMinutes), 1);
  // Pad the front so the grid always starts on a Sunday column.
  const firstDate = days[0] ? new Date(`${days[0].date}T00:00:00Z`) : new Date();
  const padCount = firstDate.getUTCDay();
  const cells: Array<(typeof days)[number] | null> = [
    ...Array.from({ length: padCount }, () => null),
    ...days,
  ];
  const weeks: Array<Array<(typeof days)[number] | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const intensity = (minutes: number) => {
    if (minutes <= 0) return "bg-[var(--lumiverse-border)]";
    const ratio = minutes / maxMinutes;
    if (ratio > 0.75) return "bg-[var(--lumiverse-primary)]";
    if (ratio > 0.45) return "bg-[var(--lumiverse-primary)]/70";
    if (ratio > 0.15) return "bg-[var(--lumiverse-primary)]/45";
    return "bg-[var(--lumiverse-primary)]/20";
  };

  return (
    <LumiverseCard className="p-6">
      <LumiverseSectionHeader
        eyebrow="Study Heatmap"
        title="Last 90 days"
        description="Darker squares mean more study minutes that day."
      />
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) =>
              day ? (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.studyMinutes} min, ${day.xp} XP${
                    day.accuracyPercent !== null ? `, ${day.accuracyPercent}% accuracy` : ""
                  }`}
                  className={`h-3.5 w-3.5 rounded-[3px] ${intensity(day.studyMinutes)}`}
                />
              ) : (
                <div key={`pad-${dayIndex}`} className="h-3.5 w-3.5" />
              ),
            )}
          </div>
        ))}
      </div>
    </LumiverseCard>
  );
}

function sourceBadgeLabel(source: CoachAdvice["source"]) {
  return source === "GEMINI" ? "AI Coach" : "Coach (basic)";
}

/** AI Learning Coach — grounded entirely in the metrics the API already computed, never invented client-side. */
export function AiCoachPanel() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; data: CoachAdvice }
  >({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setState({ status: "loading" });
    try {
      const data = await getAiCoachAdvice({ refresh });
      setState({ status: "ready", data });
    } catch {
      setState({ status: "error" });
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    getAiCoachAdvice()
      .then((data) => {
        if (mounted) setState({ status: "ready", data });
      })
      .catch(() => {
        if (mounted) setState({ status: "error" });
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return <LumiverseSkeleton className="h-[280px]" />;
  }
  if (state.status === "error") {
    return (
      <LumiverseState
        title="Your AI Coach is unavailable right now"
        description="Please try again in a moment."
        actionLabel="Retry"
        onAction={() => load(false)}
        tone="error"
      />
    );
  }

  const { data } = state;
  const focusHref = data.recommendedFocus
    ? skillRoutes[data.recommendedFocus.skill] ?? "/dashboard"
    : null;

  return (
    <LumiverseCard className="p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <LumiverseBadge>{sourceBadgeLabel(data.source)}</LumiverseBadge>
        <LumiverseButton
          tone="ghost"
          className="!min-h-9 !px-3 !py-2 text-xs"
          loading={refreshing}
          onClick={() => load(true)}
          aria-label="Refresh AI Coach advice"
        >
          <RefreshCcw aria-hidden className="h-3.5 w-3.5" />
        </LumiverseButton>
      </div>

      <h3 className="text-lg font-black text-[var(--lumiverse-ink)]">{data.headline}</h3>
      {data.whyThisLesson ? (
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
          {data.whyThisLesson}
        </p>
      ) : null}

      {data.recommendedFocus ? (
        <Link
          href={focusHref ?? "/dashboard"}
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--lumiverse-primary)]/30 bg-[var(--lumiverse-primary-soft)] px-4 py-3 transition hover:-translate-y-0.5"
        >
          <span className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-wide text-[var(--lumiverse-primary)]">
              {data.recommendedFocus.skill} · {data.recommendedFocus.topic}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--lumiverse-ink)]">
              {data.recommendedFocus.reason}
            </span>
          </span>
          <Sparkles aria-hidden className="h-5 w-5 shrink-0 text-[var(--lumiverse-primary)]" />
        </Link>
      ) : null}

      {data.whatsNext.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--lumiverse-muted)]">
            What&apos;s next
          </p>
          <ul className="mt-2 space-y-1.5">
            {data.whatsNext.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm font-semibold text-[var(--lumiverse-ink)]">
                <TrendingUp aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lumiverse-primary)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.weeklyPlan.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--lumiverse-muted)]">
            This week
          </p>
          <ul className="mt-2 space-y-1.5">
            {data.weeklyPlan.map((item, index) => (
              <li key={index} className="text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.examPrepTip || data.dailyHabitTip ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.examPrepTip ? (
            <div className="rounded-xl border border-[var(--lumiverse-border)] p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-[var(--lumiverse-muted)]">
                Exam prep
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--lumiverse-ink)]">
                {data.examPrepTip}
              </p>
            </div>
          ) : null}
          {data.dailyHabitTip ? (
            <div className="rounded-xl border border-[var(--lumiverse-border)] p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-[var(--lumiverse-muted)]">
                Daily habit
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--lumiverse-ink)]">
                {data.dailyHabitTip}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </LumiverseCard>
  );
}

export function useCoachHeadline() {
  const [headline, setHeadline] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getAiCoachAdvice()
      .then((data) => {
        if (mounted) setHeadline(data.headline);
      })
      .catch(() => {
        if (mounted) setHeadline(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return headline;
}

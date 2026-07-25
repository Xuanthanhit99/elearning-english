"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Download,
  Headphones,
  Loader2,
  Mic2,
  PencilLine,
  RefreshCw,
  Route,
  ShieldCheck,
  Target,
  Trophy,
  Type,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generatePlacementResult,
  LearningSkill,
  PlacementResultData,
} from "@/src/lib/placement-result-api";
import {
  BeaconVieBadge,
  BeaconVieButton,
  BeaconVieCard,
  BeaconVieProgress,
  BeaconVieSectionHeader,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";

const skillMeta: Record<LearningSkill, { label: string; icon: typeof Type }> = {
  VOCABULARY: { label: "Từ vựng", icon: Type },
  GRAMMAR: { label: "Ngữ pháp", icon: BookOpen },
  LISTENING: { label: "Luyện nghe", icon: Headphones },
  READING: { label: "Luyện đọc", icon: BookOpen },
  SPEAKING: { label: "Luyện nói", icon: Mic2 },
  WRITING: { label: "Luyện viết", icon: PencilLine },
};

export default function PlacementResultScreen({ testId }: { testId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PlacementResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadResult = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setData(await generatePlacementResult(testId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not load your placement result.");
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    void Promise.resolve().then(loadResult);
  }, [loadResult]);

  const completedDate = useMemo(() => {
    if (!data?.completedAt) return null;
    const date = new Date(data.completedAt);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
  }, [data]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <BeaconVieCard className="w-full max-w-lg p-8 text-center">
          <Loader2 aria-hidden className="mx-auto h-10 w-10 animate-spin text-[var(--BeaconVie-primary)]" />
          <h1 className="mt-5 text-2xl font-black text-[var(--BeaconVie-ink)]">
            Preparing your result
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
            The result is generated through the existing placement result API.
          </p>
        </BeaconVieCard>
      </main>
    );
  }

  if (!data) {
    return (
      <BeaconVieState
        title="Result is unavailable"
        description={error}
        actionLabel="Try again"
        tone="error"
        onAction={() => void loadResult()}
      />
    );
  }

  return (
    <main className="min-h-screen px-3 py-5 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <BeaconVieCard className="overflow-hidden p-0">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
            <section>
              <BeaconVieBadge>Placement Result</BeaconVieBadge>
              <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-[var(--BeaconVie-ink)] sm:text-5xl">
                Your current level is {data.overview.overallLevel}
              </h1>
              {data.overview.summary ? (
                <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--BeaconVie-muted)]">
                  {data.overview.summary}
                </p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                <Metric icon={Trophy} label="CEFR" value={data.overview.overallLevel} />
                <Metric icon={BarChart3} label="Score" value={`${Math.round(data.overview.overallScore)}/100`} />
                {data.overview.confidence !== null ? (
                  <Metric icon={ShieldCheck} label="Confidence" value={`${data.overview.confidence}%`} />
                ) : null}
                {data.overview.percentile !== null ? (
                  <Metric icon={Target} label="Percentile" value={`${data.overview.percentile}`} />
                ) : null}
              </div>

              {completedDate ? (
                <p className="mt-5 text-sm font-bold text-[var(--BeaconVie-muted)]">
                  Completed {completedDate}
                </p>
              ) : null}
            </section>

            <BeaconVieCard className="border-blue-100 bg-blue-50/45 p-5">
              <div className="relative mx-auto h-36 w-full max-w-[220px]">
                <Image
                  src="/images/placement/BeaconVie-result.png"
                  alt="Beacon celebrating your placement result"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
              <div className="mt-5 text-center">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
                  Overall level
                </p>
                <p className="mt-2 text-6xl font-black text-[var(--BeaconVie-primary)]">
                  {data.overview.overallLevel}
                </p>
                <p className="mt-2 font-bold text-[var(--BeaconVie-muted)]">
                  {levelLabel(data.overview.overallLevel)}
                </p>
              </div>
            </BeaconVieCard>
          </div>
        </BeaconVieCard>

        {error ? (
          <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
            {error}
          </p>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <BeaconVieCard className="p-6">
            <BeaconVieSectionHeader
              eyebrow="Skills"
              title="Skill breakdown"
              description="Every score, status, level and feedback item below comes from the result API."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {data.skills.map((skill) => (
                <SkillCard key={skill.skill} skill={skill} />
              ))}
            </div>
          </BeaconVieCard>

          <aside className="space-y-5">
            <InsightList title="Strengths" items={data.overview.strengths} positive />
            <InsightList title="Areas to improve" items={data.overview.improvements} />
            <ProjectionCard data={data} />
          </aside>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <LearningDirection data={data} />
          <CertificateCard data={data} />
        </section>

        <BeaconVieCard className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BeaconVieButton onClick={() => router.push(data.actions.startLearningUrl)}>
              Continue learning
              <ArrowRight aria-hidden className="h-4 w-4" />
            </BeaconVieButton>
            <BeaconVieButton tone="soft" onClick={() => router.push(data.actions.retryTestUrl)}>
              Retake test
              <RefreshCw aria-hidden className="h-4 w-4" />
            </BeaconVieButton>
            <BeaconVieButton tone="soft" onClick={() => router.push(data.actions.chooseOtherPathUrl)}>
              Choose another path
              <Route aria-hidden className="h-4 w-4" />
            </BeaconVieButton>
            <BeaconVieButton tone="ghost" onClick={() => router.push(data.actions.detailedAnalysisUrl)}>
              Detailed analysis
              <BarChart3 aria-hidden className="h-4 w-4" />
            </BeaconVieButton>
          </div>
        </BeaconVieCard>
      </div>
    </main>
  );
}

function SkillCard({ skill }: { skill: PlacementResultData["skills"][number] }) {
  const meta = skillMeta[skill.skill];
  const Icon = meta.icon;
  const skipped = skill.status === "SKIPPED";

  return (
    <article className="rounded-3xl border border-[var(--BeaconVie-border)] bg-white/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--BeaconVie-primary)]">
            <Icon aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-black text-[var(--BeaconVie-ink)]">{meta.label}</h3>
            <p className="text-xs font-bold text-[var(--BeaconVie-muted)]">
              {skill.level ?? skill.label ?? skill.status}
            </p>
          </div>
        </div>
        <span className="text-2xl font-black text-[var(--BeaconVie-primary)]">
          {skipped ? "—" : Math.round(skill.score)}
        </span>
      </div>
      {!skipped ? <BeaconVieProgress value={skill.score} className="mt-4" /> : null}
      {skill.feedback ? (
        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
          {skill.feedback}
        </p>
      ) : null}
      {skill.improvements.length ? (
        <p className="mt-3 text-sm font-bold leading-6 text-amber-700">
          Improve: {skill.improvements[0]}
        </p>
      ) : null}
    </article>
  );
}

function InsightList({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <BeaconVieCard className="p-5">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">{title}</h2>
      {items.length ? (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <p key={item} className="flex gap-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              <CheckCircle2 aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${positive ? "text-emerald-500" : "text-amber-500"}`} />
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-[var(--BeaconVie-muted)]">
          No items returned by the backend.
        </p>
      )}
    </BeaconVieCard>
  );
}

function ProjectionCard({ data }: { data: PlacementResultData }) {
  const hasProjection =
    data.overview.projectedLevel ||
    data.overview.projectedWeeksMin !== null ||
    data.overview.projectedWeeksMax !== null;

  return (
    <BeaconVieCard className="p-5">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">
        Recommended direction
      </h2>
      {hasProjection ? (
        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
          The backend projects{" "}
          {data.overview.projectedLevel ? (
            <strong className="text-[var(--BeaconVie-primary)]">{data.overview.projectedLevel}</strong>
          ) : (
            "your next level"
          )}{" "}
          {data.overview.projectedWeeksMin !== null || data.overview.projectedWeeksMax !== null
            ? `in ${data.overview.projectedWeeksMin ?? "?"}-${data.overview.projectedWeeksMax ?? "?"} weeks`
            : "with continued practice"}
          .
        </p>
      ) : (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-[var(--BeaconVie-muted)]">
          No projection was returned by the backend.
        </p>
      )}
    </BeaconVieCard>
  );
}

function LearningDirection({ data }: { data: PlacementResultData }) {
  return (
    <BeaconVieCard className="p-6">
      <BeaconVieSectionHeader
        eyebrow="Path"
        title="Learning path preview"
        description="Phases and priorities are shown only from backend result data."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {data.learningPath.phases.map((phase) => (
          <article key={phase.phase} className="rounded-3xl border border-[var(--BeaconVie-border)] bg-white/75 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-primary)]">
              Phase {phase.phase}
              {phase.targetLevel ? ` • ${phase.targetLevel}` : ""}
            </p>
            <h3 className="mt-3 font-black text-[var(--BeaconVie-ink)]">{phase.title}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              {phase.description}
            </p>
            <BeaconVieProgress value={phase.progress} className="mt-4" />
          </article>
        ))}
      </div>
    </BeaconVieCard>
  );
}

function CertificateCard({ data }: { data: PlacementResultData }) {
  return (
    <BeaconVieCard className="p-5">
      <Trophy aria-hidden className="h-9 w-9 text-amber-500" />
      <h2 className="mt-4 text-xl font-black text-[var(--BeaconVie-ink)]">
        Certificate
      </h2>
      <p className="mt-2 text-4xl font-black text-[var(--BeaconVie-primary)]">
        {data.certificate.level}
      </p>
      {data.certificate.code ? (
        <p className="mt-2 text-xs font-bold text-[var(--BeaconVie-muted)]">
          {data.certificate.code}
        </p>
      ) : null}
      {data.certificate.url ? (
        <Link href={data.certificate.url} className="BeaconVie-button-soft mt-5 w-full" target="_blank">
          Download certificate
          <Download aria-hidden className="h-4 w-4" />
        </Link>
      ) : (
        <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-[var(--BeaconVie-muted)]">
          No certificate file URL was returned by the backend.
        </p>
      )}
    </BeaconVieCard>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--BeaconVie-border)] bg-white/70 p-4">
      <Icon aria-hidden className="h-5 w-5 text-[var(--BeaconVie-primary)]" />
      <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-[var(--BeaconVie-ink)]">
        {value}
      </p>
    </div>
  );
}

function levelLabel(level: string) {
  const labels: Record<string, string> = {
    A1: "Beginner",
    A2: "Elementary",
    B1: "Intermediate",
    B2: "Upper intermediate",
    C1: "Advanced",
    C2: "Proficient",
  };

  return labels[level] ?? level;
}

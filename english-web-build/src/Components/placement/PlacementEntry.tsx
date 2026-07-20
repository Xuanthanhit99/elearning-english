"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Headphones,
  ListChecks,
  Loader2,
  Mic2,
  PencilLine,
  Play,
  RefreshCw,
  ShieldCheck,
  Target,
  Type,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getPlacementDashboard,
  PlacementDashboardData,
  retakePlacement,
} from "@/src/lib/placement-dashboard-api";
import { CefrLevel, selectManualLevel } from "@/src/lib/placement-api";
import {
  LumiverseBadge,
  LumiverseButton,
  LumiverseCard,
  LumiverseDialog,
  LumiverseDialogCloseButton,
  LumiverseProgress,
  LumiverseSkeleton,
  LumiverseState,
} from "@/src/Components/UI/Lumiverse";

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CEFR_LEVEL_LABELS: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

const assessedSkills = [
  { label: "Vocabulary", icon: Type },
  { label: "Grammar", icon: BookOpen },
  { label: "Listening", icon: Headphones },
  { label: "Reading", icon: FileText },
  { label: "Speaking", icon: Mic2 },
  { label: "Writing", icon: PencilLine },
];

export default function PlacementEntry() {
  const router = useRouter();
  const [data, setData] = useState<PlacementDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retaking, setRetaking] = useState(false);
  const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);
  const [error, setError] = useState("");
  const [showManualLevel, setShowManualLevel] = useState(false);
  const [manualLevel, setManualLevel] = useState<CefrLevel>("A1");
  const [savingManualLevel, setSavingManualLevel] = useState(false);
  const [manualLevelError, setManualLevelError] = useState("");

  async function loadPlacement() {
    try {
      setLoading(true);
      setError("");
      setData(await getPlacementDashboard());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not load your placement status.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadPlacement);
  }, []);

  async function handleRetake(force = false) {
    try {
      setRetaking(true);
      setError("");
      const result = await retakePlacement(force);
      router.push(result.nextUrl);
    } catch (err) {
      const response = (
        err as {
          response?: {
            data?: {
              code?: string;
              message?: string;
            };
          };
        }
      ).response?.data;

      if (!force && response?.code === "PLACEMENT_RETAKE_COOLDOWN") {
        setShowRetakeConfirm(true);
        setError(response.message ?? "");
        return;
      }

      setError(response?.message ?? "We could not start a new placement test.");
    } finally {
      setRetaking(false);
    }
  }

  async function handleConfirmManualLevel() {
    try {
      setSavingManualLevel(true);
      setManualLevelError("");
      const result = await selectManualLevel(manualLevel);
      router.push(result.nextUrl);
    } catch (err) {
      setManualLevelError(
        err instanceof Error
          ? err.message
          : "We could not save the selected level.",
      );
    } finally {
      setSavingManualLevel(false);
    }
  }

  const latest = data?.latestResult ?? null;
  const progress = useMemo(() => {
    if (data?.state !== "IN_PROGRESS" || !data.currentTest) return null;
    return {
      label: data.currentTest.startedAt
        ? `Started ${new Date(data.currentTest.startedAt).toLocaleDateString()}`
        : "Your answers are saved on the server.",
      href: data.currentTest.testUrl,
    };
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-[70vh] px-4 py-10" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your placement status…</span>
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <LumiverseSkeleton className="h-[360px]" />
          <LumiverseSkeleton className="h-[360px]" />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <LumiverseState
        title="Placement is unavailable"
        description={error}
        actionLabel="Try again"
        tone="error"
        onAction={() => void loadPlacement()}
      />
    );
  }

  return (
    <main className="min-h-screen px-3 py-5 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <LumiverseCard className="overflow-hidden p-0">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:p-8">
            <section>
              <LumiverseBadge>Placement Test</LumiverseBadge>
              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-[var(--lumiverse-ink)] sm:text-5xl">
                Find your real English starting point.
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-[var(--lumiverse-muted)]">
                The adaptive placement test checks the six core skills and uses
                your real result to unlock a personal learning path. Opening this
                page never creates a new session.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Fact icon={Clock3} label="Duration" value="Adaptive" />
                <Fact icon={ShieldCheck} label="Saving" value="Autosaved" />
                <Fact icon={BarChart3} label="Outcome" value="CEFR level" />
              </div>

              {error ? (
                <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
                  {error}
                </p>
              ) : null}
            </section>

            <StatePanel
              data={data}
              latest={latest}
              progress={progress}
              retaking={retaking}
              onRetake={() => {
                if (data.retake.allowed) {
                  void handleRetake(false);
                } else {
                  setShowRetakeConfirm(true);
                }
              }}
              onSelectManualLevel={() => {
                setManualLevelError("");
                setShowManualLevel(true);
              }}
            />
          </div>
        </LumiverseCard>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <LumiverseCard className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[var(--lumiverse-ink)]">
                  Skills assessed
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                  The test keeps each skill separate so your path can target the
                  areas that need the most support.
                </p>
              </div>
              <Target aria-hidden className="h-7 w-7 text-[var(--lumiverse-primary)]" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {assessedSkills.map((skill) => {
                const Icon = skill.icon;
                return (
                  <div
                    key={skill.label}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--lumiverse-border)] bg-white/70 p-4"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)]">
                      <Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <span className="font-black text-[var(--lumiverse-ink)]">
                      {skill.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </LumiverseCard>

          <LumiverseCard className="p-6">
            <h2 className="text-xl font-black text-[var(--lumiverse-ink)]">
              How adaptive testing works
            </h2>
            <div className="mt-5 grid gap-3">
              <Step
                number="1"
                title="Start from a balanced question set"
                description="The session starts with a broad skill check and keeps your progress on the server."
              />
              <Step
                number="2"
                title="Adjust by answer quality"
                description="Questions and specialized Speaking/Writing submissions continue through the existing backend flow."
              />
              <Step
                number="3"
                title="Generate result and path"
                description="Processing, result generation, and learning-path gate remain controlled by the current API."
              />
            </div>
          </LumiverseCard>
        </section>
      </div>

      <RetakeDialog
        open={showRetakeConfirm}
        message={data.retake.message}
        loading={retaking}
        onClose={() => setShowRetakeConfirm(false)}
        onConfirm={() => void handleRetake(true)}
      />

      <ManualLevelDialog
        open={showManualLevel}
        level={manualLevel}
        saving={savingManualLevel}
        error={manualLevelError}
        onSelectLevel={setManualLevel}
        onClose={() => !savingManualLevel && setShowManualLevel(false)}
        onConfirm={() => void handleConfirmManualLevel()}
      />
    </main>
  );
}

function StatePanel({
  data,
  latest,
  progress,
  retaking,
  onRetake,
  onSelectManualLevel,
}: {
  data: PlacementDashboardData;
  latest: PlacementDashboardData["latestResult"];
  progress: { label: string; href: string } | null;
  retaking: boolean;
  onRetake: () => void;
  onSelectManualLevel: () => void;
}) {
  if (data.state === "FIRST_TIME") {
    return (
      <LumiverseCard className="border-blue-100 bg-blue-50/45 p-5">
        <Play aria-hidden className="h-8 w-8 text-[var(--lumiverse-primary)]" />
        <h2 className="mt-4 text-2xl font-black text-[var(--lumiverse-ink)]">
          Ready for your first placement?
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
          Review the preparation screen before the session starts. No microphone
          permission is requested until a Speaking question needs it.
        </p>
        <Link href="/placement/introduction" className="lumiverse-button-primary mt-6 w-full">
          Start preparation <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
        <LumiverseButton
          tone="ghost"
          className="mt-2 w-full"
          onClick={onSelectManualLevel}
        >
          <ListChecks aria-hidden className="h-4 w-4" />
          Choose my level manually
        </LumiverseButton>
      </LumiverseCard>
    );
  }

  if (data.state === "IN_PROGRESS" && progress) {
    return (
      <LumiverseCard className="border-amber-100 bg-amber-50/55 p-5">
        <RefreshCw aria-hidden className="h-8 w-8 text-amber-600" />
        <h2 className="mt-4 text-2xl font-black text-[var(--lumiverse-ink)]">
          Resume your current test
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
          {progress.label}
        </p>
        <Link href={progress.href} className="lumiverse-button-primary mt-6 w-full">
          Resume test <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </LumiverseCard>
    );
  }

  if (data.state === "PROCESSING") {
    return (
      <LumiverseCard className="border-violet-100 bg-violet-50/55 p-5">
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-[var(--lumiverse-primary)]" />
        <h2 className="mt-4 text-2xl font-black text-[var(--lumiverse-ink)]">
          Your result is being prepared
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
          Continue to the live processing screen. Progress comes from the
          existing processing API.
        </p>
        <Link
          href={data.currentTest?.processingUrl ?? "/placement/dashboard"}
          className="lumiverse-button-primary mt-6 w-full"
        >
          View processing <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </LumiverseCard>
    );
  }

  return (
    <LumiverseCard className="border-emerald-100 bg-emerald-50/50 p-5">
      <CheckCircle2 aria-hidden className="h-8 w-8 text-emerald-600" />
      <h2 className="mt-4 text-2xl font-black text-[var(--lumiverse-ink)]">
        Current level: {latest?.overallLevel ?? "Ready"}
      </h2>
      {latest ? (
        <>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
            Completed{" "}
            {latest.completedAt
              ? new Date(latest.completedAt).toLocaleDateString()
              : "recently"}
            . Score {Math.round(latest.overallScore)}/100.
          </p>
          <div className="mt-4">
            <LumiverseProgress value={Math.round(latest.overallScore)} />
          </div>
        </>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/learning-path" className="lumiverse-button-primary">
          Continue learning
        </Link>
        {data.actions.resultUrl ? (
          <Link href={data.actions.resultUrl} className="lumiverse-button-soft">
            View result
          </Link>
        ) : null}
      </div>
      <LumiverseButton
        tone="ghost"
        loading={retaking}
        className="mt-3 w-full"
        onClick={onRetake}
      >
        Retake placement
      </LumiverseButton>
    </LumiverseCard>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/70 p-4">
      <Icon aria-hidden className="h-5 w-5 text-[var(--lumiverse-primary)]" />
      <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--lumiverse-muted)]">
        {label}
      </p>
      <p className="mt-1 font-black text-[var(--lumiverse-ink)]">{value}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-[var(--lumiverse-border)] bg-white/70 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--lumiverse-primary)] font-black text-white">
        {number}
      </span>
      <div>
        <h3 className="font-black text-[var(--lumiverse-ink)]">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function RetakeDialog({
  open,
  message,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  message: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <LumiverseDialog open={open} onClose={onClose} titleId="retake-title">
      <div className="flex items-start justify-between gap-4">
        <h2 id="retake-title" className="text-2xl font-black text-[var(--lumiverse-ink)]">
          Retake placement now?
        </h2>
        <LumiverseDialogCloseButton onClose={onClose} label="Close dialog" />
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
        {message || "A new attempt will start through the existing retake API."}
      </p>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <LumiverseButton tone="ghost" disabled={loading} onClick={onClose}>
          Cancel
        </LumiverseButton>
        <LumiverseButton loading={loading} onClick={onConfirm}>
          Retake anyway
        </LumiverseButton>
      </div>
    </LumiverseDialog>
  );
}

function ManualLevelDialog({
  open,
  level,
  saving,
  error,
  onSelectLevel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  level: CefrLevel;
  saving: boolean;
  error: string;
  onSelectLevel: (level: CefrLevel) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <LumiverseDialog open={open} onClose={onClose} titleId="manual-level-title" className="max-w-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <LumiverseBadge>CEFR</LumiverseBadge>
          <h2 id="manual-level-title" className="mt-3 text-2xl font-black text-[var(--lumiverse-ink)]">
            Choose your starting level
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
            We will use this as the starting point for every skill. You can
            retake the adaptive test later to refine it.
          </p>
        </div>
        <LumiverseDialogCloseButton onClose={onClose} label="Close dialog" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CEFR_LEVELS.map((cefr) => {
          const active = level === cefr;
          return (
            <button
              key={cefr}
              type="button"
              disabled={saving}
              onClick={() => onSelectLevel(cefr)}
              aria-pressed={active}
              className={[
                "rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-[var(--lumiverse-primary)] bg-blue-50 ring-2 ring-[var(--lumiverse-ring)] dark:bg-white/10"
                  : "border-[var(--lumiverse-border)] bg-white/70 hover:border-[var(--lumiverse-primary)] dark:bg-white/5",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-[var(--lumiverse-ink)]">{cefr}</span>
                {active ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--lumiverse-primary)] text-white">
                    <Check aria-hidden className="h-4 w-4" />
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs font-bold text-[var(--lumiverse-muted)]">
                {CEFR_LEVEL_LABELS[cefr]}
              </p>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <LumiverseButton tone="ghost" disabled={saving} onClick={onClose}>
          Cancel
        </LumiverseButton>
        <LumiverseButton loading={saving} onClick={onConfirm}>
          Start from {level}
        </LumiverseButton>
      </div>
    </LumiverseDialog>
  );
}

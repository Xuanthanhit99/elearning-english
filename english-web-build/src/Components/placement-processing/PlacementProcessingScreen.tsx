"use client";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  FileSearch,
  Headphones,
  Loader2,
  Mic2,
  PencilLine,
  RefreshCw,
  Route,
  ShieldCheck,
  Type,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getPlacementProcessing,
  PlacementProcessingSnapshot,
  ProcessingItemStatus,
  startPlacementProcessing,
} from "@/src/lib/placement-processing-api";
import {
  LumiverseBadge,
  LumiverseButton,
  LumiverseCard,
  LumiverseProgress,
  LumiverseSectionHeader,
} from "@/src/Components/UI/Lumiverse";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

const stepIcons = {
  ANSWER_ANALYSIS: FileSearch,
  SKILL_EVALUATION: BarChart3,
  LEARNING_PATH: Route,
  QUALITY_CHECK: ShieldCheck,
};

const skillIcons = {
  VOCABULARY: Type,
  GRAMMAR: BookOpen,
  LISTENING: Headphones,
  READING: BookOpen,
  SPEAKING: Mic2,
  WRITING: PencilLine,
};

export default function PlacementProcessingScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PlacementProcessingSnapshot | null>(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(true);
  const [starting, setStarting] = useState(false);
  const redirectingRef = useRef(false);

  const applySnapshot = useCallback((snapshot: PlacementProcessingSnapshot) => {
    setData(snapshot);
    setError(snapshot.errorMessage ?? "");

    if (snapshot.status === "COMPLETED" && snapshot.nextUrl && !redirectingRef.current) {
      redirectingRef.current = true;
      window.setTimeout(() => router.replace(snapshot.nextUrl as string), 700);
    }
  }, [router]);

  const initializeProcessing = useCallback(async () => {
    try {
      setStarting(true);
      setError("");
      applySnapshot(await startPlacementProcessing(sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing could not be started.");
    } finally {
      setStarting(false);
    }
  }, [applySnapshot, sessionId]);

  const refreshSnapshot = useCallback(async () => {
    try {
      applySnapshot(await getPlacementProcessing(sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing status could not be refreshed.");
    }
  }, [applySnapshot, sessionId]);

  useEffect(() => {
    void Promise.resolve().then(initializeProcessing);

    const eventSource = new EventSource(
      `${API_BASE_URL}/placement/tests/${sessionId}/processing/events`,
      { withCredentials: true },
    );

    const handleSnapshot = (event: MessageEvent<string>) => {
      const snapshot = JSON.parse(event.data) as PlacementProcessingSnapshot;
      applySnapshot(snapshot);
      setConnecting(false);
    };

    eventSource.addEventListener("snapshot", handleSnapshot);
    eventSource.onopen = () => setConnecting(false);
    eventSource.onerror = () => setConnecting(false);

    const fallback = window.setInterval(() => {
      if (eventSource.readyState !== EventSource.OPEN) void refreshSnapshot();
    }, 3000);

    return () => {
      window.clearInterval(fallback);
      eventSource.removeEventListener("snapshot", handleSnapshot);
      eventSource.close();
    };
  }, [applySnapshot, initializeProcessing, refreshSnapshot, sessionId]);

  const activeStep = useMemo(() => {
    if (!data) return null;
    return data.steps.find((step) => step.status === "PROCESSING") ?? data.steps.find((step) => step.status === "WAITING") ?? data.steps.at(-1) ?? null;
  }, [data]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <LumiverseCard className="w-full max-w-lg p-8 text-center">
          <Loader2 aria-hidden className="mx-auto h-10 w-10 animate-spin text-[var(--lumiverse-primary)]" />
          <h1 className="mt-5 text-2xl font-black text-[var(--lumiverse-ink)]">
            Starting placement analysis
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
            The backend is preparing the processing job for this test.
          </p>
          {error ? (
            <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
        </LumiverseCard>
      </main>
    );
  }

  const failed = data.status === "FAILED";
  const completed = data.status === "COMPLETED";

  return (
    <main className="min-h-screen px-3 py-5 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <LumiverseCard className="p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section>
              <LumiverseBadge>{data.status}</LumiverseBadge>
              <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-[var(--lumiverse-ink)] sm:text-5xl">
                {failed
                  ? "Analysis needs attention"
                  : completed
                    ? "Analysis complete"
                    : "Analyzing your placement test"}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--lumiverse-muted)]">
                Progress, steps, logs, skill states, and redirect are driven by
                the existing placement processing API. No progress is simulated.
              </p>

              <div className="mt-7">
                <div className="flex items-center justify-between text-sm font-black text-[var(--lumiverse-muted)]">
                  <span>Overall progress</span>
                  <span>{data.progress}%</span>
                </div>
                <LumiverseProgress value={data.progress} className="mt-2 h-4" />
              </div>

              {error ? (
                <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600" role="alert">
                  {error}
                </p>
              ) : null}
            </section>

            <LumiverseCard className="border-slate-100 bg-white/70 p-5">
              <ConnectionStatus connecting={connecting} failed={failed} />
              <div className="mt-5 space-y-4">
                <Fact icon={Clock3} label="Estimated remaining" value={formatDuration(data.estimatedRemainingSeconds)} />
                <Fact icon={activeStep ? stepIcons[activeStep.key] : Circle} label="Current step" value={activeStep?.title ?? "Waiting"} />
              </div>
              {failed ? (
                <LumiverseButton
                  className="mt-6 w-full"
                  loading={starting}
                  onClick={() => void initializeProcessing()}
                >
                  Retry processing
                  <RefreshCw aria-hidden className="h-4 w-4" />
                </LumiverseButton>
              ) : completed && data.nextUrl ? (
                <LumiverseButton className="mt-6 w-full" onClick={() => router.replace(data.nextUrl as string)}>
                  Open result
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </LumiverseButton>
              ) : null}
            </LumiverseCard>
          </div>
        </LumiverseCard>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <LumiverseCard className="p-6">
            <LumiverseSectionHeader
              eyebrow="Pipeline"
              title="Processing steps"
              description="Each step uses the status and progress returned by the backend snapshot."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {data.steps.map((step) => (
                <StepCard key={step.key} step={step} />
              ))}
            </div>
          </LumiverseCard>

          <LogPanel logs={data.logs} connecting={connecting} failed={failed} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SkillPanel skills={data.skills} />
          <InsightPanel insights={data.insights} />
        </section>
      </div>
    </main>
  );
}

function ConnectionStatus({ connecting, failed }: { connecting: boolean; failed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={[
        "flex h-11 w-11 items-center justify-center rounded-2xl",
        failed ? "bg-rose-50 text-rose-600" : connecting ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600",
      ].join(" ")}>
        {failed ? <AlertCircle aria-hidden className="h-5 w-5" /> : connecting ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <CheckCircle2 aria-hidden className="h-5 w-5" />}
      </span>
      <div>
        <p className="font-black text-[var(--lumiverse-ink)]">
          {failed ? "Failed" : connecting ? "Connecting" : "Live updates"}
        </p>
        <p className="text-xs font-bold text-[var(--lumiverse-muted)]">
          SSE with polling fallback
        </p>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/75 p-4">
      <Icon aria-hidden className="h-5 w-5 text-[var(--lumiverse-primary)]" />
      <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--lumiverse-muted)]">
        {label}
      </p>
      <p className="mt-1 font-black text-[var(--lumiverse-ink)]">{value}</p>
    </div>
  );
}

function StepCard({ step }: { step: PlacementProcessingSnapshot["steps"][number] }) {
  const Icon = stepIcons[step.key];
  return (
    <article className="rounded-3xl border border-[var(--lumiverse-border)] bg-white/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)]">
          <Icon aria-hidden className="h-6 w-6" />
        </span>
        <StatusIcon status={step.status} />
      </div>
      <h3 className="mt-4 font-black text-[var(--lumiverse-ink)]">{step.title}</h3>
      <p className="mt-1 text-sm font-bold text-[var(--lumiverse-muted)]">
        {statusLabel(step.status)}
      </p>
      <div className="mt-5">
        <LumiverseProgress value={step.progress} />
      </div>
    </article>
  );
}

function SkillPanel({ skills }: { skills: PlacementProcessingSnapshot["skills"] }) {
  return (
    <LumiverseCard className="p-6">
      <LumiverseSectionHeader
        eyebrow="Skills"
        title="Skill evaluation"
        description="Skill status, score, level, and message come directly from the processing snapshot."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {skills.map((item) => {
          const Icon = skillIcons[item.skill];
          return (
            <div key={item.skill} className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)]">
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-black text-[var(--lumiverse-ink)]">{item.skill}</p>
                    <p className="text-xs font-bold text-[var(--lumiverse-muted)]">
                      {item.level ?? statusLabel(item.status)}
                    </p>
                  </div>
                </div>
                <StatusIcon status={item.status} />
              </div>
              <LumiverseProgress value={item.progress} className="mt-4" />
              {item.message ? (
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                  {item.message}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </LumiverseCard>
  );
}

function LogPanel({
  logs,
  connecting,
  failed,
}: {
  logs: PlacementProcessingSnapshot["logs"];
  connecting: boolean;
  failed: boolean;
}) {
  return (
    <LumiverseCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[var(--lumiverse-ink)]">Processing log</h2>
        <span className={[
          "rounded-full px-3 py-1 text-xs font-black",
          failed ? "bg-rose-50 text-rose-600" : connecting ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-700",
        ].join(" ")}>
          {failed ? "FAILED" : connecting ? "CONNECTING" : "LIVE"}
        </span>
      </div>
      <div className="mt-5 max-h-[520px] space-y-4 overflow-auto pr-1">
        {logs.length ? (
          logs.map((log) => (
            <div key={log.id} className="grid grid-cols-[70px_24px_minmax(0,1fr)] gap-3">
              <span className="text-xs font-bold text-[var(--lumiverse-muted)]">
                {new Date(log.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <StatusIcon status={log.status} />
              <p className="text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                {log.message}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-[var(--lumiverse-muted)]">
            Waiting for the backend to publish processing logs.
          </p>
        )}
      </div>
    </LumiverseCard>
  );
}

function InsightPanel({ insights }: { insights: string[] }) {
  return (
    <LumiverseCard className="p-5">
      <h2 className="text-lg font-black text-[var(--lumiverse-ink)]">Insights</h2>
      <div className="mt-4 space-y-3">
        {insights.length ? (
          insights.slice(-5).map((insight, index) => (
            <p key={`${insight}-${index}`} className="rounded-2xl bg-blue-50/55 p-4 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
              {insight}
            </p>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-[var(--lumiverse-muted)]">
            Insights will appear here if the backend returns them.
          </p>
        )}
      </div>
    </LumiverseCard>
  );
}

function StatusIcon({ status }: { status: ProcessingItemStatus }) {
  if (status === "COMPLETED") return <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-500" />;
  if (status === "PROCESSING") return <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-[var(--lumiverse-primary)]" />;
  if (status === "FAILED") return <AlertCircle aria-hidden className="h-5 w-5 shrink-0 text-rose-500" />;
  if (status === "SKIPPED") return <Circle aria-hidden className="h-5 w-5 shrink-0 text-amber-500" />;
  return <Circle aria-hidden className="h-5 w-5 shrink-0 text-slate-300" />;
}

function statusLabel(status: ProcessingItemStatus) {
  const labels: Record<ProcessingItemStatus, string> = {
    WAITING: "Waiting",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    SKIPPED: "Skipped",
    FAILED: "Failed",
  };
  return labels[status];
}

function formatDuration(seconds: number) {
  const safe = Math.max(seconds, 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

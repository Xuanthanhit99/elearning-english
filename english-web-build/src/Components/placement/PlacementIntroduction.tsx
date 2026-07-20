"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Flag,
  Headphones,
  Mic2,
  PencilLine,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Target,
  Type,
  VolumeX,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getPlacementIntroduction,
  PlacementIntroductionData,
  PlacementStepKey,
  startPlacementTest,
} from "@/src/lib/placement-api";
import {
  LumiverseBadge,
  LumiverseButton,
  LumiverseCard,
  LumiverseSkeleton,
  LumiverseState,
} from "@/src/Components/UI/Lumiverse";

const readinessChecklist = [
  { icon: Wifi, text: "Stable internet connection" },
  { icon: Headphones, text: "Headphones for Listening questions" },
  { icon: Mic2, text: "Microphone ready for the Speaking section" },
  { icon: VolumeX, text: "A quiet environment with no interruptions" },
];

const stepIcons: Record<PlacementStepKey, typeof Type> = {
  INTRODUCTION: Target,
  VOCABULARY: Type,
  GRAMMAR: BookOpen,
  LISTENING: Headphones,
  READING: FileText,
  SPEAKING: Mic2,
  WRITING: PencilLine,
  RESULT: CheckCircle2,
};

const skillLabels: Record<string, string> = {
  VOCABULARY: "Vocabulary",
  GRAMMAR: "Grammar",
  LISTENING: "Listening",
  READING: "Reading",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

export default function PlacementIntroduction() {
  const router = useRouter();
  const [data, setData] = useState<PlacementIntroductionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function loadIntroduction() {
    try {
      setLoading(true);
      setError("");
      setData(await getPlacementIntroduction());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not load placement preparation.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadIntroduction);
  }, []);

  async function handleStart() {
    try {
      setStarting(true);
      setError("");
      const result = await startPlacementTest();
      router.push(result.nextUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We could not start the test.",
      );
    } finally {
      setStarting(false);
    }
  }

  const answeredPercent = useMemo(() => {
    if (!data?.test.hasActiveSession) return 0;
    const total = Math.max(data.content.steps.length - 2, 1);
    return Math.min(Math.round((data.test.answeredQuestions / total) * 100), 100);
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen px-3 py-5" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading placement preparation…</span>
        <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <LumiverseSkeleton className="h-[680px]" />
          <LumiverseSkeleton className="h-[680px]" />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <LumiverseState
        title="Preparation is unavailable"
        description={error}
        actionLabel="Try again"
        tone="error"
        onAction={() => void loadIntroduction()}
      />
    );
  }

  return (
    <main className="min-h-screen px-3 py-5 sm:px-4 lg:px-6">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <LumiverseCard className="p-5">
          <LumiverseBadge>Checklist</LumiverseBadge>
          <h2 className="mt-4 text-xl font-black text-[var(--lumiverse-ink)]">
            Test flow
          </h2>
          <ol className="mt-5 space-y-4">
            {data.content.steps.map((step) => {
              const Icon = stepIcons[step.key];
              const active = step.key === data.test.currentStep;
              const completed = isStepCompleted(step.key, data.test.currentStep);

              return (
                <li key={step.key} className="flex gap-3">
                  <span
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                      completed
                        ? "bg-emerald-100 text-emerald-700"
                        : active
                          ? "bg-blue-100 text-[var(--lumiverse-primary)]"
                          : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {completed ? (
                      <CheckCircle2 aria-hidden className="h-5 w-5" />
                    ) : (
                      <Icon aria-hidden className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <p className="font-black text-[var(--lumiverse-ink)]">
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                      {step.subtitle}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </LumiverseCard>

        <section className="space-y-5">
          <LumiverseCard className="p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <LumiverseBadge>{data.test.mode.replace("_", " ")} mode</LumiverseBadge>
                <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-[var(--lumiverse-ink)] sm:text-5xl">
                  {data.content.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--lumiverse-muted)]">
                  {data.content.description}
                </p>

                <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/55 p-5">
                  <div className="flex gap-4">
                    <Target aria-hidden className="h-8 w-8 shrink-0 text-[var(--lumiverse-primary)]" />
                    <div>
                      <h2 className="font-black text-[var(--lumiverse-ink)]">
                        {data.content.adaptive.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                        {data.content.adaptive.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <LumiverseCard className="border-slate-100 bg-white/75 p-5">
                <h2 className="text-lg font-black text-[var(--lumiverse-ink)]">
                  Readiness checklist
                </h2>
                <ul className="mt-4 space-y-3">
                  {readinessChecklist.map((item) => (
                    <li key={item.text} className="flex items-center gap-3 rounded-2xl bg-white/75 p-3">
                      <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-600" />
                      <span className="text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <h2 className="mt-6 text-lg font-black text-[var(--lumiverse-ink)]">
                  Before you begin
                </h2>
                <div className="mt-4 space-y-3">
                  <PrepItem icon={Mic2} text="Microphone permission is requested only when Speaking starts." />
                  <PrepItem icon={Clock3} text={`Estimated time: about ${data.content.estimatedMinutes} minutes.`} />
                  <PrepItem icon={SkipForward} text="Skip keeps the existing server behavior." />
                  <PrepItem icon={Flag} text="Flag saves a question for review when the backend supports it." />
                  <PrepItem icon={ShieldCheck} text={data.content.autosaveMessage} />
                </div>
              </LumiverseCard>
            </div>
          </LumiverseCard>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <LumiverseCard className="p-6">
              <h2 className="text-xl font-black text-[var(--lumiverse-ink)]">
                Skills in this test
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.content.skills.map((skill) => {
                  const Icon = stepIcons[skill];
                  return (
                    <div
                      key={skill}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--lumiverse-border)] bg-white/70 p-4"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--lumiverse-primary)]">
                        <Icon aria-hidden className="h-5 w-5" />
                      </span>
                      <span className="font-black text-[var(--lumiverse-ink)]">
                        {skillLabels[skill] ?? skill}
                      </span>
                    </div>
                  );
                })}
              </div>
            </LumiverseCard>

            <LumiverseCard className="p-6">
              <h2 className="text-xl font-black text-[var(--lumiverse-ink)]">
                Session status
              </h2>
              {data.test.hasActiveSession ? (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                  <RotateCcw aria-hidden className="h-6 w-6 text-amber-600" />
                  <p className="mt-3 font-black text-[var(--lumiverse-ink)]">
                    Active test found
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                    {data.test.answeredQuestions} answered questions. Current
                    step: {data.test.currentStep}.
                  </p>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${answeredPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                  No active session yet. The session is created only after you
                  press the start button.
                </p>
              )}

              {error ? (
                <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col gap-3">
                <LumiverseButton
                  loading={starting}
                  onClick={() => void handleStart()}
                  className="w-full"
                >
                  {data.test.hasActiveSession ? "Resume test" : "Start test"}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </LumiverseButton>
                <LumiverseButton
                  tone="ghost"
                  disabled={starting}
                  onClick={() => router.push("/placement")}
                  className="w-full"
                >
                  <ArrowLeft aria-hidden className="h-4 w-4" />
                  Back
                </LumiverseButton>
              </div>
            </LumiverseCard>
          </section>
        </section>
      </div>
    </main>
  );
}

function PrepItem({
  icon: Icon,
  text,
}: {
  icon: typeof Headphones;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/75 p-3">
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[var(--lumiverse-primary)]" />
      <p className="text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
        {text}
      </p>
    </div>
  );
}

function isStepCompleted(step: PlacementStepKey, current: PlacementStepKey) {
  const order: PlacementStepKey[] = [
    "INTRODUCTION",
    "VOCABULARY",
    "GRAMMAR",
    "LISTENING",
    "READING",
    "SPEAKING",
    "WRITING",
    "RESULT",
  ];

  return order.indexOf(step) < order.indexOf(current);
}

"use client";

import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Clock3,
  Cloud,
  FileText,
  Flag,
  Headphones,
  Loader2,
  Mic2,
  PencilLine,
  RotateCcw,
  SkipForward,
  Type,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  answerPlacementQuestion,
  flagPlacementQuestion,
  getPlacementTest,
  LearningSkill,
  PlacementTestScreenData,
  skipPlacementQuestion,
} from "@/src/lib/placement-api";
import PlacementListeningQuestion from "../placement-test/PlacementListeningQuestion";
import PlacementSpeakingQuestion from "../placement-test/PlacementSpeakingQuestion";
import PlacementTextQuestion from "../placement-test/PlacementTextQuestion";
import PlacementWritingQuestion from "../placement-test/PlacementWritingQuestion";

const skillMeta: Record<
  LearningSkill,
  { label: string; icon: typeof Type; accent: string }
> = {
  VOCABULARY: { label: "Vocabulary", icon: Type, accent: "text-violet-700 bg-violet-50" },
  GRAMMAR: { label: "Grammar", icon: BookOpen, accent: "text-emerald-700 bg-emerald-50" },
  LISTENING: { label: "Listening", icon: Headphones, accent: "text-orange-700 bg-orange-50" },
  READING: { label: "Reading", icon: FileText, accent: "text-sky-700 bg-sky-50" },
  SPEAKING: { label: "Speaking", icon: Mic2, accent: "text-blue-700 bg-blue-50" },
  WRITING: { label: "Writing", icon: PencilLine, accent: "text-cyan-700 bg-cyan-50" },
};

export default function PlacementTestScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PlacementTestScreenData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [error, setError] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const questionStartedAt = useRef(0);

  const loadTest = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await getPlacementTest(sessionId);

      if (result.session.isCompleted || !result.currentQuestion) {
        setRedirecting(true);
        router.replace(result.nextUrl ?? `/placement/test/${sessionId}/processing`);
        return;
      }

      setData(result);
      setSelectedAnswer(result.currentQuestion.selectedAnswer);
      setRemainingSeconds(calculateRemaining(result));
      questionStartedAt.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not load this placement session.");
    } finally {
      setLoading(false);
    }
  }, [router, sessionId]);

  useEffect(() => {
    void Promise.resolve().then(loadTest);
  }, [loadTest]);

  const sessionKey = data?.session.id;

  useEffect(() => {
    if (!sessionKey) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionKey]);

  const currentSection = useMemo(() => {
    if (!data?.currentQuestion) return null;
    return data.sections.find((section) => section.skill === data.currentQuestion?.skill) ?? null;
  }, [data]);

  async function handleNext() {
    if (!data?.currentQuestion || !selectedAnswer || saving) return;
    const currentQuestion = data.currentQuestion;

    try {
      setSaving(true);
      setError("");
      const result = await answerPlacementQuestion(sessionId, {
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        spentSeconds: getQuestionSpentSeconds(),
      });
      applyNextResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save this answer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (!data?.currentQuestion || saving) return;
    const currentQuestion = data.currentQuestion;

    try {
      setSaving(true);
      setError("");
      const result = await skipPlacementQuestion(sessionId, {
        questionId: currentQuestion.id,
        spentSeconds: getQuestionSpentSeconds(),
      });
      applyNextResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not skip this question.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFlag() {
    if (!data?.currentQuestion || flagging) return;
    const currentQuestion = data.currentQuestion;
    const nextFlagged = !currentQuestion.isFlagged;

    try {
      setFlagging(true);
      setError("");
      await flagPlacementQuestion(sessionId, {
        questionId: currentQuestion.id,
        isFlagged: nextFlagged,
      });

      setData((current) => {
        if (!current?.currentQuestion) return current;
        return {
          ...current,
          currentQuestion: {
            ...current.currentQuestion,
            isFlagged: nextFlagged,
          },
          questionNavigator: current.questionNavigator.map((item) =>
            item.id === currentQuestion.id ? { ...item, flagged: nextFlagged } : item,
          ),
          autosave: { savedAt: new Date().toISOString() },
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not update the flag.");
    } finally {
      setFlagging(false);
    }
  }

  function applyNextResult(result: PlacementTestScreenData) {
    if (result.session.isCompleted || !result.currentQuestion) {
      setRedirecting(true);
      router.replace(result.nextUrl ?? `/placement/test/${sessionId}/processing`);
      return;
    }

    setData(result);
    setSelectedAnswer(result.currentQuestion.selectedAnswer);
    setRemainingSeconds(calculateRemaining(result));
    questionStartedAt.current = Date.now();
  }

  function getQuestionSpentSeconds() {
    return Math.max(Math.floor((Date.now() - questionStartedAt.current) / 1000), 0);
  }

  if (redirecting) {
    return <CenteredState icon={Loader2} spinning title="Opening analysis" description="Your completed session is moving to the processing screen." />;
  }

  if (loading) {
    return <PlacementTestSkeleton />;
  }

  if (!data || !data.currentQuestion) {
    return (
      <CenteredState
        icon={RotateCcw}
        title="Test session unavailable"
        description={error || "The session may have finished or expired."}
        actionLabel="Try again"
        onAction={() => void loadTest()}
      />
    );
  }

  const question = data.currentQuestion;
  const meta = skillMeta[question.skill];
  const Icon = meta.icon;
  const sectionProgress =
    currentSection && currentSection.total > 0
      ? Math.round((currentSection.answered / currentSection.total) * 100)
      : 0;
  const isSpecialQuestion = question.type === "SPEAKING" || question.type === "WRITING";

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.accent}`}>
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-[0.12em] text-violet-700">
                {meta.label} placement
              </p>
              <p className="text-sm font-semibold text-slate-500">
                Question {question.globalOrder} of {data.session.totalQuestions}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Timer seconds={remainingSeconds} total={data.session.durationSeconds} />
            <button
              type="button"
              onClick={() => void handleFlag()}
              disabled={flagging}
              aria-pressed={question.isFlagged}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 font-black text-slate-700 disabled:opacity-60"
            >
              <Bookmark
                aria-hidden
                className={`h-5 w-5 ${question.isFlagged ? "fill-amber-400 text-amber-500" : "text-slate-500"}`}
              />
              <span className="hidden sm:inline">{question.isFlagged ? "Flagged" : "Flag"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:py-6">
        <section className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-violet-700">
                  Section {question.sectionOrder} / {question.sectionTotal}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Level target: {question.level}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {question.type.replace("_", " ")}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sectionProgress}>
              <div className="h-full rounded-full bg-violet-600" style={{ width: `${sectionProgress}%` }} />
            </div>
          </div>

          {question.adaptiveMessage ? (
            <div className="border-b border-slate-100 bg-violet-50/65 px-5 py-3 text-sm font-semibold leading-6 text-violet-900">
              {question.adaptiveMessage}
            </div>
          ) : null}

          <div className="px-5 py-6 sm:px-7">
            <QuestionBody
              sessionId={sessionId}
              question={question}
              selectedAnswer={selectedAnswer}
              saving={saving}
              onSelectAnswer={setSelectedAnswer}
              onReload={() => void loadTest()}
            />

            {error ? (
              <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <footer className="sticky bottom-0 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
            {isSpecialQuestion ? (
              <div className="flex items-center justify-between gap-3 text-sm font-bold text-slate-500">
                <span>Specialized response is saved through its own endpoint.</span>
                <span>{question.globalOrder} / {data.session.totalQuestions}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => void handleSkip()}
                  disabled={saving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-600 disabled:opacity-60"
                >
                  <SkipForward aria-hidden className="h-5 w-5" />
                  Skip
                </button>
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700" aria-live="polite">
                  <Cloud aria-hidden className="h-4 w-4" />
                  Saved {formatSavedAt(data.autosave.savedAt)}
                </div>
                <button
                  type="button"
                  onClick={() => void handleNext()}
                  disabled={!selectedAnswer || saving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-black text-white shadow-[0_14px_34px_rgba(124,58,237,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : null}
                  Save and continue
                  <ArrowRight aria-hidden className="h-5 w-5" />
                </button>
              </div>
            )}
          </footer>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <ProgressPanel data={data} />
          <NavigatorPanel items={data.questionNavigator} />
          <ToolPanel
            flagged={question.isFlagged}
            saving={saving}
            flagging={flagging}
            onFlag={() => void handleFlag()}
            onSkip={() => void handleSkip()}
          />
        </aside>
      </div>
    </main>
  );
}

function QuestionBody({
  sessionId,
  question,
  selectedAnswer,
  saving,
  onSelectAnswer,
  onReload,
}: {
  sessionId: string;
  question: NonNullable<PlacementTestScreenData["currentQuestion"]>;
  selectedAnswer: string | null;
  saving: boolean;
  onSelectAnswer: (answer: string | null) => void;
  onReload: () => void;
}) {
  if (question.type === "LISTENING") {
    if (!question.audioUrl) {
      return (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Audio is unavailable for this Listening question. Please retry later.
        </div>
      );
    }
    return (
      <PlacementListeningQuestion
        key={question.id}
        audioUrl={question.audioUrl}
        prompt={question.prompt}
        options={question.options}
        selectedAnswer={selectedAnswer}
        disabled={saving}
        onSelectAnswer={onSelectAnswer}
      />
    );
  }

  if (question.type === "SPEAKING") {
    return (
      <PlacementSpeakingQuestion
        key={question.id}
        sessionId={sessionId}
        questionId={question.id}
        prompt={question.prompt}
        level={question.level}
        onSubmitted={onReload}
      />
    );
  }

  if (question.type === "WRITING") {
    return (
      <PlacementWritingQuestion
        key={question.id}
        sessionId={sessionId}
        questionId={question.id}
        prompt={question.prompt}
        level={question.level}
        minWords={80}
        maxWords={120}
        onSubmitted={onReload}
      />
    );
  }

  return (
    <PlacementTextQuestion
      prompt={question.prompt}
      passage={question.passage}
      options={question.options}
      selectedAnswer={selectedAnswer}
      disabled={saving}
      questionType={question.type}
      onSelectAnswer={onSelectAnswer}
    />
  );
}

function Timer({ seconds, total }: { seconds: number; total: number }) {
  const urgent = seconds <= 120;
  const percent = total > 0 ? Math.max((seconds / total) * 100, 0) : 0;

  return (
    <div className="min-w-[116px] rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <Clock3 aria-hidden className={`h-4 w-4 ${urgent ? "text-rose-600" : "text-violet-600"}`} />
        <span className={`font-black tabular-nums ${urgent ? "text-rose-600" : "text-slate-950"}`}>
          {formatTime(seconds)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${urgent ? "bg-rose-500" : "bg-violet-600"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ProgressPanel({ data }: { data: PlacementTestScreenData }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-950">Overall progress</h2>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={data.session.progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-violet-600" style={{ width: `${data.session.progressPercent}%` }} />
      </div>
      <p className="mt-3 text-sm font-bold text-slate-500">
        {data.session.answeredTotal} answered of {data.session.totalQuestions}
      </p>
      <div className="mt-4 space-y-2">
        {data.sections.map((section) => {
          const meta = skillMeta[section.skill];
          const Icon = meta.icon;
          return (
            <div key={section.skill} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <Icon aria-hidden className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-black text-slate-700">{meta.label}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {section.answered}/{section.total}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NavigatorPanel({ items }: { items: PlacementTestScreenData["questionNavigator"] }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-950">Questions</h2>
      <div className="mt-4 grid grid-cols-6 gap-2 lg:grid-cols-5">
        {items.map((item) => (
          <span
            key={item.id}
            className={[
              "relative flex h-10 w-10 items-center justify-center rounded-full border text-xs font-black",
              item.active
                ? "border-violet-600 bg-violet-600 text-white"
                : item.answered
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : item.skipped
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-600",
            ].join(" ")}
            aria-current={item.active ? "step" : undefined}
          >
            {item.order}
            {item.flagged ? <Flag aria-hidden className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-amber-400 text-amber-500" /> : null}
          </span>
        ))}
      </div>
    </section>
  );
}

function ToolPanel({
  flagged,
  saving,
  flagging,
  onFlag,
  onSkip,
}: {
  flagged: boolean;
  saving: boolean;
  flagging: boolean;
  onFlag: () => void;
  onSkip: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-950">Tools</h2>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={onFlag}
          disabled={flagging}
          className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left font-black text-slate-700 disabled:opacity-60"
        >
          <Bookmark aria-hidden className={`h-5 w-5 ${flagged ? "fill-amber-400 text-amber-500" : "text-violet-600"}`} />
          {flagged ? "Remove flag" : "Flag question"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left font-black text-slate-700 disabled:opacity-60"
        >
          <SkipForward aria-hidden className="h-5 w-5 text-violet-600" />
          Skip question
        </button>
      </div>
    </section>
  );
}

function CenteredState({
  icon: Icon,
  title,
  description,
  spinning = false,
  actionLabel,
  onAction,
}: {
  icon: typeof Loader2;
  title: string;
  description: string;
  spinning?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8ff] p-6">
      <section className="w-full max-w-lg rounded-[28px] bg-white p-8 text-center shadow-sm">
        <Icon aria-hidden className={`mx-auto h-10 w-10 text-violet-600 ${spinning ? "animate-spin" : ""}`} />
        <h1 className="mt-5 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="mt-6 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white">
            {actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}

function PlacementTestSkeleton() {
  return (
    <main className="min-h-screen bg-[#f7f8ff] px-3 py-4">
      <div className="mx-auto grid max-w-7xl animate-pulse gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="h-[760px] rounded-[28px] bg-white" />
        <div className="h-[620px] rounded-[28px] bg-white" />
      </div>
    </main>
  );
}

function calculateRemaining(result: PlacementTestScreenData) {
  const startedAt = new Date(result.session.startedAt).getTime();
  const elapsed = Number.isFinite(startedAt)
    ? Math.floor((Date.now() - startedAt) / 1000)
    : 0;
  return Math.max(result.session.durationSeconds - elapsed, 0);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatSavedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

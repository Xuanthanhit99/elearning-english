"use client";

import {
  BarChart3,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  FileSearch,
  Headphones,
  Loader2,
  Mic2,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Type,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getPlacementProcessing,
  PlacementProcessingSnapshot,
  ProcessingItemStatus,
  startPlacementProcessing,
} from "@/src/lib/placement-processing-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

export default function PlacementProcessingScreen({
  sessionId,
}: {
  sessionId: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<PlacementProcessingSnapshot | null>(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(true);
  const redirectingRef = useRef(false);

  async function initializeProcessing() {
    try {
      setError("");

      const snapshot = await startPlacementProcessing(sessionId);

      applySnapshot(snapshot);
    } catch (err) {
      console.error("Initialize placement processing error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể bắt đầu phân tích bài kiểm tra.",
      );
    }
  }

  async function loadSnapshot() {
    try {
      setError("");
      const snapshot = await getPlacementProcessing(sessionId);
      applySnapshot(snapshot);
    } catch {
      const snapshot = await startPlacementProcessing(sessionId);
      applySnapshot(snapshot);
    }
  }
  function applySnapshot(snapshot: PlacementProcessingSnapshot) {
    setData(snapshot);

    if (
      snapshot.status === "COMPLETED" &&
      snapshot.nextUrl &&
      !redirectingRef.current
    ) {
      redirectingRef.current = true;

      window.setTimeout(() => {
        router.replace(snapshot.nextUrl as string);
      }, 700);
    }
  }

  async function refreshSnapshot() {
    try {
      const snapshot = await getPlacementProcessing(sessionId);

      applySnapshot(snapshot);
    } catch (err) {
      console.error("Refresh processing snapshot error:", err);
    }
  }
  useEffect(() => {
    void initializeProcessing();

    const eventSource = new EventSource(
      `${API_BASE_URL}/placement/tests/${sessionId}/processing/events`,
      {
        withCredentials: true,
      },
    );

    const handleSnapshot = (event: MessageEvent<string>) => {
      const snapshot = JSON.parse(event.data) as PlacementProcessingSnapshot;

      applySnapshot(snapshot);
      setConnecting(false);
    };

    eventSource.addEventListener("snapshot", handleSnapshot);

    eventSource.onopen = () => {
      setConnecting(false);
    };

    eventSource.onerror = () => {
      setConnecting(false);
    };

    const fallback = window.setInterval(() => {
      if (eventSource.readyState !== EventSource.OPEN) {
        void refreshSnapshot();
      }
    }, 3000);

    return () => {
      window.clearInterval(fallback);

      eventSource.removeEventListener("snapshot", handleSnapshot);

      eventSource.close();
    };
  }, [sessionId]);

  const activeStepIndex = useMemo(() => {
    if (!data) return 1;

    const processing = data.steps.findIndex(
      (step) => step.status === "PROCESSING",
    );

    if (processing >= 0) return processing + 2;

    return Math.min(
      data.steps.filter((step) => step.status === "COMPLETED").length + 2,
      5,
    );
  }, [data]);

  if (!data) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
          <p className="mt-4 font-black text-slate-900">
            Đang khởi tạo tiến trình phân tích...
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,#faf9ff,#fff)] px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[290px_minmax(0,1fr)_300px]">
        <Timeline activeStepIndex={activeStepIndex} status={data.status} />

        <section className="space-y-5">
          <div className="overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
            <div className="grid items-center gap-6 p-7 lg:grid-cols-[1fr_420px]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
                  <Bot className="h-4 w-4" />
                  AI Placement Analysis
                </span>

                <h1 className="mt-5 text-3xl font-black text-slate-950 sm:text-4xl">
                  {data.status === "COMPLETED"
                    ? "Phân tích đã hoàn tất!"
                    : "AI đang phân tích bài làm của bạn..."}
                </h1>

                <p className="mt-3 max-w-xl leading-7 text-slate-600">
                  AI đang đánh giá 6 kỹ năng tiếng Anh và xây dựng lộ trình học
                  cá nhân hóa phù hợp nhất.
                </p>

                <div className="mt-7 flex flex-wrap items-end gap-8">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <Clock3 className="h-4 w-4" />
                      Thời gian còn lại ước tính
                    </p>
                    <p className="mt-2 text-4xl font-black tabular-nums text-violet-700">
                      {formatDuration(data.estimatedRemainingSeconds)}
                    </p>
                  </div>

                  <div className="min-w-[230px] flex-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-500">
                        Tiến trình tổng thể
                      </span>
                      <span className="text-violet-700">{data.progress}%</span>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-violet-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-700 to-fuchsia-500 transition-all duration-500"
                        style={{ width: `${data.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative mx-auto h-[300px] w-full max-w-[420px]">
                <Image
                  src="/images/placement/poppy-processing.png"
                  alt="Poppy đang xử lý bài làm"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          <StepCards steps={data.steps} />

          <div className="grid gap-5 lg:grid-cols-2">
            <SkillPanel skills={data.skills} />

            <div className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-[0_14px_45px_rgba(76,29,149,0.07)]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h2 className="text-xl font-black text-slate-950">
                  AI Insight
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                {data.insights.length ? (
                  data.insights.slice(-6).map((insight, index) => (
                    <div
                      key={`${insight}-${index}`}
                      className="flex gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-4"
                    >
                      <Bot className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                      <p className="text-sm leading-6 text-slate-700">
                        {insight}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                    Insight sẽ xuất hiện sau khi AI hoàn thành một kỹ năng.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 text-violet-600" />
            Dữ liệu bài làm được bảo mật trong suốt quá trình xử lý.
          </div>
        </section>

        <LogPanel
          logs={data.logs}
          connecting={connecting}
          failed={data.status === "FAILED"}
        />
      </div>
    </main>
  );
}

function Timeline({
  activeStepIndex,
  status,
}: {
  activeStepIndex: number;
  status: PlacementProcessingSnapshot["status"];
}) {
  const items = [
    "Hoàn thành bài kiểm tra",
    "AI đang phân tích",
    "Xác định trình độ",
    "Tạo lộ trình học",
    "Hoàn tất",
  ];

  return (
    <aside className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-[0_14px_45px_rgba(76,29,149,0.07)]">
      <h2 className="text-xl font-black text-slate-950">
        Tiến trình bài kiểm tra
      </h2>

      <div className="mt-7">
        {items.map((title, index) => {
          const step = index + 1;
          const completed = status === "COMPLETED" || step < activeStepIndex;
          const active = status !== "COMPLETED" && step === activeStepIndex;

          return (
            <div key={title} className="relative flex gap-4 pb-8">
              {index < items.length - 1 ? (
                <div className="absolute left-[17px] top-9 h-full border-l-2 border-dashed border-violet-100" />
              ) : null}

              <div
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black ${
                  completed
                    ? "bg-violet-600 text-white"
                    : active
                      ? "bg-violet-600 text-white ring-8 ring-violet-100"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {completed ? <Check className="h-5 w-5" /> : step}
              </div>

              <div
                className={active ? "rounded-2xl bg-violet-50 px-3 py-1" : ""}
              >
                <p
                  className={
                    active
                      ? "font-black text-violet-700"
                      : "font-black text-slate-900"
                  }
                >
                  {title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {completed
                    ? "Hoàn thành"
                    : active
                      ? "Đang xử lý..."
                      : "Chờ xử lý"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function StepCards({ steps }: { steps: PlacementProcessingSnapshot["steps"] }) {
  const icons = {
    ANSWER_ANALYSIS: FileSearch,
    SKILL_EVALUATION: BarChart3,
    LEARNING_PATH: Target,
    QUALITY_CHECK: ShieldCheck,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step) => {
        const Icon = icons[step.key];

        return (
          <div
            key={step.key}
            className="rounded-3xl border border-violet-100 bg-white p-5 shadow-[0_12px_35px_rgba(76,29,149,0.06)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Icon className="h-6 w-6" />
              </div>
              <StatusIcon status={step.status} />
            </div>

            <h3 className="mt-4 font-black text-slate-950">{step.title}</h3>

            <p className="mt-1 text-sm text-slate-500">
              {statusLabel(step.status)}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-500"
                  style={{ width: `${step.progress}%` }}
                />
              </div>
              <span className="text-xs font-black text-slate-600">
                {step.progress}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkillPanel({
  skills,
}: {
  skills: PlacementProcessingSnapshot["skills"];
}) {
  const meta = {
    VOCABULARY: { label: "Vocabulary", icon: Type },
    GRAMMAR: { label: "Grammar", icon: BookOpen },
    READING: { label: "Reading", icon: BookOpen },
    LISTENING: { label: "Listening", icon: Headphones },
    SPEAKING: { label: "Speaking", icon: Mic2 },
    WRITING: { label: "Writing", icon: PencilLine },
  };

  return (
    <div className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-[0_14px_45px_rgba(76,29,149,0.07)]">
      <h2 className="text-xl font-black text-slate-950">
        Tiến độ phân tích 6 kỹ năng
      </h2>

      <div className="mt-6 space-y-5">
        {skills.map((item) => {
          const skill = meta[item.skill];
          const Icon = skill.icon;

          return (
            <div
              key={item.skill}
              className="grid items-center gap-3 sm:grid-cols-[130px_minmax(0,1fr)_80px]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-bold text-slate-800">{skill.label}</span>
              </div>

              <div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-600 transition-all duration-500"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {item.message ?? statusLabel(item.status)}
                </p>
              </div>

              <div className="text-right">
                {item.level ? (
                  <span className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-black text-violet-700">
                    {item.level}
                  </span>
                ) : item.status === "SKIPPED" ? (
                  <span className="text-xs font-bold text-slate-400">
                    Chưa đánh giá
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500">
                    {item.progress}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
    <aside className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-[0_14px_45px_rgba(76,29,149,0.07)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-950">Nhật ký AI</h2>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            failed
              ? "bg-red-50 text-red-600"
              : connecting
                ? "bg-amber-50 text-amber-600"
                : "bg-violet-50 text-violet-700"
          }`}
        >
          {failed ? "FAILED" : connecting ? "CONNECTING" : "LIVE"}
        </span>
      </div>

      <div className="mt-6 space-y-5">
        {logs.length ? (
          logs.map((log) => (
            <div key={log.id} className="flex gap-3">
              <div className="w-14 shrink-0 text-xs text-slate-400">
                {new Date(log.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>

              <StatusIcon status={log.status} />

              <p className="text-sm leading-6 text-slate-700">{log.message}</p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Đang chờ AI bắt đầu xử lý.
          </p>
        )}
      </div>
    </aside>
  );
}

function StatusIcon({ status }: { status: ProcessingItemStatus }) {
  if (status === "COMPLETED") {
    return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />;
  }

  if (status === "PROCESSING") {
    return (
      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-violet-600" />
    );
  }

  if (status === "FAILED") {
    return <RefreshCw className="h-5 w-5 shrink-0 text-red-500" />;
  }

  return <Circle className="h-5 w-5 shrink-0 text-slate-300" />;
}

function statusLabel(status: ProcessingItemStatus) {
  const labels: Record<ProcessingItemStatus, string> = {
    WAITING: "Chờ xử lý",
    PROCESSING: "Đang xử lý",
    COMPLETED: "Hoàn thành",
    SKIPPED: "Chưa đánh giá",
    FAILED: "Xử lý thất bại",
  };

  return labels[status];
}

function formatDuration(seconds: number) {
  const safe = Math.max(seconds, 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

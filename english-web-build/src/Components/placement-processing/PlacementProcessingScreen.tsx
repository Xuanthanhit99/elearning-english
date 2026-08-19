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
  BeaconVieBadge,
  BeaconVieButton,
  BeaconVieCard,
  BeaconVieProgress,
  BeaconVieSectionHeader,
} from "@/src/Components/UI/BeaconVie";

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

const skillLabels: Record<keyof typeof skillIcons, string> = {
  VOCABULARY: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
  LISTENING: "Nghe",
  READING: "Đọc",
  SPEAKING: "Nói",
  WRITING: "Viết",
};

const processingStatusLabels: Record<string, string> = {
  WAITING: "Đang chờ",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
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
      setError(err instanceof Error ? err.message : "Không thể bắt đầu xử lý kết quả.");
    } finally {
      setStarting(false);
    }
  }, [applySnapshot, sessionId]);

  const refreshSnapshot = useCallback(async () => {
    try {
      applySnapshot(await getPlacementProcessing(sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể làm mới trạng thái xử lý.");
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
        <BeaconVieCard className="w-full max-w-lg p-8 text-center">
          <Loader2 aria-hidden className="mx-auto h-10 w-10 animate-spin text-[var(--BeaconVie-primary)]" />
          <h1 className="mt-5 text-2xl font-black text-[var(--BeaconVie-ink)]">
            Đang bắt đầu phân tích
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
            BeaconVie đang chuẩn bị phân tích kết quả bài kiểm tra của bạn.
          </p>
          {error ? (
            <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
        </BeaconVieCard>
      </main>
    );
  }

  const failed = data.status === "FAILED";
  const completed = data.status === "COMPLETED";

  return (
    <main className="min-h-screen px-3 py-5 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <BeaconVieCard className="p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section>
              <BeaconVieBadge>{processingStatusLabels[data.status] ?? data.status}</BeaconVieBadge>
              <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-[var(--BeaconVie-ink)] sm:text-5xl">
                {failed
                  ? "Cần thử lại việc phân tích"
                  : completed
                    ? "Đã phân tích xong"
                    : "BeaconVie đang phân tích kết quả của bạn"}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--BeaconVie-muted)]">
                Chỉ mất một chút thời gian để tính điểm từng kỹ năng và chuẩn bị
                lộ trình phù hợp với bạn.
              </p>

              <div className="mt-7">
                <div className="flex items-center justify-between text-sm font-black text-[var(--BeaconVie-muted)]">
                  <span>Tiến độ chung</span>
                  <span>{data.progress}%</span>
                </div>
                <BeaconVieProgress value={data.progress} className="mt-2 h-4" />
              </div>

              {error ? (
                <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600" role="alert">
                  {error}
                </p>
              ) : null}
            </section>

            <BeaconVieCard className="border-slate-100 bg-white/70 p-5">
              <ConnectionStatus connecting={connecting} failed={failed} />
              <div className="mt-5 space-y-4">
                <Fact icon={Clock3} label="Thời gian còn lại (ước tính)" value={formatDuration(data.estimatedRemainingSeconds)} />
                <Fact icon={activeStep ? stepIcons[activeStep.key] : Circle} label="Bước hiện tại" value={activeStep?.title ?? "Đang chờ"} />
              </div>
              {failed ? (
                <BeaconVieButton
                  className="mt-6 w-full"
                  loading={starting}
                  onClick={() => void initializeProcessing()}
                >
                  Thử lại
                  <RefreshCw aria-hidden className="h-4 w-4" />
                </BeaconVieButton>
              ) : completed && data.nextUrl ? (
                <BeaconVieButton className="mt-6 w-full" onClick={() => router.replace(data.nextUrl as string)}>
                  Xem kết quả
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </BeaconVieButton>
              ) : null}
            </BeaconVieCard>
          </div>
        </BeaconVieCard>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <BeaconVieCard className="p-6">
            <BeaconVieSectionHeader
              eyebrow="Các bước"
              title="Quá trình xử lý"
              description="BeaconVie đang thực hiện lần lượt các bước dưới đây."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {data.steps.map((step) => (
                <StepCard key={step.key} step={step} />
              ))}
            </div>
          </BeaconVieCard>

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
        <p className="font-black text-[var(--BeaconVie-ink)]">
          {failed ? "Thất bại" : connecting ? "Đang kết nối" : "Đang cập nhật trực tiếp"}
        </p>
        <p className="text-xs font-bold text-[var(--BeaconVie-muted)]">
          Kết quả sẽ tự động cập nhật
        </p>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--BeaconVie-border)] bg-white/75 p-4">
      <Icon aria-hidden className="h-5 w-5 text-[var(--BeaconVie-primary)]" />
      <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
        {label}
      </p>
      <p className="mt-1 font-black text-[var(--BeaconVie-ink)]">{value}</p>
    </div>
  );
}

function StepCard({ step }: { step: PlacementProcessingSnapshot["steps"][number] }) {
  const Icon = stepIcons[step.key];
  return (
    <article className="rounded-3xl border border-[var(--BeaconVie-border)] bg-white/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--BeaconVie-primary)]">
          <Icon aria-hidden className="h-6 w-6" />
        </span>
        <StatusIcon status={step.status} />
      </div>
      <h3 className="mt-4 font-black text-[var(--BeaconVie-ink)]">{step.title}</h3>
      <p className="mt-1 text-sm font-bold text-[var(--BeaconVie-muted)]">
        {statusLabel(step.status)}
      </p>
      <div className="mt-5">
        <BeaconVieProgress value={step.progress} />
      </div>
    </article>
  );
}

function SkillPanel({ skills }: { skills: PlacementProcessingSnapshot["skills"] }) {
  return (
    <BeaconVieCard className="p-6">
      <BeaconVieSectionHeader
        eyebrow="Kỹ năng"
        title="Đánh giá kỹ năng"
        description="Điểm, mức trình độ và nhận xét cho từng kỹ năng."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {skills.map((item) => {
          const Icon = skillIcons[item.skill];
          return (
            <div key={item.skill} className="rounded-2xl border border-[var(--BeaconVie-border)] bg-white/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[var(--BeaconVie-primary)]">
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-black text-[var(--BeaconVie-ink)]">{skillLabels[item.skill]}</p>
                    <p className="text-xs font-bold text-[var(--BeaconVie-muted)]">
                      {item.level ?? statusLabel(item.status)}
                    </p>
                  </div>
                </div>
                <StatusIcon status={item.status} />
              </div>
              <BeaconVieProgress value={item.progress} className="mt-4" />
              {item.message ? (
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                  {item.message}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </BeaconVieCard>
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
    <BeaconVieCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">Nhật ký xử lý</h2>
        <span className={[
          "rounded-full px-3 py-1 text-xs font-black",
          failed ? "bg-rose-50 text-rose-600" : connecting ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-700",
        ].join(" ")}>
          {failed ? "THẤT BẠI" : connecting ? "ĐANG KẾT NỐI" : "TRỰC TIẾP"}
        </span>
      </div>
      <div className="mt-5 max-h-[520px] space-y-4 overflow-auto pr-1">
        {logs.length ? (
          logs.map((log) => (
            <div key={log.id} className="grid grid-cols-[70px_24px_minmax(0,1fr)] gap-3">
              <span className="text-xs font-bold text-[var(--BeaconVie-muted)]">
                {new Date(log.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <StatusIcon status={log.status} />
              <p className="text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                {log.message}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-[var(--BeaconVie-muted)]">
            Đang chờ nhật ký xử lý...
          </p>
        )}
      </div>
    </BeaconVieCard>
  );
}

function InsightPanel({ insights }: { insights: string[] }) {
  return (
    <BeaconVieCard className="p-5">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">Nhận xét</h2>
      <div className="mt-4 space-y-3">
        {insights.length ? (
          insights.slice(-5).map((insight, index) => (
            <p key={`${insight}-${index}`} className="rounded-2xl bg-blue-50/55 p-4 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              {insight}
            </p>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-[var(--BeaconVie-muted)]">
            Nhận xét sẽ xuất hiện tại đây khi có.
          </p>
        )}
      </div>
    </BeaconVieCard>
  );
}

function StatusIcon({ status }: { status: ProcessingItemStatus }) {
  if (status === "COMPLETED") return <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-500" />;
  if (status === "PROCESSING") return <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-[var(--BeaconVie-primary)]" />;
  if (status === "FAILED") return <AlertCircle aria-hidden className="h-5 w-5 shrink-0 text-rose-500" />;
  if (status === "SKIPPED") return <Circle aria-hidden className="h-5 w-5 shrink-0 text-amber-500" />;
  return <Circle aria-hidden className="h-5 w-5 shrink-0 text-slate-300" />;
}

function statusLabel(status: ProcessingItemStatus) {
  const labels: Record<ProcessingItemStatus, string> = {
    WAITING: "Đang chờ",
    PROCESSING: "Đang xử lý",
    COMPLETED: "Hoàn tất",
    SKIPPED: "Đã bỏ qua",
    FAILED: "Thất bại",
  };
  return labels[status];
}

function formatDuration(seconds: number) {
  const safe = Math.max(seconds, 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

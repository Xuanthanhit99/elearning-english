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
import { trackEvent } from "@/src/lib/ga";
import {
  BeaconVieBadge,
  BeaconVieButton,
  BeaconVieCard,
  BeaconVieSkeleton,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";

const readinessChecklist = [
  { icon: Wifi, text: "Kết nối internet ổn định" },
  { icon: Headphones, text: "Tai nghe cho phần Nghe" },
  { icon: Mic2, text: "Micro sẵn sàng cho phần Nói" },
  { icon: VolumeX, text: "Không gian yên tĩnh, không bị làm phiền" },
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
  VOCABULARY: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
  LISTENING: "Luyện nghe",
  READING: "Luyện đọc",
  SPEAKING: "Luyện nói",
  WRITING: "Luyện viết",
};

const stepLabels: Record<PlacementStepKey, string> = {
  INTRODUCTION: "Giới thiệu",
  VOCABULARY: skillLabels.VOCABULARY,
  GRAMMAR: skillLabels.GRAMMAR,
  LISTENING: skillLabels.LISTENING,
  READING: skillLabels.READING,
  SPEAKING: skillLabels.SPEAKING,
  WRITING: skillLabels.WRITING,
  RESULT: "Kết quả",
};

const modeLabels: Record<string, string> = {
  LEVEL_BASED: "Theo trình độ",
  ADAPTIVE: "Thích ứng",
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
          : "Không thể tải phần chuẩn bị kiểm tra trình độ.",
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
      trackEvent("placement_test_start", {
        resumed: data?.test.hasActiveSession ?? false,
      });
      router.push(result.nextUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể bắt đầu bài kiểm tra.",
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
        <span className="sr-only">Đang tải phần chuẩn bị kiểm tra trình độ...</span>
        <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <BeaconVieSkeleton className="h-[680px]" />
          <BeaconVieSkeleton className="h-[680px]" />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <BeaconVieState
        title="Không thể mở phần chuẩn bị"
        description={error}
        actionLabel="Thử lại"
        tone="error"
        onAction={() => void loadIntroduction()}
      />
    );
  }

  return (
    <main className="min-h-screen px-3 py-5 sm:px-4 lg:px-6">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <BeaconVieCard className="p-5">
          <BeaconVieBadge>Danh sách chuẩn bị</BeaconVieBadge>
          <h2 className="mt-4 text-xl font-black text-[var(--BeaconVie-ink)]">
            Các bước kiểm tra
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
                          ? "bg-blue-100 text-[var(--BeaconVie-primary)]"
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
                    <p className="font-black text-[var(--BeaconVie-ink)]">
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                      {step.subtitle}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </BeaconVieCard>

        <section className="space-y-5">
          <BeaconVieCard className="p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <BeaconVieBadge>Chế độ {modeLabels[data.test.mode] ?? data.test.mode}</BeaconVieBadge>
                <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-[var(--BeaconVie-ink)] sm:text-5xl">
                  {data.content.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--BeaconVie-muted)]">
                  {data.content.description}
                </p>

                <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/55 p-5">
                  <div className="flex gap-4">
                    <Target aria-hidden className="h-8 w-8 shrink-0 text-[var(--BeaconVie-primary)]" />
                    <div>
                      <h2 className="font-black text-[var(--BeaconVie-ink)]">
                        {data.content.adaptive.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                        {data.content.adaptive.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <BeaconVieCard className="border-slate-100 bg-white/75 p-5">
                <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">
                  Cần chuẩn bị gì
                </h2>
                <ul className="mt-4 space-y-3">
                  {readinessChecklist.map((item) => (
                    <li key={item.text} className="flex items-center gap-3 rounded-2xl bg-white/75 p-3">
                      <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-600" />
                      <span className="text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <h2 className="mt-6 text-lg font-black text-[var(--BeaconVie-ink)]">
                  Trước khi bắt đầu
                </h2>
                <div className="mt-4 space-y-3">
                  <PrepItem icon={Mic2} text="BeaconVie chỉ xin quyền dùng micro khi bạn vào phần Nói." />
                  <PrepItem icon={Clock3} text={`Thời gian dự kiến: khoảng ${data.content.estimatedMinutes} phút.`} />
                  <PrepItem icon={SkipForward} text="Bạn có thể bỏ qua một câu và quay lại sau." />
                  <PrepItem icon={Flag} text="Đánh dấu câu hỏi để xem lại trước khi nộp bài." />
                  <PrepItem icon={ShieldCheck} text={data.content.autosaveMessage} />
                </div>
              </BeaconVieCard>
            </div>
          </BeaconVieCard>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <BeaconVieCard className="p-6">
              <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
                Kỹ năng trong bài kiểm tra
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.content.skills.map((skill) => {
                  const Icon = stepIcons[skill];
                  return (
                    <div
                      key={skill}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--BeaconVie-border)] bg-white/70 p-4"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--BeaconVie-primary)]">
                        <Icon aria-hidden className="h-5 w-5" />
                      </span>
                      <span className="font-black text-[var(--BeaconVie-ink)]">
                        {skillLabels[skill] ?? skill}
                      </span>
                    </div>
                  );
                })}
              </div>
            </BeaconVieCard>

            <BeaconVieCard className="p-6">
              <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
                Tình trạng bài làm
              </h2>
              {data.test.hasActiveSession ? (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                  <RotateCcw aria-hidden className="h-6 w-6 text-amber-600" />
                  <p className="mt-3 font-black text-[var(--BeaconVie-ink)]">
                    Bạn có bài làm dở
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                    Đã trả lời {data.test.answeredQuestions} câu. Đang ở phần{" "}
                    {stepLabels[data.test.currentStep] ?? data.test.currentStep}.
                  </p>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${answeredPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                  Bạn chưa bắt đầu. Bài làm sẽ được tạo khi bạn bấm nút bắt đầu
                  bên dưới.
                </p>
              )}

              {error ? (
                <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col gap-3">
                <BeaconVieButton
                  loading={starting}
                  onClick={() => void handleStart()}
                  className="w-full"
                >
                  {data.test.hasActiveSession ? "Tiếp tục bài kiểm tra" : "Bắt đầu bài kiểm tra"}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </BeaconVieButton>
                <BeaconVieButton
                  tone="ghost"
                  disabled={starting}
                  onClick={() => router.push("/placement")}
                  className="w-full"
                >
                  <ArrowLeft aria-hidden className="h-4 w-4" />
                  Quay lại
                </BeaconVieButton>
              </div>
            </BeaconVieCard>
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
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[var(--BeaconVie-primary)]" />
      <p className="text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
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

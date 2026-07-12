"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  XCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";
import {
  ApiEnvelope,
  ReadingResultResponse,
  ReadingSubmitResult,
} from "./reading-v2.types";
import {
  missionStatusText,
  useReadingMissions,
} from "./use-reading-missions";

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  return typeof value === "object" &&
    value !== null &&
    "data" in value
    ? (value as ApiEnvelope<T>).data
    : (value as T);
}

export default function ReadingResultPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();

  const [data, setData] =
    useState<ReadingResultResponse | null>(null);
  const [submitMeta, setSubmitMeta] =
    useState<ReadingSubmitResult | null>(null);
  const [showAllQuestions, setShowAllQuestions] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { dailyMission, weeklyMission, reload } =
    useReadingMissions();

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<
        ReadingResultResponse | ApiEnvelope<ReadingResultResponse>
      >(`/reading/sessions/${params.sessionId}/result`);

      setData(unwrap(response.data));

      const cached = sessionStorage.getItem(
        `reading-submit:${params.sessionId}`,
      );

      if (cached) {
        setSubmitMeta(
          JSON.parse(cached) as ReadingSubmitResult,
        );
        sessionStorage.removeItem(
          `reading-submit:${params.sessionId}`,
        );
      }

      await reload();
    } catch {
      setError("Không tải được kết quả bài đọc.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sessionId]);

  const stars = useMemo(() => {
    const score = data?.summary.score ?? 0;

    if (score >= 90) return 5;
    if (score >= 80) return 4;
    if (score >= 65) return 3;
    if (score >= 50) return 2;
    return 1;
  }, [data?.summary.score]);

  if (loading) {
    return <State text="Đang tải kết quả..." />;
  }

  if (error || !data) {
    return <State text={error || "Không có kết quả."} action={load} />;
  }

  const { summary } = data;
  const visibleQuestions = showAllQuestions
    ? data.questions
    : data.questions.slice(0, 5);
  const nextArticle = data.suggestions[0] ?? null;

  return (
    <main className="min-h-screen bg-[#fbfbff] px-5 py-7 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-[1450px]">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-8 text-white shadow-xl shadow-violet-200">
          <div className="grid gap-7 md:grid-cols-[1fr_300px] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                <Trophy size={16} />
                KẾT QUẢ READING
              </div>

              <h1 className="mt-4 text-3xl font-black md:text-4xl">
                {summary.articleTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-white/75">
                {summary.passedText}
              </p>

              <div className="mt-5 flex gap-1">
                {Array.from({ length: 5 }, (_, index) => (
                  <span
                    key={index}
                    className={`text-2xl ${
                      index < stars
                        ? "text-yellow-300"
                        : "text-white/25"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/10 p-6 text-center backdrop-blur">
              <p className="text-sm font-bold text-white/70">
                Điểm số
              </p>
              <p className="mt-1 text-6xl font-black">
                {summary.score}
              </p>
              <p className="mt-2 text-sm font-bold">
                {summary.correctAnswers}/{summary.totalQuestions} câu đúng
              </p>
              <p className="mt-3 text-lg font-black text-yellow-300">
                +{summary.xpReward} XP
              </p>
            </div>
          </div>
        </section>

        {submitMeta?.missionUpdated && (
          <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <CheckCircle2 size={25} />
              </div>
              <div>
                <h2 className="text-lg font-black text-emerald-800">
                  Nhiệm vụ Reading đã được cập nhật
                </h2>
                <p className="mt-1 text-sm text-emerald-700">
                  Bài đọc, quiz và thời gian học đã được ghi nhận.
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 space-y-7">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                title={`${summary.accuracy}%`}
                label="Độ chính xác"
                icon={<Target size={22} />}
              />
              <Stat
                title={summary.spentTimeText}
                label="Thời gian"
                icon={<Sparkles size={22} />}
              />
              <Stat
                title={String(summary.correctAnswers)}
                label="Câu đúng"
                icon={<CheckCircle2 size={22} />}
              />
              <Stat
                title={String(summary.wrongAnswers)}
                label="Câu sai"
                icon={<XCircle size={22} />}
              />
            </section>

            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">
                Hiệu suất theo kỹ năng
              </h2>

              <div className="mt-6 space-y-5">
                {data.skillPerformance.map((item) => (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between text-sm font-bold">
                      <span>{item.name}</span>
                      <span>{item.score}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-violet-600"
                        style={{
                          width: `${Math.min(item.score, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">
                  Xem lại câu hỏi
                </h2>
                <span className="text-sm font-bold text-slate-500">
                  {summary.correctAnswers}/{summary.totalQuestions} đúng
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {visibleQuestions.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-5 ${
                      item.isCorrect
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {item.isCorrect ? (
                        <CheckCircle2
                          className="mt-0.5 shrink-0 text-emerald-600"
                          size={20}
                        />
                      ) : (
                        <XCircle
                          className="mt-0.5 shrink-0 text-red-600"
                          size={20}
                        />
                      )}

                      <div>
                        <h3 className="font-black">
                          {item.index}. {item.question}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                          Bạn chọn:{" "}
                          <strong>{item.selected ?? "Chưa trả lời"}</strong>
                        </p>
                        {!item.isCorrect && (
                          <p className="mt-1 text-sm text-emerald-700">
                            Đáp án đúng:{" "}
                            <strong>{item.correctAnswer}</strong>
                          </p>
                        )}
                        {item.explanation && (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {item.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {data.questions.length > 5 && (
                <button
                  onClick={() =>
                    setShowAllQuestions((value) => !value)
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-3 font-bold text-violet-600"
                >
                  {showAllQuestions ? "Thu gọn" : "Xem tất cả"}
                  <ChevronDown
                    size={17}
                    className={
                      showAllQuestions ? "rotate-180" : ""
                    }
                  />
                </button>
              )}
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <article className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">
                  Từ vựng mới
                </h2>
                <div className="mt-5 space-y-4">
                  {data.vocabulary.slice(0, 6).map((word) => (
                    <div
                      key={word.id}
                      className="flex items-center gap-4"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                        <BookOpen size={18} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black">
                          {word.word}
                          {word.partOfSpeech && (
                            <span className="ml-2 text-sm font-medium text-slate-400">
                              ({word.partOfSpeech})
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {word.meaning}
                        </p>
                      </div>
                      <Volume2 size={17} className="text-violet-600" />
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Brain className="text-violet-600" />
                  <h2 className="text-xl font-black">
                    AI gợi ý cải thiện
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  {data.improvementSkills.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <h3 className="font-black">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </section>

          <aside className="space-y-6">
            <MissionSummary
              title="Nhiệm vụ hôm nay"
              mission={dailyMission}
            />
            <MissionSummary
              title="Mục tiêu tuần"
              mission={weeklyMission}
            />

            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black">
                Tiếp tục Learning Path
              </h2>

              {nextArticle ? (
                <>
                  <h3 className="mt-4 font-black">
                    {nextArticle.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {nextArticle.categoryName} ·{" "}
                    {nextArticle.difficultyText}
                  </p>
                  <button
                    onClick={() =>
                      router.push(
                        `/reading/articles/${nextArticle.slug}`,
                      )
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 font-black text-white"
                  >
                    Học bài tiếp theo
                    <ArrowRight size={17} />
                  </button>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Chưa có bài đọc tiếp theo.
                </p>
              )}
            </section>

            <button
              onClick={() =>
                router.push(
                  `/reading/articles/${summary.articleSlug}`,
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white py-3 font-black text-violet-600"
            >
              <RotateCcw size={17} />
              Ôn lại bài đọc
            </button>

            <button
              onClick={() => router.push("/reading")}
              className="w-full rounded-xl bg-slate-900 py-3 font-black text-white"
            >
              Về Reading Home
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Stat({
  title,
  label,
  icon,
}: {
  title: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
        {icon}
      </div>
      <p className="mt-4 text-2xl font-black">{title}</p>
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>
    </article>
  );
}

function MissionSummary({
  title,
  mission,
}: {
  title: string;
  mission: ReturnType<typeof useReadingMissions>["dailyMission"];
}) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black">{title}</h2>

      {mission ? (
        <>
          <h3 className="mt-4 font-black">{mission.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {mission.description}
          </p>
          <div className="mt-5 h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-emerald-500"
              style={{
                width: `${Math.min(
                  mission.progressPercent,
                  100,
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm font-bold">
            {missionStatusText(mission)}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Chưa có nhiệm vụ Reading.
        </p>
      )}
    </section>
  );
}

function State({
  text,
  action,
}: {
  text: string;
  action?: () => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
      <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
        <p className="font-bold">{text}</p>
        {action && (
          <button
            onClick={action}
            className="mt-4 rounded-xl bg-violet-600 px-5 py-2 font-bold text-white"
          >
            Tải lại
          </button>
        )}
      </div>
    </div>
  );
}

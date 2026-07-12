"use client";

import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Target,
  Volume2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";
import {
  ApiEnvelope,
  ReadingLessonResponse,
  ReadingSubmitResult,
} from "./reading-v2.types";
import { useReadingMissions } from "./use-reading-missions";

const fallbackImage =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop";

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  return typeof value === "object" &&
    value !== null &&
    "data" in value
    ? (value as ApiEnvelope<T>).data
    : (value as T);
}

function errorText(error: unknown, fallback: string) {
  const value = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = value.response?.data?.message;

  if (Array.isArray(message)) return message.join(", ");

  return message ?? value.message ?? fallback;
}

export default function ReadingLessonPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const startedAtRef = useRef(Date.now());

  const [data, setData] =
    useState<ReadingLessonResponse | null>(null);
  const [sessionId, setSessionId] =
    useState<string | null>(null);
  const [answers, setAnswers] =
    useState<Record<string, string>>({});
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [answeringId, setAnsweringId] =
    useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completion, setCompletion] =
    useState<ReadingSubmitResult | null>(null);

  const { missionForArticle } = useReadingMissions();

  async function loadLesson() {
    try {
      setLoading(true);
      setError("");
      setCompletion(null);
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);

      const response = await api.get<
        ReadingLessonResponse | ApiEnvelope<ReadingLessonResponse>
      >(`/reading/articles/${params.slug}`);

      const payload = unwrap(response.data);
      const selected: Record<string, string> = {};

      payload.questions.forEach((question) => {
        if (question.selected) {
          selected[question.id] = question.selected;
        }
      });

      if (payload.session?.isCompleted) {
        router.replace(
          `/reading/sessions/${payload.session.id}/result`,
        );
        return;
      }

      setAnswers(selected);
      setData(payload);

      if (payload.session?.id) {
        setSessionId(payload.session.id);
        return;
      }

      const startResponse = await api.post(
        `/reading/articles/${payload.article.id}/start`,
      );
      const startPayload = unwrap<{
        sessionId: string;
        articleId: string;
        startedAt: string;
      }>(startResponse.data);

      setSessionId(startPayload.sessionId);
      startedAtRef.current = new Date(
        startPayload.startedAt,
      ).getTime();

      setData({
        ...payload,
        session: {
          id: startPayload.sessionId,
          isCompleted: false,
          score: 0,
          accuracy: 0,
          answeredCount: 0,
          totalQuestions: payload.questions.length,
          progressPercent: 0,
        },
      });
    } catch (requestError) {
      setError(
        errorText(
          requestError,
          "Không tải được bài đọc.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor(
            (Date.now() - startedAtRef.current) / 1000,
          ),
        ),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const totalQuestions = data?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    totalQuestions > 0
      ? Math.round((answeredCount / totalQuestions) * 100)
      : 0;

  const mission = data
    ? missionForArticle(data.article.id)
    : null;

  const paragraphs = useMemo(() => {
    return (data?.article.content ?? "")
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [data?.article.content]);

  async function selectAnswer(
    questionId: string,
    option: string,
  ) {
    if (
      !sessionId ||
      submitting ||
      completion ||
      data?.session?.isCompleted
    ) {
      return;
    }

    const previous = answers[questionId];

    setAnswers((current) => ({
      ...current,
      [questionId]: option,
    }));

    try {
      setAnsweringId(questionId);
      setError("");

      await api.post(
        `/reading/sessions/${sessionId}/answer`,
        {
          questionId,
          selected: option,
        },
      );
    } catch (requestError) {
      setAnswers((current) => {
        const next = { ...current };

        if (previous) {
          next[questionId] = previous;
        } else {
          delete next[questionId];
        }

        return next;
      });

      setError(
        errorText(
          requestError,
          "Không lưu được câu trả lời.",
        ),
      );
    } finally {
      setAnsweringId(null);
    }
  }

  async function submit() {
    if (!sessionId || submitting) return;

    if (answeredCount < totalQuestions) {
      setError(
        `Bạn còn ${totalQuestions - answeredCount} câu chưa trả lời.`,
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await api.post<
        ReadingSubmitResult | ApiEnvelope<ReadingSubmitResult>
      >(`/reading/sessions/${sessionId}/submit`);

      const payload = unwrap(response.data);

      setCompletion(payload);

      sessionStorage.setItem(
        `reading-submit:${payload.sessionId}`,
        JSON.stringify(payload),
      );

      /*
       * Cho người dùng nhìn thấy popup cập nhật Mission/XP
       * trước khi chuyển trang kết quả.
       */
      window.setTimeout(() => {
        router.replace(payload.resultUrl);
      }, payload.missionUpdated ? 1100 : 300);
    } catch (requestError) {
      setError(
        errorText(
          requestError,
          "Không thể nộp bài.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <State text="Đang tải bài đọc..." />;
  }

  if (error && !data) {
    return <State text={error} action={loadLesson} />;
  }

  if (!data) return null;

  const currentQuestion =
    data.questions[
      Math.min(
        Math.max(activeQuestion - 1, 0),
        Math.max(data.questions.length - 1, 0),
      )
    ];

  return (
    <main className="min-h-screen bg-[#fbfbff] px-5 py-6 text-slate-900 lg:px-10">
      <header className="mx-auto flex max-w-[1500px] flex-col gap-4 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <button
          onClick={() =>
            router.push(
              `/reading/categories/${data.article.categorySlug}`,
            )
          }
          className="inline-flex items-center gap-2 font-bold text-violet-600"
        >
          <ChevronLeft size={18} />
          Quay lại chủ đề
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <Info icon={<Clock size={16} />} text={formatTime(elapsedSeconds)} />
          <Info
            icon={<FileText size={16} />}
            text={data.article.wordCountText}
          />
          <Info
            icon={<Target size={16} />}
            text={`${progressPercent}% câu hỏi`}
          />
        </div>
      </header>

      <div className="mx-auto mt-7 grid max-w-[1500px] gap-7 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="min-w-0 space-y-6">
          <article className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
            <img
              src={data.article.thumbnail || fallbackImage}
              alt={data.article.title}
              className="h-64 w-full object-cover"
            />

            <div className="p-7">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                  {data.article.categoryName}
                </span>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
                  {data.article.difficultyText}
                </span>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                  +{data.article.xpReward} XP tối đa
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black">
                {data.article.title}
              </h1>

              {data.article.description && (
                <p className="mt-3 leading-7 text-slate-500">
                  {data.article.description}
                </p>
              )}

              <div className="mt-7 space-y-5 text-[17px] leading-9 text-slate-700">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </article>

          {!!data.vocabulary.length && (
            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">
                Từ vựng trong bài
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {data.vocabulary.map((word) => (
                  <article
                    key={word.id}
                    className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4"
                  >
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"
                    >
                      <Volume2 size={18} />
                    </button>
                    <div>
                      <h3 className="font-black">
                        {word.word}
                        {word.partOfSpeech && (
                          <span className="ml-2 text-sm font-medium text-slate-400">
                            ({word.partOfSpeech})
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {word.meaning}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="space-y-6">
          {mission && (
            <section className="rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-600 p-6 text-white shadow-lg">
              <p className="text-xs font-black text-white/70">
                NHIỆM VỤ LIÊN QUAN
              </p>
              <h2 className="mt-2 text-xl font-black">
                {mission.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/75">
                {mission.description}
              </p>
              <div className="mt-5 h-3 rounded-full bg-white/20">
                <div
                  className="h-3 rounded-full bg-emerald-400"
                  style={{
                    width: `${Math.min(
                      mission.progressPercent,
                      100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm font-bold">
                {mission.progress}/{mission.target} · +
                {mission.reward.xp} XP
              </p>
            </section>
          )}

          <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">
                Câu hỏi đọc hiểu
              </h2>
              <span className="text-sm font-bold text-violet-600">
                {answeredCount}/{totalQuestions}
              </span>
            </div>

            <div className="mt-5 h-3 rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full bg-violet-600"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {currentQuestion ? (
              <div className="mt-6">
                <div className="mb-4 flex items-start gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-600 text-sm font-black text-white">
                    {currentQuestion.index}
                  </div>
                  <h3 className="font-black leading-7">
                    {currentQuestion.question}
                  </h3>
                </div>

                <div className="space-y-3">
                  {currentQuestion.options.map((option) => {
                    const selected =
                      answers[currentQuestion.id] === option;
                    const disabled =
                      submitting ||
                      Boolean(completion) ||
                      answeringId === currentQuestion.id;

                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          selectAnswer(currentQuestion.id, option)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                          selected
                            ? "border-violet-400 bg-violet-50 text-violet-700"
                            : "border-slate-200 hover:border-violet-300"
                        }`}
                      >
                        <span
                          className={`grid h-5 w-5 place-items-center rounded-full border ${
                            selected
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {selected && (
                            <CheckCircle2 size={13} />
                          )}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={activeQuestion <= 1}
                    onClick={() =>
                      setActiveQuestion((value) =>
                        Math.max(1, value - 1),
                      )
                    }
                    className="rounded-xl border px-4 py-3 font-bold disabled:opacity-40"
                  >
                    Câu trước
                  </button>

                  {activeQuestion < totalQuestions ? (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveQuestion((value) =>
                          Math.min(totalQuestions, value + 1),
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-bold text-white"
                    >
                      Câu tiếp theo
                      <ChevronRight size={17} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        submitting ||
                        answeredCount < totalQuestions ||
                        Boolean(completion)
                      }
                      onClick={submit}
                      className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting
                        ? "Đang nộp..."
                        : "Nộp bài"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">
                Bài đọc chưa có câu hỏi.
              </p>
            )}
          </section>

          {data.tip && (
            <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
              <h2 className="font-black text-amber-800">
                {data.tip.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-700">
                {data.tip.content}
              </p>
            </section>
          )}
        </aside>
      </div>

      {error && data && (
        <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg">
          {error}
        </div>
      )}

      {completion && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={34} />
            </div>
            <h2 className="mt-4 text-2xl font-black">
              {completion.alreadyCompleted
                ? "Bài đã được nộp trước đó"
                : "Hoàn thành bài đọc"}
            </h2>
            <p className="mt-2 text-slate-500">
              {completion.score}% · +{completion.earnedXp} XP
            </p>
            {completion.missionUpdated && (
              <div className="mt-4 rounded-2xl bg-violet-50 p-4 font-bold text-violet-700">
                🎯 Nhiệm vụ Reading đã được cập nhật
              </div>
            )}
            <p className="mt-4 text-sm text-slate-400">
              Đang chuyển đến trang kết quả...
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function Info({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">
      {icon}
      {text}
    </span>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remain,
  ).padStart(2, "0")}`;
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

"use client";

import {
  CheckCircle2,
  ChevronDown,
  Headphones,
  RotateCcw,
  Star,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";
import type {
  ApiEnvelope,
  ListeningFinishResult,
  ListeningResultResponse,
} from "./listening.types";
import {
  getApiErrorMessage,
  unwrap,
} from "./listening.helpers";
import { useListeningMissions } from "./useListeningMissions";

export default function ListeningResultPage({
  sessionId,
}: {
  sessionId: string;
}) {
  const router = useRouter();
  const [data, setData] =
    useState<ListeningResultResponse | null>(null);
  const [finishMeta, setFinishMeta] =
    useState<ListeningFinishResult | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingSent, setRatingSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);
  const [error, setError] = useState("");

  const { dailyMission, weeklyMission, reload } =
    useListeningMissions();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<
        ListeningResultResponse | ApiEnvelope<ListeningResultResponse>
      >(`/listening/sessions/${sessionId}/result`);

      const result = unwrap(response.data);

      setData(result);

      if (result.summary.rating) {
        setRating(result.summary.rating);
        setRatingSent(true);
      }

      const cached = sessionStorage.getItem(
        `listening-finish:${sessionId}`,
      );

      if (cached) {
        setFinishMeta(
          JSON.parse(cached) as ListeningFinishResult,
        );
        sessionStorage.removeItem(
          `listening-finish:${sessionId}`,
        );
      }

      await reload();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không tải được kết quả Listening.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [reload, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function startAction(
    action: "retry" | "continue",
  ) {
    try {
      setActionLoading(true);
      setError("");

      const response = await api.post<any>(
        `/listening/sessions/${sessionId}/${action}`,
      );

      const payload = unwrap<{ sessionId: string }>(
        response.data,
      );

      router.push(
        `/listening/practice/${payload.sessionId}`,
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không tạo được bài Listening tiếp theo.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function submitRating() {
    try {
      setActionLoading(true);
      setError("");

      await api.post(
        `/listening/sessions/${sessionId}/rating`,
        {
          rating,
        },
      );

      setRatingSent(true);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không gửi được đánh giá.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <PageState text="Đang tải kết quả..." />;
  }

  if (error && !data) {
    return <PageState text={error} action={load} />;
  }

  if (!data) return null;

  const visibleQuestions = showAll
    ? data.questions
    : data.questions.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#fbfbff] text-[#101733]">
      <div className="mx-auto min-h-screen max-w-[1920px]">
        <section className="min-w-0 px-0 py-2 sm:py-4 lg:px-2">
          <div className="mx-auto max-w-[1450px]">
            <section className="rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-8 text-white shadow-xl">
              <div className="grid gap-7 md:grid-cols-[1fr_300px] md:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                    <Trophy size={16} />
                    LISTENING RESULT
                  </div>
                  <h1 className="mt-4 text-4xl font-black">
                    {data.summary.topic || "Listening"}
                  </h1>
                  <p className="mt-3 text-white/75">
                    {data.summary.level} ·{" "}
                    {data.summary.totalTimeText}
                  </p>
                </div>

                <div className="rounded-3xl bg-white/10 p-6 text-center">
                  <p className="text-sm font-bold text-white/70">
                    Điểm số
                  </p>
                  <p className="mt-1 text-6xl font-black">
                    {data.summary.score}
                  </p>
                  <p className="mt-3 font-black text-yellow-300">
                    +{data.summary.xpEarned} XP · +
                    {data.summary.coinsEarned} xu
                  </p>
                </div>
              </div>
            </section>

            {finishMeta?.missionUpdated && (
              <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 font-bold text-emerald-700">
                🎯 Nhiệm vụ Listening đã được cập nhật.
              </section>
            )}

            {error && data && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-600">
                {error}
              </div>
            )}

            <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                icon={<Target />}
                value={`${data.summary.accuracy}%`}
                label="Độ chính xác"
              />
              <Stat
                icon={<CheckCircle2 />}
                value={String(data.summary.correct)}
                label="Câu đúng"
              />
              <Stat
                icon={<XCircle />}
                value={String(data.summary.wrong)}
                label="Câu sai"
              />
              <Stat
                icon={<Headphones />}
                value={data.summary.totalTimeText}
                label="Thời gian nghe"
              />
            </section>

            <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="space-y-7">
                <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black">
                    AI Feedback
                  </h2>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-emerald-50 p-5">
                      <h3 className="font-black text-emerald-700">
                        Điểm mạnh
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm text-emerald-700">
                        {data.feedback.strengths.length ? (
                          data.feedback.strengths.map(
                            (item) => (
                              <li key={item}>• {item}</li>
                            ),
                          )
                        ) : (
                          <li>• Tiếp tục luyện để tạo điểm mạnh mới.</li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-5">
                      <h3 className="font-black text-amber-700">
                        Cần cải thiện
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm text-amber-700">
                        {data.feedback.improvements.length ? (
                          data.feedback.improvements.map(
                            (item) => (
                              <li key={item}>• {item}</li>
                            ),
                          )
                        ) : (
                          <li>• Duy trì luyện nghe hằng ngày.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black">
                    Xem lại câu hỏi
                  </h2>

                  <div className="mt-5 space-y-4">
                    {visibleQuestions.map((question) => (
                      <article
                        key={question.id}
                        className={`rounded-2xl border p-5 ${
                          question.isCorrect
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <h3 className="font-black">
                          {question.order}.{" "}
                          {question.question}
                        </h3>
                        <p className="mt-2 text-sm">
                          Bạn chọn:{" "}
                          <strong>
                            {question.selectedAnswer ??
                              "Bỏ qua"}
                          </strong>
                        </p>
                        {!question.isCorrect && (
                          <p className="mt-1 text-sm text-emerald-700">
                            Đáp án đúng:{" "}
                            <strong>
                              {question.correctAnswer}
                            </strong>
                          </p>
                        )}
                        {question.explanation && (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {question.explanation}
                          </p>
                        )}
                        {question.transcript && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-bold text-violet-600">
                              Xem transcript
                            </summary>
                            <p className="mt-2 rounded-xl bg-white/70 p-3 text-sm leading-6">
                              {question.transcript}
                            </p>
                          </details>
                        )}
                      </article>
                    ))}
                  </div>

                  {data.questions.length > 5 && (
                    <button
                      onClick={() =>
                        setShowAll((value) => !value)
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-3 font-bold text-violet-600"
                    >
                      {showAll
                        ? "Thu gọn"
                        : "Xem tất cả"}
                      <ChevronDown
                        size={17}
                        className={
                          showAll ? "rotate-180" : ""
                        }
                      />
                    </button>
                  )}
                </section>
              </section>

              <aside className="space-y-6">
                <MissionCard
                  title="Nhiệm vụ hôm nay"
                  mission={dailyMission}
                />
                <MissionCard
                  title="Mục tiêu tuần"
                  mission={weeklyMission}
                />

                <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
                  <h2 className="font-black">
                    Bạn thấy bài học thế nào?
                  </h2>

                  <div className="mt-4 flex gap-2">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setRating(item);
                          setRatingSent(false);
                        }}
                        className={
                          item <= rating
                            ? "text-yellow-400"
                            : "text-slate-200"
                        }
                      >
                        <Star
                          fill="currentColor"
                          size={28}
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={
                      actionLoading || ratingSent
                    }
                    onClick={submitRating}
                    className="mt-4 w-full rounded-xl bg-violet-600 py-3 font-black text-white disabled:opacity-50"
                  >
                    {ratingSent
                      ? "Đã gửi đánh giá · Bấm sao để sửa"
                      : "Gửi đánh giá"}
                  </button>
                </section>

                <button
                  disabled={actionLoading}
                  onClick={() => startAction("retry")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white py-3 font-black text-violet-600 disabled:opacity-50"
                >
                  <RotateCcw size={17} />
                  Làm lại bài này
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() =>
                    startAction("continue")
                  }
                  className="w-full rounded-xl bg-violet-600 py-3 font-black text-white disabled:opacity-50"
                >
                  Luyện bài tiếp theo
                </button>

                <button
                  onClick={() =>
                    router.push("/listening")
                  }
                  className="w-full rounded-xl bg-slate-900 py-3 font-black text-white"
                >
                  Listening Home
                </button>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
        {icon}
      </div>
      <p className="mt-4 text-2xl font-black">
        {value}
      </p>
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>
    </article>
  );
}

function MissionCard({
  title,
  mission,
}: {
  title: string;
  mission: ReturnType<
    typeof useListeningMissions
  >["dailyMission"];
}) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <h2 className="font-black">{title}</h2>

      {mission ? (
        <>
          <h3 className="mt-4 font-black">
            {mission.title}
          </h3>
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
            {mission.progress}/{mission.target}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Chưa có nhiệm vụ Listening.
        </p>
      )}
    </section>
  );
}

function PageState({
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

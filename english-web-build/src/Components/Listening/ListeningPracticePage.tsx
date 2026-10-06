"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Headphones,
  Pause,
  Play,
  SkipForward,
  Volume2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";
import type {
  ApiEnvelope,
  ListeningFinishResult,
  ListeningPractice,
} from "./listening.types";
import {
  formatSeconds,
  getApiErrorMessage,
  unwrap,
} from "./listening.helpers";
import { useListeningMissions } from "./useListeningMissions";

export default function ListeningPracticePage({
  sessionId,
}: {
  sessionId: string;
}) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [practice, setPractice] =
    useState<ListeningPractice | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] =
    useState<string | null>(null);
  const [questionStartedAt, setQuestionStartedAt] =
    useState(Date.now());
  const [listenedCount, setListenedCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  const { dailyMission } = useListeningMissions();

  const currentQuestion =
    practice?.questions[currentIndex] ?? null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * Backend resume bằng POST start theo level/topic,
       * nhưng frontend route đã có sessionId. Endpoint result chỉ
       * dành cho completed. Do backend chưa có GET session detail,
       * ta dùng Home để lấy level/topic rồi POST start; backend sẽ
       * trả lại session IN_PROGRESS hiện có.
       */
      const homeResponse = await api.get<any>("/listening/home");
      const home = unwrap<any>(homeResponse.data);
      const active = home.continueSession;

      if (!active || active.sessionId !== sessionId) {
        router.replace("/listening");
        return;
      }

      const response = await api.post<
        ListeningPractice | ApiEnvelope<ListeningPractice>
      >("/listening/practice/start", {
        level: active.level ?? "B1",
        topic: active.topic ?? undefined,
        limit: active.total || 10,
      });

      const payload = unwrap(response.data);
      const firstIncomplete = payload.questions.findIndex(
        (item) => !item.answered,
      );

      setPractice(payload);
      setCurrentIndex(
        firstIncomplete >= 0 ? firstIncomplete : 0,
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không tải được phiên luyện nghe.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [router, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setListenedCount(0);
    setShowTranscript(false);
    setSelectedAnswer(
      currentQuestion?.selectedAnswer ?? null,
    );
    setQuestionStartedAt(Date.now());
  }, [currentQuestion?.id]);

  const progress = useMemo(
    () =>
      practice?.progress ?? {
        percent: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
      },
    [practice?.progress],
  );

  function playAudio() {
    if (!audioRef.current || !currentQuestion?.audioUrl) {
      setError(
        "Câu hỏi chưa có audio. Hãy kiểm tra cấu hình Google TTS.",
      );
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      return;
    }

    audioRef.current
      .play()
      .then(() => {
        setListenedCount((value) => value + 1);
      })
      .catch(() => {
        setError("Trình duyệt không phát được audio.");
      });
  }

  async function submitAnswer() {
    if (
      !practice ||
      !currentQuestion ||
      !selectedAnswer ||
      submitting
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await api.post<any>(
        `/listening/sessions/${practice.sessionId}/answer`,
        {
          questionId: currentQuestion.id,
          selectedAnswer,
          timeSpent: Math.max(
            0,
            Math.floor(
              (Date.now() - questionStartedAt) / 1000,
            ),
          ),
          listenedCount,
        },
      );

      const payload = unwrap<any>(response.data);

      setPractice((current) => {
        if (!current) return current;

        return {
          ...current,
          progress: payload.progress,
          questions: current.questions.map((question) =>
            question.id === currentQuestion.id
              ? {
                  ...question,
                  answered: true,
                  selectedAnswer,
                  isCorrect: payload.isCorrect,
                  correctAnswer:
                    payload.correctAnswer,
                  explanation: payload.explanation,
                  transcript:
                    payload.transcript ??
                    question.transcript,
                }
              : question,
          ),
        };
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không lưu được đáp án.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function skipQuestion() {
    if (
      !practice ||
      !currentQuestion ||
      currentQuestion.answered ||
      submitting
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await api.post<any>(
        `/listening/sessions/${practice.sessionId}/skip`,
        {
          questionId: currentQuestion.id,
          timeSpent: Math.max(
            0,
            Math.floor(
              (Date.now() - questionStartedAt) / 1000,
            ),
          ),
          listenedCount,
        },
      );

      const payload = unwrap<any>(response.data);

      setPractice((current) => {
        if (!current) return current;

        return {
          ...current,
          progress: payload.progress,
          questions: current.questions.map((question) =>
            question.id === currentQuestion.id
              ? {
                  ...question,
                  answered: true,
                  isSkipped: true,
                }
              : question,
          ),
        };
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không bỏ qua được câu hỏi.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFlag() {
    if (!practice || !currentQuestion) return;

    const next = !currentQuestion.isFlagged;

    setPractice((current) => {
      if (!current) return current;

      return {
        ...current,
        questions: current.questions.map((question) =>
          question.id === currentQuestion.id
            ? { ...question, isFlagged: next }
            : question,
        ),
      };
    });

    try {
      await api.post(
        `/listening/sessions/${practice.sessionId}/flag`,
        {
          questionId: currentQuestion.id,
          isFlagged: next,
        },
      );
    } catch {
      setError("Chưa lưu được đánh dấu.");
    }
  }

  async function finish() {
    if (!practice || submitting) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await api.post<
        ListeningFinishResult | ApiEnvelope<ListeningFinishResult>
      >(
        `/listening/sessions/${practice.sessionId}/finish`,
      );

      const payload = unwrap(response.data);

      sessionStorage.setItem(
        `listening-finish:${payload.sessionId}`,
        JSON.stringify(payload),
      );

      router.replace(payload.resultUrl);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không kết thúc được bài luyện nghe.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    if (!currentQuestion || !practice) return;

    if (!currentQuestion.answered) {
      await submitAnswer();
      return;
    }

    if (currentIndex < practice.questions.length - 1) {
      setCurrentIndex((value) => value + 1);
      return;
    }

    await finish();
  }

  if (loading) {
    return <PageState text="Đang tải bài luyện nghe..." />;
  }

  if (error && !practice) {
    return <PageState text={error} action={load} />;
  }

  if (!practice || !currentQuestion) {
    return <PageState text="Không có dữ liệu luyện nghe." />;
  }

  return (
    <main className="min-h-screen bg-[#f7faff] text-[#101733]">
      <audio
        ref={audioRef}
        src={currentQuestion.audioUrl || undefined}
        onTimeUpdate={(event) =>
          setCurrentTime(
            event.currentTarget.currentTime,
          )
        }
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="mx-auto min-h-screen max-w-[1920px]">
        <section className="min-w-0 px-0 py-2 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:py-4 sm:pb-4 lg:px-2">
          <div className="mx-auto max-w-[1450px]">
            <div className="mb-3 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4">
              <button
                onClick={() => router.push("/listening")}
                className="inline-flex items-center gap-2 font-bold text-blue-600"
              >
                <ChevronLeft size={18} />
                Trang luyện nghe
              </button>

              <button
                onClick={finish}
                disabled={submitting}
                className="rounded-xl border bg-white px-3 py-2 text-sm font-bold sm:px-5 sm:py-3 disabled:opacity-50"
              >
                Kết thúc bài
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl bg-red-50 p-4 font-bold text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-7">
                <div className="flex flex-wrap gap-3">
                  <Badge>
                    Câu {currentIndex + 1}/
                    {practice.questions.length}
                  </Badge>
                  <Badge>{practice.level}</Badge>
                  <Badge>{practice.topic}</Badge>
                </div>

                <div className="mt-4 rounded-2xl bg-blue-50 p-4 sm:mt-7 sm:rounded-3xl sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-6">
                    <button
                      onClick={playAudio}
                      className="grid h-14 w-14 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-lg"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6 sm:h-8 sm:w-8" />
                      ) : (
                        <Play className="h-6 w-6 sm:h-8 sm:w-8" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="h-3 rounded-full bg-white">
                        <div
                          className="h-3 rounded-full bg-blue-600"
                          style={{
                            width: `${Math.min(
                              100,
                              (currentTime /
                                Math.max(
                                  currentQuestion.duration,
                                  1,
                                )) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-3 flex justify-between text-sm font-bold text-slate-500">
                        <span>
                          {formatSeconds(currentTime)}
                        </span>
                        <span>
                          {formatSeconds(
                            currentQuestion.duration,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-start justify-between gap-3 sm:mt-7 sm:gap-4">
                  <div>
                    <h1 className="text-base font-black leading-snug min-[400px]:text-lg sm:text-2xl">
                      {currentQuestion.question}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 sm:mt-2 sm:text-base">
                      Nghe audio và chọn đáp án đúng nhất.
                    </p>
                  </div>

                  <button
                    onClick={toggleFlag}
                    className={`rounded-xl border p-3 ${
                      currentQuestion.isFlagged
                        ? "border-blue-400 bg-blue-50 text-blue-600"
                        : "text-slate-400"
                    }`}
                  >
                    <Flag size={19} />
                  </button>
                </div>

                <div className="mt-3 space-y-2 sm:mt-6 sm:space-y-3">
                  {currentQuestion.options.map((option) => {
                    const selected =
                      selectedAnswer === option.label;
                    const correct =
                      currentQuestion.answered &&
                      currentQuestion.correctAnswer ===
                        option.label;
                    const wrongSelected =
                      currentQuestion.answered &&
                      selected &&
                      !currentQuestion.isCorrect;

                    return (
                      <button
                        key={option.label}
                        disabled={
                          currentQuestion.answered ||
                          submitting
                        }
                        onClick={() =>
                          setSelectedAnswer(option.label)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-bold sm:gap-4 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-base disabled:cursor-not-allowed ${
                          correct
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : wrongSelected
                              ? "border-red-400 bg-red-50 text-red-700"
                              : selected
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-200"
                        }`}
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm">
                          {option.label}
                        </span>
                        {option.text}
                      </button>
                    );
                  })}
                </div>

                {currentQuestion.answered &&
                  currentQuestion.explanation && (
                    <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-blue-700">
                      <strong>Giải thích:</strong>{" "}
                      {currentQuestion.explanation}
                    </div>
                  )}

                {currentQuestion.answered &&
                  currentQuestion.transcript && (
                    <div className="mt-4">
                      <button
                        onClick={() =>
                          setShowTranscript((value) => !value)
                        }
                        className="font-bold text-blue-600"
                      >
                        {showTranscript
                          ? "Ẩn lời thoại"
                          : "Xem lời thoại"}
                      </button>

                      {showTranscript && (
                        <p className="mt-3 rounded-2xl bg-slate-50 p-5 text-sm leading-7">
                          {currentQuestion.transcript}
                        </p>
                      )}
                    </div>
                  )}

                <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 mt-4 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white/95 p-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() =>
                      setCurrentIndex((value) =>
                        Math.max(0, value - 1),
                      )
                    }
                    className="rounded-xl border px-4 py-2.5 text-sm font-bold sm:px-6 sm:py-3 sm:text-base disabled:opacity-40"
                  >
                    Câu trước
                  </button>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                    <button
                      disabled={
                        submitting ||
                        currentQuestion.answered
                      }
                      onClick={skipQuestion}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold sm:px-5 sm:py-3 sm:text-base disabled:opacity-40"
                    >
                      <SkipForward size={17} />
                      Bỏ qua
                    </button>

                    <button
                      disabled={
                        submitting ||
                        (!selectedAnswer &&
                          !currentQuestion.answered)
                      }
                      onClick={next}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white sm:px-7 sm:py-3 sm:text-base disabled:opacity-40"
                    >
                      {currentQuestion.answered
                        ? currentIndex ===
                          practice.questions.length - 1
                          ? "Hoàn thành"
                          : "Câu tiếp theo"
                        : "Nộp đáp án"}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </section>

              <aside className="grid grid-cols-2 gap-2 sm:block sm:space-y-6">
                {dailyMission && (
                  <section className="col-span-2 rounded-2xl bg-gradient-to-br from-blue-700 to-sky-600 p-4 text-white sm:rounded-3xl sm:p-6">
                    <p className="text-xs font-black text-white/70">
                      NHIỆM VỤ LISTENING
                    </p>
                    <h2 className="mt-2 font-black">
                      {dailyMission.title}
                    </h2>
                    <div className="mt-5 h-3 rounded-full bg-white/20">
                      <div
                        className="h-3 rounded-full bg-emerald-400"
                        style={{
                          width: `${Math.min(
                            dailyMission.progressPercent,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-bold">
                      {dailyMission.progress}/
                      {dailyMission.target}
                    </p>
                  </section>
                )}

                <section className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
                  <h2 className="font-black">
                    Tiến độ bài học
                  </h2>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 sm:mt-5 sm:h-3">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{
                        width: `${progress.percent}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1 text-center sm:mt-5 sm:gap-2">
                    <ProgressItem
                      value={progress.correct}
                      label="Đúng"
                      tone="green"
                    />
                    <ProgressItem
                      value={progress.wrong}
                      label="Sai"
                      tone="red"
                    />
                    <ProgressItem
                      value={progress.skipped}
                      label="Bỏ qua"
                      tone="gray"
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
                  <h2 className="font-black">
                    Danh sách câu
                  </h2>
                  <div className="mt-2 grid grid-cols-5 gap-1 sm:mt-4 sm:gap-2">
                    {practice.questions.map(
                      (question, index) => (
                        <button
                          key={question.id}
                          onClick={() =>
                            setCurrentIndex(index)
                          }
                          className={`grid h-8 place-items-center rounded-lg text-sm font-black sm:h-10 sm:rounded-xl sm:text-base ${
                            index === currentIndex
                              ? "bg-blue-600 text-white"
                              : question.isCorrect
                                ? "bg-emerald-100 text-emerald-700"
                                : question.isSkipped
                                  ? "bg-slate-200 text-slate-600"
                                  : question.answered
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-50"
                          }`}
                        >
                          {index + 1}
                        </button>
                      ),
                    )}
                  </div>
                </section>

                <section className="col-span-2 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm sm:col-span-1 sm:rounded-3xl sm:p-6">
                  <div className="flex items-center gap-3">
                    <Headphones className="text-blue-600" />
                    <div>
                      <p className="font-black">
                        Lượt nghe câu này
                      </p>
                      <p className="text-sm text-slate-500">
                        {listenedCount} lượt
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
      {children}
    </span>
  );
}

function ProgressItem({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "green" | "red" | "gray";
}) {
  const className =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-red-600"
        : "text-slate-500";

  return (
    <div>
      <p className={`text-xl font-black sm:text-2xl ${className}`}>
        {value}
      </p>
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>
    </div>
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
    <div className="grid min-h-screen place-items-center bg-[#f7faff]">
      <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
        <p className="font-bold">{text}</p>
        {action && (
          <button
            onClick={action}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white"
          >
            Tải lại
          </button>
        )}
      </div>
    </div>
  );
}

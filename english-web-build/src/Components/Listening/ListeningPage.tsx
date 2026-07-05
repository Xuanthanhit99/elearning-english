"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Diamond,
  Flag,
  Flame,
  Gift,
  Headphones,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipForward,
  Star,
  Volume2,
  XCircle,
} from "lucide-react";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import AppLogo from "@/src/Components/UI/AppLogo";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";
import StudySidebar from "@/src/Components/Layout/StudySidebar";

type ListeningOption = {
  label: string;
  text: string;
};

type ListeningQuestion = {
  id: string;
  order: number;
  level: string;
  topic: string;
  audioUrl?: string | null;
  transcript?: string | null;
  duration: number;
  question: string;
  options: ListeningOption[];
  answered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  isSkipped?: boolean;
  isFlagged: boolean;
  explanation?: string | null;
  correctAnswer?: string | null;
};

type ListeningPractice = {
  sessionId: string;
  level: string;
  topic: string;
  totalQuestions: number;
  progress: {
    percent: number;
    correct: number;
    wrong: number;
    skipped: number;
  };
  questions: ListeningQuestion[];
};

type ListeningFinishResult = {
  sessionId: string;
  level?: string;
  topic?: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  xpEarned: number;
  coinsEarned: number;
};

const listeningSubMenu = [
  { label: "Luyện nghe", href: "/listening" },
  { label: "Nghe chép chính tả", href: "/listening?mode=dictation" },
  { label: "Nghe hiểu đoạn", href: "/listening?mode=dialogue" },
  { label: "Nghe theo chủ đề", href: "/listening?mode=topic" },
];

const menu = [
  { icon: "home", label: "Trang chủ", href: "/" },
  { icon: "book", label: "Tổng quan", href: "/vocabulary/overview" },
  { icon: "book", label: "Từ vựng", href: "/vocabulary" },
  { icon: "library", label: "Ngữ pháp", href: "/courses" },
  { icon: "volume", label: "Nghe", href: "/listening" },
  { icon: "mic", label: "Nói", href: "/pronunciation" },
  { icon: "book", label: "Đọc hiểu", href: "/courses" },
  { icon: "pen", label: "Viết", href: "/check-writing" },
] satisfies Array<{ icon: AppIconName; label: string; href: string }>;

export default function ListeningPage() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechStartedAtRef = useRef(0);
  const speechBaseTimeRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [message, setMessage] = useState("");
  const [practice, setPractice] = useState<ListeningPractice | null>(null);
  const [finishResult, setFinishResult] = useState<ListeningFinishResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [listenedCount, setListenedCount] = useState(0);
  const [questionStartAt, setQuestionStartAt] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(0);

  const currentQuestion = practice?.questions[currentIndex] || null;

  const progress = useMemo(
    () =>
      practice?.progress || {
        percent: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
      },
    [practice?.progress],
  );

  async function loadListeningPractice(level = "B1") {
    try {
      setLoading(true);
      setMessage("");
      const res = await api.get<ListeningPractice>(
        `/listening/practice?level=${encodeURIComponent(level)}&limit=10`,
      );
      setPractice(res.data);
      setFinishResult(null);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setQuestionStartAt(Date.now());
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message || "Không tải được bài luyện nghe.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListeningPractice();
  }, []);

  useEffect(() => {
    stopPlayback();
    setSelectedAnswer(currentQuestion?.selectedAnswer || null);
    setQuestionStartAt(Date.now());
    setListenedCount(0);
    setIsPlaying(false);
    setShowTranscript(false);
    setCurrentTime(0);
  }, [currentQuestion?.id]);

  useEffect(() => {
    return () => stopPlayback();
  }, []);

  function clearSpeechTimer() {
    if (speechTimerRef.current) {
      clearInterval(speechTimerRef.current);
      speechTimerRef.current = null;
    }
  }

  function stopPlayback() {
    clearSpeechTimer();
    window.speechSynthesis?.cancel();
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
  }

  function transcriptSegments(text: string) {
    return (
      text
        .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
        ?.map((item) => item.trim())
        .filter(Boolean) || [text]
    );
  }

  function startSpeechProgress(baseTime: number) {
    clearSpeechTimer();
    speechBaseTimeRef.current = baseTime;
    speechStartedAtRef.current = Date.now();

    speechTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - speechStartedAtRef.current) / 1000;
      const nextTime = Math.min(
        currentQuestion?.duration || 0,
        speechBaseTimeRef.current + elapsed,
      );
      setCurrentTime(nextTime);

      if (nextTime >= (currentQuestion?.duration || 0)) {
        clearSpeechTimer();
        setIsPlaying(false);
      }
    }, 200);
  }

  function speakTranscript(startAt = currentTime) {
    if (!currentQuestion?.transcript || typeof window === "undefined") return;

    window.speechSynthesis.cancel();
    const duration = Math.max(currentQuestion.duration || 1, 1);
    const segments = transcriptSegments(currentQuestion.transcript);
    const segmentIndex = Math.min(
      segments.length - 1,
      Math.floor((Math.max(startAt, 0) / duration) * segments.length),
    );
    const baseTime = (segmentIndex / segments.length) * duration;
    const utterance = new SpeechSynthesisUtterance(
      segments.slice(segmentIndex).join(" "),
    );
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => {
      clearSpeechTimer();
      setCurrentTime(duration);
      setIsPlaying(false);
    };
    window.speechSynthesis.speak(utterance);
    setCurrentTime(baseTime);
    startSpeechProgress(baseTime);
    setIsPlaying(true);
    setListenedCount((prev) => prev + 1);
  }

  function handlePlayAudio() {
    if (!currentQuestion) return;

    if (currentQuestion.audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        setListenedCount((prev) => prev + 1);
      }
      return;
    }

    if (isPlaying) {
      stopPlayback();
      return;
    }

    speakTranscript();
  }

  function handleSeek(seconds: number) {
    if (!currentQuestion) return;

    const nextTime = Math.max(
      0,
      Math.min(currentQuestion.duration || 0, currentTime + seconds),
    );

    if (currentQuestion.audioUrl && audioRef.current) {
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
      return;
    }

    setCurrentTime(nextTime);
    if (isPlaying) {
      window.speechSynthesis.cancel();
      speakTranscript(nextTime);
    }
  }

  function handleSelectAnswer(answer: string) {
    if (!currentQuestion || currentQuestion.answered) return;
    setSelectedAnswer(answer);
  }

  async function handleSubmitAnswer() {
    if (!practice || !currentQuestion || !selectedAnswer) return false;

    try {
      setSubmitting(true);
      setCheckingAnswer(true);
      setMessage("");
      const timeSpent = Math.floor((Date.now() - questionStartAt) / 1000);

      const res = await api.post(
        `/listening/sessions/${practice.sessionId}/answer`,
        {
          questionId: currentQuestion.id,
          selectedAnswer,
          timeSpent,
          listenedCount,
        },
      );

      setPractice((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          progress: res.data.progress,
          questions: prev.questions.map((question) =>
            question.id === currentQuestion.id
              ? {
                  ...question,
                  answered: true,
                  selectedAnswer,
                  isCorrect: res.data.isCorrect,
                  correctAnswer: res.data.correctAnswer,
                  explanation: res.data.explanation,
                  transcript: res.data.transcript || question.transcript,
                }
              : question,
          ),
        };
      });
      return true;
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Không nộp được đáp án.");
      return false;
    } finally {
      setSubmitting(false);
      setCheckingAnswer(false);
    }
  }

  async function handleSkip() {
    if (!practice || !currentQuestion || currentQuestion.answered) return;

    try {
      setSubmitting(true);
      const timeSpent = Math.floor((Date.now() - questionStartAt) / 1000);
      const res = await api.post(
        `/listening/sessions/${practice.sessionId}/skip`,
        {
          questionId: currentQuestion.id,
          timeSpent,
          listenedCount,
        },
      );

      setPractice((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          progress: res.data.progress,
          questions: prev.questions.map((question) =>
            question.id === currentQuestion.id
              ? { ...question, answered: true, isSkipped: true }
              : question,
          ),
        };
      });
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Không bỏ qua được câu hỏi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFlag() {
    if (!practice || !currentQuestion) return;
    const next = !currentQuestion.isFlagged;

    setPractice((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((question) =>
          question.id === currentQuestion.id
            ? { ...question, isFlagged: next }
            : question,
        ),
      };
    });

    try {
      await api.post(`/listening/sessions/${practice.sessionId}/flag`, {
        questionId: currentQuestion.id,
        isFlagged: next,
      });
    } catch {
      setMessage("Chưa lưu được đánh dấu, nhưng bạn vẫn có thể tiếp tục.");
    }
  }

  async function handleNext() {
    if (!practice || !currentQuestion) return;

    if (!currentQuestion.answered) {
      await handleSubmitAnswer();
      return;
    }

    if (currentIndex < practice.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    await handleFinish();
  }

  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }

  async function handleFinish() {
    if (!practice) return;

    try {
      setSubmitting(true);
      const res = await api.post(
        `/listening/sessions/${practice.sessionId}/finish`,
      );
      setFinishResult(res.data);
      setMessage("");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Không kết thúc được bài.");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadSessionFromAction(action: "retry" | "continue") {
    if (!practice) return;

    try {
      setSubmitting(true);
      setMessage("");
      const res = await api.post<ListeningPractice>(
        `/listening/sessions/${practice.sessionId}/${action}`,
      );
      setPractice(res.data);
      setFinishResult(null);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setQuestionStartAt(Date.now());
      setCurrentTime(0);
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          "Không tải được bài luyện nghe tiếp theo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function loadChallengeLevel(level: string) {
    await loadListeningPractice(level);
  }

  const totalQuestions = practice?.questions.length || 0;

  return (
    <main className="min-h-screen bg-[#fbfbff] text-[#101733]">
      <audio
        ref={audioRef}
        src={currentQuestion?.audioUrl || undefined}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      {checkingAnswer && <CheckingAnswerModal />}
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <ListeningSidebar pathname={pathname} />

        <section className="min-w-0 flex-1">
          <ListeningTopBar
            displayName={user?.fullname || "Minh Anh"}
            avatar={user?.avatar || "/cat-home.jpg"}
          />

          <div className="grid gap-8 px-4 py-7 lg:px-8 xl:grid-cols-[1fr_420px]">
            <section>
              <div className="mb-6 flex items-center gap-2 text-sm font-bold text-[#73799b]">
                <Link href="/">Trang chủ</Link>
                <ChevronRight size={16} />
                <span>Nghe</span>
                <ChevronRight size={16} />
                <span className="text-[#101733]">Luyện nghe</span>
              </div>

              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="flex items-center gap-3 text-4xl font-black">
                    Luyện nghe <Volume2 className="text-[#6d35ff]" />
                  </h1>
                  <p className="mt-2 text-lg font-bold text-[#69708b]">
                    Nghe và chọn đáp án đúng
                  </p>
                </div>
                <button
                  onClick={handleFinish}
                  disabled={submitting || !practice}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#dfe2f3] bg-white px-6 text-sm font-black text-[#27245f] disabled:opacity-50"
                >
                  Thoát bài <LogOut size={17} />
                </button>
              </div>

              {message && (
                <div className="mb-5 rounded-2xl bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">
                  {message}
                </div>
              )}

              {loading ? (
                <LoadingCard />
              ) : finishResult && practice ? (
                <ListeningCompletedCard
                  result={finishResult}
                  submitting={submitting}
                  onRetry={() => loadSessionFromAction("retry")}
                  onContinue={() => loadSessionFromAction("continue")}
                  onChallenge={(level) => loadChallengeLevel(level)}
                  currentLevel={practice.level}
                />
              ) : !practice || !currentQuestion ? (
                <EmptyCard onRetry={() => loadListeningPractice()} />
              ) : (
                <>
                  <section className="rounded-3xl border border-[#e7e8f2] bg-white p-6 shadow-[0_16px_42px_rgba(35,35,80,0.06)] lg:p-8">
                    <div className="mb-6 flex flex-wrap gap-4">
                      <Badge text={`Câu ${currentIndex + 1} / ${totalQuestions}`} tone="purple" />
                      <Badge text={`${practice.level} - Trung cấp`} tone="green" />
                      <Badge text={`Chủ đề: ${practice.topic}`} tone="plain" />
                    </div>

                    <AudioPlayer
                      duration={currentQuestion.duration}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      onPlay={handlePlayAudio}
                      onSeek={(time) => handleSeek(time - currentTime)}
                    />

                    <div className="mt-8 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black">
                          {currentQuestion.question}
                        </h2>
                        <p className="mt-2 font-bold text-[#69708b]">
                          Nghe đoạn hội thoại và chọn đáp án đúng nhất.
                        </p>
                      </div>
                      <button
                        onClick={handleFlag}
                        className={`grid h-11 w-11 place-items-center rounded-xl border ${
                          currentQuestion.isFlagged
                            ? "border-[#6d35ff] bg-[#f1ecff] text-[#6d35ff]"
                            : "border-[#dfe2f3] text-[#8b91aa]"
                        }`}
                        title="Đánh dấu câu hỏi"
                      >
                        <Flag size={17} />
                      </button>
                    </div>

                    <div className="mt-6 space-y-4">
                      {currentQuestion.options.map((option) => (
                        <AnswerOption
                          key={option.label}
                          option={option}
                          selectedAnswer={selectedAnswer}
                          question={currentQuestion}
                          onSelect={handleSelectAnswer}
                        />
                      ))}
                    </div>

                    {currentQuestion.answered && currentQuestion.explanation && (
                      <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-700">
                        <b>Giải thích:</b> {currentQuestion.explanation}
                      </div>
                    )}

                    {showTranscript && currentQuestion.transcript && (
                      <div className="mt-5 rounded-2xl bg-[#f7f5ff] p-5 text-sm font-bold leading-7 text-[#3d4264]">
                        <b className="text-[#6d35ff]">Lời thoại:</b>{" "}
                        {currentQuestion.transcript}
                      </div>
                    )}

                    <div className="mt-8 flex flex-wrap justify-between gap-4">
                      <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                          className="inline-flex h-[52px] items-center gap-3 rounded-xl border border-[#bfaeff] bg-white px-8 font-black text-[#6d35ff] disabled:opacity-40"
                      >
                        <AppIcon name="chevronLeft" bare size={18} /> Quay lại
                      </button>
                      <div className="flex gap-3">
                        <button
                          onClick={handleSkip}
                          disabled={submitting || currentQuestion.answered}
                          className="inline-flex h-[52px] items-center gap-2 rounded-xl border border-[#dfe2f3] bg-white px-6 font-black text-[#59627f] disabled:opacity-40"
                        >
                          <SkipForward size={17} /> Bỏ qua
                        </button>
                        <button
                          onClick={handleNext}
                          disabled={
                            submitting ||
                            (!selectedAnswer && !currentQuestion.answered)
                          }
                          className="inline-flex h-[52px] items-center gap-3 rounded-xl bg-[#6d35ff] px-9 font-black text-white shadow-[0_12px_26px_rgba(101,44,255,0.22)] disabled:opacity-40"
                        >
                          {currentQuestion.answered
                            ? currentIndex === totalQuestions - 1
                              ? "Hoàn thành"
                              : "Câu tiếp theo"
                            : checkingAnswer
                              ? "Đang kiểm tra..."
                              : "Nộp đáp án"}
                          <AppIcon name="chevronRight" bare size={18} />
                        </button>
                      </div>
                    </div>
                  </section>

                  <div className="mt-6 flex items-center gap-5 rounded-3xl bg-emerald-50 p-6">
                    <Headphones className="text-emerald-500" size={36} />
                    <div>
                      <p className="font-black text-emerald-700">Mẹo nhỏ</p>
                      <p className="text-sm font-bold leading-6 text-emerald-700">
                        Tập trung vào từ khóa và ngữ điệu. Đừng cố hiểu từng từ,
                        hãy nắm ý chính trước nhé!
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>

            <aside className="space-y-6">
              <ProgressCard progress={progress} />
              <QuestionList
                questions={practice?.questions || []}
                currentIndex={currentIndex}
                onSelect={setCurrentIndex}
              />
              <ControlCard
                onBack={() => handleSeek(-5)}
                onForward={() => handleSeek(5)}
                onPlay={handlePlayAudio}
                onTranscript={() => setShowTranscript((prev) => !prev)}
              />
              <section className="flex items-center justify-between overflow-hidden rounded-3xl bg-[#f2ecff] p-6 shadow-sm">
                <div>
                  <p className="font-black text-[#101733]">Mẹo luyện nghe</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#5f6382]">
                    Nghe lần đầu để nắm ý chính, lần 2 để chú ý chi tiết nhé!
                  </p>
                </div>
                <img src="/poppylingo-logo.png" alt="Mascot" className="w-24" />
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function ListeningSidebar({ pathname }: { pathname: string }) {
  return <StudySidebar />;
}

function ListeningTopBar({
  displayName,
  avatar,
}: {
  displayName: string;
  avatar: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e8e9f5] bg-white/95 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-4">
        <label className="relative hidden w-full max-w-[580px] md:block">
          <Search
            aria-hidden
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b91aa]"
            size={20}
          />
          <input
            placeholder="Tìm bài học, từ vựng, ngữ pháp..."
            className="h-14 w-full rounded-xl border border-[#dfe2f3] bg-white pl-12 pr-4 text-sm font-bold outline-none placeholder:text-[#8b91aa] focus:border-[#6d35ff]"
          />
        </label>
        <div className="ml-auto flex items-center gap-3">
          <TopStat icon={<Flame />} value="18" label="Streak" tone="orange" />
          <TopStat icon={<Star />} value="2,450" label="XP hôm nay" tone="yellow" />
          <TopStat icon={<Diamond />} value="5,230" label="Xu" tone="cyan" />
          <button className="grid h-12 w-12 place-items-center rounded-full border border-[#e8e9f5] text-[#6d35ff]">
            <Gift size={20} />
          </button>
          <button className="relative grid h-12 w-12 place-items-center rounded-full border border-[#e8e9f5] text-[#6d35ff]">
            <Bell size={20} />
            <span className="absolute right-2 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
              3
            </span>
          </button>
          <div className="hidden items-center gap-3 lg:flex">
            <img
              src={avatar}
              alt={displayName}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-black">{displayName}</p>
              <p className="text-xs font-bold text-[#69708b]">Level 18</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function AudioPlayer({
  duration,
  currentTime,
  isPlaying,
  onPlay,
  onSeek,
}: {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onPlay: () => void;
  onSeek: (time: number) => void;
}) {
  const safeDuration = Math.max(duration || 1, 1);
  const safeTime = Math.max(0, Math.min(safeDuration, currentTime || 0));
  const progress = Math.round((safeTime / safeDuration) * 100);

  function handleProgressClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(safeDuration, percent * safeDuration)));
  }

  return (
    <div className="rounded-3xl bg-[#f4efff] p-6">
      <div className="flex items-center gap-7">
        <button
          onClick={onPlay}
          className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[#6d35ff] text-white shadow-[0_14px_30px_rgba(101,44,255,0.35)]"
        >
          {isPlaying ? <Pause size={34} /> : <Play size={34} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex h-12 items-center gap-1 overflow-hidden">
            {Array.from({ length: 90 }, (_, index) => (
              <span
                key={index}
                className={`w-1 rounded-full transition-colors ${
                  index <= progress * 0.9 ? "bg-[#7b35ff]" : "bg-[#b994ff]"
                }`}
                style={{
                  height: `${8 + ((index * 13) % 34)}px`,
                  opacity: index <= progress * 0.9 ? 0.95 : 0.45,
                }}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm font-bold text-[#69708b]">
            <span>{formatDuration(Math.floor(safeTime))}</span>
            <button
              type="button"
              onClick={handleProgressClick}
              className="h-2 flex-1 rounded-full bg-white text-left"
              aria-label="Tua âm thanh"
            >
              <span
                className="block h-2 rounded-full bg-[#6d35ff]"
                style={{ width: `${progress}%` }}
              />
            </button>
            <span>{formatDuration(duration)}</span>
            <button className="rounded-xl border border-[#bfaeff] bg-white px-4 py-2 font-black text-[#6d35ff]">
              1.0x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerOption({
  option,
  selectedAnswer,
  question,
  onSelect,
}: {
  option: ListeningOption;
  selectedAnswer: string | null;
  question: ListeningQuestion;
  onSelect: (answer: string) => void;
}) {
  const isSelected = selectedAnswer === option.label;
  const isCorrect = question.correctAnswer === option.label;
  const isWrongSelected = question.answered && isSelected && !question.isCorrect;

  return (
    <button
      onClick={() => onSelect(option.label)}
      className={`flex w-full items-center gap-5 rounded-xl border px-5 py-4 text-left transition ${
        question.answered && isCorrect
          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
          : isWrongSelected
            ? "border-red-400 bg-red-50 text-red-700"
            : isSelected
              ? "border-[#8d5cff] bg-[#f7f3ff] text-[#6d35ff]"
              : "border-[#dfe2f3] bg-white hover:border-[#bfaeff]"
      }`}
    >
      <span
        className={`grid h-6 w-6 place-items-center rounded-full border ${
          isSelected
            ? "border-[#6d35ff] bg-[#6d35ff]"
            : "border-[#b8bdd4] bg-white"
        }`}
      >
        {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      <span className="w-5 font-black">{option.label}</span>
      <span className="font-bold">{option.text}</span>
    </button>
  );
}

function getNextListeningLevel(level: string) {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const index = levels.indexOf(level);
  if (index < 0) return "B1";
  return levels[Math.min(index + 1, levels.length - 1)];
}

function ListeningCompletedCard({
  result,
  submitting,
  onRetry,
  onContinue,
  onChallenge,
  currentLevel,
}: {
  result: ListeningFinishResult;
  submitting: boolean;
  onRetry: () => void;
  onContinue: () => void;
  onChallenge: (level: string) => void;
  currentLevel: string;
}) {
  const correctPercent = result.totalQuestions
    ? Math.round((result.correct / result.totalQuestions) * 100)
    : 0;
  const wrongPercent = result.totalQuestions
    ? Math.round((result.wrong / result.totalQuestions) * 100)
    : 0;
  const skippedPercent = result.totalQuestions
    ? Math.round((result.skipped / result.totalQuestions) * 100)
    : 0;
  const [selectedRating, setSelectedRating] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingMessage, setRatingMessage] = useState("");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const challengeLevel = getNextListeningLevel(currentLevel);

  async function submitRating() {
    if (!selectedRating || ratingLoading) return;

    try {
      setRatingLoading(true);
      setRatingMessage("");
      await api.post(`/listening/sessions/${result.sessionId}/rating`, {
        rating: selectedRating,
      });
      setRatingSubmitted(true);
      setShowRatingModal(true);
    } catch (error: any) {
      setRatingMessage(
        error?.response?.data?.message || "Chưa gửi được đánh giá. Hãy thử lại nhé.",
      );
    } finally {
      setRatingLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {showRatingModal && (
        <RatingCompleteModal
          result={result}
          correctPercent={correctPercent}
          wrongPercent={wrongPercent}
          skippedPercent={skippedPercent}
          onClose={() => setShowRatingModal(false)}
        />
      )}
      <section className="relative overflow-hidden rounded-3xl border border-[#e7e8f2] bg-white p-8 text-center shadow-[0_16px_42px_rgba(35,35,80,0.06)]">
        <Confetti />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[280px_1fr]">
          <div className="mx-auto">
            <img
              src="/poppylingo-logo.png"
              alt="Hoàn thành"
              className="mx-auto w-56 drop-shadow-xl"
            />
          </div>
          <div>
            <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-emerald-100 text-emerald-600 ring-[10px] ring-emerald-50">
              <CheckCircle2 size={70} strokeWidth={3} />
            </div>
            <h2 className="mt-7 text-4xl font-black text-[#101733]">
              Hoàn thành xuất sắc!
            </h2>
            <p className="mt-4 text-lg font-bold leading-8 text-[#4f5575]">
              Bạn đã hoàn thành bài luyện nghe.
              <br />
              Cố gắng duy trì phong độ này nhé!
            </p>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-8 grid max-w-[820px] gap-4 md:grid-cols-3">
          <ResultStat
            icon={<CheckCircle2 size={20} />}
            label="Đúng"
            value={result.correct}
            sub={`${correctPercent}%`}
            tone="green"
          />
          <ResultStat
            icon={<XCircle size={20} />}
            label="Sai"
            value={result.wrong}
            sub={`${wrongPercent}%`}
            tone="red"
          />
          <ResultStat
            icon={<AppIcon name="calendar" bare size={20} />}
            label="Bỏ qua"
            value={result.skipped}
            sub={`+${result.xpEarned} XP`}
            tone="purple"
          />
        </div>

        <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={onRetry}
            disabled={submitting}
            className="inline-flex h-[52px] min-w-[190px] items-center justify-center gap-3 rounded-xl border border-[#d9ceff] bg-white px-7 font-black text-[#6d35ff] disabled:opacity-50"
          >
            <RotateCcw size={18} /> Luyện lại
          </button>
          <button
            onClick={onContinue}
            disabled={submitting}
            className="inline-flex h-[52px] min-w-[220px] items-center justify-center gap-3 rounded-xl bg-[#6d35ff] px-7 font-black text-white shadow-[0_12px_26px_rgba(101,44,255,0.22)] disabled:opacity-50"
          >
            Tiếp tục học <AppIcon name="chevronRight" bare size={18} />
          </button>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-[#e7e8f2] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
        <div className="flex items-center gap-4">
          <AppIcon name="star" tone="yellow" className="h-14 w-14" size={28} />
          <div>
            <h3 className="font-black text-[#101733]">Đánh giá bài học</h3>
            <p className="mt-1 text-sm font-bold text-[#69708b]">
              {ratingSubmitted
                ? "Cảm ơn bạn đã gửi đánh giá!"
                : "Bài học này có hữu ích với bạn không?"}
            </p>
            {ratingMessage && (
              <p className="mt-1 text-xs font-bold text-red-500">{ratingMessage}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <button
              key={index}
              onClick={() => setSelectedRating(index + 1)}
              disabled={ratingLoading}
              className={`transition hover:scale-110 ${
                index < selectedRating ? "text-amber-400" : "text-[#d6d8e8]"
              }`}
              aria-label={`Đánh giá ${index + 1} sao`}
            >
              <Star fill="currentColor" size={34} />
            </button>
          ))}
        </div>
        <button
          onClick={submitRating}
          disabled={ratingLoading || ratingSubmitted}
          className="rounded-xl bg-[#6d35ff] px-8 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-[#b8a6ff]"
        >
          {ratingLoading
            ? "Đang gửi..."
            : ratingSubmitted
              ? "Đã đánh giá"
              : "Gửi đánh giá"}
        </button>
      </section>

      <section className="flex items-center justify-between gap-5 overflow-hidden rounded-3xl bg-emerald-50 p-6">
        <div>
          <h3 className="font-black text-emerald-700">Thử thách tiếp theo</h3>
          <p className="mt-2 text-sm font-bold text-emerald-700">
            Bạn đã sẵn sàng cho thử thách khó hơn?
          </p>
          <button
            onClick={() => onChallenge(challengeLevel)}
            disabled={submitting}
            className="mt-4 font-black text-[#6d35ff] disabled:opacity-50"
          >
            Luyện nghe trình độ {challengeLevel} ngay →
          </button>
        </div>
        <Headphones className="mr-8 hidden text-[#3046a5] md:block" size={90} />
      </section>
    </div>
  );
}

function ResultStat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  sub: string;
  tone: "green" | "red" | "purple";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-red-50 text-red-500"
        : "bg-[#f2ecff] text-[#6d35ff]";
  const subClass =
    tone === "red"
      ? "text-red-500"
      : tone === "green"
        ? "text-emerald-600"
        : "text-[#6d35ff]";

  return (
    <div className="rounded-2xl border border-[#e7e8f2] bg-white p-5">
      <div className={`mx-auto grid h-8 w-8 place-items-center rounded-lg ${toneClass}`}>
        {icon}
      </div>
      <p className="mt-3 font-black text-[#101733]">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#101733]">{value}</p>
      <p className={`mt-1 text-sm font-black ${subClass}`}>{sub}</p>
    </div>
  );
}

function RatingCompleteModal({
  result,
  correctPercent,
  wrongPercent,
  skippedPercent,
  onClose,
}: {
  result: ListeningFinishResult;
  correctPercent: number;
  wrongPercent: number;
  skippedPercent: number;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  const circleProgress = Math.max(0, Math.min(100, (countdown / 10) * 100));

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-[#111427]/60 px-4 backdrop-blur-sm">
      <section className="relative w-full max-w-[620px] overflow-hidden rounded-[28px] bg-white px-8 py-9 text-center shadow-[0_30px_90px_rgba(15,20,50,0.32)]">
        <Confetti />
        <button
          onClick={onClose}
          className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-[#dfe2f3] text-[#8b91aa] hover:bg-[#f7f5ff] hover:text-[#6d35ff]"
          aria-label="Đóng modal"
        >
          <XCircle size={22} />
        </button>

        <img
          src="/poppylingo-logo.png"
          alt="Hoàn thành"
          className="relative z-10 mx-auto h-36 w-36 rounded-full object-contain"
        />
        <h2 className="relative z-10 mt-5 text-3xl font-black text-[#101733]">
          Hoàn thành xuất sắc!
        </h2>
        <p className="relative z-10 mt-3 text-base font-bold leading-7 text-[#4f5575]">
          Bạn đã hoàn thành bài luyện nghe.
          <br />
          Cố gắng duy trì phong độ này nhé!
        </p>

        <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-3">
          <ResultStat
            icon={<CheckCircle2 size={18} />}
            label="Đúng"
            value={result.correct}
            sub={`${correctPercent}%`}
            tone="green"
          />
          <ResultStat
            icon={<XCircle size={18} />}
            label="Sai"
            value={result.wrong}
            sub={`${wrongPercent}%`}
            tone="red"
          />
          <ResultStat
            icon={<AppIcon name="shield" bare size={18} />}
            label="Bỏ qua"
            value={result.skipped}
            sub={`${skippedPercent}%`}
            tone="purple"
          />
        </div>

        <h3 className="relative z-10 mt-7 font-black text-[#101733]">
          Phần thưởng nhận được
        </h3>
        <div className="relative z-10 mt-4 grid gap-3 sm:grid-cols-3">
          <RewardItem icon={<Star fill="currentColor" />} value={`+${result.xpEarned} XP`} />
          <RewardItem icon={<Diamond fill="currentColor" />} value={`+${result.coinsEarned} Xu`} />
          <RewardItem icon={<Flame fill="currentColor" />} value="+1 Streak" />
        </div>

        <div className="relative z-10 mx-auto mt-8 grid h-20 w-20 place-items-center rounded-full">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#6d35ff ${circleProgress * 3.6}deg, #eee8ff 0deg)`,
            }}
          />
          <div className="relative grid h-14 w-14 place-items-center rounded-full bg-white">
            <span className="text-2xl font-black text-[#101733]">{countdown}</span>
          </div>
        </div>
        <p className="relative z-10 mt-3 font-bold text-[#101733]">
          Đóng sau {countdown} giây
        </p>
      </section>
    </div>
  );
}

function RewardItem({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-[#e7e8f2] bg-white px-4 py-4 font-black text-[#101733]">
      <span className="text-amber-400">{icon}</span>
      {value}
    </div>
  );
}

function Confetti() {
  const colors = ["#6d35ff", "#22c55e", "#f59e0b", "#ec4899", "#38bdf8", "#f87171"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 22 }, (_, index) => (
        <span
          key={index}
          className="absolute h-2 w-2 rounded-sm"
          style={{
            left: `${8 + ((index * 17) % 86)}%`,
            top: `${8 + ((index * 29) % 70)}%`,
            backgroundColor: colors[index % colors.length],
            transform: `rotate(${index * 24}deg)`,
            opacity: 0.72,
          }}
        />
      ))}
    </div>
  );
}

function ProgressCard({ progress }: { progress: ListeningPractice["progress"] }) {
  return (
    <Card title="Tiến độ bài học">
      <div className="mb-8 flex items-center gap-4">
        <div className="h-2 flex-1 rounded-full bg-[#eeeef8]">
          <div
            className="h-2 rounded-full bg-[#6d35ff]"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <b>{progress.percent}%</b>
      </div>
      <div className="grid grid-cols-3 text-center">
        <ProgressItem icon={<CheckCircle2 />} value={progress.correct} label="Đúng" tone="green" />
        <ProgressItem icon={<XCircle />} value={progress.wrong} label="Sai" tone="red" />
        <ProgressItem icon={<XCircle />} value={progress.skipped} label="Bỏ qua" tone="slate" />
      </div>
    </Card>
  );
}

function QuestionList({
  questions,
  currentIndex,
  onSelect,
}: {
  questions: ListeningQuestion[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <Card title="Danh sách câu hỏi">
      <div className="grid grid-cols-5 gap-4">
        {questions.map((question, index) => (
          <button
            key={question.id}
            onClick={() => onSelect(index)}
            className={`h-12 w-12 rounded-full font-black ${
              index === currentIndex
                ? "bg-[#6d35ff] text-white"
                : question.answered && question.isCorrect
                  ? "bg-emerald-100 text-emerald-700"
                  : question.answered && question.isCorrect === false
                    ? "bg-red-100 text-red-700"
                    : question.isSkipped
                      ? "bg-slate-200 text-slate-600"
                      : "bg-[#f0f0f8] text-[#101733]"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-[#69708b]">
        <Legend color="bg-emerald-500" label="Đúng" />
        <Legend color="bg-red-500" label="Sai" />
        <Legend color="bg-[#d9d9ed]" label="Chưa làm" />
        <Legend color="bg-[#6d35ff]" label="Đang làm" />
      </div>
    </Card>
  );
}

function ControlCard({
  onBack,
  onForward,
  onPlay,
  onTranscript,
}: {
  onBack: () => void;
  onForward: () => void;
  onPlay: () => void;
  onTranscript: () => void;
}) {
  return (
    <Card title="Điều khiển">
      <Control icon={<RotateCcw size={18} />} text="Tua lại 5 giây" onClick={onBack} />
      <Control icon={<RotateCcw size={18} />} text="Tua tới 5 giây" onClick={onForward} />
      <Control icon={<Play size={18} />} text="Phát / Tạm dừng" onClick={onPlay} />
      <Control icon={<BookOpen size={18} />} text="Hiện lời thoại" onClick={onTranscript} />
    </Card>
  );
}

function CheckingAnswerModal() {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#111427]/55 px-4 backdrop-blur-sm">
      <section className="w-full max-w-[430px] rounded-[28px] bg-white px-8 py-10 text-center shadow-[0_30px_90px_rgba(15,20,50,0.28)]">
        <div className="relative mx-auto grid h-28 w-28 place-items-center">
          <span className="absolute inset-0 rounded-full border-[7px] border-[#e3d5ff]" />
          <span className="absolute inset-0 animate-spin rounded-full border-[7px] border-transparent border-t-[#6d35ff]" />
          <img
            src="/poppylingo-logo.png"
            alt="Đang kiểm tra"
            className="relative h-16 w-16 rounded-full object-contain"
          />
        </div>
        <h2 className="mt-6 text-xl font-black text-[#101733]">
          Đang kiểm tra đáp án...
        </h2>
        <p className="mt-3 text-sm font-bold text-[#69708b]">
          Vui lòng đợi trong giây lát
        </p>
      </section>
    </div>
  );
}

function LoadingCard() {
  return (
    <section className="rounded-3xl border border-[#e7e8f2] bg-white p-8 shadow-sm">
      <div className="h-8 w-48 animate-pulse rounded-full bg-[#f0ecff]" />
      <div className="mt-8 h-32 animate-pulse rounded-3xl bg-[#f4efff]" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xl bg-[#f7f7fb]" />
        ))}
      </div>
    </section>
  );
}

function EmptyCard({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
      <p className="text-xl font-black text-red-500">Không có dữ liệu luyện nghe</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-xl bg-[#6d35ff] px-6 py-3 font-black text-white"
      >
        Tải lại
      </button>
    </section>
  );
}

function TopStat({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  tone: "orange" | "yellow" | "cyan";
}) {
  const color =
    tone === "orange" ? "text-orange-500" : tone === "yellow" ? "text-amber-500" : "text-cyan-500";
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div className={color}>{icon}</div>
      <div>
        <p className="text-sm font-black">{value}</p>
        <p className="text-xs font-bold text-[#69708b]">{label}</p>
      </div>
    </div>
  );
}

function Badge({
  text,
  tone,
}: {
  text: string;
  tone: "purple" | "green" | "plain";
}) {
  const classes =
    tone === "purple"
      ? "bg-[#efe9ff] text-[#6d35ff]"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-white text-[#59627f]";

  return <span className={`rounded-lg px-4 py-2 text-sm font-black ${classes}`}>{text}</span>;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#e7e8f2] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
      <h3 className="mb-5 text-xl font-black">{title}</h3>
      {children}
    </section>
  );
}

function ProgressItem({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  tone: "green" | "red" | "slate";
}) {
  const classes =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-red-50 text-red-500"
        : "bg-slate-100 text-slate-500";
  return (
    <div>
      <div className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl ${classes}`}>
        {icon}
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-sm font-bold text-[#69708b]">{label}</p>
    </div>
  );
}

function Control({
  icon,
  text,
  onClick,
}: {
  icon: ReactNode;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mb-4 flex w-full items-center gap-4 text-left font-bold text-[#303956]"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#efe9ff] text-[#6d35ff]">
        {icon}
      </span>
      {text}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function formatDuration(seconds?: number) {
  const total = seconds || 0;
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

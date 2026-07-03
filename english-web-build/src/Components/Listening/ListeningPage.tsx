"use client";

import { api } from "@/src/lib/axios";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Diamond,
  Flame,
  Gift,
  Headphones,
  Home,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
  ShieldQuestion,
  Star,
  Volume2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  duration: number;
  question: string;
  options: ListeningOption[];
  answered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  isFlagged: boolean;
  explanation?: string;
  correctAnswer?: string;
};

type ListeningPractice = {
  sessionId: string;
  level: string;
  topic: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  progress: {
    percent: number;
    correct: number;
    wrong: number;
    skipped: number;
  };
  questions: ListeningQuestion[];
};

export default function ListeningPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [practice, setPractice] = useState<ListeningPractice | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [listenedCount, setListenedCount] = useState(0);
  const [questionStartAt, setQuestionStartAt] = useState<number>(Date.now());

  const currentQuestion = practice?.questions?.[currentIndex];

  const progress = useMemo(() => {
    if (!practice) {
      return {
        percent: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
      };
    }

    return practice.progress;
  }, [practice]);

  const loadListeningPractice = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await api.get<ListeningPractice>(
        "/listening/practice?level=B1&topic=Environment&limit=10",
      );

      setPractice(res.data);
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
  };

  useEffect(() => {
    loadListeningPractice();
  }, []);

  useEffect(() => {
    setSelectedAnswer(currentQuestion?.selectedAnswer || null);
    setQuestionStartAt(Date.now());
    setListenedCount(0);
    setIsPlaying(false);
  }, [currentQuestion?.id]);

  const handlePlayAudio = () => {
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

    // Nếu backend chưa có audioUrl thì dùng Web Speech API đọc transcript sau này.
    setMessage("Bài này chưa có file audio. Bạn cần tạo audioUrl hoặc dùng TTS.");
  };

  const handleSelectAnswer = (answer: string) => {
    if (!currentQuestion || currentQuestion.answered) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = async () => {
    if (!practice || !currentQuestion || !selectedAnswer) return;

    try {
      setSubmitting(true);
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

      const result = res.data;

      setPractice((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          progress: result.progress,
          questions: prev.questions.map((q) =>
            q.id === currentQuestion.id
              ? {
                  ...q,
                  answered: true,
                  selectedAnswer,
                  isCorrect: result.isCorrect,
                  correctAnswer: result.correctAnswer,
                  explanation: result.explanation,
                }
              : q,
          ),
        };
      });
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Không nộp được đáp án.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!practice) return;

    if (!currentQuestion?.answered) {
      await handleSubmitAnswer();
      return;
    }

    if (currentIndex < practice.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    await handleFinish();
  };

  const handlePrev = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex((prev) => prev - 1);
  };

  const handleFinish = async () => {
    if (!practice) return;

    try {
      setSubmitting(true);

      const res = await api.post(
        `/listening/sessions/${practice.sessionId}/finish`,
      );

      setMessage(
        `Hoàn thành! Điểm: ${res.data.score}, đúng ${res.data.correct}/${res.data.totalQuestions}.`,
      );
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Không kết thúc được bài.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white p-8 text-center shadow">
          <p className="text-2xl font-black text-violet-700">Đang tải bài nghe...</p>
          <p className="mt-2 text-slate-500">Vui lòng chờ một chút.</p>
        </div>
      </div>
    );
  }

  if (!practice || !currentQuestion) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white p-8 text-center shadow">
          <p className="text-xl font-black text-red-500">Không có dữ liệu luyện nghe</p>
          <button
            onClick={loadListeningPractice}
            className="mt-4 rounded-xl bg-violet-600 px-6 py-3 font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  const totalQuestions = practice.questions.length;

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#070735]">
      <audio
        ref={audioRef}
        src={currentQuestion.audioUrl || undefined}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[290px] border-r bg-white px-5 py-6">
          <div className="mb-10 flex items-center gap-3 text-3xl font-black">
            🦊 <span>Study<span className="text-violet-600">Arena</span></span>
          </div>

          <nav className="space-y-6 text-sm font-semibold">
            <MenuItem icon={<Home size={18} />} label="Trang chủ" />

            <div>
              <p className="mb-3 text-xs font-bold text-slate-400">HỌC TẬP</p>
              <MenuItem icon={<BookOpen size={18} />} label="Tổng quan" />
              <MenuItem icon={<BookOpen size={18} />} label="Từ vựng" />
              <MenuItem icon={<BookOpen size={18} />} label="Ngữ pháp" />
              <MenuItem active icon={<Volume2 size={18} />} label="Nghe" />

              <div className="ml-7 mt-2 space-y-3 border-l pl-5">
                <p className="w-fit rounded-lg bg-violet-100 px-3 py-1 text-violet-700">
                  Luyện nghe
                </p>
                <p>Nghe chép chính tả</p>
                <p>Nghe hiểu đoạn</p>
                <p>Nghe theo chủ đề</p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold text-slate-400">CỘNG ĐỒNG</p>
              <MenuItem icon={<ShieldQuestion size={18} />} label="Cộng đồng" />
              <MenuItem icon={<ShieldQuestion size={18} />} label="Hỏi đáp" />
            </div>

            <MenuItem icon={<Settings size={18} />} label="Cài đặt" />
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-violet-50 p-4">
            <p className="font-bold text-violet-700">👑 Nâng cấp Premium</p>
            <p className="mt-1 text-xs text-slate-500">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">
              Nâng cấp ngay
            </button>
          </div>
        </aside>

        <main className="ml-[290px] flex-1">
          <header className="sticky top-0 z-20 flex h-[92px] items-center justify-between border-b bg-white px-12">
            <div className="flex h-12 w-[580px] items-center gap-3 rounded-xl border px-4">
              <Search className="text-slate-400" size={22} />
              <input
                className="w-full outline-none"
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
              />
            </div>

            <div className="flex items-center gap-8">
              <TopStat icon={<Flame />} value="18" label="Streak" />
              <TopStat icon={<Star />} value="2,450" label="XP hôm nay" />
              <TopStat icon={<Diamond />} value="5,230" label="Xu" />
              <Gift className="text-violet-600" />
              <Bell />
            </div>
          </header>

          <div className="grid grid-cols-[1fr_420px] gap-10 px-12 py-8">
            <section>
              <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
                Trang chủ <ChevronRight size={16} /> Nghe <ChevronRight size={16} />
                <span className="font-bold text-slate-800">Luyện nghe</span>
              </div>

              <div className="mb-8 flex items-end justify-between">
                <div>
                  <h1 className="flex items-center gap-3 text-4xl font-black">
                    Luyện nghe <Volume2 className="text-violet-600" />
                  </h1>
                  <p className="mt-2 text-lg text-slate-500">
                    Nghe và chọn đáp án đúng
                  </p>
                </div>

                <button
                  onClick={handleFinish}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl border bg-white px-6 py-3 font-bold"
                >
                  Thoát bài <LogOut size={18} />
                </button>
              </div>

              {message && (
                <div className="mb-5 rounded-xl bg-yellow-50 px-5 py-4 font-medium text-yellow-700">
                  {message}
                </div>
              )}

              <div className="rounded-2xl border bg-white p-8 shadow-sm">
                <div className="mb-6 flex gap-5">
                  <Badge text={`⏱ Câu ${currentIndex + 1} / ${totalQuestions}`} violet />
                  <Badge text={`▣ ${practice.level} - Trung cấp`} green />
                  <Badge text={`🌿 Chủ đề: ${practice.topic}`} />
                </div>

                <div className="rounded-2xl bg-violet-50 p-6">
                  <div className="flex items-center gap-7">
                    <button
                      onClick={handlePlayAudio}
                      className="grid size-16 place-items-center rounded-full bg-violet-600 text-white shadow-lg"
                    >
                      {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                    </button>

                    <div className="flex-1">
                      <div className="mb-5 h-12 rounded-xl bg-[repeating-linear-gradient(90deg,#7c3aed_0_3px,transparent_3px_10px)] opacity-70" />
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>0:00</span>
                        <div className="h-2 flex-1 rounded-full bg-violet-100">
                          <div className="h-2 w-[18%] rounded-full bg-violet-600" />
                        </div>
                        <span>{formatDuration(currentQuestion.duration)}</span>
                        <button className="rounded-xl border border-violet-300 bg-white px-4 py-2 font-bold text-violet-700">
                          1.0x
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className="mt-8 text-xl font-black">
                  {currentQuestion.question}
                </h2>
                <p className="mt-2 text-slate-500">
                  Nghe đoạn hội thoại và chọn đáp án đúng nhất.
                </p>

                <div className="mt-6 space-y-4">
                  {currentQuestion.options.map((option) => {
                    const isSelected = selectedAnswer === option.label;
                    const isAnswered = currentQuestion.answered;
                    const isCorrect = currentQuestion.correctAnswer === option.label;
                    const isWrongSelected =
                      isAnswered && isSelected && !currentQuestion.isCorrect;

                    return (
                      <button
                        key={option.label}
                        onClick={() => handleSelectAnswer(option.label)}
                        className={`flex w-full items-center gap-5 rounded-xl border px-5 py-4 text-left transition ${
                          isAnswered && isCorrect
                            ? "border-green-500 bg-green-50 text-green-700"
                            : isWrongSelected
                              ? "border-red-500 bg-red-50 text-red-700"
                              : isSelected
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "bg-white hover:border-violet-300"
                        }`}
                      >
                        <div
                          className={`grid size-6 place-items-center rounded-full border ${
                            isSelected
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && <div className="size-2 rounded-full bg-white" />}
                        </div>
                        <span className="font-bold">{option.label}</span>
                        <p>{option.text}</p>
                      </button>
                    );
                  })}
                </div>

                {currentQuestion.answered && currentQuestion.explanation && (
                  <div className="mt-6 rounded-xl bg-blue-50 p-4 text-blue-700">
                    <b>Giải thích:</b> {currentQuestion.explanation}
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="rounded-xl border border-violet-400 px-10 py-4 font-bold text-violet-700 disabled:opacity-40"
                  >
                    ← Quay lại
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={submitting || (!selectedAnswer && !currentQuestion.answered)}
                    className="rounded-xl bg-violet-600 px-10 py-4 font-bold text-white shadow-lg disabled:opacity-40"
                  >
                    {currentQuestion.answered
                      ? currentIndex === totalQuestions - 1
                        ? "Hoàn thành"
                        : "Câu tiếp theo →"
                      : "Nộp đáp án"}
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-5 rounded-2xl bg-emerald-50 p-6">
                <Headphones className="text-emerald-500" size={36} />
                <div>
                  <p className="font-bold text-emerald-700">Mẹo nhỏ</p>
                  <p className="text-sm text-emerald-700">
                    Tập trung vào từ khóa và ngữ điệu. Đừng cố hiểu từng từ, hãy nắm ý chính trước nhé!
                  </p>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <Card title="Tiến độ bài học">
                <div className="mb-8 flex items-center gap-4">
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-violet-600"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <b>{progress.percent}%</b>
                </div>

                <div className="grid grid-cols-3 text-center">
                  <ProgressItem icon={<CheckCircle2 />} value={progress.correct} label="Đúng" green />
                  <ProgressItem icon={<XCircle />} value={progress.wrong} label="Sai" red />
                  <ProgressItem icon={<XCircle />} value={progress.skipped} label="Bỏ qua" />
                </div>
              </Card>

              <Card title="Danh sách câu hỏi">
                <div className="grid grid-cols-5 gap-4">
                  {practice.questions.map((q, index) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(index)}
                      className={`size-12 rounded-full font-bold ${
                        index === currentIndex
                          ? "bg-violet-600 text-white"
                          : q.answered && q.isCorrect
                            ? "bg-green-100 text-green-700"
                            : q.answered && q.isCorrect === false
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-500">
                  <span>🟢 Đúng</span>
                  <span>🔴 Sai</span>
                  <span>⚪ Chưa làm</span>
                  <span>🟣 Đang làm</span>
                </div>
              </Card>

              <Card title="Điều khiển">
                <Control icon={<RotateCcw size={18} />} text="Tua lại 5 giây" />
                <Control icon={<RotateCcw size={18} />} text="Tua tới 5 giây" />
                <Control icon={<Play size={18} />} text="Phát / Tạm dừng" />
                <Control icon={<BookOpen size={18} />} text="Hiện lời thoại" />
              </Card>

              <div className="flex items-center justify-between rounded-2xl bg-violet-50 p-6 shadow-sm">
                <div>
                  <p className="font-black">💡 Mẹo luyện nghe</p>
                  <p className="mt-2 text-sm">
                    Nghe lần đầu để nắm ý chính, lần 2 để chú ý chi tiết nhé!
                  </p>
                </div>
                <div className="text-7xl">🦊</div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function formatDuration(seconds?: number) {
  const total = seconds || 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MenuItem({ icon, label, active }: any) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl px-4 py-3 ${
        active ? "bg-violet-100 text-violet-700" : "text-slate-700"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function TopStat({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-violet-600">{icon}</div>
      <div>
        <p className="font-black">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Badge({ text, violet, green }: any) {
  return (
    <span
      className={`rounded-lg px-4 py-2 text-sm font-bold ${
        violet
          ? "bg-violet-100 text-violet-700"
          : green
            ? "bg-green-100 text-green-700"
            : "bg-white text-slate-600"
      }`}
    >
      {text}
    </span>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-xl font-black">{title}</h3>
      {children}
    </div>
  );
}

function ProgressItem({ icon, value, label, green, red }: any) {
  return (
    <div>
      <div
        className={`mx-auto mb-3 grid size-12 place-items-center rounded-xl ${
          green
            ? "bg-green-100 text-green-600"
            : red
              ? "bg-red-100 text-red-600"
              : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function Control({ icon, text }: any) {
  return (
    <div className="mb-4 flex items-center gap-4 font-medium">
      <div className="grid size-9 place-items-center rounded-lg bg-violet-100 text-violet-600">
        {icon}
      </div>
      {text}
    </div>
  );
}
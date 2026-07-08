"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  BookText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  FileText,
  Flame,
  Gem,
  Gift,
  Headphones,
  HelpCircle,
  Home,
  Layers,
  Mic,
  PenTool,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Trophy,
  Users,
  Volume2,
} from "lucide-react";
import { api } from "@/src/lib/axios";

const menuGroups = [
  {
    title: "",
    items: [{ label: "Trang chủ", icon: Home }],
  },
  {
    title: "Học tập",
    items: [
      { label: "Tổng quan", icon: BarChart3 },
      { label: "Từ vựng", icon: BookText },
      { label: "Ngữ pháp", icon: Layers },
      { label: "Nghe", icon: Headphones },
      { label: "Nói", icon: Mic },
      { label: "Đọc hiểu", icon: BookOpen, active: true },
      { label: "Viết", icon: PenTool },
      { label: "Flashcards", icon: Layers },
    ],
  },
  {
    title: "Cộng đồng",
    items: [
      { label: "Cộng đồng", icon: Users },
      { label: "Hỏi đáp", icon: HelpCircle },
      { label: "Thành tích", icon: Trophy },
    ],
  },
  {
    title: "Khác",
    items: [
      { label: "Khoá học", icon: BookText },
      { label: "Shop", icon: ShoppingBag },
      { label: "Cài đặt", icon: Settings },
    ],
  },
];

type ReadingQuestionOption = string;

type ReadingLessonResponse = {
  article: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    content: string;
    categoryName: string;
    categorySlug: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    difficultyText: string;
    readTimeText: string;
    wordCountText: string;
    xpReward: number;
  };
  session: {
    id: string;
    isCompleted: boolean;
    score: number;
    accuracy: number;
    answeredCount: number;
    totalQuestions: number;
    progressPercent: number;
  } | null;
  questions: {
    id: string;
    index: number;
    question: string;
    options: ReadingQuestionOption[];
    selected: string | null;
  }[];
  vocabulary: {
    id: string;
    word: string;
    partOfSpeech: string | null;
    meaning: string;
    audioUrl?: string | null;
  }[];
  tip?: {
    title: string;
    content: string;
  };
};

type SubmitResult = {
  sessionId: string;
  score: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  earnedXp: number;
  isCompleted: boolean;
  resultUrl: string;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1000&auto=format&fit=crop";

export default function ReadingLessonPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();

  const [data, setData] = useState<ReadingLessonResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(
    {},
  );
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");

  async function fetchLesson() {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/reading/articles/${params.slug}`);
      const payload: ReadingLessonResponse = res.data?.data ?? res.data;

      const answers: Record<string, string> = {};

      payload.questions.forEach((question) => {
        if (question.selected) {
          answers[question.id] = question.selected;
        }
      });

      setData(payload);
      setSelectedAnswers(answers);

      if (payload.session?.id) {
        setSessionId(payload.session.id);
      } else {
        const startRes = await api.post(
          `/reading/articles/${payload.article.id}/start`,
        );
        const startPayload = startRes.data?.data ?? startRes.data;

        setSessionId(startPayload.sessionId);

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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const answeredCount = useMemo(
    () => Object.keys(selectedAnswers).length,
    [selectedAnswers],
  );

  const totalQuestions = data?.questions.length ?? 0;

  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const currentQuestionText =
    totalQuestions > 0
      ? `Câu hỏi ${answeredCount}/${totalQuestions}`
      : "Câu hỏi 0/0";

  async function handleSelectAnswer(questionId: string, option: string) {
    if (!sessionId || submitting || submitResult) return;

    try {
      setAnsweringId(questionId);

      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: option,
      }));

      await api.post(`/reading/sessions/${sessionId}/answer`, {
        questionId,
        selected: option,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu câu trả lời");
    } finally {
      setAnsweringId(null);
    }
  }

  async function handleSubmit() {
  if (!sessionId || submitting) return;

  try {
    setSubmitting(true);
    setError("");

    const res = await api.post(
      `/reading/sessions/${sessionId}/submit`
    );

    const payload: SubmitResult = res.data?.data ?? res.data;

    router.replace(payload.resultUrl);
  } catch (err: any) {
    setError(
      err?.response?.data?.message ||
      err?.message ||
      "Không thể nộp bài"
    );
  } finally {
    setSubmitting(false);
  }
}

  const paragraphs = useMemo(() => {
    if (!data?.article.content) return [];

    return data.article.content
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [data?.article.content]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="font-bold text-slate-700">Đang tải bài đọc...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <p className="mb-4 font-bold text-red-500">{error}</p>
          <button
            onClick={fetchLesson}
            className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#fbfbff] text-slate-900">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[260px] border-r border-slate-100 bg-white px-5 py-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="text-3xl">🦊</div>
            <div className="text-2xl font-extrabold">
              Study<span className="text-violet-600">Arena</span>
            </div>
          </div>

          <nav className="space-y-7">
            {menuGroups.map((group, index) => (
              <div key={index}>
                {group.title && (
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </p>
                )}

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div
                      key={item.label}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                        item.active
                          ? "bg-violet-100 text-violet-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-violet-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold text-violet-700">
              <Crown size={18} className="text-yellow-500" />
              Nâng cấp Premium
            </div>
            <p className="mb-4 text-sm leading-5 text-slate-500">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
              Nâng cấp ngay
            </button>
            <div className="absolute bottom-2 right-3 text-5xl">🦊</div>
          </div>
        </aside>

        <main className="ml-[260px] flex-1">
          <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-slate-100 bg-white/80 px-8 backdrop-blur">
            <div className="relative w-[520px]">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
                className="h-12 w-full rounded-xl border border-slate-100 bg-slate-50 pl-14 pr-4 text-sm outline-none focus:border-violet-300"
              />
            </div>

            <div className="flex items-center gap-6">
              <TopStat
                icon={<Flame className="text-red-500" />}
                value="18"
                label="Streak"
              />
              <TopStat
                icon={<Star className="text-yellow-500" />}
                value="2.450"
                label="XP hôm nay"
              />
              <TopStat
                icon={<Gem className="text-cyan-500" />}
                value="5.230"
                label="Xu"
              />

              <div className="flex gap-3">
                <IconCircle>
                  <Gift size={18} />
                </IconCircle>
                <IconCircle badge>
                  <Bell size={18} />
                </IconCircle>
              </div>

              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-100 text-xl">
                  👨🏻‍💻
                </div>
                <div>
                  <p className="text-sm font-bold">Minh Anh</p>
                  <p className="text-xs text-slate-400">Level 18</p>
                </div>
              </div>
            </div>
          </header>

          <div className="p-8">
            {error && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            )}

            {submitResult && (
              <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                Hoàn thành! Đúng {submitResult.correctCount}/
                {submitResult.totalQuestions}, độ chính xác {submitResult.accuracy}%,
                nhận +{submitResult.earnedXp} XP.
              </div>
            )}

            <div className="mb-7 flex items-center justify-between">
              <div>
                <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <span>Đọc hiểu</span>
                  <ChevronRight size={16} />
                  <button
                    onClick={() =>
                      router.push(`/reading/categories/${data.article.categorySlug}`)
                    }
                  >
                    {data.article.categoryName}
                  </button>
                  <ChevronRight size={16} />
                  <span className="text-slate-900">{data.article.title}</span>
                </div>

                <button
                  onClick={() => router.back()}
                  className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm"
                >
                  <ChevronLeft size={16} />
                  Quay lại
                </button>

                <h1 className="text-3xl font-extrabold">{data.article.title}</h1>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Badge text={data.article.difficultyText} />
                  <InfoPill
                    icon={<Clock size={16} />}
                    text={data.article.readTimeText}
                  />
                  <InfoPill
                    icon={<FileText size={16} />}
                    text={data.article.wordCountText}
                  />
                  <InfoPill
                    icon={<Star size={16} />}
                    text={`+${data.article.xpReward} XP`}
                  />
                </div>
              </div>

              <div className="w-[300px] rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-extrabold">Tiến độ bài học</h3>
                  <span className="text-sm font-extrabold">
                    {progressPercent}%
                  </span>
                </div>
                <div className="mb-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-violet-600"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-sm text-slate-500">
                  {answeredCount}/{totalQuestions} câu trả lời
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_520px] gap-4">
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-lg font-extrabold">Bài đọc</h2>

                <img
                  src={data.article.thumbnail || fallbackImage}
                  alt={data.article.title}
                  className="mb-6 h-[310px] w-full rounded-2xl object-cover"
                />

                <div className="space-y-6 text-[15px] leading-8 text-slate-700">
                  {paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>

                <div className="mt-10 rounded-2xl border border-violet-100 bg-violet-50/40 p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-violet-700">
                      Từ vựng quan trọng
                    </h3>
                    <button className="text-sm font-bold text-violet-600">
                      Xem thêm
                    </button>
                  </div>

                  {data.vocabulary.length === 0 ? (
                    <p className="text-sm font-semibold text-slate-500">
                      Chưa có từ vựng cho bài đọc này.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      {data.vocabulary.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <button className="grid h-9 w-9 place-items-center rounded-full bg-violet-100">
                            <Volume2 size={17} className="text-violet-600" />
                          </button>
                          <div>
                            <h4 className="font-extrabold">
                              {item.word}{" "}
                              {item.partOfSpeech && (
                                <span className="font-semibold">
                                  ({item.partOfSpeech})
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-slate-500">
                              {item.meaning}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-2xl bg-amber-50 p-5">
                  <div className="mb-2 flex items-center gap-2 font-extrabold text-amber-700">
                    💡 {data.tip?.title || "Mẹo nhỏ"}
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {data.tip?.content ||
                      "Đọc lướt toàn bài trước để nắm ý chính, sau đó trả lời câu hỏi sẽ giúp bạn hiểu sâu và nhớ lâu hơn."}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <h2 className="font-extrabold">{currentQuestionText}</h2>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Clock size={16} />
                      {formatTime(elapsedSeconds)}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !sessionId || answeredCount === 0}
                    className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Đang nộp..." : "Nộp bài"}
                  </button>
                </div>

                <div className="space-y-5">
                  {data.questions.map((item) => (
                    <QuestionCard
                      key={item.id}
                      item={item}
                      selected={selectedAnswers[item.id] ?? null}
                      disabled={answeringId === item.id || !!submitResult}
                      onSelect={(option) => handleSelectAnswer(item.id, option)}
                    />
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <button
                onClick={() => setActiveQuestion((prev) => Math.max(prev - 1, 1))}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-100 px-8 py-3 text-sm font-bold text-violet-600"
              >
                <ChevronLeft size={16} />
                Câu trước
              </button>

              <div className="flex items-center gap-6 font-bold">
                {data.questions.map((question) => (
                  <button
                    key={question.id}
                    onClick={() => setActiveQuestion(question.index)}
                    className={`grid h-10 w-10 place-items-center rounded-full ${
                      question.index === activeQuestion
                        ? "bg-violet-600 text-white"
                        : selectedAnswers[question.id]
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-700"
                    }`}
                  >
                    {question.index}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setActiveQuestion((prev) => Math.min(prev + 1, totalQuestions))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-violet-100 px-8 py-3 text-sm font-bold text-violet-600"
              >
                Câu tiếp theo
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function QuestionCard({
  item,
  selected,
  disabled,
  onSelect,
}: {
  item: {
    id: string;
    index: number;
    question: string;
    options: string[];
  };
  selected: string | null;
  disabled?: boolean;
  onSelect: (option: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-5">
      <div className="mb-5 flex items-center gap-4">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-violet-600 text-sm font-extrabold text-white">
          {item.index}
        </div>
        <h3 className="font-extrabold">{item.question}</h3>
      </div>

      <div className="space-y-3">
        {item.options.map((option) => {
          const active = option === selected;

          return (
            <button
              key={option}
              disabled={disabled}
              onClick={() => onSelect(option)}
              className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left text-sm font-semibold disabled:cursor-not-allowed ${
                active
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-transparent text-slate-600"
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border ${
                  active
                    ? "border-violet-600 bg-violet-600"
                    : "border-slate-300"
                }`}
              >
                {active && <CheckCircle2 size={13} className="text-white" />}
              </span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-blue-600">
      {text}
    </span>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
      {icon}
      {text}
    </div>
  );
}

function IconCircle({
  children,
  badge,
}: {
  children: React.ReactNode;
  badge?: boolean;
}) {
  return (
    <div className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-violet-600">
      {children}
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-bold text-white">
          2
        </span>
      )}
    </div>
  );
}

function TopStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-sm font-extrabold">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");

  return `${m}:${s}`;
}

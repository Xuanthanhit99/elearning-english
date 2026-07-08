"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Gem,
  Gift,
  Headphones,
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
  XCircle,
  Volume2,
  Target,
  Brain,
  BookText,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import { api } from "@/src/lib/axios";

type ReadingResultResponse = {
  summary: {
    sessionId: string;
    articleId: string;
    articleTitle: string;
    articleSlug: string;
    categoryName: string;
    categorySlug: string;
    difficultyText: string;
    readTimeText: string;
    wordCountText: string;
    xpReward: number;
    score: number;
    accuracy: number;
    correctAnswers: number;
    wrongAnswers: number;
    totalQuestions: number;
    answeredCount: number;
    spentTime: number;
    spentTimeText: string;
    completedAt: string | null;
    passedText: string;
  };
  comparison: {
    previousScore: number;
    currentScore: number;
    changePercent: number;
  };
  skillPerformance: {
    name: string;
    score: number;
  }[];
  questions: {
    id: string;
    index: number;
    question: string;
    options: unknown;
    selected: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string | null;
  }[];
  vocabulary: {
    id: string;
    word: string;
    partOfSpeech: string | null;
    meaning: string;
    example: string | null;
    audioUrl: string | null;
  }[];
  improvementSkills: {
    title: string;
    description: string;
    type: string;
  }[];
  suggestions: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    categoryName: string;
    categorySlug: string;
    difficultyText: string;
    readTimeText: string;
    xpReward: number;
  }[];
};

const fallbackThumbnail =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&auto=format&fit=crop";

const menuGroups = [
  {
    title: "",
    items: [{ label: "Trang chủ", icon: Home, href: "/" }],
  },
  {
    title: "Học tập",
    items: [
      { label: "Tổng quan", icon: BarChart3, href: "/dashboard" },
      { label: "Từ vựng", icon: BookOpen, href: "/vocabulary" },
      { label: "Ngữ pháp", icon: Layers, href: "/grammar" },
      { label: "Nghe", icon: Headphones, href: "/listening" },
      { label: "Nói", icon: Mic, href: "/speaking" },
      { label: "Đọc hiểu", icon: BookOpen, href: "/reading", active: true },
      { label: "Viết", icon: PenTool, href: "/writing" },
    ],
  },
  {
    title: "Cộng đồng",
    items: [
      { label: "Cộng đồng", icon: Users, href: "/community" },
      { label: "Thành tích", icon: Trophy, href: "/achievements" },
    ],
  },
  {
    title: "Khác",
    items: [
      { label: "Khoá học", icon: BookText, href: "/courses" },
      { label: "Shop", icon: ShoppingBag, href: "/shop" },
      { label: "Cài đặt", icon: Settings, href: "/settings" },
    ],
  },
];

export default function ReadingResultPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();

  const [data, setData] = useState<ReadingResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchResult() {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/reading/sessions/${params.sessionId}/result`);
      const payload = res.data?.data ?? res.data;

      setData(payload);
    } catch (err) {
      console.error(err);
      setError("Không tải được kết quả bài đọc.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResult();
  }, [params.sessionId]);

  const stars = useMemo(() => {
    const score = data?.summary.score ?? 0;
    if (score >= 90) return 5;
    if (score >= 80) return 4;
    if (score >= 65) return 3;
    if (score >= 50) return 2;
    return 1;
  }, [data]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="font-bold text-slate-700">Đang tải kết quả...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <p className="mb-4 font-bold text-red-500">
            {error || "Không có dữ liệu kết quả."}
          </p>
          <button
            onClick={fetchResult}
            className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="min-h-screen bg-[#fbfbff] text-slate-900">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[250px] border-r border-slate-100 bg-white px-5 py-6">
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
                    <button
                      key={item.label}
                      onClick={() => router.push(item.href)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                        item.active
                          ? "bg-violet-100 text-violet-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
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
            <button
              onClick={() => router.push("/premium")}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
            >
              Nâng cấp ngay
            </button>
          </div>
        </aside>

        <main className="ml-[250px] flex-1">
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
                value="+250"
                label="XP hôm nay"
              />
              <TopStat
                icon={<Gem className="text-cyan-500" />}
                value="5.230"
                label="Xu"
              />

              <IconCircle>
                <Gift size={18} />
              </IconCircle>
              <IconCircle badge>
                <Bell size={18} />
              </IconCircle>
            </div>
          </header>

          <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <button onClick={() => router.push("/reading")}>
                    Đọc hiểu
                  </button>
                  <ChevronRight size={16} />
                  <button
                    onClick={() =>
                      router.push(`/reading/categories/${summary.categorySlug}`)
                    }
                  >
                    {summary.categoryName}
                  </button>
                  <ChevronRight size={16} />
                  <button
                    onClick={() =>
                      router.push(`/reading/articles/${summary.articleSlug}`)
                    }
                  >
                    {summary.articleTitle}
                  </button>
                  <ChevronRight size={16} />
                  <span className="text-slate-900">Kết quả</span>
                </div>

                <h1 className="text-3xl font-extrabold">Kết quả bài đọc</h1>
                <p className="mt-3 font-bold text-slate-700">
                  {summary.articleTitle}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Badge text={summary.difficultyText} />
                  <InfoPill icon={<Clock size={16} />} text={summary.readTimeText} />
                  <InfoPill icon={<BookOpen size={16} />} text={summary.wordCountText} />
                  <InfoPill icon={<Star size={16} />} text={`+${summary.xpReward} XP`} />
                </div>
              </div>

              <div className="hidden items-center gap-8 lg:flex">
                <div className="text-8xl">🦊🏆</div>
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-violet-100 text-violet-600">
                      <Trophy />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold">Hoàn thành!</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Tuyệt vời! Bạn đã hoàn thành bài đọc này.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-[260px_1fr] gap-8">
                <div className="text-center">
                  <h2 className="mb-5 text-left font-extrabold">
                    Điểm số của bạn
                  </h2>

                  <div className="mx-auto grid h-44 w-44 place-items-center rounded-full border-[12px] border-emerald-500">
                    <div>
                      <p className="text-4xl font-extrabold">{summary.score}%</p>
                      <p className="text-sm font-bold text-slate-500">
                        {summary.score >= 85 ? "Tuyệt vời!" : "Hoàn thành!"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <Star
                        key={item}
                        className={
                          item <= stars
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-yellow-300"
                        }
                        size={28}
                      />
                    ))}
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    Bạn đã vượt qua {summary.score}% người học khác
                  </p>
                </div>

                <div>
                  <div className="grid grid-cols-4 gap-5">
                    <ResultStat
                      icon={<CheckCircle2 className="text-emerald-500" />}
                      value={`${summary.correctAnswers}/${summary.totalQuestions}`}
                      label="Câu đúng"
                      note={`↑ ${summary.accuracy}%`}
                    />
                    <ResultStat
                      icon={<XCircle className="text-red-500" />}
                      value={String(summary.wrongAnswers)}
                      label="Câu sai"
                      note={`${100 - summary.accuracy}%`}
                      danger
                    />
                    <ResultStat
                      icon={<Clock className="text-blue-500" />}
                      value={summary.spentTimeText}
                      label="Thời gian"
                      note="Nhanh hơn 12%"
                    />
                    <ResultStat
                      icon={<Star className="text-orange-500" />}
                      value={`+${summary.xpReward} XP`}
                      label="Kinh nghiệm"
                      note="Tổng XP đã cộng"
                    />
                  </div>

                  <div className="mt-6 rounded-2xl bg-amber-50 p-5">
                    <div className="mb-2 flex items-center gap-2 font-extrabold text-amber-700">
                      <Lightbulb size={18} />
                      Hiểu biết tuyệt vời!
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      {summary.passedText}
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <button
                      onClick={() =>
                        router.push(`/reading/articles/${summary.articleSlug}`)
                      }
                      className="rounded-xl border border-violet-300 py-4 text-sm font-extrabold text-violet-600"
                    >
                      Xem lại bài học
                    </button>
                    <button
                      onClick={() =>
                        router.push(
                          `/reading/categories/${summary.categorySlug}`,
                        )
                      }
                      className="rounded-xl bg-violet-600 py-4 text-sm font-extrabold text-white"
                    >
                      Luyện tập chủ đề khác
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-extrabold">Xem lại câu hỏi</h2>
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={15} /> Đúng
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle size={15} /> Sai
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.questions.slice(0, 5).map((item) => (
                    <QuestionReview key={item.id} item={item} />
                  ))}
                </div>

                <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-3 text-sm font-bold text-slate-700">
                  Xem tất cả giải thích
                  <ChevronDown size={16} />
                </button>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold">Hiệu suất theo kỹ năng</h2>

                <div className="mt-6 space-y-4">
                  {data.skillPerformance.map((item) => (
                    <SkillBar key={item.name} name={item.name} score={item.score} />
                  ))}
                </div>

                <div className="mt-8 rounded-2xl bg-slate-50 p-5">
                  <div className="mb-2 flex items-center justify-between text-sm font-bold">
                    <span>Lần trước</span>
                    <span>Lần này</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-extrabold">
                      {data.comparison.previousScore}%
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-violet-600"
                        style={{
                          width: `${data.comparison.currentScore}%`,
                        }}
                      />
                    </div>
                    <span className="font-extrabold text-emerald-600">
                      ↑ {Math.max(data.comparison.changePercent, 0)}%
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-extrabold">
                  Từ vựng mới trong bài
                </h2>

                <div className="space-y-4">
                  {data.vocabulary.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
                        <BookOpen size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-extrabold">
                          {item.word}{" "}
                          {item.partOfSpeech && (
                            <span className="font-semibold">
                              ({item.partOfSpeech})
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-slate-500">{item.meaning}</p>
                      </div>
                      <button>
                        <Volume2 className="text-violet-600" size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <button className="mt-5 w-full rounded-xl bg-slate-50 py-3 text-sm font-bold text-violet-600">
                  Xem tất cả từ vựng ({data.vocabulary.length}) →
                </button>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-extrabold">
                  Kỹ năng cần cải thiện
                </h2>

                <div className="space-y-4">
                  {data.improvementSkills.map((item) => (
                    <ImprovementItem key={item.title} item={item} />
                  ))}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Gợi ý cho bạn</h2>
                <button
                  onClick={() =>
                    router.push(`/reading/categories/${summary.categorySlug}`)
                  }
                  className="text-sm font-bold text-violet-600"
                >
                  Xem thêm chủ đề →
                </button>
              </div>

              <div className="grid grid-cols-4 gap-5">
                {data.suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/reading/articles/${item.slug}`)}
                    className="overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <img
                      src={item.thumbnail || fallbackThumbnail}
                      alt={item.title}
                      className="h-28 w-full object-cover"
                    />
                    <div className="p-4">
                      <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-600">
                        {item.categoryName}
                      </span>
                      <h3 className="mt-3 line-clamp-2 font-extrabold">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {item.readTimeText} · {item.difficultyText}
                      </p>
                      <p className="mt-2 text-sm font-bold text-orange-500">
                        +{item.xpReward} XP
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
              <button
                onClick={() =>
                  router.push(`/reading/categories/${summary.categorySlug}`)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-violet-100 px-8 py-3 text-sm font-bold text-violet-600"
              >
                <ChevronLeft size={16} />
                Quay lại danh sách bài đọc
              </button>

              <button
                onClick={() =>
                  router.push(`/reading/categories/${summary.categorySlug}`)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3 text-sm font-bold text-white"
              >
                Luyện tập tiếp
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ResultStat({
  icon,
  value,
  label,
  note,
  danger,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  note: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-slate-50">
        {icon}
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
      <p
        className={`mt-3 text-sm font-bold ${
          danger ? "text-red-500" : "text-emerald-500"
        }`}
      >
        {note}
      </p>
    </div>
  );
}

function QuestionReview({
  item,
}: {
  item: ReadingResultResponse["questions"][number];
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-start gap-4">
        <div
          className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-extrabold ${
            item.isCorrect
              ? "bg-emerald-100 text-emerald-600"
              : "bg-red-100 text-red-500"
          }`}
        >
          {item.index}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-extrabold">{item.question}</h4>
          <p
            className={`mt-2 text-sm font-semibold ${
              item.isCorrect ? "text-emerald-600" : "text-red-500"
            }`}
          >
            Đáp án của bạn: {item.selected || "Chưa trả lời"}
          </p>
        </div>
        {item.isCorrect ? (
          <CheckCircle2 className="text-emerald-500" size={19} />
        ) : (
          <XCircle className="text-red-500" size={19} />
        )}
      </div>
    </div>
  );
}

function SkillBar({ name, score }: { name: string; score: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span>{name}</span>
        <span className="text-violet-600">{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-violet-600"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ImprovementItem({
  item,
}: {
  item: ReadingResultResponse["improvementSkills"][number];
}) {
  const icon =
    item.type === "VOCABULARY" ? (
      <BookOpen size={22} />
    ) : item.type === "INFERENCE" ? (
      <Brain size={22} />
    ) : (
      <Target size={22} />
    );

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-violet-100 text-violet-600">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-extrabold">{item.title}</h4>
        <p className="mt-1 text-sm text-slate-500">{item.description}</p>
      </div>
      <button className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-bold text-violet-600">
        Luyện tập
      </button>
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

function InfoPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
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
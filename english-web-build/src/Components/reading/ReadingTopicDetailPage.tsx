"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  Home,
  BarChart3,
  BookText,
  Headphones,
  Mic,
  PenTool,
  Layers,
  Users,
  HelpCircle,
  Trophy,
  ShoppingBag,
  Settings,
  Crown,
  Gift,
  Bell,
  Flame,
  Star,
  Gem,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  Bookmark,
  Play,
  Target,
  Clock,
  FileText,
  Volume2,
  Leaf,
  BadgeCheck,
} from "lucide-react";
import { api } from "@/src/lib/axios";
import { useSpeak } from "@/src/hooks/useSpeak";

type TopicDetailResponse = {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    articleCount: number;
    difficultyText: string;
    totalReadTimeText: string;
    totalXp: number;
  };
  progress: {
    percent: number;
    totalArticles: number;
    completedArticles: number;
    learningArticles: number;
    notStartedArticles: number;
  };
  articles: {
    id: string;
    index: number;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    difficultyText: string;
    readTimeText: string;
    wordCountText: string;
    progressPercent: number;
    status: "completed" | "learning" | "new";
    buttonText: string;
  }[];
  featuredVocabulary: {
    id: string;
    word: string;
    partOfSpeech: string | null;
    meaning: string;
  }[];
  achievements: {
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
  }[];
  suggestions: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    difficultyText: string;
    readTimeText: string;
    wordCountText: string;
  }[];
};

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

const categoryFallbackImage =
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=700&auto=format&fit=crop";

const articleFallbackImages = [
  "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=500&auto=format&fit=crop",
];

export default function ReadingTopicDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();

  const [data, setData] = useState<TopicDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { speak, isSpeaking } = useSpeak();

  async function fetchTopicDetail() {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/reading/categories/${params.slug}`);
      const payload = res.data?.data ?? res.data;

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTopicDetail();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="font-bold text-slate-700">Đang tải chủ đề...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <p className="mb-4 font-bold text-red-500">{error}</p>
          <button
            onClick={fetchTopicDetail}
            className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  const nextArticle =
    data.articles.find((item) => item.status === "learning") ||
    data.articles.find((item) => item.status === "new") ||
    data.articles[0];

  const mainSuggestion = data.suggestions[0];

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
            <div className="relative w-[660px]">
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
                value={String(data.category.totalXp)}
                label="XP chủ đề"
              />
              <TopStat
                icon={<Gem className="text-cyan-500" />}
                value="0"
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
                  <p className="text-xs text-slate-400">Reading</p>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_470px] gap-7 p-8">
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <button onClick={() => router.push("/reading")}>Đọc hiểu</button>
                <ChevronRight size={16} />
                <button onClick={() => router.push("/reading/categories")}>
                  Danh sách chủ đề
                </button>
                <ChevronRight size={16} />
                <span className="text-slate-900">{data.category.name}</span>
              </div>

              <div className="flex gap-6 rounded-3xl bg-white p-4">
                <img
                  src={data.category.thumbnail || categoryFallbackImage}
                  alt={data.category.name}
                  className="h-56 w-72 rounded-2xl object-cover"
                />

                <div className="flex-1 py-1">
                  <div className="mb-2 inline-flex rounded-lg bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-600">
                    Chủ đề
                  </div>

                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-extrabold">
                      {data.category.name}
                    </h1>
                    <Bookmark className="text-slate-400" />
                  </div>

                  <p className="mt-4 text-slate-500">
                    {data.category.description || "Chủ đề luyện đọc hiểu tiếng Anh."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <InfoPill
                      icon={<BookOpen size={17} />}
                      text={`${data.category.articleCount} bài đọc`}
                    />
                    <InfoPill
                      icon={<BarChart3 size={17} />}
                      text={data.category.difficultyText}
                    />
                    <InfoPill
                      icon={<Clock size={17} />}
                      text={data.category.totalReadTimeText}
                    />
                    <InfoPill
                      icon={<Star size={17} />}
                      text={`+${data.category.totalXp} XP`}
                    />
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() =>
                        nextArticle &&
                        router.push(`/reading/articles/${nextArticle.slug}`)
                      }
                      disabled={!nextArticle}
                      className="flex h-14 items-center gap-3 rounded-xl bg-violet-600 px-8 text-sm font-bold text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Play size={18} />
                      {nextArticle?.status === "learning"
                        ? "Tiếp tục học"
                        : "Bắt đầu học"}
                    </button>

                    <button className="flex h-14 items-center gap-3 rounded-xl border border-violet-300 px-8 text-sm font-bold text-violet-600">
                      <Target size={18} />
                      Luyện tập chủ đề
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-slate-100">
                {[
                  "Tổng quan",
                  `Bài đọc (${data.category.articleCount})`,
                  `Từ vựng (${data.featuredVocabulary.length})`,
                  "Thành tích",
                ].map((tab, index) => (
                  <button
                    key={tab}
                    className={`px-7 pb-4 text-sm font-bold ${
                      index === 0
                        ? "border-b-2 border-violet-600 text-violet-600"
                        : "text-slate-500"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-extrabold">
                  Danh sách bài đọc
                </h2>

                {data.articles.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                    Chủ đề này chưa có bài đọc.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.articles.map((article, index) => (
                      <ArticleRow
                        key={article.id}
                        article={{
                          index: article.index,
                          title: article.title,
                          slug: article.slug,
                          desc: article.description || "",
                          image:
                            article.thumbnail ||
                            articleFallbackImages[index % articleFallbackImages.length],
                          level: article.difficultyText,
                          badge: getDifficultyBadge(article.difficultyText),
                          time: article.readTimeText,
                          words: article.wordCountText,
                          progress: article.progressPercent,
                          status: article.status,
                          buttonText: article.buttonText,
                        }}
                      />
                    ))}
                  </div>
                )}

                <button className="mt-5 w-full rounded-xl bg-slate-50 py-3 text-sm font-bold text-violet-600">
                  Xem tất cả {data.category.articleCount} bài đọc⌄
                </button>
              </div>
            </section>

            <aside className="space-y-6">
              <RightCard title="Tiến độ chủ đề">
                <div className="flex items-center gap-8">
                  <div className="grid h-44 w-44 place-items-center rounded-full border-[12px] border-violet-600">
                    <div className="text-center">
                      <p className="text-4xl font-extrabold">
                        {data.progress.percent}%
                      </p>
                      <p className="text-sm text-slate-500">Hoàn thành</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <ProgressItem
                      value={String(data.progress.completedArticles)}
                      label="Bài đã hoàn thành"
                    />
                    <ProgressItem
                      value={String(data.progress.learningArticles)}
                      label="Bài đang học"
                    />
                    <ProgressItem
                      value={String(data.progress.notStartedArticles)}
                      label="Bài chưa học"
                    />
                  </div>
                </div>

                <p className="mt-4 text-center text-sm font-semibold text-slate-500">
                  Tổng: {data.progress.totalArticles} bài đọc
                </p>
              </RightCard>

              <RightCard
                title="Từ vựng nổi bật"
                action={
                  <button className="text-sm font-bold text-violet-600">
                    Xem tất cả
                  </button>
                }
              >
                {data.featuredVocabulary.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500">
                    Chưa có từ vựng nổi bật.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.featuredVocabulary.map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => speak(item.id, item.word)}
                          disabled={isSpeaking(item.id)}
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-50 transition disabled:cursor-not-allowed ${isSpeaking(item.id) ? "animate-pulse opacity-70" : "hover:bg-violet-100"}`}
                        >
                          <Volume2 size={17} className="text-violet-600" />
                        </button>
                        <div>
                          <h4 className="font-extrabold">
                            {item.word}{" "}
                            <span className="font-semibold">
                              {item.partOfSpeech ? `(${item.partOfSpeech})` : ""}
                            </span>
                          </h4>
                          <p className="text-sm text-slate-500">{item.meaning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </RightCard>

              <RightCard title="Thành tích">
                <div className="grid grid-cols-3 gap-5 text-center">
                  {data.achievements.map((item, index) => (
                    <Achievement
                      key={item.id}
                      icon={getAchievementIcon(index)}
                      title={item.title}
                      desc={item.description}
                      color={
                        item.unlocked ? getAchievementColor(index) : "text-slate-400"
                      }
                      bg={item.unlocked ? getAchievementBg(index) : "bg-slate-100"}
                    />
                  ))}
                </div>
              </RightCard>

              <RightCard
                title="Gợi ý cho bạn"
                action={
                  <button className="text-sm font-bold text-violet-600">
                    Xem thêm
                  </button>
                }
              >
                {mainSuggestion ? (
                  <button
                    onClick={() =>
                      router.push(`/reading/articles/${mainSuggestion.slug}`)
                    }
                    className="flex w-full items-center gap-4 text-left"
                  >
                    <img
                      src={mainSuggestion.thumbnail || articleFallbackImages[1]}
                      alt={mainSuggestion.title}
                      className="h-16 w-20 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold">{mainSuggestion.title}</h4>
                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-bold ${getDifficultyBadge(
                            mainSuggestion.difficultyText,
                          )}`}
                        >
                          {mainSuggestion.difficultyText}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {mainSuggestion.readTimeText}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText size={14} /> {mainSuggestion.wordCountText}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-400" />
                  </button>
                ) : (
                  <p className="text-sm font-semibold text-slate-500">
                    Chưa có gợi ý phù hợp.
                  </p>
                )}
              </RightCard>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function ArticleRow({
  article,
}: {
  article: {
    index: number;
    title: string;
    slug: string;
    desc: string;
    image: string;
    level: string;
    badge: string;
    time: string;
    words: string;
    progress: number;
    status: "completed" | "learning" | "new";
    buttonText: string;
  };
}) {
  const router = useRouter();

  return (
    <div
      className={`flex items-center gap-5 rounded-2xl border p-4 ${
        article.status === "learning"
          ? "border-violet-200 bg-violet-50/20"
          : "border-slate-100"
      }`}
    >
      <div className="grid h-11 w-11 place-items-center rounded-full bg-violet-100 text-lg font-extrabold text-violet-600">
        {article.index}
      </div>

      <img
        src={article.image}
        alt={article.title}
        className="h-24 w-36 rounded-xl object-cover"
      />

      <div className="flex-1">
        <div className="mb-2 flex items-center gap-3">
          <h3 className="font-extrabold">{article.title}</h3>
          <span
            className={`rounded-lg px-3 py-1 text-xs font-bold ${article.badge}`}
          >
            {article.level}
          </span>
        </div>

        <p className="mb-4 text-sm text-slate-500">{article.desc}</p>

        <div className="flex gap-5 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={15} /> {article.time}
          </span>
          <span className="flex items-center gap-1">
            <FileText size={15} /> {article.words}
          </span>
        </div>
      </div>

      <div className="w-48">
        {article.status === "completed" ? (
          <div className="mb-4 flex items-center justify-end gap-2 text-sm font-bold text-emerald-600">
            <CheckCircle2 size={17} />
            Đã hoàn thành
          </div>
        ) : (
          <>
            <div className="mb-2 flex justify-between text-sm font-bold text-slate-500">
              <span>{article.progress > 0 ? "Tiến độ" : "0%"}</span>
              {article.progress > 0 && <span>{article.progress}%</span>}
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-violet-600"
                style={{ width: `${article.progress}%` }}
              />
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => router.push(`/reading/articles/${article.slug}`)}
        className={`w-24 rounded-xl border px-4 py-2 text-sm font-bold ${
          article.status === "completed"
            ? "border-violet-300 text-violet-600"
            : article.status === "learning"
              ? "border-violet-600 bg-violet-600 text-white"
              : "border-violet-300 text-violet-600"
        }`}
      >
        {article.buttonText}
      </button>
    </div>
  );
}

function getDifficultyBadge(level: string) {
  if (level === "Dễ") return "bg-emerald-100 text-emerald-600";
  if (level === "Trung bình") return "bg-blue-100 text-blue-600";
  return "bg-orange-100 text-orange-600";
}

function getAchievementIcon(index: number) {
  if (index === 0) return <Leaf size={45} />;
  if (index === 1) return <BookOpen size={45} />;
  return <BadgeCheck size={45} />;
}

function getAchievementColor(index: number) {
  if (index === 0) return "text-emerald-600";
  if (index === 1) return "text-blue-600";
  return "text-violet-600";
}

function getAchievementBg(index: number) {
  if (index === 0) return "bg-emerald-100";
  if (index === 1) return "bg-blue-100";
  return "bg-violet-100";
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
      {icon}
      {text}
    </div>
  );
}

function Achievement({
  icon,
  title,
  desc,
  color,
  bg,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  bg: string;
}) {
  return (
    <div>
      <div
        className={`mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full ${bg} ${color}`}
      >
        {icon}
      </div>
      <h4 className="text-sm font-extrabold">{title}</h4>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
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

function RightCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ProgressItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50">
        <CheckCircle2 size={18} className="text-emerald-500" />
      </div>
      <div>
        <p className="font-extrabold">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

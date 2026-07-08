"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Flame,
  Gem,
  Gift,
  Grid3X3,
  Headphones,
  Home,
  Layers,
  List,
  Lock,
  Mic,
  PenTool,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { api } from "@/src/lib/axios";

type ArticleStatus = "ALL" | "COMPLETED" | "LEARNING" | "NOT_STARTED";
type DifficultyFilter = "ALL" | "EASY" | "MEDIUM" | "HARD";
type SortType = "newest" | "popular" | "xp" | "readTime";

type ReadingArticlesResponse = {
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    totalArticles: number;
    completedArticles: number;
    learningArticles: number;
    notStartedArticles: number;
    progressPercent: number;
  };
  filters: {
    categories: {
      label: string;
      value: string;
      count: number;
    }[];
    difficulties: {
      label: string;
      value: DifficultyFilter;
    }[];
    statuses: {
      label: string;
      value: ArticleStatus;
    }[];
  };
  articles: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    categoryName: string;
    categorySlug: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    difficultyText: string;
    level: string;
    readTimeText: string;
    wordCountText: string;
    questionCount: number;
    xpReward: number;
    status: "COMPLETED" | "LEARNING" | "NOT_STARTED";
    progressPercent: number;
    isLocked: boolean;
  }[];
  achievements: {
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
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
      { label: "Từ vựng", icon: BookText, href: "/vocabulary" },
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

export default function ReadingAllArticlesPage() {
  const router = useRouter();

  const [data, setData] = useState<ReadingArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [status, setStatus] = useState<ArticleStatus>("ALL");
  const [sort, setSort] = useState<SortType>("newest");
  const [keyword, setKeyword] = useState("");
  const [pendingKeyword, setPendingKeyword] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", "8");
      params.set("sort", sort);

      if (category !== "all") {
        params.set("category", category);
      }

      if (difficulty !== "ALL") {
        params.set("difficulty", difficulty);
      }

      if (status !== "ALL") {
        params.set("status", status);
      }

      if (keyword.trim()) {
        params.set("keyword", keyword.trim());
      }

      const res = await api.get(`/reading/articles?${params.toString()}`);
      const payload = res.data?.data ?? res.data;

      setData(payload);
    } catch (err) {
      console.error(err);
      setError("Không tải được danh sách bài đọc.");
    } finally {
      setLoading(false);
    }
  }, [page, category, difficulty, status, sort, keyword]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setKeyword(pendingKeyword);
  }

  function resetFilters() {
    setPage(1);
    setCategory("all");
    setDifficulty("ALL");
    setStatus("ALL");
    setSort("newest");
    setPendingKeyword("");
    setKeyword("");
  }

  function goToArticle(article: ReadingArticlesResponse["articles"][number]) {
    if (article.isLocked) return;
    router.push(`/reading/articles/${article.slug}`);
  }

  const pages = useMemo(() => {
    const total = data?.meta.totalPages || 1;
    return Array.from({ length: total }, (_, index) => index + 1).slice(0, 7);
  }, [data?.meta.totalPages]);

  if (loading && !data) {
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
            onClick={fetchArticles}
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

        <main className="ml-[260px] flex-1">
          <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-slate-100 bg-white/80 px-8 backdrop-blur">
            <form onSubmit={handleSearchSubmit} className="relative w-[620px]">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                value={pendingKeyword}
                onChange={(e) => setPendingKeyword(e.target.value)}
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
                className="h-12 w-full rounded-xl border border-slate-100 bg-slate-50 pl-14 pr-4 text-sm outline-none focus:border-violet-300"
              />
            </form>

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

              <IconCircle>
                <Gift size={18} />
              </IconCircle>
              <IconCircle badge>
                <Bell size={18} />
              </IconCircle>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_430px] gap-7 p-8">
            <section>
              <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <button onClick={() => router.push("/reading")}>Đọc hiểu</button>
                <ChevronRight size={16} />
                <span className="text-slate-900">Tất cả bài đọc</span>
              </div>

              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h1 className="text-4xl font-extrabold">Tất cả bài đọc</h1>
                  <p className="mt-3 text-slate-500">
                    Khám phá tất cả các bài đọc theo nhiều chủ đề khác nhau.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <select
                    value={sort}
                    onChange={(e) => {
                      setPage(1);
                      setSort(e.target.value as SortType);
                    }}
                    className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold outline-none"
                  >
                    <option value="newest">Sắp xếp: Mới nhất</option>
                    <option value="popular">Sắp xếp: Phổ biến</option>
                    <option value="xp">Sắp xếp: XP cao</option>
                    <option value="readTime">Sắp xếp: Thời gian đọc</option>
                  </select>

                  <div className="flex rounded-xl bg-slate-100 p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`grid h-10 w-10 place-items-center rounded-lg ${
                        viewMode === "grid"
                          ? "bg-violet-600 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      <Grid3X3 size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`grid h-10 w-10 place-items-center rounded-lg ${
                        viewMode === "list"
                          ? "bg-violet-600 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                {data.filters.categories.slice(0, 5).map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setPage(1);
                      setCategory(item.value);
                    }}
                    className={`rounded-xl px-5 py-3 text-sm font-bold ${
                      category === item.value
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                        : "border border-slate-100 bg-white text-slate-600"
                    }`}
                  >
                    {item.label} ({item.count})
                  </button>
                ))}
              </div>

              {loading && (
                <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                  Đang cập nhật dữ liệu...
                </div>
              )}

              {data.articles.length === 0 ? (
                <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                  <p className="font-bold text-slate-700">
                    Không có bài đọc phù hợp.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-3">
                  {data.articles.map((article) => (
                    <ArticleListItem
                      key={article.id}
                      article={article}
                      onClick={() => goToArticle(article)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-5">
                  {data.articles.map((article) => (
                    <ArticleGridItem
                      key={article.id}
                      article={article}
                      onClick={() => goToArticle(article)}
                    />
                  ))}
                </div>
              )}

              <div className="mt-8 flex justify-center gap-2">
                <button
                  disabled={!data.meta.hasPrevPage}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-100 bg-white disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>

                {pages.map((item) => (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold ${
                      page === item
                        ? "bg-violet-600 text-white"
                        : "border border-slate-100 bg-white text-slate-600"
                    }`}
                  >
                    {item}
                  </button>
                ))}

                <button
                  disabled={!data.meta.hasNextPage}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-100 bg-white disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </section>

            <aside className="space-y-6">
              <RightCard title="Tiến độ đọc hiểu">
                <div className="flex items-center gap-7">
                  <div className="grid h-44 w-44 place-items-center rounded-full border-[12px] border-violet-600">
                    <div className="text-center">
                      <p className="text-4xl font-extrabold">
                        {data.summary.progressPercent}%
                      </p>
                      <p className="text-sm text-slate-500">Hoàn thành</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <ProgressItem
                      value={String(data.summary.completedArticles)}
                      label="Bài đã hoàn thành"
                    />
                    <ProgressItem
                      value={String(data.summary.learningArticles)}
                      label="Bài đang đọc"
                    />
                    <ProgressItem
                      value={String(data.summary.notStartedArticles)}
                      label="Bài chưa đọc"
                    />
                  </div>
                </div>

                <p className="mt-4 text-center text-sm font-semibold text-slate-500">
                  {data.summary.completedArticles} / {data.summary.totalArticles} bài đã đọc
                </p>
              </RightCard>

              <RightCard
                title="Bộ lọc"
                action={
                  <button
                    onClick={resetFilters}
                    className="text-sm font-bold text-violet-600"
                  >
                    Xóa lọc
                  </button>
                }
              >
                <div className="space-y-6">
                  <FilterGroup title="Cấp độ">
                    <div className="grid grid-cols-4 gap-2">
                      {data.filters.difficulties.map((item) => (
                        <button
                          key={item.value}
                          onClick={() => {
                            setPage(1);
                            setDifficulty(item.value);
                          }}
                          className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                            difficulty === item.value
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-100 bg-white text-slate-700"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </FilterGroup>

                  <FilterGroup title="Chủ đề">
                    <select
                      value={category}
                      onChange={(e) => {
                        setPage(1);
                        setCategory(e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold outline-none"
                    >
                      {data.filters.categories.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </FilterGroup>

                  <FilterGroup title="Trạng thái">
                    <div className="space-y-3">
                      {data.filters.statuses.map((item) => (
                        <label
                          key={item.value}
                          className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-600"
                        >
                          <input
                            type="radio"
                            checked={status === item.value}
                            onChange={() => {
                              setPage(1);
                              setStatus(item.value);
                            }}
                            className="h-4 w-4 accent-violet-600"
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </FilterGroup>

                  <button
                    onClick={fetchArticles}
                    className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white"
                  >
                    Áp dụng bộ lọc
                  </button>
                </div>
              </RightCard>

              <RightCard
                title="Thành tích"
                action={
                  <button
                    onClick={() => router.push("/achievements")}
                    className="text-sm font-bold text-violet-600"
                  >
                    Xem tất cả
                  </button>
                }
              >
                <div className="grid grid-cols-3 gap-4 text-center">
                  {data.achievements.map((item) => (
                    <div
                      key={item.id}
                      className={!item.unlocked ? "opacity-40" : ""}
                    >
                      <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                        <Trophy size={32} />
                      </div>
                      <h4 className="text-xs font-extrabold">{item.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </RightCard>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function ArticleListItem({
  article,
  onClick,
}: {
  article: ReadingArticlesResponse["articles"][number];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={article.isLocked}
      className="flex w-full items-center gap-5 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed"
    >
      <img
        src={article.thumbnail || fallbackThumbnail}
        alt={article.title}
        className="h-24 w-40 rounded-xl object-cover"
      />

      <div className="flex-1">
        <div className="mb-2 flex items-center gap-3">
          <h3 className="font-extrabold">{article.title}</h3>
          <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
            {article.categoryName}
          </span>
        </div>

        <p className="line-clamp-2 text-sm text-slate-500">
          {article.description || "Chưa có mô tả."}
        </p>

        <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-500">
          <span
            className={`font-bold ${
              article.difficulty === "HARD"
                ? "text-red-500"
                : article.difficulty === "MEDIUM"
                  ? "text-blue-500"
                  : "text-emerald-500"
            }`}
          >
            {article.difficultyText}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={15} /> {article.readTimeText}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={15} /> {article.wordCountText}
          </span>
          <span className="font-bold text-orange-500">
            +{article.xpReward} XP
          </span>
        </div>
      </div>

      <ArticleProgress article={article} />

      <ChevronRight className="text-slate-400" />
    </button>
  );
}

function ArticleGridItem({
  article,
  onClick,
}: {
  article: ReadingArticlesResponse["articles"][number];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={article.isLocked}
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed"
    >
      <img
        src={article.thumbnail || fallbackThumbnail}
        alt={article.title}
        className="h-36 w-full object-cover"
      />
      <div className="p-4">
        <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
          {article.categoryName}
        </span>
        <h3 className="mt-3 line-clamp-2 font-extrabold">{article.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
          {article.description || "Chưa có mô tả."}
        </p>
        <div className="mt-4 flex justify-between text-sm">
          <span>{article.readTimeText}</span>
          <span className="font-bold text-orange-500">
            +{article.xpReward} XP
          </span>
        </div>
      </div>
    </button>
  );
}

function ArticleProgress({
  article,
}: {
  article: ReadingArticlesResponse["articles"][number];
}) {
  if (article.isLocked) {
    return (
      <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Lock size={22} />
      </div>
    );
  }

  if (article.status === "COMPLETED") {
    return (
      <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={24} />
      </div>
    );
  }

  return (
    <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-violet-600 text-sm font-extrabold text-violet-600">
      {article.progressPercent}%
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-extrabold">{title}</h3>
      {children}
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
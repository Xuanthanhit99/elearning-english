"use client";

import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid3X3,
  List,
  Lock,
  Search,
  Target,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/src/lib/axios";
import {
  ApiEnvelope,
  ReadingArticlesResponse,
} from "./reading-v2.types";
import {
  missionStatusText,
  useReadingMissions,
} from "./use-reading-missions";

type Status = "ALL" | "COMPLETED" | "LEARNING" | "NOT_STARTED";
type Difficulty = "ALL" | "EASY" | "MEDIUM" | "HARD";
type Sort = "newest" | "popular" | "xp" | "readTime";

const fallbackThumbnail =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&auto=format&fit=crop";

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  return typeof value === "object" &&
    value !== null &&
    "data" in value
    ? (value as ApiEnvelope<T>).data
    : (value as T);
}

export default function ReadingAllArticlesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] =
    useState<ReadingArticlesResponse | null>(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] =
    useState<Difficulty>("ALL");
  const [status, setStatus] = useState<Status>("ALL");
  const [sort, setSort] = useState<Sort>("newest");
  const [keyword, setKeyword] = useState(
    searchParams.get("keyword") ?? "",
  );
  const [searchInput, setSearchInput] = useState(keyword);
  const [view, setView] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { dailyMission, missionForArticle } =
    useReadingMissions();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "8",
        sort,
      });

      if (category !== "all") params.set("category", category);
      if (difficulty !== "ALL")
        params.set("difficulty", difficulty);
      if (status !== "ALL") params.set("status", status);
      if (keyword.trim()) params.set("keyword", keyword.trim());

      const response = await api.get<
        ReadingArticlesResponse | ApiEnvelope<ReadingArticlesResponse>
      >(`/reading/articles?${params.toString()}`);

      setData(unwrap(response.data));
    } catch {
      setError("Không tải được danh sách bài đọc.");
    } finally {
      setLoading(false);
    }
  }, [page, category, difficulty, status, sort, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  function search(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setKeyword(searchInput);
  }

  function reset() {
    setPage(1);
    setCategory("all");
    setDifficulty("ALL");
    setStatus("ALL");
    setSort("newest");
    setKeyword("");
    setSearchInput("");
  }

  const pages = useMemo(() => {
    const total = data?.meta.totalPages ?? 1;
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [data?.meta.totalPages]);

  if (loading && !data) {
    return <State text="Đang tải bài đọc..." />;
  }

  if (error && !data) {
    return <State text={error} action={load} />;
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-[#fbfbff] px-5 py-6 text-slate-900 lg:px-10">
      <header className="mx-auto flex max-w-[1500px] flex-col gap-4 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={search} className="relative w-full lg:max-w-[620px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={19}
          />
          <input
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            placeholder="Tìm bài đọc..."
            className="h-12 w-full rounded-xl bg-slate-50 pl-12 pr-24 text-sm outline-none focus:ring-2 focus:ring-violet-200"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white">
            Tìm
          </button>
        </form>

        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`rounded-xl p-3 ${
              view === "list"
                ? "bg-violet-600 text-white"
                : "bg-slate-100"
            }`}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`rounded-xl p-3 ${
              view === "grid"
                ? "bg-violet-600 text-white"
                : "bg-slate-100"
            }`}
          >
            <Grid3X3 size={18} />
          </button>
        </div>
      </header>

      <div className="mx-auto mt-7 grid max-w-[1500px] gap-7 xl:grid-cols-[minmax(0,1fr)_350px]">
        <section className="min-w-0 space-y-6">
          {dailyMission && (
            <section className="rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-6 text-white">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black text-white/75">
                    <Target size={16} />
                    NHIỆM VỤ READING HÔM NAY
                  </div>
                  <h2 className="mt-2 text-2xl font-black">
                    {dailyMission.title}
                  </h2>
                  <p className="mt-2 text-sm text-white/75">
                    {dailyMission.description}
                  </p>
                </div>
                <div className="min-w-[210px]">
                  <div className="h-3 rounded-full bg-white/20">
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
                    {missionStatusText(dailyMission)} · +
                    {dailyMission.reward.xp} XP
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <button
                  onClick={() => router.push("/reading")}
                  className="text-sm font-bold text-violet-600"
                >
                  ← Reading Home
                </button>
                <h1 className="mt-3 text-3xl font-black">
                  Tất cả bài đọc
                </h1>
                <p className="mt-2 text-slate-500">
                  {data.meta.totalItems} kết quả ·{" "}
                  {data.summary.progressPercent}% đã hoàn thành
                </p>
              </div>

              <select
                value={sort}
                onChange={(event) => {
                  setPage(1);
                  setSort(event.target.value as Sort);
                }}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="newest">Mới nhất</option>
                <option value="popular">Phổ biến</option>
                <option value="xp">XP cao nhất</option>
                <option value="readTime">Thời gian ngắn</option>
              </select>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-600">
              {error}
            </div>
          )}

          {loading && (
            <p className="rounded-2xl bg-white p-5 text-center font-bold text-slate-500">
              Đang cập nhật danh sách...
            </p>
          )}

          <div
            className={
              view === "grid"
                ? "grid gap-5 md:grid-cols-2"
                : "space-y-4"
            }
          >
            {data.articles.map((article) => {
              const mission = missionForArticle(article.id);
              const recommended =
                mission?.lessonId === article.id;

              return (
                <button
                  key={article.id}
                  disabled={article.isLocked}
                  onClick={() =>
                    !article.isLocked &&
                    router.push(
                      `/reading/articles/${article.slug}`,
                    )
                  }
                  className={`relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed ${
                    recommended
                      ? "border-violet-400 ring-2 ring-violet-100"
                      : "border-slate-100"
                  } ${
                    view === "list"
                      ? "flex flex-col gap-5 p-4 sm:flex-row"
                      : ""
                  }`}
                >
                  {recommended && (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-violet-600 px-3 py-1 text-xs font-black text-white">
                      AI đề xuất
                    </span>
                  )}

                  <img
                    src={article.thumbnail || fallbackThumbnail}
                    alt={article.title}
                    className={
                      view === "list"
                        ? "h-32 w-full rounded-xl object-cover sm:w-48"
                        : "h-44 w-full object-cover"
                    }
                  />

                  <div className={view === "grid" ? "p-5" : "flex-1"}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                        {article.categoryName}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                        {article.level}
                      </span>
                    </div>

                    <h2 className="mt-3 line-clamp-2 text-lg font-black">
                      {article.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                      {article.description || "Chưa có mô tả."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={15} />
                        {article.readTimeText}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen size={15} />
                        {article.wordCountText}
                      </span>
                      <span className="font-bold text-orange-500">
                        +{article.xpReward} XP
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <ArticleStatus article={article} />
                      {article.isLocked ? (
                        <Lock size={18} className="text-slate-400" />
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-violet-600">
                          {article.status === "LEARNING"
                            ? "Tiếp tục"
                            : article.status === "COMPLETED"
                              ? "Ôn lại"
                              : "Bắt đầu"}
                          <ChevronRight size={17} />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {!data.articles.length && (
            <div className="rounded-3xl bg-white p-10 text-center font-bold text-slate-500">
              Không có bài đọc phù hợp.
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <button
              disabled={!data.meta.hasPrevPage}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-xl border bg-white p-3 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            {pages.map((item) => (
              <button
                key={item}
                onClick={() => setPage(item)}
                className={`h-11 min-w-11 rounded-xl font-black ${
                  item === page
                    ? "bg-violet-600 text-white"
                    : "border bg-white"
                }`}
              >
                {item}
              </button>
            ))}

            <button
              disabled={!data.meta.hasNextPage}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-xl border bg-white p-3 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </section>

        <aside className="space-y-5">
          <FilterCard title="Chủ đề">
            <select
              value={category}
              onChange={(event) => {
                setPage(1);
                setCategory(event.target.value);
              }}
              className="w-full rounded-xl border px-3 py-3 text-sm font-bold"
            >
              {data.filters.categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({item.count})
                </option>
              ))}
            </select>
          </FilterCard>

          <FilterCard title="Độ khó">
            <div className="grid grid-cols-2 gap-2">
              {data.filters.difficulties.map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setPage(1);
                    setDifficulty(item.value);
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-bold ${
                    difficulty === item.value
                      ? "bg-violet-600 text-white"
                      : "bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </FilterCard>

          <FilterCard title="Trạng thái">
            <div className="space-y-2">
              {data.filters.statuses.map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setPage(1);
                    setStatus(item.value);
                  }}
                  className={`w-full rounded-xl px-3 py-3 text-left text-sm font-bold ${
                    status === item.value
                      ? "bg-violet-50 text-violet-700"
                      : "bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </FilterCard>

          <button
            onClick={reset}
            className="w-full rounded-xl border border-violet-200 bg-white py-3 font-bold text-violet-600"
          >
            Xóa bộ lọc
          </button>
        </aside>
      </div>
    </main>
  );
}

function ArticleStatus({
  article,
}: {
  article: ReadingArticlesResponse["articles"][number];
}) {
  if (article.status === "COMPLETED") {
    return (
      <span className="flex items-center gap-2 text-sm font-bold text-emerald-600">
        <CheckCircle2 size={17} />
        Đã hoàn thành
      </span>
    );
  }

  if (article.status === "LEARNING") {
    return (
      <div className="min-w-[160px]">
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-violet-600"
            style={{ width: `${article.progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs font-bold text-violet-600">
          Đang đọc {article.progressPercent}%
        </p>
      </div>
    );
  }

  return (
    <span className="text-sm font-bold text-slate-400">
      Chưa bắt đầu
    </span>
  );
}

function FilterCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-black">{title}</h3>
      {children}
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

"use client";

import { api } from "@/src/lib/axios";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  List,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Topic = {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl?: string;
  difficulty: string;
  lessonCount: number;
  progressPercent: number;
};

type TopicResponse = {
  items: Topic[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function WritingTopicsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialType = searchParams.get("type") || "ALL";

  const [data, setData] = useState<TopicResponse | null>(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("ALL");
  const [progress, setProgress] = useState("ALL");
  const [sort, setSort] = useState("popular");
  const [type, setType] = useState(initialType);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");

  async function loadTopics(nextPage = page) {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/writing/topics", {
        params: {
          search: search.trim() || undefined,
          difficulty,
          progress,
          sort,
          type: type === "ALL" ? undefined : type,
          page: nextPage,
          limit: 10,
        },
      });

      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Không tải được danh sách chủ đề.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTopics(page);
  }, [difficulty, progress, sort, type, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (page === 1) {
      loadTopics(1);
    } else {
      setPage(1);
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#09083f]">
      <div className="flex">
        <main className="min-h-screen flex-1">
          <div className="px-10 py-8">
            <div>
              <h1 className="text-3xl font-extrabold">All Writing Topics</h1>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Explore topics and improve your writing skills step by step.
              </p>
            </div>

            <div className="mt-7 flex items-center gap-4">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search topics..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-5 pr-12 text-sm outline-none focus:border-violet-400"
                />
                <button type="submit">
                  <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </button>
              </form>

              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-[210px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 outline-none"
              >
                <option value="ALL">All Difficulties</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>

              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-[190px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="SENTENCE">Sentence</option>
                <option value="PARAGRAPH">Paragraph</option>
                <option value="ESSAY">Essay</option>
                <option value="EMAIL">Email</option>
                <option value="STORY">Story</option>
                <option value="IELTS_TASK_1">IELTS Task 1</option>
                <option value="IELTS_TASK_2">IELTS Task 2</option>
              </select>

              <select
                value={progress}
                onChange={(e) => {
                  setProgress(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-[210px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 outline-none"
              >
                <option value="ALL">All Progress</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-[210px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 outline-none"
              >
                <option value="popular">Sort by: Popular</option>
                <option value="newest">Sort by: Newest</option>
                <option value="progress">Sort by: Progress</option>
              </select>

              <button
                onClick={() => setViewMode("GRID")}
                className={`grid h-12 w-12 place-items-center rounded-xl border ${
                  viewMode === "GRID"
                    ? "border-violet-400 bg-violet-600 text-white"
                    : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                <Grid2X2 className="h-5 w-5" />
              </button>

              <button
                onClick={() => setViewMode("LIST")}
                className={`grid h-12 w-12 place-items-center rounded-xl border ${
                  viewMode === "LIST"
                    ? "border-violet-400 bg-violet-600 text-white"
                    : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>

            {loading && <div className="mt-8">Loading...</div>}

            {error && (
              <div className="mt-8 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            {!loading && !error && data?.items.length === 0 && (
              <div className="mt-8 rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
                Không tìm thấy chủ đề phù hợp.
              </div>
            )}

            {!loading && !error && (
              <div
                className={
                  viewMode === "GRID"
                    ? "mt-6 grid grid-cols-2 gap-4"
                    : "mt-6 space-y-4"
                }
              >
                {data?.items.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    onClick={() => router.push(`/writing/topics/${topic.slug}`)}
                  />
                ))}
              </div>
            )}

            <Pagination
              page={data && data.pagination.page || 1}
              totalPages={data && data.pagination.totalPages || 1}
              onChange={(nextPage) => setPage(nextPage)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function TopicCard({ topic, onClick }: { topic: Topic; onClick: () => void }) {
  const progressColor =
    topic.progressPercent >= 70
      ? "bg-violet-600"
      : topic.progressPercent >= 60
        ? "bg-green-500"
        : topic.progressPercent >= 50
          ? "bg-orange-400"
          : "bg-yellow-500";

  return (
    <button
      onClick={onClick}
      className="flex min-h-[170px] items-center gap-7 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="h-[135px] w-[160px] shrink-0 rounded-xl bg-cover bg-center"
        style={{
          backgroundImage: `url(${topic.imageUrl || "/images/writing/default-topic.png"})`,
        }}
      />

      <div className="min-w-0 flex-1">
        <h2 className="text-2xl font-extrabold">{topic.title}</h2>

        <p className="mt-2 line-clamp-2 max-w-[470px] text-sm leading-6 text-slate-600">
          {topic.description}
        </p>

        <div className="mt-5 flex items-center gap-5">
          <div className="h-1.5 flex-1 rounded-full bg-slate-200">
            <div
              className={`h-1.5 rounded-full ${progressColor}`}
              style={{ width: `${topic.progressPercent}%` }}
            />
          </div>

          <span className="w-10 text-sm font-extrabold">
            {topic.progressPercent}%
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <BookOpen className="h-4 w-4" />
            {topic.lessonCount} Lessons
          </p>

          <DifficultyBadge difficulty={topic.difficulty} />
        </div>
      </div>

      <ChevronRight className="h-7 w-7 text-slate-400" />
    </button>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config: Record<string, string> = {
    BEGINNER: "bg-green-100 text-green-600",
    INTERMEDIATE: "bg-blue-100 text-blue-600",
    ADVANCED: "bg-orange-100 text-orange-600",
  };

  const label: Record<string, string> = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${
        config[difficulty] || "bg-slate-100 text-slate-600"
      }`}
    >
      {label[difficulty] || difficulty}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {Array.from({ length: Math.min(totalPages, 3) }).map((_, index) => {
        const current = index + 1;

        return (
          <button
            key={current}
            onClick={() => onChange(current)}
            className={`grid h-9 w-9 place-items-center rounded-lg border text-sm font-bold ${
              page === current
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {current}
          </button>
        );
      })}

      {totalPages > 3 && (
        <>
          <span className="text-slate-400">...</span>
          <button
            onClick={() => onChange(totalPages)}
            className="grid h-9 min-w-9 place-items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

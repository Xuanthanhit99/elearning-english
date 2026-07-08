"use client";

import { api } from "@/src/lib/axios";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  Gift,
  Grid2X2,
  List,
  PenLine,
  Search,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  const [data, setData] = useState<TopicResponse | null>(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("ALL");
  const [progress, setProgress] = useState("ALL");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);

  async function loadTopics() {
    const res = await api.get("/writing/topics", {
      params: {
        search,
        difficulty,
        progress,
        sort,
        page,
        limit: 10,
      },
    });

    setData(res.data);
  }

  useEffect(() => {
    loadTopics();
  }, [difficulty, progress, sort, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadTopics();
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

              <button className="grid h-12 w-12 place-items-center rounded-xl border border-violet-400 bg-violet-600 text-white">
                <Grid2X2 className="h-5 w-5" />
              </button>

              <button className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400">
                <List className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              {data?.items.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onClick={() => router.push(`/writing/topics/${topic.slug}`)}
                />
              ))}
            </div>

            {data && (
              <Pagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onChange={setPage}
              />
            )}
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

const topics = [
  {
    title: 'Business',
    slug: 'business',
    description: 'Write about work, companies, marketing, finance and other business-related topics.',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
    difficulty: 'INTERMEDIATE',
    learnerCount: 1200,
    order: 1,
  },
  {
    title: 'Travel',
    slug: 'travel',
    description: 'Describe places, travel experiences, hotels, transportation and more.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    difficulty: 'BEGINNER',
    learnerCount: 900,
    order: 2,
  },
  {
    title: 'Education',
    slug: 'education',
    description: 'Write about school life, learning, teachers, education systems and future goals.',
    imageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f',
    difficulty: 'INTERMEDIATE',
    learnerCount: 1100,
    order: 3,
  },
  {
    title: 'Technology',
    slug: 'technology',
    description: 'Explore gadgets, AI, social media, and the impact of technology on our lives.',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    difficulty: 'INTERMEDIATE',
    learnerCount: 1800,
    order: 4,
  },
  {
    title: 'Health',
    slug: 'health',
    description: 'Discuss healthy habits, mental health, fitness, and healthcare topics.',
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528',
    difficulty: 'BEGINNER',
    learnerCount: 950,
    order: 5,
  },
  {
    title: 'Food',
    slug: 'food',
    description: 'Write about cuisine, cooking, restaurants, eating habits and food culture.',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    difficulty: 'BEGINNER',
    learnerCount: 700,
    order: 6,
  },
  {
    title: 'Environment',
    slug: 'environment',
    description: 'Talk about nature, pollution, climate change, and how to protect our planet.',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    difficulty: 'INTERMEDIATE',
    learnerCount: 1300,
    order: 7,
  },
  {
    title: 'Daily Life',
    slug: 'daily-life',
    description: 'Write about routines, hobbies, family, friends and everyday activities.',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f',
    difficulty: 'INTERMEDIATE',
    learnerCount: 1500,
    order: 8,
  },
  {
    title: 'Culture',
    slug: 'culture',
    description: 'Explore traditions, festivals, customs, and cultural diversity.',
    imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526',
    difficulty: 'BEGINNER',
    learnerCount: 800,
    order: 9,
  },
  {
    title: 'Opinion',
    slug: 'opinion',
    description: 'Express your views on social issues, trends, and controversial topics.',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0',
    difficulty: 'INTERMEDIATE',
    learnerCount: 1000,
    order: 10,
  },
];
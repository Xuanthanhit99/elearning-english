"use client";

import { api } from "@/src/lib/axios";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  GitBranch,
  MapPin,
  Search,
  Target,
  Type,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type GrammarCategory = {
  id: string;
  title: string;
  icon?: string | null;
  color?: string | null;
  totalTopics: number;
  totalLessons: number;
  completedLessons: number;
  progress: number;
};

type GrammarTopic = {
  id: string;
  title: string;
  description?: string | null;
  level?: string | null;
  category: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
};

type RoadmapItem = {
  id: string;
  title: string;
  total: number;
  completed: number;
  done: boolean;
  progress: number;
};

type RecentLesson = {
  id: string;
  title: string;
  topic: string;
  status: string;
  score: number;
};

type GrammarDashboard = {
  stats: {
    totalTopics: number;
    totalLessons: number;
    completedLessons: number;
    averageScore: number;
  };
  categories: GrammarCategory[];
  topics: GrammarTopic[];
  roadmap: {
    currentLevel: string;
    progress: number;
    items: RoadmapItem[];
  };
  recentLessons: RecentLesson[];
  recommend?: {
    title: string;
    description: string;
  };
};

const levels = [
  { label: "Tất cả", value: "ALL" },
  { label: "A1 - Cơ bản", value: "A1" },
  { label: "A2 - Sơ cấp", value: "A2" },
  { label: "B1 - Trung cấp", value: "B1" },
  { label: "B2 - Trung cao", value: "B2" },
  { label: "C1 - Cao cấp", value: "C1" },
  { label: "C2 - Thành thạo", value: "C2" },
];

const categoryIcons = [Clock, Type, GitBranch, FileText, MapPin, BookOpen];
const categoryTones = [
  { wrap: "bg-violet-50 border-violet-100", icon: "text-violet-600", bar: "bg-violet-500" },
  { wrap: "bg-sky-50 border-sky-100", icon: "text-sky-600", bar: "bg-sky-500" },
  { wrap: "bg-emerald-50 border-emerald-100", icon: "text-emerald-600", bar: "bg-emerald-500" },
  { wrap: "bg-orange-50 border-orange-100", icon: "text-orange-500", bar: "bg-orange-500" },
  { wrap: "bg-pink-50 border-pink-100", icon: "text-pink-500", bar: "bg-pink-500" },
];

function numberText(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

export default function GrammarPage() {
  const [dashboard, setDashboard] = useState<GrammarDashboard | null>(null);
  const [activeLevel, setActiveLevel] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setMessage("");
        const res = await api.get<GrammarDashboard>("/grammar/dashboard", {
          params: activeLevel === "ALL" ? {} : { level: activeLevel },
        });
        if (active) setDashboard(res.data);
      } catch {
        if (active) setMessage("Chưa tải được dữ liệu ngữ pháp.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [activeLevel]);

  const stats = useMemo(() => {
    const value = dashboard?.stats;
    const progress = value?.totalLessons
      ? Math.round(((value.completedLessons || 0) / value.totalLessons) * 100)
      : 0;

    return [
      {
        icon: BookOpen,
        value: numberText(value?.totalTopics || 0),
        label: "Chủ điểm ngữ pháp",
        sub: `${dashboard?.categories?.length || 0} nhóm chủ đề`,
        tone: "bg-violet-100 text-violet-600",
      },
      {
        icon: Calendar,
        value: numberText(value?.totalLessons || 0),
        label: "Bài học",
        sub: "Theo lộ trình hiện tại",
        tone: "bg-sky-100 text-sky-600",
      },
      {
        icon: CheckCircle2,
        value: numberText(value?.completedLessons || 0),
        label: "Bài đã hoàn thành",
        sub: `${progress}% tiến độ`,
        tone: "bg-emerald-100 text-emerald-600",
      },
      {
        icon: Target,
        value: `${value?.averageScore || 0}%`,
        label: "Điểm trung bình",
        sub: value?.averageScore ? "Tính theo bài đã làm" : "Chưa có điểm",
        tone: "bg-orange-100 text-orange-500",
      },
    ];
  }, [dashboard]);

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#11104a]">
      <header className="sticky top-0 z-10 flex h-[88px] items-center justify-between border-b border-slate-100 bg-white/85 px-7 backdrop-blur-xl">
        <div className="flex h-12 w-full max-w-[560px] items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/40 px-4">
          <Search size={20} className="text-slate-500" />
          <input
            placeholder="Tìm bài học, từ vựng, ngữ pháp..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </header>

      <div className="grid gap-8 px-5 py-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:px-8">
        <main className="min-w-0">
          <div className="mb-7 flex items-start justify-between gap-5">
            <div>
              <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-slate-500">
                <Link href="/">Trang chủ</Link>
                <ChevronRight size={16} />
                <span className="text-[#11104a]">Ngữ pháp</span>
              </div>
              <h1 className="text-4xl font-black">Ngữ pháp</h1>
              <p className="mt-2 text-lg font-medium text-slate-500">
                Học ngữ pháp theo trình độ từ cơ bản đến nâng cao
              </p>
            </div>

            <div className="hidden items-center gap-5 rounded-xl bg-sky-50 px-5 py-4 lg:flex">
              <p className="text-sm font-bold leading-6">
                Học ngữ pháp mỗi ngày
                <br />
                để giao tiếp tự nhiên hơn nhé!
              </p>
              <img src="/poppylingo-logo.png" alt="Mascot" className="h-24 w-24 object-contain" />
            </div>
          </div>

          <div className="mb-7 flex flex-wrap gap-3">
            {levels.map((level) => (
              <button
                key={level.value}
                onClick={() => setActiveLevel(level.value)}
                className={`rounded-xl px-5 py-3 text-sm font-bold ${
                  activeLevel === level.value
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-200"
                    : "border border-violet-100 bg-white text-slate-600"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>

          {message && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-5 font-bold text-red-600">
              {message}
            </div>
          )}

          <section className="mb-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-5">
                    <div className={`grid h-16 w-16 place-items-center rounded-2xl ${stat.tone}`}>
                      <Icon size={30} />
                    </div>
                    <div>
                      <p className="text-3xl font-black">{loading ? "..." : stat.value}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-500">{stat.label}</p>
                      <p className="mt-2 text-sm font-bold text-emerald-600">{stat.sub}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="mb-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Chủ đề ngữ pháp</h2>
              <button className="text-sm font-bold text-violet-600">Xem tất cả</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
              {(dashboard?.categories || []).slice(0, 5).map((category, index) => (
                <CategoryCard key={category.id} category={category} index={index} />
              ))}
              {!loading && !dashboard?.categories?.length && (
                <p className="col-span-full py-8 text-center font-bold text-slate-500">
                  Chưa có nhóm chủ đề ngữ pháp.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Chủ điểm ngữ pháp</h2>
              <button className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white px-5 py-3 text-sm font-bold text-slate-500">
                Sắp xếp: Mới nhất <ChevronDown size={16} />
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center font-bold text-slate-500">Đang tải dữ liệu ngữ pháp...</div>
            ) : dashboard?.topics?.length ? (
              <div className="divide-y divide-slate-100">
                {dashboard.topics.slice(0, 8).map((topic, index) => (
                  <TopicRow key={topic.id} topic={topic} index={index} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center font-bold text-slate-500">
                Chưa có chủ điểm ở trình độ này.
              </div>
            )}

            {!!dashboard?.topics?.length && (
              <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-100 py-4 font-black">
                Xem tất cả chủ điểm ngữ pháp <ChevronDown size={18} />
              </button>
            )}
          </section>
        </main>

        <aside className="space-y-6">
          <RoadmapPanel dashboard={dashboard} />
          <RecentPanel lessons={dashboard?.recentLessons || []} />
          <RecommendPanel text={dashboard?.recommend?.description} />
        </aside>
      </div>
    </div>
  );
}

function CategoryCard({ category, index }: { category: GrammarCategory; index: number }) {
  const tone = categoryTones[index % categoryTones.length];
  const Icon = categoryIcons[index % categoryIcons.length];

  return (
    <div className={`rounded-2xl border p-5 ${tone.wrap}`}>
      <div className="flex items-start justify-between">
        <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-white ${tone.icon}`}>
          <Icon size={30} />
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-[#6d35ff]">
          {category.totalTopics} chủ điểm
        </span>
      </div>
      <h3 className="mt-5 font-black">{category.title}</h3>
      <div className="mt-4 h-2 rounded-full bg-white/80">
        <div className={`h-2 rounded-full ${tone.bar}`} style={{ width: `${category.progress}%` }} />
      </div>
      <p className="mt-3 text-sm font-bold text-slate-600">
        {category.completedLessons}/{category.totalLessons} bài học
      </p>
    </div>
  );
}

function TopicRow({ topic, index }: { topic: GrammarTopic; index: number }) {
  const tone = categoryTones[index % categoryTones.length];
  const Icon = categoryIcons[index % categoryIcons.length];

  return (
    <div className="flex items-center gap-5 px-1 py-5">
      <div className={`grid h-16 w-16 place-items-center rounded-2xl ${tone.wrap} ${tone.icon}`}>
        <Icon size={28} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-black">{topic.title}</h3>
        <p className="mt-1 truncate text-sm font-medium text-slate-500">
          {topic.description || topic.category}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <span className="rounded-full bg-violet-100 px-4 py-1 text-sm font-bold text-violet-600">
            {topic.level || "ALL"}
          </span>
          <span className="rounded-full bg-slate-100 px-4 py-1 text-sm font-bold text-slate-500">
            {topic.totalLessons} bài học
          </span>
        </div>
      </div>
      <Link href={`/grammar/topic/${topic.id}`} className="hidden w-[230px] items-center gap-5 sm:flex">
        <div className="h-2 flex-1 rounded-full bg-slate-100">
          <div className={`h-2 rounded-full ${tone.bar}`} style={{ width: `${topic.progress}%` }} />
        </div>
        <span className="w-10 text-sm font-black">{topic.progress}%</span>
        <ChevronRight className="text-slate-400" />
      </Link>
    </div>
  );
}

function RoadmapPanel({ dashboard }: { dashboard: GrammarDashboard | null }) {
  const roadmap = dashboard?.roadmap;
  const completed = roadmap?.items.reduce((sum, item) => sum + item.completed, 0) || 0;
  const total = roadmap?.items.reduce((sum, item) => sum + item.total, 0) || 0;

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-black">Lộ trình học ngữ pháp</h2>
        <button className="text-sm font-bold text-violet-600">Xem chi tiết</button>
      </div>
      <div className="mb-6">
        <div className="mb-2 flex justify-between font-black">
          <span>{roadmap?.currentLevel || "B1"}</span>
          <span className="text-emerald-600">{roadmap?.progress || 0}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-violet-600" style={{ width: `${roadmap?.progress || 0}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Hoàn thành {completed}/{total} bài học
        </p>
      </div>
      <div className="space-y-5">
        {(roadmap?.items || []).slice(0, 6).map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <div
              className={`grid h-6 w-6 place-items-center rounded-full ${
                item.done ? "bg-emerald-500 text-white" : item.progress > 0 ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {item.done ? "✓" : item.progress > 0 ? "•" : "○"}
            </div>
            <p className={`flex-1 text-sm font-bold ${item.progress > 0 && !item.done ? "text-violet-600" : "text-slate-600"}`}>
              {item.title}
            </p>
            <p className="text-sm font-bold text-slate-500">
              {item.completed}/{item.total}
            </p>
          </div>
        ))}
      </div>
      <Link href="/grammar" className="mt-8 block w-full rounded-xl border border-violet-100 py-4 text-center font-black text-violet-600">
        Tiếp tục học
      </Link>
    </section>
  );
}

function RecentPanel({ lessons }: { lessons: RecentLesson[] }) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-black">Bài học gần đây</h2>
        <button className="text-sm font-bold text-violet-600">Xem tất cả</button>
      </div>
      <div className="space-y-5">
        {lessons.length ? (
          lessons.map((lesson, index) => (
            <div key={lesson.id} className="flex items-center gap-4">
              <div className={`grid h-12 w-12 place-items-center rounded-xl ${categoryTones[index % categoryTones.length].wrap}`}>
                <Calendar size={22} className={categoryTones[index % categoryTones.length].icon} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{lesson.title}</p>
                <p className="text-sm font-medium text-slate-500">
                  {lesson.topic} · {lesson.score}%
                </p>
              </div>
              <button className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-600">
                {lesson.status}
              </button>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-sm font-bold text-slate-500">
            Chưa có bài học gần đây.
          </p>
        )}
      </div>
    </section>
  );
}

function RecommendPanel({ text }: { text?: string }) {
  return (
    <section className="flex items-center justify-between rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-violet-50 text-violet-600">
            💡
          </div>
          <h2 className="font-black">Gợi ý hôm nay</h2>
        </div>
        <p className="text-sm font-medium leading-6 text-slate-500">
          {text || "Học 15 phút ngữ pháp mỗi ngày sẽ giúp bạn tiến bộ nhanh hơn!"}
        </p>
      </div>
      <img src="/poppylingo-logo.png" alt="Mascot" className="h-24 w-24 object-contain" />
    </section>
  );
}

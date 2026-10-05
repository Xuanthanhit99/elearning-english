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
  slug?: string | null;
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
  { wrap: "bg-blue-50 border-blue-100", icon: "text-blue-600", bar: "bg-blue-500" },
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

  const [reloadToken, setReloadToken] = useState(0);

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
  }, [activeLevel, reloadToken]);

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
        tone: "bg-blue-100 text-blue-600",
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
    <div className="min-h-screen bg-[#f7faff] text-[#16325c]">
      <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-sky-50 p-4 sm:rounded-3xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Lộ trình ngữ pháp</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Ngữ pháp</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                Học đúng chủ điểm theo trình độ, tiếp tục bài đang dở và theo dõi tiến độ ở một nơi.
              </p>
            </div>
            {dashboard?.roadmap?.items?.length ? (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100 sm:min-w-[300px]">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-xs font-bold text-slate-500">Tiếp tục học</p><p className="mt-1 font-black">{dashboard.roadmap.items.find((item) => !item.done)?.title || dashboard.roadmap.items[0]?.title}</p></div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-blue-700">{dashboard.roadmap.currentLevel || "—"}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${dashboard.roadmap.progress || 0}%` }} /></div>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-5">
          {levels.map((level) => (
            <button key={level.value} onClick={() => setActiveLevel(level.value)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold ${activeLevel === level.value ? "bg-blue-600 text-white shadow-sm" : "border border-blue-100 bg-white text-slate-600"}`}>
              {level.label}
            </button>
          ))}
        </div>

        {message && <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 font-bold text-red-600"><span>{message}</span><button onClick={() => setReloadToken((token) => token + 1)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white">Thử lại</button></div>}

        <section className="mt-3 grid !grid-cols-2 gap-2 sm:mt-5 sm:gap-3 lg:!grid-cols-4">
          {stats.map((stat) => { const Icon = stat.icon; return (
            <div key={stat.label} className="min-w-0 rounded-xl border border-blue-100 bg-white p-3 sm:rounded-2xl sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${stat.tone}`}><Icon size={20}/></div>
                <div className="min-w-0"><p className="text-lg font-black sm:text-2xl">{loading ? "…" : stat.value}</p><p className="truncate text-xs font-bold text-slate-500 sm:text-sm">{stat.label}</p></div>
              </div>
            </div>
          );})}
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-blue-100 bg-white p-4 sm:p-5">
              <div className="mb-4"><p className="text-xs font-black uppercase tracking-wider text-blue-600">Khám phá theo nhóm</p><h2 className="mt-1 text-xl font-black">Chủ đề ngữ pháp</h2></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(dashboard?.categories || []).slice(0, 6).map((category,index)=><CategoryCard key={category.id} category={category} index={index}/>)}
                {!loading && !dashboard?.categories?.length && <p className="col-span-full py-6 text-center font-bold text-slate-500">Chưa có nhóm chủ đề ngữ pháp.</p>}
              </div>
            </section>
            <section className="rounded-2xl border border-blue-100 bg-white p-4 sm:p-5">
              <div className="mb-2"><p className="text-xs font-black uppercase tracking-wider text-blue-600">Bài nên học tiếp</p><h2 className="mt-1 text-xl font-black">Chủ điểm ngữ pháp</h2></div>
              {loading ? <div className="py-10 text-center font-bold text-slate-500">Đang tải dữ liệu ngữ pháp...</div> : dashboard?.topics?.length ? <div className="divide-y divide-slate-100">{dashboard.topics.slice(0,8).map((topic,index)=><TopicRow key={topic.id} topic={topic} index={index}/>)}</div> : <div className="py-10 text-center font-bold text-slate-500">Chưa có chủ điểm ở trình độ này.</div>}
            </section>
          </main>
          <aside className="space-y-4">
            <RoadmapPanel dashboard={dashboard}/>
            <RecentPanel lessons={dashboard?.recentLessons || []}/>
            <RecommendPanel text={dashboard?.recommend?.description}/>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ category, index }: { category: GrammarCategory; index: number }) {
  const tone = categoryTones[index % categoryTones.length];
  const Icon = categoryIcons[index % categoryIcons.length];

  return (
    <Link
      href={`/grammar/${category.slug || category.id}`}
      className={`block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${tone.wrap}`}
    >
      <div className="flex items-start justify-between">
        <div className={`grid h-12 w-12 place-items-center rounded-xl bg-white ${tone.icon}`}>
          <Icon size={24} />
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-[#2563eb]">
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
    </Link>
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
          <span className="rounded-full bg-blue-100 px-4 py-1 text-sm font-bold text-blue-600">
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
    <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-black">Lộ trình học ngữ pháp</h2>
        <button className="text-sm font-bold text-blue-600">Xem chi tiết</button>
      </div>
      <div className="mb-6">
        <div className="mb-2 flex justify-between font-black">
          <span>{roadmap?.currentLevel || "—"}</span>
          <span className="text-emerald-600">{roadmap?.progress || 0}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${roadmap?.progress || 0}%` }} />
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
                item.done ? "bg-emerald-500 text-white" : item.progress > 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {item.done ? "✓" : item.progress > 0 ? "•" : "○"}
            </div>
            <p className={`flex-1 text-sm font-bold ${item.progress > 0 && !item.done ? "text-blue-600" : "text-slate-600"}`}>
              {item.title}
            </p>
            <p className="text-sm font-bold text-slate-500">
              {item.completed}/{item.total}
            </p>
          </div>
        ))}
      </div>
      <Link href="/grammar" className="mt-8 block w-full rounded-xl border border-blue-100 py-4 text-center font-black text-blue-600">
        Tiếp tục học
      </Link>
    </section>
  );
}

function RecentPanel({ lessons }: { lessons: RecentLesson[] }) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-black">Bài học gần đây</h2>
        <button className="text-sm font-bold text-blue-600">Xem tất cả</button>
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
              <button className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-600">
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
    <section className="flex items-center justify-between rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600">
            💡
          </div>
          <h2 className="font-black">Gợi ý hôm nay</h2>
        </div>
        <p className="text-sm font-medium leading-6 text-slate-500">
          {text || "Học 15 phút ngữ pháp mỗi ngày sẽ giúp bạn tiến bộ nhanh hơn!"}
        </p>
      </div>
      <img src="/brand/beaconvie-app-icon.png" alt="Mascot" className="h-24 w-24 object-contain" />
    </section>
  );
}

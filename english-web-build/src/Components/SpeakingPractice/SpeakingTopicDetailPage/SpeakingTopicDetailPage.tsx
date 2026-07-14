"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  Gem,
  Gift,
  Home,
  Lock,
  Mic,
  Search,
  Star,
} from "lucide-react";
import {
  getSpeakingTopicDetail,
  getSpeakingTopicLessons,
  SpeakingLessonItem,
  SpeakingTopicDetail,
  SpeakingTopicLessonsResponse,
  startSpeakingLesson,
} from "@/src/lib/speaking-api";

export default function SpeakingTopicDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.slug);
  const [detail, setDetail] = useState<SpeakingTopicDetail | null>(null);
  const [lessonData, setLessonData] =
    useState<SpeakingTopicLessonsResponse | null>(null);
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"LESSONS" | "ABOUT">("LESSONS");
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getSpeakingTopicDetail(slug),
      getSpeakingTopicLessons(slug, { sort, page, limit: 8 }),
    ])
      .then(([d, l]) => {
        setDetail(d);
        setLessonData(l);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    getSpeakingTopicLessons(slug, { sort, page, limit: 8 }).then(setLessonData);
  }, [sort, page, slug]);

  async function handleStart(lesson: SpeakingLessonItem) {
    if (lesson.status === "LOCKED") return;
    if (lesson.status === "IN_PROGRESS" && lesson.sessionId)
      return router.push(`/speaking/topics/${lesson.sessionId}`);
    try {
      setStartingId(lesson.id);
      const res = await startSpeakingLesson(lesson.id);
      router.push(res.redirectUrl);
    } finally {
      setStartingId(null);
    }
  }

  if (loading || !detail || !lessonData)
    return <div className="p-10 text-purple-600">Loading topic detail...</div>;

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#08083d]">
      <div className="flex">
        <main className="flex-1">
          <div className="grid grid-cols-12 gap-8 px-9 py-7">
            <section className="col-span-9">
              <Breadcrumb title={detail.topic.title} />
              <Hero detail={detail} />
              <div className="mt-8 flex items-center justify-between">
                <div className="flex gap-10">
                  <button
                    onClick={() => setTab("LESSONS")}
                    className={`pb-4 text-sm font-bold ${tab === "LESSONS" ? "border-b-2 border-purple-600 text-purple-600" : "text-indigo-400"}`}
                  >
                    Lessons
                  </button>
                  <button
                    onClick={() => setTab("ABOUT")}
                    className={`pb-4 text-sm font-bold ${tab === "ABOUT" ? "border-b-2 border-purple-600 text-purple-600" : "text-indigo-400"}`}
                  >
                    About this Topic
                  </button>
                </div>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="h-12 w-56 rounded-xl border border-indigo-100 bg-white px-4 text-sm font-semibold outline-none"
                >
                  <option value="default">Sort by: Default</option>
                  <option value="newest">Sort by: Newest</option>
                  <option value="oldest">Sort by: Oldest</option>
                  <option value="level">Sort by: Level</option>
                </select>
              </div>
              {tab === "LESSONS" ? (
                <>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-indigo-100 bg-white">
                    {lessonData.lessons.map((lesson, index) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        active={index === 0}
                        starting={startingId === lesson.id}
                        onStart={() => handleStart(lesson)}
                      />
                    ))}
                  </div>
                  <Pagination
                    page={lessonData.pagination.page}
                    totalPages={lessonData.pagination.totalPages}
                    onPageChange={setPage}
                  />
                </>
              ) : (
                <About detail={detail} />
              )}
            </section>
            <aside className="col-span-3 space-y-5">
              <ProgressCard progress={detail.progress} />
              <Card title="You’ll improve">
                <div className="space-y-5">
                  {detail.improveSkills.map((s) => (
                    <div key={s.title} className="flex items-center gap-4">
                      <div className="rounded-xl bg-green-50 p-3 text-xl">
                        {s.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">{s.title}</h3>
                        <p className="text-sm text-indigo-400">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Related Topics">
                <div className="space-y-5">
                  {detail.relatedTopics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/speaking/topics/${t.slug}`)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-3 font-bold">
                        <span className="rounded-xl bg-green-50 p-2">
                          {t.icon}
                        </span>
                        {t.title}
                      </span>
                      <span className="text-sm text-indigo-400">
                        {t.lessonCount} Lessons
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => router.push("/speaking/topics")}
                  className="mt-5 text-sm font-bold text-purple-600"
                >
                  View all
                </button>
              </Card>
              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-7 shadow-sm">
                <h2 className="mb-5 text-lg font-extrabold">
                  {detail.practiceTip.title}
                </h2>
                <div className="flex items-end justify-between gap-5">
                  <p className="text-sm font-semibold leading-6 text-indigo-700">
                    {detail.practiceTip.description}
                  </p>
                  <div className="text-7xl">🦊</div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Hero({ detail }: { detail: SpeakingTopicDetail }) {
  const t = detail.topic;
  return (
    <div className="grid grid-cols-12 items-center gap-8">
      <div className="col-span-2">
        <div className="h-40 w-40 overflow-hidden rounded-2xl bg-indigo-100">
          {t.imageUrl ? (
            <img
              src={t.imageUrl}
              alt={t.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl">
              {t.category.icon || "🎙️"}
            </div>
          )}
        </div>
      </div>
      <div className="col-span-7">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Mic size={32} />
          </div>
          <h1 className="text-4xl font-extrabold">{t.title}</h1>
        </div>
        <p className="mt-4 text-lg text-indigo-500">{t.description}</p>
        <div className="mt-6 flex items-center gap-8 text-sm font-semibold">
          <span className="rounded-lg bg-green-100 px-4 py-2 text-green-600">
            {t.levelRange}
          </span>
          <span className="text-indigo-500">{t.levelText}</span>
          <span className="flex items-center gap-2 text-indigo-500">
            <BookOpen size={18} />
            {t.lessonCount} Lessons
          </span>
          <div className="flex w-52 items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-indigo-100">
              <div
                className="h-2 rounded-full bg-purple-600"
                style={{ width: `${t.progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold">
              {t.progressPercent}% Complete
            </span>
          </div>
        </div>
      </div>
      <div className="col-span-3 hidden text-8xl lg:block">💬👩‍🦰☕</div>
    </div>
  );
}
function LessonRow({
  lesson,
  active,
  starting,
  onStart,
}: {
  lesson: SpeakingLessonItem;
  active: boolean;
  starting: boolean;
  onStart: () => void;
}) {
  return (
    <div
      className={`grid grid-cols-12 items-center border-b border-indigo-50 px-6 py-5 last:border-b-0 ${active ? "bg-purple-50" : "bg-white"}`}
    >
      <div className="col-span-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-white text-sm font-bold text-indigo-400">
          {String(lesson.order).padStart(2, "0")}
        </div>
      </div>
      <div className="col-span-1">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-pink-50 text-2xl">
          {lesson.icon}
        </div>
      </div>
      <div className="col-span-5">
        <h3 className="font-extrabold">{lesson.title}</h3>
        <p className="mt-1 text-sm text-indigo-500">{lesson.description}</p>
      </div>
      <div className="col-span-1">
        <span className="rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-600">
          {lesson.level}
        </span>
      </div>
      <div className="col-span-2 flex items-center gap-2 text-sm font-semibold text-indigo-500">
        <Clock size={16} />
        {Math.max(lesson.estimatedMinutes - 1, 1)} -{" "}
        {lesson.estimatedMinutes + 1} min
      </div>
      <div className="col-span-2 flex justify-end">
        {lesson.status === "LOCKED" ? (
          <button className="flex items-center gap-2 text-sm font-bold text-indigo-400">
            <Lock size={15} />
            Locked
            <ChevronRight size={16} />
          </button>
        ) : lesson.status === "COMPLETED" ? (
          <button className="flex items-center gap-2 text-sm font-bold text-green-600">
            ● Completed
            <ChevronRight size={16} />
          </button>
        ) : lesson.status === "IN_PROGRESS" ? (
          <button
            onClick={onStart}
            className="flex items-center gap-2 text-sm font-bold text-orange-500"
          >
            ● In Progress
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={starting}
            className="flex items-center gap-2 rounded-lg border border-purple-600 px-6 py-3 text-sm font-bold text-purple-600 disabled:opacity-60"
          >
            <Mic size={16} />
            {starting ? "Starting..." : "Start"}
          </button>
        )}
      </div>
    </div>
  );
}
function Breadcrumb({ title }: { title: string }) {
  return (
    <div className="mb-7 flex items-center gap-3 text-sm font-semibold text-indigo-400">
      <Home size={16} />
      <span>Home</span>
      <ChevronRight size={14} />
      <span>Speaking</span>
      <ChevronRight size={14} />
      <span>Topics</span>
      <ChevronRight size={14} />
      <span className="text-[#08083d]">{title}</span>
    </div>
  );
}
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-7 flex justify-center gap-3">
      {Array.from({ length: totalPages }).map((_, i) => (
        <button
          key={i}
          onClick={() => onPageChange(i + 1)}
          className={`h-11 w-11 rounded-lg border text-sm font-bold ${page === i + 1 ? "border-purple-600 bg-purple-600 text-white" : "border-indigo-100 bg-white text-indigo-700"}`}
        >
          {i + 1}
        </button>
      ))}
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border bg-white disabled:opacity-40"
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
function About({ detail }: { detail: SpeakingTopicDetail }) {
  return (
    <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-7">
      <h2 className="text-xl font-extrabold">About {detail.topic.title}</h2>
      <p className="mt-4 text-sm leading-7 text-indigo-500">
        {detail.topic.description}
      </p>
      <div className="mt-6 grid grid-cols-3 gap-5">
        <Info label="Level" value={detail.topic.levelRange} />
        <Info label="Lessons" value={`${detail.topic.lessonCount}`} />
        <Info label="Progress" value={`${detail.topic.progressPercent}%`} />
      </div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-purple-50 p-5">
      <p className="text-xs font-bold text-indigo-400">{label}</p>
      <p className="mt-2 text-lg font-extrabold">{value}</p>
    </div>
  );
}
function ProgressCard({
  progress,
}: {
  progress: SpeakingTopicDetail["progress"];
}) {
  return (
    <Card title="Topic Progress">
      <div className="flex items-center gap-7">
        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-[10px] border-green-500">
          <p className="text-4xl font-extrabold">{progress.percent}%</p>
          <p className="text-sm text-indigo-400">Completed</p>
        </div>
        <div className="space-y-5 text-sm">
          <p>
            ✅ Completed <b>{progress.completed}</b>
          </p>
          <p>
            🟠 In Progress <b>{progress.inProgress}</b>
          </p>
          <p>
            ⚪ Not Started <b>{progress.notStarted}</b>
          </p>
        </div>
      </div>
    </Card>
  );
}
function Sidebar({ onGoPremium }: { onGoPremium: () => void }) {
  const menus = [
    ["Home", "🏠", "/"],
    ["Vocabulary", "✚", "/vocabulary"],
    ["Grammar", "✚", "/grammar"],
    ["Listening", "🎧", "/listening"],
    ["Speaking", "🎙️", "/speaking"],
    ["Reading", "📖", "/reading"],
    ["Writing", "✏️", "/writing"],
    ["Flashcards", "🧩", "/flashcards"],
  ];
  return (
    <aside className="min-h-screen w-[270px] border-r border-indigo-50 bg-white px-5 py-7">
      <div className="mb-10 flex items-center gap-3">
        <div className="text-3xl">🦊</div>
        <h1 className="text-2xl font-extrabold">
          Speak<span className="text-purple-600">Arena</span>
        </h1>
      </div>
      <nav className="space-y-2">
        {menus.map(([l, i, h]) => (
          <a
            key={l}
            href={h}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold ${l === "Speaking" ? "bg-purple-50 text-purple-700" : "text-[#09093f]"}`}
          >
            <span>{i}</span>
            {l}
          </a>
        ))}
      </nav>
      <div className="mt-10 rounded-2xl bg-purple-50 p-5">
        <p className="mb-2 text-sm font-bold text-purple-700">👑 Go Premium</p>
        <p className="text-xs leading-5 text-indigo-400">
          Unlock all features and learn without limits.
        </p>
        <button
          onClick={onGoPremium}
          className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white"
        >
          Upgrade Now
        </button>
      </div>
    </aside>
  );
}
function Topbar({
  onGift,
  onNotification,
  onProfile,
}: {
  onGift: () => void;
  onNotification: () => void;
  onProfile: () => void;
}) {
  return (
    <header className="flex h-[86px] items-center justify-between border-b border-indigo-50 bg-white px-9">
      <div className="flex h-12 w-[560px] items-center rounded-xl bg-[#f5f3ff] px-5">
        <Search size={20} className="text-indigo-400" />
        <input
          className="ml-3 flex-1 bg-transparent text-sm outline-none"
          placeholder="Search topics, lessons or skills..."
        />
        <div className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-indigo-500">
          ⌘ K
        </div>
      </div>
      <div className="flex items-center gap-8">
        <TopStat
          icon={<Flame className="text-orange-500" />}
          value="12"
          label="Streak"
        />
        <TopStat
          icon={<Star className="text-yellow-500" />}
          value="2,450"
          label="XP Today"
        />
        <TopStat
          icon={<Gem className="text-blue-500" />}
          value="5,230"
          label="Gems"
        />
        <button onClick={onGift}>
          <Gift className="text-purple-600" />
        </button>
        <button onClick={onNotification} className="relative">
          <Bell className="text-indigo-400" />
          <span className="absolute -right-1 -top-2 rounded-full bg-red-500 px-1 text-xs text-white">
            2
          </span>
        </button>
        <button onClick={onProfile} className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-indigo-100" />
          <div className="text-left">
            <p className="text-sm font-bold">Minh Anh</p>
            <p className="text-xs text-indigo-400">Level 18</p>
          </div>
          <ChevronDown size={15} />
        </button>
      </div>
    </header>
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
        <p className="text-sm font-bold">{value}</p>
        <p className="text-xs text-indigo-400">{label}</p>
      </div>
    </div>
  );
}
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">{title}</h2>
      {children}
    </div>
  );
}

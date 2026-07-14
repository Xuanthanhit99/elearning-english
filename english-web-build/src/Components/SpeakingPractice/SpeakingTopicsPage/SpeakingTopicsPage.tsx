"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Flame,
  Gem,
  Gift,
  Home,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import {
  getSpeakingTopics,
  SpeakingTopicItem,
  SpeakingTopicsResponse,
} from "@/src/lib/speaking-api";

export default function SpeakingTopicsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SpeakingTopicsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [sort, setSort] = useState("newest");
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getSpeakingTopics({
        search: search.trim() || undefined,
        category,
        level,
        difficulty,
        sort,
        page: 1,
        limit: 20,
      })
        .then(setData)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category, level, difficulty, sort]);

  const visibleCategories = useMemo(
    () =>
      data
        ? showMore
          ? data.filters.categories
          : data.filters.categories.slice(0, 7)
        : [],
    [data, showMore],
  );

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#08083d]">
      <div className="flex">
        <main className="flex-1">
          <div className="grid grid-cols-12 gap-8 px-9 py-7">
            <section className="col-span-9">
              <Breadcrumb />
              <div className="grid grid-cols-5 gap-4">
                <SearchInput value={search} onChange={setSearch} />
                <Select
                  value={category}
                  onChange={setCategory}
                  options={
                    data?.filters.categories.map((c) => ({
                      label: c.title,
                      value: c.slug,
                    })) || [{ label: "All Categories", value: "all" }]
                  }
                />
                <Select
                  value={level}
                  onChange={setLevel}
                  options={
                    data?.filters.levels || [
                      { label: "All Levels", value: "all" },
                    ]
                  }
                />
                <Select
                  value={difficulty}
                  onChange={setDifficulty}
                  options={
                    data?.filters.difficulties || [
                      { label: "All Difficulty", value: "all" },
                    ]
                  }
                />
                <Select
                  value={sort}
                  onChange={setSort}
                  icon={<SlidersHorizontal size={17} />}
                  options={[
                    { label: "Newest", value: "newest" },
                    { label: "Oldest", value: "oldest" },
                    { label: "Popular", value: "popular" },
                    { label: "Progress", value: "progress" },
                    { label: "Lessons", value: "lessons" },
                  ]}
                />
              </div>
              {loading ? (
                <LoadingList />
              ) : data && data.topics.length > 0 ? (
                <div className="mt-7 space-y-4">
                  {data.topics.map((t) => (
                    <TopicRow
                      key={t.id}
                      topic={t}
                      onView={() => router.push(`/speaking/topics/${t.slug}`)}
                    />
                  ))}
                </div>
              ) : (
                <Empty />
              )}
            </section>
            <aside className="col-span-3 space-y-5">
              {data && (
                <>
                  <ProgressCard
                    progress={data.progress}
                    onView={() => router.push("/speaking/progress")}
                  />
                  <Card title="Categories">
                    <div className="space-y-4">
                      {visibleCategories.map((c) => (
                        <button
                          key={c.slug}
                          onClick={() => setCategory(c.slug)}
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-sm ${category === c.slug ? "bg-purple-50 text-purple-700" : ""}`}
                        >
                          <span className="flex items-center gap-3 font-semibold">
                            <span>{c.icon}</span>
                            {c.title}
                          </span>
                          <span className="text-indigo-400">{c.count}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowMore((v) => !v)}
                      className="mt-5 flex items-center gap-2 text-sm font-bold text-purple-600"
                    >
                      {showMore ? "Show less" : "Show more"}{" "}
                      <ChevronDown size={16} />
                    </button>
                  </Card>
                  <Card title="Difficulty Guide">
                    <div className="space-y-5">
                      {data.difficultyGuide.map((d) => (
                        <div
                          key={d.title}
                          className="grid grid-cols-3 text-sm font-semibold"
                        >
                          <div className="flex gap-1">
                            <span className="h-3 w-3 rounded-full bg-purple-600" />
                            <span className="h-3 w-3 rounded-full bg-purple-600" />
                            <span className="h-3 w-3 rounded-full bg-purple-600" />
                          </div>
                          <span>{d.title}</span>
                          <span className="text-right text-indigo-400">
                            {d.range}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function TopicRow({
  topic,
  onView,
}: {
  topic: SpeakingTopicItem;
  onView: () => void;
}) {
  return (
    <div className="grid grid-cols-12 items-center rounded-2xl border border-indigo-50 bg-white px-5 py-4 shadow-sm hover:shadow-md">
      <div className="col-span-4 flex items-center gap-5">
        <div className="h-20 w-24 overflow-hidden rounded-xl bg-indigo-100">
          {topic.imageUrl ? (
            <img
              src={topic.imageUrl}
              alt={topic.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">
              {topic.category.icon || "🎙️"}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-extrabold">{topic.title}</h3>
          <p className="mt-2 max-w-[260px] text-sm leading-6 text-indigo-500">
            {topic.description}
          </p>
        </div>
      </div>
      <div className="col-span-3">
        <span className="rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-600">
          {topic.levelRange}
        </span>
        <p className="mt-3 text-xs font-semibold text-indigo-400">
          {topic.levelText}
        </p>
      </div>
      <div className="col-span-2 flex items-center gap-3 text-sm font-semibold text-indigo-500">
        <BookOpen size={18} />
        {topic.lessonCount} Lessons
      </div>
      <div className="col-span-2">
        <div className="h-2 rounded-full bg-indigo-100">
          <div
            className="h-2 rounded-full bg-purple-600"
            style={{ width: `${topic.progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs font-bold">
          {topic.progressPercent}%
        </p>
      </div>
      <div className="col-span-1 flex justify-end">
        <button
          onClick={onView}
          className="flex items-center gap-2 rounded-lg border border-purple-600 px-4 py-3 text-xs font-bold text-purple-600"
        >
          View Topics <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
function Breadcrumb() {
  return (
    <div className="mb-7 flex items-center gap-3 text-sm font-semibold text-indigo-400">
      <Home size={16} />
      <span>Home</span>
      <ChevronRight size={14} />
      <span>Speaking</span>
      <ChevronRight size={14} />
      <span className="text-[#08083d]">Topics</span>
    </div>
  );
}
function Header() {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-4xl">
          🎙️
        </div>
        <div>
          <h1 className="text-4xl font-extrabold">Topic List</h1>
          <p className="mt-3 text-sm text-indigo-500">
            Explore topics and practice speaking on what matters to you.
          </p>
        </div>
      </div>
      <div className="hidden text-7xl lg:block">🪴💬🌍</div>
    </div>
  );
}
function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex h-12 items-center rounded-xl border border-indigo-100 bg-white px-4">
      <Search size={18} className="text-indigo-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ml-3 w-full bg-transparent text-sm outline-none"
        placeholder="Search topics..."
      />
    </div>
  );
}
function Select({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-xl border border-indigo-100 bg-white px-4 pr-10 text-sm font-semibold outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400">
        {icon || <ChevronDown size={17} />}
      </div>
    </div>
  );
}
function LoadingList() {
  return (
    <div className="mt-7 space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
      ))}
    </div>
  );
}
function Empty() {
  return (
    <div className="mt-10 rounded-2xl bg-white p-10 text-center">
      <div className="text-5xl">🎙️</div>
      <h3 className="mt-4 text-xl font-bold">Không tìm thấy topic</h3>
    </div>
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
function ProgressCard({
  progress,
  onView,
}: {
  progress: SpeakingTopicsResponse["progress"];
  onView: () => void;
}) {
  return (
    <Card title="Your Progress">
      <div className="flex items-center gap-7">
        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-[10px] border-purple-600">
          <p className="text-4xl font-extrabold">{progress.overallPercent}%</p>
          <p className="text-sm text-indigo-400">Overall</p>
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
      <button
        onClick={onView}
        className="mt-7 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600"
      >
        View Overall Progress
      </button>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Star,
} from "lucide-react";
import {
  getSpeakingCategories,
  SpeakingCategoriesResponse,
  SpeakingCategoryItem,
} from "@/src/lib/speaking-api";

export default function SpeakingCategoriesPage() {
  const router = useRouter();
  const [data, setData] = useState<SpeakingCategoriesResponse | null>(null);
  const [level, setLevel] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSpeakingCategories({ level })
      .then(setData)
      .finally(() => setLoading(false));
  }, [level]);

  if (loading && !data)
    return <div className="p-10 text-purple-600">Loading categories...</div>;
  if (!data)
    return <div className="p-10 text-red-500">Không tải được categories.</div>;

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#08083d]">
      <div className="flex">
        <main className="flex-1">
          <div className="grid grid-cols-12 gap-8 px-9 py-7">
            <section className="col-span-9">
              <Breadcrumb />
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-extrabold">
                    Speaking Categories
                  </h1>
                  <p className="mt-3 text-lg text-indigo-500">
                    Explore different categories and practice speaking on topics
                    that interest you.
                  </p>
                </div>
                <div className="hidden text-8xl lg:block">🎙️💬🌿</div>
              </div>
              <div className="flex flex-wrap gap-5">
                {data.filters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setLevel(f.value)}
                    className={`rounded-xl border px-7 py-4 text-sm font-bold ${level === f.value ? "border-purple-600 bg-purple-600 text-white" : "border-indigo-100 bg-white text-indigo-700"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="mt-8 grid grid-cols-4 gap-6">
                {data.categories.map((c) => (
                  <CategoryCard
                    key={c.id}
                    item={c}
                    onClick={() => router.push(`/speaking/topics/${c.slug}`)}
                  />
                ))}
              </div>
            </section>
            <aside className="col-span-3 space-y-5">
              <ProgressCard
                progress={data.progress}
                onView={() => router.push("/speaking/progress")}
              />
              <Card title="Top Skills to Improve">
                <div className="space-y-5">
                  {data.topSkills.map((s) => (
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
                <button
                  onClick={() => router.push("/speaking/topics")}
                  className="mt-7 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600"
                >
                  Go to Practice
                </button>
              </Card>
              <Card title="Daily Goal">
                <div className="flex items-center justify-between gap-5">
                  <p className="text-sm leading-6 text-indigo-500">
                    {data.dailyGoal.description}
                  </p>
                  <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-[8px] border-purple-600">
                    <p className="text-2xl font-extrabold">
                      {data.dailyGoal.currentMinutes} /{" "}
                      {data.dailyGoal.targetMinutes}
                    </p>
                    <p className="text-xs text-indigo-400">minutes</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/speaking/topics")}
                  className="mt-7 w-full rounded-xl bg-purple-600 py-4 text-sm font-bold text-white"
                >
                  Start Practice
                </button>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function CategoryCard({
  item,
  onClick,
}: {
  item: SpeakingCategoryItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="overflow-hidden rounded-2xl border border-indigo-50 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="h-48 bg-indigo-50">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl">
            {item.icon || "🎙️"}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-xl font-extrabold">{item.title}</h3>
        <p className="mt-3 min-h-[72px] text-sm leading-6 text-indigo-500">
          {item.description}
        </p>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-500">
            <BookOpen size={17} />
            {item.lessonCount} Lessons
          </div>
          <span className="rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-600">
            {item.levelRange}
          </span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-indigo-100">
            <div
              className="h-2 rounded-full bg-purple-600"
              style={{ width: `${item.progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-bold">{item.progressPercent}%</span>
        </div>
      </div>
    </button>
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
      <span className="text-[#08083d]">Categories</span>
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
function ProgressCard({
  progress,
  onView,
}: {
  progress: SpeakingCategoriesResponse["progress"];
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
        View Progress
      </button>
    </Card>
  );
}

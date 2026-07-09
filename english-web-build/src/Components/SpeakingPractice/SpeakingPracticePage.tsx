'use client';

import { useEffect, useState } from 'react';
import {
  Mic,
  Search,
  Flame,
  Star,
  Gem,
  Gift,
  Bell,
  ChevronRight,
  BookOpen,
  Headphones,
  HelpCircle,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { api } from '@/src/lib/axios';

export type SpeakingHomeData = {
  hero: {
    title: string;
    description: string;
  };
  streak: {
    days: number;
    week: {
      label: string;
      day: number;
      completed: boolean;
      active?: boolean;
    }[];
  };
  progress: {
    currentLevel: number;
    nextLevel: number;
    percent: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  categories: {
    id: string;
    title: string;
    slug: string;
    icon: string | null;
    color: string | null;
    topicCount: number;
  }[];
  practiceTypes: {
    key: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  }[];
  recommendedTopics: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string | null;
    difficulty: string;
    estimatedMinutes: number;
  }[];
  recentHistory: {
    id: string;
    title: string;
    category: string;
    type: string;
    score: number;
    level: string;
    date: string;
  }[];
};

export default function SpeakingHomePage() {
  const [data, setData] = useState<SpeakingHomeData | null>(null);
  const [loading, setLoading] = useState(true);

  async function getSpeakingHome() {
  const res = await api.get('/speaking/home');
  return res.data.data as SpeakingHomeData;
}

  async function fetchHome() {
    try {
      setLoading(true);
      const result = await getSpeakingHome();
      setData(result);
    } catch (error) {
      console.error('Failed to load speaking home:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHome();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbff] p-8">
        <div className="animate-pulse text-indigo-600">
          Loading speaking home...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#fbfbff] p-8">
        <div className="text-red-500">Không tải được dữ liệu Speaking.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#09093f]">
      <div className="flex">
        {/* <Sidebar /> */}

        <main className="flex-1">
          {/* <Topbar /> */}

          <div className="grid grid-cols-12 gap-8 px-10 py-8">
            <section className="col-span-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold">Speaking Practice</h1>
                <p className="mt-2 text-sm text-indigo-500">
                  Speak with confidence. Practice real topics and improve your fluency.
                </p>
              </div>

              <HeroSection data={data} />

              <CategorySection data={data} />

              <PracticeTypeSection data={data} />

              <RecommendedSection data={data} />
            </section>

            <aside className="col-span-4 space-y-6">
              <StreakCard data={data} />
              <ProgressCard data={data} />
              <HistoryCard data={data} />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <header className="flex h-[86px] items-center justify-between border-b border-indigo-50 bg-white px-10">
      <div className="flex h-12 w-[560px] items-center rounded-xl bg-[#f5f3ff] px-5">
        <Search size={20} className="text-indigo-400" />
        <input
          className="ml-3 flex-1 bg-transparent text-sm outline-none placeholder:text-indigo-400"
          placeholder="Search topics, lessons or skills..."
        />
        <div className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-indigo-500">
          ⌘ K
        </div>
      </div>

      <div className="flex items-center gap-8">
        <Stat icon={<Flame className="text-orange-500" />} value="12" label="Streak" />
        <Stat icon={<Star className="text-yellow-500" />} value="2,450" label="XP Today" />
        <Stat icon={<Gem className="text-blue-500" />} value="5,230" label="Gems" />

        <Gift className="text-purple-600" />
        <Bell className="text-indigo-400" />

        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-indigo-100" />
          <div>
            <p className="text-sm font-bold">Minh Anh</p>
            <p className="text-xs text-indigo-400">Level 18</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({
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

function Sidebar() {
  const menus = [
    ['Home', '🏠', true],
    ['Vocabulary', '➕', false],
    ['Grammar', '➕', false],
    ['Listening', '🎧', false],
    ['Speaking', '🎙️', true],
    ['Reading', '📖', false],
    ['Writing', '✏️', false],
    ['Flashcards', '🧩', false],
  ];

  return (
    <aside className="min-h-screen w-[260px] border-r border-indigo-50 bg-white px-5 py-7">
      <div className="mb-10 flex items-center gap-3">
        <div className="text-3xl">🦊</div>
        <h1 className="text-2xl font-extrabold">
          Speak<span className="text-purple-600">Arena</span>
        </h1>
      </div>

      <nav className="space-y-2">
        {menus.map(([label, icon, active], index) => (
          <div
            key={`${label}-${index}`}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold ${
              label === 'Speaking'
                ? 'bg-purple-50 text-purple-700'
                : 'text-[#09093f]'
            }`}
          >
            <span>{icon}</span>
            {label}
          </div>
        ))}
      </nav>

      <div className="mt-10 rounded-2xl bg-purple-50 p-5">
        <p className="mb-2 text-sm font-bold text-purple-700">👑 Go Premium</p>
        <p className="text-xs leading-5 text-indigo-400">
          Unlock all features and learn without limits.
        </p>
        <button className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white">
          Upgrade Now
        </button>
      </div>
    </aside>
  );
}

function HeroSection({ data }: { data: SpeakingHomeData }) {
  return (
    <div className="relative mb-7 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 to-purple-500 px-9 py-10 text-white">
      <div className="relative z-10 max-w-md">
        <h2 className="text-3xl font-bold">{data.hero.title}</h2>
        <p className="mt-4 text-sm leading-6">{data.hero.description}</p>
        <button className="mt-7 flex items-center gap-3 rounded-lg bg-white px-7 py-4 text-sm font-bold text-purple-700 shadow">
          <Mic size={18} />
          Start Speaking Now
        </button>
      </div>

      <div className="absolute right-20 top-10 text-[130px]">🧑‍🎤</div>
      <div className="absolute right-72 top-24 rounded-3xl bg-white/15 px-8 py-4 text-3xl">
        ▌▌▌▌▌▌
      </div>
    </div>
  );
}

function CategorySection({ data }: { data: SpeakingHomeData }) {
  return (
    <section className="mb-8">
      <SectionTitle title="Practice by Category" />

      <div className="grid grid-cols-6 gap-5">
        {data.categories.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              window.location.href = `/speaking/categories/${item.slug}`;
            }}
            className="cursor-pointer rounded-2xl p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            style={{ backgroundColor: item.color || '#f5f3ff' }}
          >
            <div className="text-5xl">{item.icon || '🎙️'}</div>
            <h3 className="mt-5 text-sm font-bold">{item.title}</h3>
            <p className="mt-2 text-xs text-indigo-500">
              {item.topicCount} Topics
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PracticeTypeSection({ data }: { data: SpeakingHomeData }) {
  const iconMap: Record<string, React.ReactNode> = {
    READ_ALOUD: <ClipboardList />,
    REPEAT_AFTER_ME: <Headphones />,
    ANSWER_QUESTIONS: <HelpCircle />,
    FREE_TALK: <Mic />,
  };

  return (
    <section className="mb-8">
      <SectionTitle title="Choose a Practice Type" />

      <div className="grid grid-cols-4 gap-4">
        {data.practiceTypes.map((item) => (
          <div
            key={item.key}
            onClick={() => {
              window.location.href = `/speaking/practice-type/${item.key}`;
            }}
            className="flex cursor-pointer items-center justify-between rounded-2xl border border-indigo-50 bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="flex gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                {iconMap[item.key] || item.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-indigo-400">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500 text-purple-600">
              <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendedSection({ data }: { data: SpeakingHomeData }) {
  return (
    <section>
      <SectionTitle title="Recommended Topics For You" />

      <div className="grid grid-cols-4 gap-5">
        {data.recommendedTopics.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              window.location.href = `/speaking/topics/${item.slug}`;
            }}
            className="cursor-pointer overflow-hidden rounded-2xl border border-indigo-50 bg-white shadow-sm hover:shadow-md"
          >
            <div className="relative h-28 bg-indigo-100">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl">
                  🎙️
                </div>
              )}

              <span className="absolute left-4 top-3 rounded-lg bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
                {item.difficulty}
              </span>
            </div>

            <div className="p-4">
              <h3 className="text-sm font-bold">{item.title}</h3>
              <p className="mt-3 text-sm font-semibold text-indigo-500">
                {item.estimatedMinutes - 1} - {item.estimatedMinutes + 1} min
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StreakCard({ data }: { data: SpeakingHomeData }) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-7 flex items-center gap-2 text-xl font-bold">
        🔥 Your Streak
      </h2>

      <div className="flex items-center gap-8">
        <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-[8px] border-orange-500">
          <p className="text-5xl font-bold">{data.streak.days}</p>
          <p className="text-sm text-indigo-400">days</p>
        </div>

        <div className="flex flex-1 justify-between">
          {data.streak.week.map((item, index) => (
            <div key={index} className="text-center">
              <p className="mb-3 text-sm text-indigo-500">{item.label}</p>
              <div
                className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  item.completed
                    ? 'bg-purple-600 text-white'
                    : 'border border-indigo-300 text-indigo-400'
                }`}
              >
                {item.completed ? '✓' : ''}
              </div>
              <p
                className={`text-xs ${
                  item.active ? 'font-bold text-purple-600' : 'text-indigo-400'
                }`}
              >
                {item.day}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-7 text-sm font-semibold leading-6 text-indigo-400">
        Keep it up! Practice everyday to build your streak.
      </p>
    </div>
  );
}

function ProgressCard({ data }: { data: SpeakingHomeData }) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-7 flex items-center gap-2 text-xl font-bold">
        📈 Overall Progress
      </h2>

      <div className="mb-4 flex justify-between text-sm font-semibold text-indigo-500">
        <span>Level {data.progress.currentLevel}</span>
        <span>Level {data.progress.nextLevel}</span>
      </div>

      <div className="h-3 rounded-full bg-indigo-100">
        <div
          className="h-3 rounded-full bg-purple-600"
          style={{ width: `${data.progress.percent}%` }}
        />
      </div>

      <p className="mt-2 text-right text-sm font-bold">
        {data.progress.percent}%
      </p>

      <div className="mt-7 grid grid-cols-3 gap-4 text-center">
        <ProgressStat
          icon={<CheckCircle size={18} />}
          value={data.progress.completed}
          label="Completed"
        />
        <ProgressStat
          icon={<Clock size={18} />}
          value={data.progress.inProgress}
          label="In Progress"
        />
        <ProgressStat
          icon={<Lock size={18} />}
          value={data.progress.notStarted}
          label="Not Started"
        />
      </div>

      <button className="mt-7 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600">
        View Progress
      </button>
    </div>
  );
}

function ProgressStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div>
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
        {icon}
      </div>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-xs text-indigo-400">{label}</p>
    </div>
  );
}

function HistoryCard({ data }: { data: SpeakingHomeData }) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">🕘 Recent History</h2>
        <button
          onClick={() => {
            window.location.href = '/speaking/history';
          }}
          className="text-sm font-bold text-purple-600"
        >
          View all
        </button>
      </div>

      <div className="space-y-5">
        {data.recentHistory.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              window.location.href = `/speaking/history/${item.id}`;
            }}
            className="flex cursor-pointer items-center gap-4"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <Mic size={20} />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-bold">{item.title}</h3>
              <p className="mt-1 text-xs text-indigo-400">
                {item.category} • {formatType(item.type)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-green-600">{item.score}</p>
              <p className="text-xs text-indigo-400">{item.level}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          window.location.href = '/speaking/history';
        }}
        className="mt-7 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600"
      >
        View All History
      </button>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-xl font-bold">{title}</h2>
      <button className="text-sm font-bold text-purple-600">View all</button>
    </div>
  );
}

function formatType(type: string) {
  return type
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
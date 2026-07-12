'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { api } from '@/src/lib/axios';

export type SpeakingCategoryItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  lessonCount: number;
  levelRange: string;
  progressPercent: number;
};

export type SpeakingCategoriesResponse = {
  filters: {
    label: string;
    value: string;
  }[];
  categories: SpeakingCategoryItem[];
  progress: {
    overallPercent: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  topSkills: {
    title: string;
    description: string;
    icon: string;
  }[];
  dailyGoal: {
    currentMinutes: number;
    targetMinutes: number;
    percent: number;
    description: string;
  };
};

export async function getSpeakingCategories(params?: { level?: string }) {
  const res = await api.get('/speaking/categories', {
    params,
  });

  return res.data.data as SpeakingCategoriesResponse;
}

export default function SpeakingCategoriesPage() {
  const router = useRouter();

  const [data, setData] = useState<SpeakingCategoriesResponse | null>(null);
  const [level, setLevel] = useState('all');
  const [loading, setLoading] = useState(true);

  async function fetchCategories() {
    try {
      setLoading(true);

      const result = await getSpeakingCategories({
        level,
      });

      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, [level]);

  function handleCategoryClick(slug: string) {
    router.push(`/speaking/topics/${slug}`);
  }

  if (loading && !data) {
    return <div className="p-10 text-purple-600">Loading categories...</div>;
  }

  if (!data) {
    return <div className="p-10 text-red-500">Không tải được categories.</div>;
  }

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#08083d]">
      <div className="flex">

        <main className="flex-1">

          <div className="grid grid-cols-12 gap-8 px-9 py-7">
            <section className="col-span-9">
              <Breadcrumb />

              <Header />

              <FilterTabs
                filters={data.filters}
                active={level}
                onChange={setLevel}
              />

              <div className="mt-8 grid grid-cols-4 gap-6">
                {data.categories.map((item) => (
                  <CategoryCard
                    key={item.id}
                    item={item}
                    onClick={() => handleCategoryClick(item.slug)}
                  />
                ))}
              </div>
            </section>

            <aside className="col-span-3 space-y-5">
              <ProgressCard
                progress={data.progress}
                onView={() => router.push('/speaking/progress')}
              />

              <TopSkillsCard
                skills={data.topSkills}
                onPractice={() => router.push('/speaking/topics')}
              />

              <DailyGoalCard
                goal={data.dailyGoal}
                onStart={() => router.push('/speaking/topics')}
              />
            </aside>
          </div>
        </main>
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
      <span className="text-[#08083d]">Categories</span>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-extrabold">Speaking Categories</h1>
        <p className="mt-3 text-lg text-indigo-500">
          Explore different categories and practice speaking on topics that interest you.
        </p>
      </div>

      <div className="hidden text-8xl lg:block">🎙️💬🌿</div>
    </div>
  );
}

function FilterTabs({
  filters,
  active,
  onChange,
}: {
  filters: { label: string; value: string }[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-5">
      {filters.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`rounded-xl border px-7 py-4 text-sm font-bold transition ${
            active === item.value
              ? 'border-purple-600 bg-purple-600 text-white shadow-lg shadow-purple-100'
              : 'border-indigo-100 bg-white text-indigo-700 hover:border-purple-400'
          }`}
        >
          {item.label}
        </button>
      ))}
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
            {item.icon || '🎙️'}
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

          <span className={getLevelBadgeClass(item.levelRange)}>
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

function getLevelBadgeClass(levelRange: string) {
  if (levelRange.includes('A1')) {
    return 'rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-600';
  }

  if (levelRange.includes('A2') && levelRange.includes('B2')) {
    return 'rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-600';
  }

  if (levelRange.includes('C1')) {
    return 'rounded-lg bg-orange-100 px-3 py-2 text-xs font-bold text-orange-600';
  }

  return 'rounded-lg bg-purple-100 px-3 py-2 text-xs font-bold text-purple-600';
}

function ProgressCard({
  progress,
  onView,
}: {
  progress: SpeakingCategoriesResponse['progress'];
  onView: () => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-7 text-lg font-extrabold">Your Progress</h2>

      <div className="flex items-center gap-7">
        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-[10px] border-purple-600">
          <p className="text-4xl font-extrabold">{progress.overallPercent}%</p>
          <p className="text-sm text-indigo-400">Overall</p>
        </div>

        <div className="space-y-5 text-sm">
          <ProgressLegend title="Completed" value={progress.completed} color="green" />
          <ProgressLegend title="In Progress" value={progress.inProgress} color="orange" />
          <ProgressLegend title="Not Started" value={progress.notStarted} color="indigo" />
        </div>
      </div>

      <button
        onClick={onView}
        className="mt-7 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600 hover:bg-purple-600 hover:text-white"
      >
        View Progress
      </button>
    </div>
  );
}

function ProgressLegend({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: 'green' | 'orange' | 'indigo';
}) {
  const colorClass =
    color === 'green'
      ? 'bg-green-100 text-green-600'
      : color === 'orange'
        ? 'bg-orange-100 text-orange-600'
        : 'bg-indigo-100 text-indigo-500';

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`h-5 w-5 rounded-full ${colorClass}`} />
        <span className="font-bold">{title}</span>
      </div>
      <p className="ml-8 mt-1 font-bold text-indigo-500">{value}</p>
    </div>
  );
}

function TopSkillsCard({
  skills,
  onPractice,
}: {
  skills: SpeakingCategoriesResponse['topSkills'];
  onPractice: () => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">Top Skills to Improve</h2>

      <div className="space-y-5">
        {skills.map((item) => (
          <div key={item.title} className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-xl">
              {item.icon}
            </div>

            <div>
              <h3 className="text-sm font-bold">{item.title}</h3>
              <p className="mt-1 text-sm text-indigo-400">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onPractice}
        className="mt-7 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600 hover:bg-purple-600 hover:text-white"
      >
        Go to Practice
      </button>
    </div>
  );
}

function DailyGoalCard({
  goal,
  onStart,
}: {
  goal: SpeakingCategoriesResponse['dailyGoal'];
  onStart: () => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold">Daily Goal</h2>

      <div className="flex items-center justify-between gap-5">
        <p className="text-sm leading-6 text-indigo-500">{goal.description}</p>

        <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-[8px] border-purple-600">
          <p className="text-2xl font-extrabold">
            {goal.currentMinutes} / {goal.targetMinutes}
          </p>
          <p className="text-xs text-indigo-400">minutes</p>
        </div>
      </div>

      <button
        onClick={onStart}
        className="mt-7 w-full rounded-xl bg-purple-600 py-4 text-sm font-bold text-white hover:bg-purple-700"
      >
        Start Practice
      </button>
    </div>
  );
}


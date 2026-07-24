'use client';

import { api } from '@/src/lib/axios';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  Crown,
  FileText,
  Flame,
  Gift,
  Mail,
  PenLine,
  Search,
  Star,
  Trophy,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LumiverseLoadingState } from '@/src/Components/UI/Lumiverse';

type WritingHome = {
  user: {
    name: string;
    level: number;
  };
  stats: {
    essaysWritten: number;
    avgScore: number;
    dayStreak: number;
    xpToday?: number;
    gems?: number;
  };
  progress?: {
    overall: number;
    excellent: number;
    good: number;
    needsImprovement: number;
    total: number;
  };
  todayPractice: {
    key: string;
    title: string;
    description: string;
    color: string;
  }[];
  writingPath?: {
    key: string;
    title: string;
    description: string;
    order: number;
  }[];
  recommendations: {
    id: string;
    title: string;
    level: string;
    type: string;
    category: string;
    imageUrl?: string;
    writers: number;
  }[];
  recentHistory: {
    id: string;
    title: string;
    type: string;
    level: string;
    score: number;
    submittedAt: string;
  }[];
  dailyGoal: {
    title: string;
    current: number;
    target: number;
    continueSessionId?: string | null;
  };
};

export default function WritingHomePage() {
  const [data, setData] = useState<WritingHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get('/writing/home');
      setData(res.data);
    } catch (error) {
      console.error(error);
      setError("Không tải được trang Writing.");
    } finally {
      setLoading(false);
    }
  }

async function handleStartWriting(type: string) {
  if (type === 'PROGRESS') {
    router.push('/writing/progress');
    return;
  }

  if (type === 'DAILY_CHALLENGE') {
    router.push('/writing/daily-challenge');
    return;
  }

  if (type === 'AI_COACH') {
    router.push('/writing/ai-coach');
    return;
  }

  router.push(`/writing/topics?type=${type}`);
}

  async function handleStartLesson(lessonId: string) {
    try {
      setError("");
      const res = await api.post(`/writing/lessons/${lessonId}/start`);
      router.push(`/writing/sessions/${res.data.sessionId}`);
    } catch (error) {
      console.error(error);
      setError("Không mở được bài Writing lúc này.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LumiverseLoadingState className="m-10" label="Đang tải Writing..." />;
  }

  if (!data) {
    return error ? (
      <div className="p-10">
        <p className="font-semibold text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white"
        >
          Thử lại
        </button>
      </div>
    ) : (
      <div className="p-10">Không tải được dữ liệu.</div>
    );
  }

return (
  <div className="min-h-screen bg-[#fbfaff] text-[#09083f]">
    <div className="flex">
      {/* <Sidebar /> */}

      <main className="min-h-screen flex-1">

        <div className="grid grid-cols-[minmax(0,1fr)_390px] gap-8 px-8 py-7">
          <div className="min-w-0">
            <Hero data={data} />

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <section className="mt-8">
              <h2 className="text-2xl font-bold">Today&apos;s Practice</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a writing type to start practicing
              </p>

              <div className="mt-6 grid grid-cols-5 gap-5">
                {data.todayPractice.map((item) => (
                  <PracticeCard
                    key={item.key}
                    item={item}
                    onClick={() => handleStartWriting(item.key)}
                  />
                ))}
              </div>
            </section>

            {data.writingPath && data.writingPath.length > 0 && (
              <WritingPathSection
                items={data.writingPath}
                onStart={(key) => handleStartWriting(key)}
              />
            )}

            <section className="mt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Recommended for You</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Personalized suggestions based on your level and interests
                  </p>
                </div>

                <button
                  onClick={() => router.push('/writing/topics')}
                  className="font-semibold text-violet-600"
                >
                  View all topics →
                </button>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-5">
                {data.recommendations.map((item) => (
                  <RecommendationCard
                    key={item.id}
                    item={item}
                    onStart={() => handleStartLesson(item.id)}
                  />
                ))}
              </div>
            </section>

            <DailyGoal
              goal={data.dailyGoal}
              onContinue={() => {
                if (data.dailyGoal.continueSessionId) {
                  router.push(`/writing/sessions/${data.dailyGoal.continueSessionId}`);
                } else {
                  router.push('/writing/topics');
                }
              }}
            />
          </div>

          <aside className="space-y-6">
            <ProgressCard
              progress={data.progress}
              onViewReport={() => router.push('/writing/progress')}
            />

            <HistoryCard
              items={data.recentHistory}
              onViewAll={() => router.push('/writing/history')}
              onOpenItem={(id) => router.push(`/writing/sessions/${id}/result`)}
            />
          </aside>
        </div>
      </main>
    </div>
  </div>
);
}

function Header({ data }: { data: WritingHome }) {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-100 bg-white px-8">
      <div className="relative w-[560px]">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          className="h-12 w-full rounded-2xl bg-[#f7f5ff] pl-12 pr-16 text-sm text-slate-700 outline-none"
          placeholder="Search lessons, topics, or skills..."
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-400">
          ⌘ K
        </span>
      </div>

      <div className="flex items-center gap-7">
        <TopStat icon={<Flame className="h-7 w-7 text-red-500" />} value="18" label="Streak" />
        <TopStat icon={<Star className="h-7 w-7 fill-yellow-400 text-yellow-400" />} value="2,450" label="XP Today" />
        <TopStat icon={<span className="text-2xl">💎</span>} value="5,230" label="Gems" />

        <div className="grid h-10 w-10 place-items-center rounded-full bg-violet-50">
          <Gift className="h-5 w-5 text-violet-600" />
        </div>

        <div className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-50">
          <Bell className="h-5 w-5 text-slate-500" />
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            2
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 text-2xl">
            🧑‍🎓
          </div>
          <div>
            <p className="text-sm font-bold">{data.user.name}</p>
            <p className="text-xs font-medium text-slate-500">
              Level {data.user.level}
            </p>
          </div>
        </div>
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
      <div>{icon}</div>
      <div>
        <p className="text-sm font-bold">{value}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Sidebar() {
  const learn = [
    'Vocabulary',
    'Grammar',
    'Listening',
    'Speaking',
    'Reading',
    'Writing',
    'Flashcards',
  ];

  return (
    <aside className="h-screen w-[245px] border-r border-slate-100 bg-white px-5 py-6">
      <div className="mb-10 flex items-center gap-3">
        {/* <div className="text-3xl">🦊</div> */}
        <h1 className="text-2xl font-extrabold">
          Study<span className="text-violet-600">Arena</span>
        </h1>
      </div>

      <nav className="space-y-2 text-sm font-semibold">
        <MenuItem label="Home" active={false} />

        <p className="px-2 pt-6 text-xs font-bold uppercase tracking-widest text-slate-400">
          Learn
        </p>

        {learn.map((item) => (
          <MenuItem key={item} label={item} active={item === 'Writing'} />
        ))}

        <p className="px-2 pt-6 text-xs font-bold uppercase tracking-widest text-slate-400">
          Community
        </p>

        <MenuItem label="Community" />
        <MenuItem label="Q&A" />
        <MenuItem label="Achievements" />

        <p className="px-2 pt-6 text-xs font-bold uppercase tracking-widest text-slate-400">
          More
        </p>

        <MenuItem label="Courses" />
        <MenuItem label="Shop" />
        <MenuItem label="Settings" />
      </nav>

      <div className="mt-8 rounded-2xl bg-violet-50 p-4">
        <p className="flex items-center gap-2 font-bold text-violet-700">
          <Crown className="h-4 w-4 text-yellow-500" />
          Premium
        </p>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Unlock all features and learn without limits.
        </p>
        <button className="mt-4 rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold text-white">
          Upgrade Now
        </button>
      </div>
    </aside>
  );
}

function MenuItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className={`flex h-11 items-center gap-3 rounded-xl px-3 ${
        active ? 'bg-violet-50 text-violet-700' : 'text-slate-700'
      }`}
    >
      <PenLine className="h-4 w-4" />
      {label}
    </div>
  );
}

function Hero({ data }: { data: WritingHome }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-50 to-white p-8">
      <div>
        <div className="flex items-center gap-5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white">
            <PenLine className="h-7 w-7 text-violet-600" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold">
              Welcome back, {data.user.name}! 👋
            </h1>
            <p className="mt-2 font-medium text-slate-600">
              Let&apos;s write and express your ideas clearly.
            </p>
          </div>
        </div>

        <div className="mt-7 flex w-[560px] items-center rounded-2xl bg-white p-5 shadow-sm">
          <HeroStat value={data.stats.essaysWritten} label="Essays Written" />
          <HeroStat value={`${data.stats.avgScore}%`} label="Avg. Score" />
          <HeroStat value={data.stats.dayStreak} label="Day Streak" />
        </div>
      </div>

      <div className="absolute bottom-0 right-16 text-[160px] leading-none">🦊</div>
    </section>
  );
}

function HeroStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-1 items-center gap-3 border-r last:border-r-0">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-violet-100">
        <FileText className="h-5 w-5 text-violet-600" />
      </div>
      <div>
        <p className="text-2xl font-extrabold">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function PracticeCard({
  item,
  onClick,
}: {
  item: WritingHome['todayPractice'][number];
  onClick: () => void;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    ESSAY: <FileText />,
    EMAIL: <Mail />,
    STORY: <BookOpen />,
    SENTENCE: <PenLine />,
    PROGRESS: <BarChart3 />,
  };

  return (
    <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-50 text-violet-600">
        {iconMap[item.key]}
      </div>

      <h3 className="mt-5 text-lg font-extrabold">{item.title}</h3>
      <p className="mt-3 min-h-[66px] text-sm leading-6 text-slate-500">
        {item.description}
      </p>

      <button
        onClick={onClick}
        className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-violet-500 font-bold text-violet-600"
      >
        {item.key === 'PROGRESS' ? 'View Progress' : 'Start Writing'}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function RecommendationCard({
  item,
  onStart,
}: {
  item: WritingHome['recommendations'][number];
  onStart: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      {item.imageUrl ? (
        <div
          className="h-28 bg-cover bg-center"
          style={{
            backgroundImage: `url(${item.imageUrl})`,
          }}
        />
      ) : (
        <div className="flex h-28 items-center justify-center bg-violet-50 text-violet-600">
          <BookOpen className="h-9 w-9" />
        </div>
      )}

      <div className="p-4">
        <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
          {item.category}
        </span>

        <h3 className="mt-3 font-extrabold">{item.title}</h3>
        <p className="mt-1 text-xs text-slate-500">
          {item.level} • {formatType(item.type)}
        </p>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-slate-500">👥 {item.writers} writers</p>
          <button
            onClick={onStart}
            className="grid h-9 w-9 place-items-center rounded-lg border border-violet-200 text-violet-600"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DailyGoal({
  goal,
  onContinue,
}: {
  goal: {
    title: string;
    current: number;
    target: number;
  };
  onContinue: () => void;
}) {
  const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));

  return (
    <div className="mt-8 flex items-center gap-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-violet-100">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-yellow-100">
        <Trophy className="h-7 w-7 text-yellow-500" />
      </div>

      <div className="flex-1">
        <p className="font-extrabold text-violet-700">{goal.title}</p>
        <div className="mt-3 h-2 rounded-full bg-violet-100">
          <div
            className="h-2 rounded-full bg-violet-600"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <p className="font-extrabold">
        {goal.current} / {goal.target} min
      </p>

      <button
        onClick={onContinue}
        className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white"
      >
        Continue Writing
      </button>
    </div>
  );
}

function ProgressCard({
  progress,
  onViewReport,
}: {
  progress?: WritingHome['progress'];
  onViewReport: () => void;
}) {
  const overall = progress?.overall ?? 0;
  const total = progress?.total ?? 0;

  const excellent = progress?.excellent ?? 0;
  const good = progress?.good ?? 0;
  const needsImprovement = progress?.needsImprovement ?? 0;

  const percent = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-extrabold">Writing Progress</h2>

      <div className="mt-8 flex items-center gap-7">
        <div className="grid h-40 w-40 place-items-center rounded-full bg-violet-100">
          <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
            <div className="text-center">
              <p className="text-3xl font-extrabold">{overall}%</p>
              <p className="text-xs text-slate-500">Overall</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 text-sm">
          <ProgressLabel
            color="bg-violet-600"
            title="Excellent"
            value={`${excellent} (${percent(excellent)}%)`}
          />
          <ProgressLabel
            color="bg-green-500"
            title="Good"
            value={`${good} (${percent(good)}%)`}
          />
          <ProgressLabel
            color="bg-yellow-400"
            title="Needs Improvement"
            value={`${needsImprovement} (${percent(needsImprovement)}%)`}
          />
        </div>
      </div>

      <button
        onClick={onViewReport}
        className="mt-8 h-12 w-full rounded-xl border border-violet-500 font-bold text-violet-600"
      >
        View Detailed Report
      </button>
    </div>
  );
}

function ProgressLabel({
  color,
  title,
  value,
}: {
  color: string;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1 h-3 w-3 rounded-full ${color}`} />
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-slate-500">{value}</p>
      </div>
    </div>
  );
}

function HistoryCard({
  items,
  onViewAll,
  onOpenItem,
}: {
  items: WritingHome['recentHistory'];
  onViewAll: () => void;
  onOpenItem: (id: string) => void;
}) {
  return (
    <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Recent History</h2>
        <button onClick={onViewAll} className="font-bold text-violet-600">
          View all →
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {items.length === 0 && (
          <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            Chưa có lịch sử luyện viết.
          </div>
        )}

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onOpenItem(item.id)}
            className="flex w-full cursor-pointer items-center gap-4 border-b border-slate-100 pb-4 text-left last:border-b-0"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50">
              <FileText className="h-5 w-5 text-violet-600" />
            </div>

            <div className="flex-1">
              <p className="font-extrabold">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatType(item.type)} • {item.level}
              </p>
            </div>

            <span className="rounded-full bg-green-100 px-3 py-1 font-bold text-green-600">
              {item.score}%
            </span>

            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        ))}
      </div>

      <button
        onClick={onViewAll}
        className="mt-6 h-12 w-full rounded-xl border border-violet-500 font-bold text-violet-600"
      >
        Go to History
      </button>
    </div>
  );
}

function formatType(type: string) {
  const map: Record<string, string> = {
    ESSAY: 'Essay',
    EMAIL: 'Email',
    STORY: 'Story',
    SENTENCE: 'Sentence',
  };

  return map[type] ?? type;
}

function WritingPathSection({
  items,
  onStart,
}: {
  items: NonNullable<WritingHome['writingPath']>;
  onStart: (key: string) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold">Writing Path</h2>
      <p className="mt-1 text-sm text-slate-500">
        Follow the path to improve your writing step by step
      </p>

      <div className="mt-5 grid grid-cols-5 gap-5">
        {items
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <button
              key={item.key}
              onClick={() => onStart(item.key)}
              className="rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-violet-100 text-violet-600">
                {item.order}
              </div>

              <h3 className="mt-4 font-extrabold">{item.title}</h3>

              <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">
                {item.description}
              </p>

              <div className="mt-4 flex items-center font-bold text-violet-600">
                Start
                <ChevronRight className="ml-1 h-4 w-4" />
              </div>
            </button>
          ))}
      </div>
    </section>
  );
}

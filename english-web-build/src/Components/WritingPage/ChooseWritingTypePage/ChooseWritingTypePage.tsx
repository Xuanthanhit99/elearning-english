'use client';

import { api } from '@/src/lib/axios';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Gift,
  Home,
  PenLine,
  Search,
  Star,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type WritingTypeItem = {
  key: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessonCount: number;
  completedCount: number;
  progressPercent: number;
};

type ResponseData = {
  topic: {
    id: string;
    title: string;
    slug: string;
    description: string;
    imageUrl?: string;
    difficulty: string;
    levelText: string;
    lessonCount: number;
    estimatedTime: string;
    progressPercent: number;
  };
  types: WritingTypeItem[];
};

export default function ChooseWritingTypePage({slug}: {slug: string}) {
  const router = useRouter();
  const params = useParams();

  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const res = await api.get(`/writing/topics/${slug}/types`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart(type: string) {
    const res = await api.post(`/writing/topics/${slug}/types/${type}/start`);
    router.push(`/writing/sessions/${res.data.sessionId}`);
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  if (loading) return <div className="p-10">Loading...</div>;
  if (!data) return <div className="p-10">Không tải được dữ liệu.</div>;

  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#09083f]">
      <div className="flex">

        <main className="min-h-screen flex-1">

          <div className="px-10 py-8">
            <div className="flex items-center justify-between">
              <Breadcrumb title={data.topic.title} />

              <button
                onClick={() => router.push('/writing/topics')}
                className="flex h-11 items-center gap-2 rounded-xl border border-violet-500 px-5 text-sm font-bold text-violet-600"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Topics
              </button>
            </div>

            <TopicHeader topic={data.topic} />

            <section className="mt-8 border-t border-slate-200 pt-8">
              <h2 className="text-2xl font-extrabold">Choose a Writing Type</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Select a writing type to practice and improve your skills in this topic.
              </p>

              <div className="mt-6 grid grid-cols-4 gap-6">
                {data.types.map((item) => (
                  <WritingTypeCard
                    key={item.key}
                    item={item}
                    onClick={() => handleStart(item.key)}
                  />
                ))}
              </div>
            </section>

            <TipBox />
          </div>
        </main>
      </div>
    </div>
  );
}

function Breadcrumb({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
      <Home className="h-4 w-4" />
      <span>Writing</span>
      <ChevronRight className="h-4 w-4" />
      <span>All Topics</span>
      <ChevronRight className="h-4 w-4" />
      <span className="text-[#09083f]">{title}</span>
    </div>
  );
}

function TopicHeader({ topic }: { topic: ResponseData['topic'] }) {
  return (
    <section className="mt-7 flex items-center gap-10">
      <div
        className="h-[235px] w-[300px] shrink-0 rounded-2xl bg-cover bg-center shadow-sm"
        style={{
          backgroundImage: `url(${topic.imageUrl || '/images/writing/default-topic.png'})`,
        }}
      />

      <div className="max-w-[720px]">
        <h1 className="text-4xl font-extrabold">{topic.title}</h1>

        <p className="mt-4 text-lg leading-8 text-slate-600">
          {topic.description}
        </p>

        <div className="mt-7 flex items-center gap-4">
          <div className="flex items-center gap-3 font-bold text-violet-700">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-white">
              <BarChart3 className="h-4 w-4" />
            </div>
            Overall Progress
          </div>

          <div className="h-2 w-[250px] rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-violet-600"
              style={{ width: `${topic.progressPercent}%` }}
            />
          </div>

          <span className="font-extrabold">{topic.progressPercent}%</span>
        </div>

        <div className="mt-7 flex items-center gap-10 text-sm font-bold text-slate-500">
          <span className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {topic.lessonCount} Lessons
          </span>

          <span className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {formatDifficulty(topic.difficulty)}
          </span>

          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Est. {topic.estimatedTime}
          </span>
        </div>
      </div>
    </section>
  );
}

function WritingTypeCard({
  item,
  onClick,
}: {
  item: WritingTypeItem;
  onClick: () => void;
}) {
  const theme = getTypeTheme(item.color);

  return (
    <button
      onClick={onClick}
      className="relative min-h-[280px] rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div
        className={`mx-auto grid h-24 w-24 place-items-center rounded-full text-5xl ${theme.bg}`}
      >
        {item.icon}
      </div>

      <h3 className="mt-7 text-xl font-extrabold">{item.title}</h3>

      <p className="mx-auto mt-3 min-h-[52px] max-w-[230px] text-sm leading-6 text-slate-600">
        {item.description}
      </p>

      <div className="absolute bottom-6 left-6 flex items-center gap-2 text-sm font-bold text-slate-500">
        <BookOpen className={`h-4 w-4 ${theme.text}`} />
        {item.lessonCount} Lessons
      </div>

      <div
        className={`absolute bottom-5 right-6 grid h-9 w-9 place-items-center rounded-full border ${theme.border} ${theme.text}`}
      >
        <ChevronRight className="h-5 w-5" />
      </div>
    </button>
  );
}

function TipBox() {
  return (
    <div className="relative mt-6 flex items-center rounded-2xl border border-violet-100 bg-violet-50 px-7 py-5">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-violet-100 text-3xl">
        💡
      </div>

      <div className="ml-5">
        <p className="font-extrabold text-violet-700">
          Tip: Try different writing types to improve your overall writing skills!
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Complete lessons to earn XP and track your progress.
        </p>
      </div>

      <div className="absolute bottom-0 right-8 text-7xl">🦊</div>
    </div>
  );
}

function getTypeTheme(color: string) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    green: {
      bg: 'bg-green-100',
      text: 'text-green-500',
      border: 'border-green-300',
    },
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-500',
      border: 'border-blue-300',
    },
    purple: {
      bg: 'bg-violet-100',
      text: 'text-violet-500',
      border: 'border-violet-300',
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-500',
      border: 'border-orange-300',
    },
    pink: {
      bg: 'bg-pink-100',
      text: 'text-pink-500',
      border: 'border-pink-300',
    },
    teal: {
      bg: 'bg-teal-100',
      text: 'text-teal-500',
      border: 'border-teal-300',
    },
    sky: {
      bg: 'bg-sky-100',
      text: 'text-sky-500',
      border: 'border-sky-300',
    },
  };

  return map[color] ?? map.purple;
}

function formatDifficulty(value: string) {
  const map: Record<string, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
  };

  return map[value] ?? value;
}
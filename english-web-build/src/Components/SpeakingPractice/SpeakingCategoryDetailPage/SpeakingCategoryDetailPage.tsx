'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import {
  getSpeakingCategoryDetail,
  getSpeakingCategoryLessons,
  startSpeakingLesson,
} from '@/src/lib/speaking-api';

export default function SpeakingCategoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.slug);

  const [detail, setDetail] = useState<any>(null);
  const [lessonData, setLessonData] = useState<any>(null);
  const [tab, setTab] = useState<'LESSONS' | 'ABOUT'>('LESSONS');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('default');
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  async function fetchDetail() {
    const result = await getSpeakingCategoryDetail(slug);
    setDetail(result);
  }

  async function fetchLessons() {
    const result = await getSpeakingCategoryLessons(slug, {
      page,
      limit: 8,
      sort,
    });

    setLessonData(result);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchDetail(), fetchLessons()]);
      setLoading(false);
    }

    init();
  }, [slug]);

  useEffect(() => {
    fetchLessons();
  }, [page, sort]);

  async function handleStartLesson(lesson: any) {
    if (lesson.status === 'LOCKED') return;

    if (lesson.sessionId && lesson.status === 'IN_PROGRESS') {
      router.push(`/speaking/practice/${lesson.sessionId}`);
      return;
    }

    try {
      setStartingId(lesson.id);
      const result = await startSpeakingLesson(lesson.id);
      router.push(result.redirectUrl);
    } finally {
      setStartingId(null);
    }
  }

  if (loading || !detail || !lessonData) {
    return <div className="p-10 text-purple-600">Loading category...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#08083d]">
      <div className="flex">

        <main className="flex-1">


          <div className="grid grid-cols-12 gap-8 px-9 py-7">
            <section className="col-span-9">
              <Breadcrumb title={detail.category.title} />

              <CategoryHero detail={detail} />

              <div className="mt-8 flex items-center gap-10 border-b border-indigo-100">
                <button
                  onClick={() => setTab('LESSONS')}
                  className={`pb-4 text-sm font-bold ${
                    tab === 'LESSONS'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-indigo-400'
                  }`}
                >
                  Lessons
                </button>

                <button
                  onClick={() => setTab('ABOUT')}
                  className={`pb-4 text-sm font-bold ${
                    tab === 'ABOUT'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-indigo-400'
                  }`}
                >
                  About this Category
                </button>
              </div>

              {tab === 'LESSONS' ? (
                <>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-indigo-100 bg-white">
                    {lessonData.lessons.map((lesson: any, index: number) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        isFirst={index === 0}
                        starting={startingId === lesson.id}
                        onStart={() => handleStartLesson(lesson)}
                      />
                    ))}
                  </div>

                  <LoadMore
                    page={page}
                    totalPages={lessonData.pagination.totalPages}
                    onLoadMore={() => setPage((prev) => prev + 1)}
                  />
                </>
              ) : (
                <AboutCategory detail={detail} />
              )}
            </section>

            <aside className="col-span-3 space-y-5">
              <ProgressCard progress={detail.progress} />

              <ImproveCard items={detail.improveSkills} />

              <RelatedCategoriesCard
                categories={detail.relatedCategories}
                onViewAll={() => router.push('/speaking/categories')}
                onClick={(categorySlug: string) =>
                  router.push(`/speaking/categories/${categorySlug}`)
                }
              />
            </aside>
          </div>
        </main>
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
      <span>Categories</span>
      <ChevronRight size={14} />
      <span className="text-[#08083d]">{title}</span>
    </div>
  );
}

function CategoryHero({ detail }: { detail: any }) {
  const category = detail.category;

  return (
    <div className="grid grid-cols-12 items-center gap-8 border-b border-indigo-100 pb-8">
      <div className="col-span-2">
        <div className="h-40 w-40 overflow-hidden rounded-2xl bg-indigo-100">
          {category.imageUrl ? (
            <img
              src={category.imageUrl}
              alt={category.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">
              {category.icon || '🎙️'}
            </div>
          )}
        </div>
      </div>

      <div className="col-span-7">
        <h1 className="text-4xl font-extrabold">{category.title}</h1>

        <p className="mt-4 text-lg text-indigo-500">{category.description}</p>

        <div className="mt-6 flex items-center gap-8 text-sm font-semibold">
          <span className="rounded-lg bg-green-100 px-4 py-2 text-green-600">
            {category.levelRange}
          </span>

          <span className="text-indigo-500">{category.levelText}</span>

          <span className="flex items-center gap-2 text-indigo-500">
            <BookOpen size={18} />
            {category.lessonCount} Lessons
          </span>

          <span className="flex items-center gap-2 text-indigo-500">
            <Clock size={18} />
            {category.estimatedMinutesText}
          </span>
        </div>
      </div>

      <div className="col-span-3 hidden text-8xl lg:block">💬👩‍🦰☕</div>
    </div>
  );
}

function LessonRow({
  lesson,
  isFirst,
  starting,
  onStart,
}: {
  lesson: any;
  isFirst: boolean;
  starting: boolean;
  onStart: () => void;
}) {
  return (
    <div
      className={`grid grid-cols-12 items-center border-b border-indigo-50 px-6 py-5 last:border-b-0 ${
        isFirst ? 'bg-purple-50' : 'bg-white'
      }`}
    >
      <div className="col-span-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-white text-sm font-bold text-indigo-400">
          {String(lesson.order).padStart(2, '0')}
        </div>
      </div>

      <div className="col-span-1">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-pink-50 text-2xl">
          {lesson.icon}
        </div>
      </div>

      <div className="col-span-5">
        <h3 className="text-base font-extrabold">{lesson.title}</h3>
        <p className="mt-1 text-sm text-indigo-500">{lesson.description}</p>
      </div>

      <div className="col-span-1">
        <span className={getLevelClass(lesson.level)}>{lesson.level}</span>
      </div>

      <div className="col-span-2 flex items-center gap-2 text-sm font-semibold text-indigo-500">
        <Clock size={16} />
        {lesson.estimatedMinutes - 1} - {lesson.estimatedMinutes + 1} min
      </div>

      <div className="col-span-2 flex justify-end">
        {lesson.status === 'COMPLETED' && (
          <button className="flex items-center gap-2 text-sm font-bold text-green-600">
            ● Completed
            <ChevronRight size={16} className="text-indigo-400" />
          </button>
        )}

        {lesson.status === 'IN_PROGRESS' && (
          <button
            onClick={onStart}
            className="flex items-center gap-2 text-sm font-bold text-orange-500"
          >
            ● In Progress
            <ChevronRight size={16} className="text-indigo-400" />
          </button>
        )}

        {lesson.status === 'LOCKED' && (
          <button className="flex items-center gap-2 text-sm font-bold text-indigo-400">
            <Lock size={15} />
            Locked
            <ChevronRight size={16} />
          </button>
        )}

        {lesson.status === 'NOT_STARTED' && (
          <button
            onClick={onStart}
            disabled={starting}
            className="flex items-center gap-2 rounded-lg border border-purple-600 px-6 py-3 text-sm font-bold text-purple-600 hover:bg-purple-600 hover:text-white disabled:opacity-60"
          >
            <Mic size={16} />
            {starting ? 'Starting...' : 'Start'}
          </button>
        )}
      </div>
    </div>
  );
}

function getLevelClass(level: string) {
  const base = 'rounded-lg px-3 py-2 text-xs font-bold';

  if (level === 'A1') return `${base} bg-green-100 text-green-600`;
  if (level === 'A2') return `${base} bg-blue-100 text-blue-600`;
  if (level === 'B1') return `${base} bg-yellow-100 text-yellow-600`;

  return `${base} bg-purple-100 text-purple-600`;
}

function ProgressCard({ progress }: { progress: any }) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-7 text-lg font-extrabold">Category Progress</h2>

      <div className="flex items-center gap-7">
        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-[10px] border-purple-600">
          <p className="text-4xl font-extrabold">{progress.percent}%</p>
          <p className="text-sm text-indigo-400">Completed</p>
        </div>

        <div className="space-y-5 text-sm">
          <Legend title="Completed" value={progress.completed} color="green" />
          <Legend title="In Progress" value={progress.inProgress} color="orange" />
          <Legend title="Not Started" value={progress.notStarted} color="indigo" />
        </div>
      </div>

      <button className="mt-7 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600">
        Continue Learning
      </button>
    </div>
  );
}

function Legend({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="font-bold">{title}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function ImproveCard({ items }: { items: any[] }) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">What you'll improve</h2>

      <div className="space-y-5">
        {items.map((item) => (
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
    </div>
  );
}

function RelatedCategoriesCard({
  categories,
  onViewAll,
  onClick,
}: {
  categories: any[];
  onViewAll: () => void;
  onClick: (slug: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Related Categories</h2>

        <button onClick={onViewAll} className="text-sm font-bold text-purple-600">
          View all
        </button>
      </div>

      <div className="space-y-5">
        {categories.map((item) => (
          <button
            key={item.id}
            onClick={() => onClick(item.slug)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                {item.icon}
              </div>

              <span className="text-sm font-bold">{item.title}</span>
            </div>

            <span className="text-sm text-indigo-400">
              {item.lessonCount} Lessons
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={onViewAll}
        className="mt-7 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600"
      >
        Explore More Categories
      </button>
    </div>
  );
}

function LoadMore({
  page,
  totalPages,
  onLoadMore,
}: {
  page: number;
  totalPages: number;
  onLoadMore: () => void;
}) {
  if (page >= totalPages) return null;

  return (
    <div className="mt-6 flex justify-center">
      <button
        onClick={onLoadMore}
        className="rounded-xl border border-purple-600 px-20 py-4 text-sm font-bold text-purple-600"
      >
        Load more lessons
      </button>
    </div>
  );
}

function AboutCategory({ detail }: { detail: any }) {
  return (
    <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-7">
      <h2 className="text-xl font-extrabold">
        About {detail.category.title}
      </h2>

      <p className="mt-4 text-sm leading-7 text-indigo-500">
        {detail.category.description}
      </p>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock3,
  Flame,
  Gem,
  Gift,
  Home,
  MoreVertical,
  Search,
  Star,
} from 'lucide-react';
import {
  getSpeakingHistory,
  SpeakingHistoryItem,
  SpeakingHistoryResponse,
} from '@/src/lib/speaking-api';

export default function SpeakingHistoryPage() {
  const router = useRouter();

  const [data, setData] = useState<SpeakingHistoryResponse | null>(null);
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [from, setFrom] = useState('2025-05-01');
  const [to, setTo] = useState('2025-05-30');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function fetchHistory() {
    try {
      setLoading(true);

      const result = await getSpeakingHistory({
        type,
        category,
        from,
        to,
        page,
        limit: 8,
      });

      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, [type, category, from, to, page]);

  function handleViewDetail(id: string) {
    router.push(`/speaking/history/${id}`);
  }

  if (loading && !data) {
    return <div className="p-10 text-purple-600">Loading history...</div>;
  }

  if (!data) {
    return <div className="p-10 text-red-500">Không tải được history.</div>;
  }

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#08083d]">
      <div className="flex">

        <main className="flex-1">

          <div className="grid grid-cols-12 gap-8 px-9 py-7">
            <section className="col-span-9">
              <Breadcrumb />

              <Header />

              <FilterBar
                data={data}
                type={type}
                setType={(value) => {
                  setType(value);
                  setPage(1);
                }}
                category={category}
                setCategory={(value) => {
                  setCategory(value);
                  setPage(1);
                }}
                from={from}
                to={to}
                setFrom={setFrom}
                setTo={setTo}
              />

              <HistoryTable
                histories={data.histories}
                onViewDetail={handleViewDetail}
              />

              <Pagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onPageChange={setPage}
              />
            </section>

            <aside className="col-span-3 space-y-5">
              <ProgressCard progress={data.progress} />

              <SummaryCard summary={data.summary} />

              <RecentActivityCard
                items={data.recentActivity}
                onViewAll={() => router.push('/speaking/history')}
                onClick={(id) => router.push(`/speaking/history/${id}`)}
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
      <span className="text-[#08083d]">History</span>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8 flex items-center gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-purple-500 text-purple-600">
        <Clock3 size={34} />
      </div>

      <div>
        <h1 className="text-4xl font-extrabold">Practice History</h1>
        <p className="mt-3 text-sm text-indigo-500">
          Review your speaking practice sessions and track your progress.
        </p>
      </div>
    </div>
  );
}

function FilterBar({
  data,
  type,
  setType,
  category,
  setCategory,
  from,
  to,
  setFrom,
  setTo,
}: {
  data: SpeakingHistoryResponse;
  type: string;
  setType: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  from: string;
  to: string;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
}) {
  return (
    <div className="mb-7 flex flex-wrap gap-4">
      {data.filters.types.map((item) => (
        <button
          key={item.value}
          onClick={() => setType(item.value)}
          className={`rounded-xl border px-6 py-3 text-sm font-bold ${
            type === item.value
              ? 'border-purple-600 bg-purple-600 text-white'
              : 'border-indigo-100 bg-white text-indigo-700'
          }`}
        >
          {item.label}
        </button>
      ))}

      <div className="ml-auto flex gap-4">
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 w-56 appearance-none rounded-xl border border-indigo-100 bg-white px-4 text-sm font-bold outline-none"
          >
            {data.filters.categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-4 top-4 text-indigo-400"
          />
        </div>

        <div className="flex h-12 items-center gap-2 rounded-xl border border-indigo-100 bg-white px-4">
          <Calendar size={17} className="text-indigo-400" />

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-sm font-bold outline-none"
          />

          <span className="text-indigo-300">-</span>

          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-sm font-bold outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function HistoryTable({
  histories,
  onViewDetail,
}: {
  histories: SpeakingHistoryItem[];
  onViewDetail: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white">
      <div className="grid grid-cols-12 border-b border-indigo-100 bg-white px-6 py-5 text-sm font-bold text-indigo-500">
        <div className="col-span-4">Topic / Type</div>
        <div className="col-span-2">Score</div>
        <div className="col-span-2">Fluency</div>
        <div className="col-span-2">Accuracy</div>
        <div className="col-span-1">Completed At</div>
        <div className="col-span-1 text-right">Action</div>
      </div>

      {histories.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-12 items-center border-b border-indigo-50 px-6 py-5 last:border-b-0"
        >
          <div className="col-span-4 flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-3xl">
              {item.icon}
            </div>

            <div>
              <h3 className="text-base font-extrabold">{item.topicTitle}</h3>
              <p className="mt-1 text-sm text-indigo-500">{item.type}</p>
            </div>
          </div>

          <ScoreCell score={item.score} label={item.scoreLabel} />

          <ScoreCell score={item.fluency} label={item.fluencyLabel} />

          <ScoreCell score={item.accuracy} label={item.accuracyLabel} />

          <div className="col-span-1 text-sm font-semibold text-indigo-500">
            {formatDateTime(item.completedAt)}
          </div>

          <div className="col-span-1 flex items-center justify-end gap-4">
            <button
              onClick={() => onViewDetail(item.id)}
              className="rounded-lg border border-purple-600 px-4 py-3 text-sm font-bold text-purple-600 hover:bg-purple-600 hover:text-white"
            >
              View Details
            </button>

            <button>
              <MoreVertical size={18} className="text-indigo-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreCell({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? 'text-green-600' : score >= 70 ? 'text-green-600' : 'text-orange-600';

  return (
    <div className="col-span-2">
      <p className={`text-lg font-extrabold ${color}`}>{score}</p>
      <p className={`mt-1 text-xs ${color}`}>{label}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProgressCard({
  progress,
}: {
  progress: SpeakingHistoryResponse['progress'];
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-7 text-lg font-extrabold">Overall Progress</h2>

      <div className="flex items-center gap-7">
        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-[10px] border-purple-600">
          <p className="text-4xl font-extrabold">{progress.overallPercent}%</p>
          <p className="text-sm text-indigo-400">Overall</p>
        </div>

        <div className="space-y-5 text-sm">
          <Legend title="Completed" value={progress.completed} />
          <Legend title="In Progress" value={progress.inProgress} />
          <Legend title="Not Started" value={progress.notStarted} />
        </div>
      </div>
    </div>
  );
}

function Legend({ title, value }: { title: string; value: number }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <p className="mt-1 font-bold text-indigo-500">{value}</p>
    </div>
  );
}

function SummaryCard({
  summary,
}: {
  summary: SpeakingHistoryResponse['summary'];
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">
        Practice Summary (This Month)
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <SummaryBox icon="🎙️" value={summary.sessions} label="Sessions" />
        <SummaryBox icon="🎯" value={`${summary.avgScore}%`} label="Avg. Score" />
        <SummaryBox
          icon="🔊"
          value={summary.avgDurationText}
          label="Avg. Duration"
        />
        <SummaryBox
          icon="📈"
          value={`↑ ${summary.improvementPercent}%`}
          label="Improvement"
        />
      </div>
    </div>
  );
}

function SummaryBox({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-indigo-50 bg-purple-50 p-5 text-center">
      <div className="text-4xl">{icon}</div>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm text-indigo-500">{label}</p>
    </div>
  );
}

function RecentActivityCard({
  items,
  onViewAll,
  onClick,
}: {
  items: SpeakingHistoryResponse['recentActivity'];
  onViewAll: () => void;
  onClick: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">Recent Activity</h2>

      <div className="space-y-5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onClick(item.id)}
            className="flex w-full items-center gap-4 text-left"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-2xl">
              {item.icon}
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-bold">{item.title}</h3>
              <p className="mt-1 text-xs text-indigo-500">{item.type}</p>
            </div>

            <div className="text-right">
              <p className="font-bold text-green-600">{item.score}</p>
              <p className="text-xs text-indigo-500">{item.level}</p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onViewAll}
        className="mt-7 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600 hover:bg-purple-600 hover:text-white"
      >
        View All History
      </button>
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
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-7 flex justify-center gap-3">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="h-11 w-11 rounded-lg border border-indigo-100 bg-white disabled:opacity-40"
      >
        ‹
      </button>

      {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
        const currentPage = index + 1;

        return (
          <button
            key={currentPage}
            onClick={() => onPageChange(currentPage)}
            className={`h-11 w-11 rounded-lg border text-sm font-bold ${
              page === currentPage
                ? 'border-purple-600 bg-purple-600 text-white'
                : 'border-indigo-100 bg-white text-indigo-700'
            }`}
          >
            {currentPage}
          </button>
        );
      })}

      {totalPages > 5 && (
        <>
          <button className="h-11 w-11 rounded-lg border border-indigo-100 bg-white">
            ...
          </button>

          <button
            onClick={() => onPageChange(totalPages)}
            className="h-11 w-11 rounded-lg border border-indigo-100 bg-white text-sm font-bold"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="h-11 w-11 rounded-lg border border-indigo-100 bg-white disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}
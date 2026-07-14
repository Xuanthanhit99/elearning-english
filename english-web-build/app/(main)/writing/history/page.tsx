'use client';

import { api } from '@/src/lib/axios';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  PenLine,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type HistoryStatus = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';

type HistoryItem = {
  id: string;
  title: string;
  description: string;
  topic: string;
  topicSlug: string;
  type: string;
  level: string;
  score: number | null;
  status: HistoryStatus;
  completedAt: string | null;
  updatedAt: string;
};

type HistoryData = {
  stats: {
    totalEssays: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    averageScore: number;
    completedPercent: number;
    inProgressPercent: number;
    notStartedPercent: number;
  };
  items: HistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function WritingHistoryPage() {
  const router = useRouter();

  const [data, setData] = useState<HistoryData | null>(null);
  const [topic, setTopic] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [level, setLevel] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadHistory() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/writing/history', {
        params: {
          topic,
          type,
          level,
          status,
          page,
          limit: 7,
        },
      });

      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Không tải được lịch sử Writing.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [topic, type, level, status, page]);

  function handleAction(item: HistoryItem) {
    if (item.status === 'COMPLETED') {
      router.push(`/writing/sessions/${item.id}/result`);
      return;
    }

    if (item.status === 'IN_PROGRESS') {
      router.push(`/writing/sessions/${item.id}`);
      return;
    }

    router.push(`/writing/topics/${item.topicSlug}`);
  }

  if (loading && !data) return <div className="p-10">Loading...</div>;

  if (error && !data) {
    return (
      <div className="p-10">
        <p className="font-semibold text-red-600">{error}</p>
        <button
          onClick={loadHistory}
          className="mt-4 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!data) return <div className="p-10">Không có dữ liệu lịch sử.</div>;

  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#09083f]">
      <div className="flex">

        <main className="min-h-screen flex-1">

          <div className="px-10 py-8">
            <h1 className="text-3xl font-extrabold">Writing History</h1>
            <p className="mt-2 text-lg text-slate-600">
              Review your past writing practice and track your improvement.
            </p>

            <div className="mt-8 grid grid-cols-5 gap-5">
              <StatCard
                icon={<FileText className="h-8 w-8 text-violet-600" />}
                value={data.stats.totalEssays}
                title="Total Essays"
                subtitle="All time"
                bg="bg-violet-100"
              />

              <StatCard
                icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
                value={data.stats.completed}
                title="Completed"
                subtitle={`${data.stats.completedPercent}%`}
                bg="bg-green-100"
              />

              <StatCard
                icon={<Clock className="h-8 w-8 text-orange-500" />}
                value={data.stats.inProgress}
                title="In Progress"
                subtitle={`${data.stats.inProgressPercent}%`}
                bg="bg-orange-100"
              />

              <StatCard
                icon={<X className="h-8 w-8 text-red-500" />}
                value={data.stats.notStarted}
                title="Not Started"
                subtitle={`${data.stats.notStartedPercent}%`}
                bg="bg-red-100"
              />

              <StatCard
                icon={<BarChart3 className="h-8 w-8 text-blue-600" />}
                value={data.stats.averageScore}
                title="Average Score"
                subtitle="Good"
                bg="bg-blue-100"
              />
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-4">
                <select
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setPage(1);
                  }}
                  className="h-12 w-[200px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none"
                >
                  <option value="ALL">All Topics</option>
                  <option value="technology">Technology</option>
                  <option value="business">Business</option>
                  <option value="education">Education</option>
                  <option value="environment">Environment</option>
                  <option value="opinion">Opinion</option>
                </select>

                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setPage(1);
                  }}
                  className="h-12 w-[200px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none"
                >
                  <option value="ALL">All Types</option>
                  <option value="SENTENCE">Sentence</option>
                  <option value="PARAGRAPH">Paragraph</option>
                  <option value="ESSAY">Essay</option>
                  <option value="EMAIL">Email</option>
                  <option value="OPINION">Opinion</option>
                  <option value="STORY">Story</option>
                  <option value="IELTS_TASK_1">IELTS Task 1</option>
                  <option value="IELTS_TASK_2">IELTS Task 2</option>
                </select>

                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setPage(1);
                  }}
                  className="h-12 w-[200px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none"
                >
                  <option value="ALL">All Levels</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>

                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="h-12 w-[200px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="NOT_STARTED">Not Started</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold">
                  <Calendar className="h-5 w-5 text-slate-500" />
                  Tất cả thời gian
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold"
                >
                  <Download className="h-5 w-5 text-violet-600" />
                  Export
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="grid grid-cols-[2.2fr_1fr_1fr_0.8fr_0.9fr_1.2fr_1.2fr] bg-violet-50 px-6 py-4 text-sm font-extrabold text-slate-600">
                <div>Essay</div>
                <div>Topic</div>
                <div>Type</div>
                <div>Level</div>
                <div>Score</div>
                <div>Status</div>
                <div>Completed At</div>
              </div>

              {data.items.length === 0 && (
                <div className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  Chưa có lịch sử Writing phù hợp.
                </div>
              )}

              {data.items.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  onClick={() => handleAction(item)}
                />
              ))}
            </div>

            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onChange={setPage}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  title,
  subtitle,
  bg,
}: {
  icon: React.ReactNode;
  value: number;
  title: string;
  subtitle: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className={`grid h-16 w-16 place-items-center rounded-full ${bg}`}>
        {icon}
      </div>

      <div>
        <p className="text-3xl font-extrabold">{value}</p>
        <p className="mt-1 font-semibold text-slate-600">{title}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function HistoryRow({
  item,
  onClick,
}: {
  item: HistoryItem;
  onClick: () => void;
}) {
  return (
    <div className="grid grid-cols-[2.2fr_1fr_1fr_0.8fr_0.9fr_1.2fr_1.2fr] items-center border-b border-slate-100 px-6 py-5 last:border-b-0">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-violet-100">
          <PenLine className="h-5 w-5 text-violet-600" />
        </div>

        <div>
          <p className="text-base font-extrabold">{item.title}</p>
          <p className="mt-1 line-clamp-1 max-w-[280px] text-sm text-slate-500">
            {item.description}
          </p>
        </div>
      </div>

      <div className="font-semibold">{item.topic}</div>

      <div>
        <TypeBadge type={item.type} />
      </div>

      <div className="font-semibold">{item.level}</div>

      <div>
        {item.score !== null ? (
          <>
            <p
              className={`font-extrabold ${
                item.score >= 70 ? 'text-green-600' : 'text-orange-500'
              }`}
            >
              {item.score}
              <span className="text-xs">/100</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {item.score >= 80 ? 'Very Good' : item.score >= 70 ? 'Good' : 'Fair'}
            </p>
          </>
        ) : (
          <>
            <p className="font-extrabold">-</p>
            <p className="mt-1 text-xs text-slate-500">
              {item.status === 'IN_PROGRESS' ? 'Not graded' : 'Not started'}
            </p>
          </>
        )}
      </div>

      <div>
        <StatusBadge status={item.status} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold leading-6">
          {item.completedAt ? formatDate(item.completedAt) : '-'}
        </p>

        <button
          onClick={onClick}
          className="flex h-11 items-center gap-2 rounded-xl border border-violet-300 px-5 text-sm font-extrabold text-violet-600"
        >
          {item.status === 'COMPLETED'
            ? 'View Report'
            : item.status === 'IN_PROGRESS'
              ? 'Continue'
              : 'Start'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, string> = {
    ESSAY: 'bg-violet-100 text-violet-600',
    EMAIL: 'bg-yellow-100 text-orange-600',
    PARAGRAPH: 'bg-blue-100 text-blue-600',
    OPINION: 'bg-pink-100 text-pink-600',
    IELTS_TASK_1: 'bg-orange-100 text-orange-600',
    IELTS_TASK_2: 'bg-sky-100 text-sky-600',
    SENTENCE: 'bg-green-100 text-green-600',
    STORY: 'bg-teal-100 text-teal-600',
  };

  return (
    <span
      className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${
        config[type] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {formatType(type)}
    </span>
  );
}

function StatusBadge({ status }: { status: HistoryStatus }) {
  const config: Record<HistoryStatus, string> = {
    COMPLETED: 'bg-green-100 text-green-600',
    IN_PROGRESS: 'bg-blue-100 text-blue-600',
    NOT_STARTED: 'bg-red-100 text-red-500',
  };

  const label: Record<HistoryStatus, string> = {
    COMPLETED: 'Completed',
    IN_PROGRESS: 'In Progress',
    NOT_STARTED: 'Not Started',
  };

  return (
    <span className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${config[status]}`}>
      {label[status]}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-6 flex justify-center gap-3">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {Array.from({ length: Math.min(totalPages, 3) }).map((_, index) => {
        const current = index + 1;

        return (
          <button
            key={current}
            onClick={() => onChange(current)}
            className={`grid h-10 w-10 place-items-center rounded-lg border text-sm font-bold ${
              page === current
                ? 'border-violet-600 bg-violet-600 text-white'
                : 'border-slate-200 bg-white'
            }`}
          >
            {current}
          </button>
        );
      })}

      {totalPages > 3 && (
        <>
          <span className="grid h-10 place-items-center">...</span>
          <button
            onClick={() => onChange(totalPages)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-bold"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function formatType(type: string) {
  const map: Record<string, string> = {
    SENTENCE: 'Sentence',
    PARAGRAPH: 'Paragraph',
    ESSAY: 'Essay',
    EMAIL: 'Email',
    OPINION: 'Opinion',
    STORY: 'Story',
    IELTS_TASK_1: 'IELTS Task 1',
    IELTS_TASK_2: 'IELTS Task 2',
  };

  return map[type] ?? type;
}

function formatDate(value: string) {
  const date = new Date(value);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

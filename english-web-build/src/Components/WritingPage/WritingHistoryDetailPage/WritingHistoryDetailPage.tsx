'use client';

import { api } from '@/src/lib/axios';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  PenLine,
  RefreshCcw,
  TriangleAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type HistoryDetail = {
  session: {
    id: string;
    content: string;
    wordCount: number;
    timeSpentSeconds: number;
    submittedAt: string;
    status: string;
  };
  lesson: {
    id: string;
    title: string;
    type: string;
    level: string;
    maxWords: number;
  };
  topic: {
    id: string;
    title: string;
    slug: string;
  };
  score: {
    overall: number;
    grade: string;
    taskAchievement: number;
    coherence: number;
    lexicalResource: number;
    grammar: number;
  };
  strengths: string[];
  improvements: string[];
  corrections: {
    wrong: string;
    correct: string;
    explanation: string;
    type: string;
  }[];
  progressChart: {
    date: string;
    score: number;
  }[];
};

export default function WritingHistoryDetailPage({sessionId} : {sessionId: string}) {
  const router = useRouter();

  const [data, setData] = useState<HistoryDetail | null>(null);
  const [tab, setTab] = useState('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/writing/history/${sessionId}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Không tải được chi tiết lịch sử Writing.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry() {
    try {
      setRetrying(true);
      setError('');
      const res = await api.post(`/writing/history/${sessionId}/practice-again`);
      router.push(`/writing/sessions/${res.data.sessionId}`);
    } catch (err) {
      console.error(err);
      setError('Không tạo được bài luyện lại lúc này.');
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [sessionId]);

  if (loading) return <div className="p-10">Loading...</div>;

  if (error && !data) {
    return (
      <div className="p-10">
        <p className="font-semibold text-red-600">{error}</p>
        <button
          onClick={loadData}
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
      <main className="min-h-screen">
          <div className="grid grid-cols-[minmax(0,1fr)_390px] gap-8 px-10 py-8">
            <div>
              <div className="flex items-start justify-between">
                <TitleBlock data={data} />

                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/writing/history')}
                    className="h-11 rounded-xl border border-violet-500 px-6 font-bold text-violet-600"
                  >
                    ← Back to History
                  </button>

                  <button
                    onClick={() => router.push(`/writing/sessions/${sessionId}`)}
                    className="h-11 rounded-xl bg-violet-600 px-6 font-bold text-white"
                  >
                    Review My Essay
                  </button>
                </div>
              </div>

              <Tabs tab={tab} setTab={setTab} />

              {error && (
                <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              <div className="mt-6 grid grid-cols-[1fr_310px] gap-5">
                <EssayCard data={data} />
                <ScoreCard data={data} />
              </div>

              <InfoCard data={data} />

              <CorrectionsCard corrections={data.corrections} />

              <div className="mt-6 flex justify-center gap-5">
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="flex h-12 items-center gap-2 rounded-xl border border-violet-500 px-8 font-bold text-violet-600 disabled:opacity-50"
                >
                  <RefreshCcw className="h-5 w-5" />
                  {retrying ? 'Creating...' : 'Try Another Essay'}
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex h-12 items-center gap-2 rounded-xl border border-violet-500 px-8 font-bold text-violet-600"
                >
                  <Download className="h-5 w-5" />
                  Download Report
                </button>
              </div>
            </div>

            <aside className="space-y-6">
              <QuickSummary data={data} />
              <Highlights data={data} />
              <ProgressChart data={data} />
            </aside>
          </div>
      </main>
    </div>
  );
}

function TitleBlock({ data }: { data: HistoryDetail }) {
  return (
    <div>
      <div className="text-sm font-bold text-slate-400">
        ← Writing › History › {data.lesson.title} ›{' '}
        <span className="text-[#09083f]">Result Details</span>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-violet-600 text-white">
          <FileText className="h-8 w-8" />
        </div>

        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold">{data.lesson.title}</h1>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
              Completed
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            {formatType(data.lesson.type)} • {data.lesson.level} Level •{' '}
            {formatDate(data.session.submittedAt)} • ~{data.lesson.maxWords} words
          </p>
        </div>
      </div>
    </div>
  );
}

function Tabs({
  tab,
  setTab,
}: {
  tab: string;
  setTab: (tab: string) => void;
}) {
  const tabs = [
    ['OVERVIEW', 'Overview'],
    ['FEEDBACK', 'Detailed Feedback'],
    ['CORRECTIONS', 'Corrections'],
    ['SAMPLE', 'Sample Essay'],
  ];

  return (
    <div className="mt-8 flex gap-8 border-b border-slate-200">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          className={`pb-4 text-sm font-extrabold ${
            tab === key
              ? 'border-b-2 border-violet-600 text-violet-600'
              : 'text-slate-500'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function EssayCard({ data }: { data: HistoryDetail }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex justify-between">
        <h2 className="text-lg font-extrabold">Your Essay</h2>
        <span className="text-sm text-slate-500">{data.session.wordCount} words</span>
      </div>

      <div className="mt-6 whitespace-pre-line text-sm leading-8 text-slate-700">
        {renderHighlightedEssay(data.session.content)}
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
        <Calendar className="h-4 w-4" />
        Submitted on {formatDate(data.session.submittedAt)}
      </p>
    </div>
  );
}

function renderHighlightedEssay(content: string) {
  return content || 'Bài viết này chưa có nội dung được lưu.';
}

function ScoreCard({ data }: { data: HistoryDetail }) {
  const rows = [
    ['Task Achievement', data.score.taskAchievement, 'text-green-600'],
    ['Coherence & Cohesion', data.score.coherence, 'text-blue-600'],
    ['Lexical Resource', data.score.lexicalResource, 'text-orange-500'],
    ['Grammatical Range', data.score.grammar, 'text-violet-600'],
  ];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mx-auto grid h-40 w-40 place-items-center rounded-full bg-violet-100">
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
          <div>
            <p className="text-4xl font-extrabold">{data.score.overall}</p>
            <p className="font-bold">/100</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xl font-extrabold text-green-600">
        {data.score.grade}
      </p>

      <div className="mt-6 space-y-4">
        {rows.map(([label, value, color]) => (
          <div key={label as string} className="flex justify-between text-sm">
            <span>{label}</span>
            <span className={`font-bold ${color}`}>{value}/100</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ data }: { data: HistoryDetail }) {
  const items = [
    ['Topic', data.topic.title],
    ['Type', formatType(data.lesson.type)],
    ['Level', data.lesson.level],
    ['Time Spent', formatTime(data.session.timeSpentSeconds)],
    ['Word Count', `${data.session.wordCount} words`],
    ['Status', 'Completed'],
  ];

  return (
    <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-extrabold">Essay Information</h2>

      <div className="mt-5 grid grid-cols-6 gap-4">
        {items.map(([label, value]) => (
          <div key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-extrabold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrectionsCard({
  corrections,
}: {
  corrections: HistoryDetail['corrections'];
}) {
  return (
    <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-extrabold">Recent Corrections</h2>

      <div className="mt-5 divide-y divide-slate-100">
        {corrections.map((item) => (
          <div
            key={item.wrong}
            className="grid grid-cols-[150px_30px_170px_1fr_100px] items-center py-3 text-sm"
          >
            <span className="font-semibold text-red-500 line-through">
              {item.wrong}
            </span>
            <span>→</span>
            <span className="font-bold text-green-600">{item.correct}</span>
            <span className="text-slate-500">{item.explanation}</span>
            <span className="rounded-lg bg-violet-100 px-3 py-1 text-center text-xs font-bold text-violet-600">
              {item.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickSummary({ data }: { data: HistoryDetail }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-extrabold">Quick Summary</h2>

      <div className="mt-6 space-y-5 text-sm">
        <SummaryRow label="Overall Score" value={`${data.score.overall}/100`} />
        <SummaryRow label="Time Spent" value={formatTime(data.session.timeSpentSeconds)} />
        <SummaryRow label="Words Used" value={`${data.session.wordCount}`} />
        <SummaryRow label="Completed At" value={formatDate(data.session.submittedAt)} />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function Highlights({ data }: { data: HistoryDetail }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-extrabold">Feedback Highlights</h2>

      <p className="mt-6 font-bold text-green-600">Strengths</p>
      <div className="mt-4 space-y-4">
        {data.strengths.map((item) => (
          <p key={item} className="flex gap-3 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {item}
          </p>
        ))}
      </div>

      <p className="mt-6 font-bold text-red-500">Areas to Improve</p>
      <div className="mt-4 space-y-4">
        {data.improvements.map((item) => (
          <p key={item} className="flex gap-3 text-sm text-slate-600">
            <TriangleAlert className="h-4 w-4 text-orange-500" />
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function ProgressChart({ data }: { data: HistoryDetail }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-extrabold">Writing Progress</h2>

      <div className="mt-6 flex h-36 items-end gap-6 border-b border-slate-200">
        {data.progressChart.length === 0 && (
          <div className="flex h-full flex-1 items-center justify-center text-sm font-semibold text-slate-500">
            Chưa có đủ dữ liệu tiến độ.
          </div>
        )}

        {data.progressChart.map((item) => (
          <div key={item.date} className="flex flex-1 flex-col items-center">
            <div
              className="w-3 rounded-t bg-violet-600"
              style={{ height: `${item.score}px` }}
            />
            <span className="mt-2 text-xs text-slate-500">{item.date}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-sm font-bold text-violet-600">
        Keep practicing to improve your score!
      </p>
    </div>
  );
}

function formatType(type: string) {
  const map: Record<string, string> = {
    SENTENCE: 'Sentence Writing',
    PARAGRAPH: 'Paragraph',
    ESSAY: 'Essay Writing',
    EMAIL: 'Email',
    OPINION: 'Opinion',
    STORY: 'Story',
    IELTS_TASK_1: 'IELTS Task 1',
    IELTS_TASK_2: 'IELTS Task 2',
  };

  return map[type] ?? type;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min ${s} sec`;
}

function formatDate(value: string) {
  if (!value) return '-';

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

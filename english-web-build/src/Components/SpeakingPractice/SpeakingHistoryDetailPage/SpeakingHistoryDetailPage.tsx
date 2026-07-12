'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Flame,
  Gem,
  Gift,
  Home,
  Mic,
  MoreHorizontal,
  RotateCcw,
  Search,
  Star,
  Timer,
} from 'lucide-react';
import {
  getSpeakingHistoryDetail,
  practiceSpeakingAgain,
  SpeakingHistoryDetailResponse,
} from '@/src/lib/speaking-api';

export default function SpeakingHistoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);

  const [data, setData] = useState<SpeakingHistoryDetailResponse | null>(null);
  const [tab, setTab] = useState<'OVERVIEW' | 'ANSWER' | 'FEEDBACK' | 'VOCAB'>(
    'OVERVIEW',
  );
  const [loading, setLoading] = useState(true);
  const [practicing, setPracticing] = useState(false);

  async function fetchDetail() {
    try {
      setLoading(true);
      const result = await getSpeakingHistoryDetail(id);
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function handlePracticeAgain() {
    try {
      setPracticing(true);
      const result = await practiceSpeakingAgain(id);
      router.push(result.redirectUrl);
    } finally {
      setPracticing(false);
    }
  }

  if (loading || !data) {
    return <div className="p-10 text-purple-600">Loading history detail...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#08083d]">
      <div className="flex">

        <main className="flex-1">


          <div className="grid grid-cols-12 gap-8 px-9 py-7">
            <section className="col-span-9">
              <Breadcrumb />

              <button
                onClick={() => router.push('/speaking/history')}
                className="mb-6 text-sm font-bold text-purple-600"
              >
                ← Back to History
              </button>

              <div className="mb-7 flex items-center justify-between">
                <h1 className="text-3xl font-extrabold">Practice Detail</h1>

                <div className="flex gap-3">
                  <button className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-5 py-3 text-sm font-bold text-indigo-600">
                    <Download size={16} />
                    Download Report
                  </button>

                  <button className="rounded-lg border border-indigo-100 bg-white px-4 py-3">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>

              <SessionHeader data={data} />

              <Tabs tab={tab} setTab={setTab} />

              {tab === 'OVERVIEW' && <OverviewTab data={data} />}
              {tab === 'ANSWER' && <AnswerTab data={data} />}
              {tab === 'FEEDBACK' && <FeedbackTab data={data} />}
              {tab === 'VOCAB' && <VocabularyTab />}
            </section>

            <aside className="col-span-3 space-y-5">
              <SessionSummaryCard data={data} />
              <ScoreBreakdownCard data={data} />
              <ProgressChartCard data={data} />

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handlePracticeAgain}
                  disabled={practicing}
                  className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-4 text-sm font-bold text-white disabled:opacity-60"
                >
                  <Mic size={17} />
                  {practicing ? 'Starting...' : 'Practice Again'}
                </button>

                <button
                  onClick={() => router.push('/speaking/topics')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-white py-4 text-sm font-bold text-indigo-600"
                >
                  <RotateCcw size={17} />
                  Try Another Topic
                </button>
              </div>
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
      <span>History</span>
      <ChevronRight size={14} />
      <span className="text-[#08083d]">Detail</span>
    </div>
  );
}

function SessionHeader({ data }: { data: SpeakingHistoryDetailResponse }) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-4xl">
          {data.session.icon}
        </div>

        <div>
          <h2 className="text-lg font-extrabold">{data.session.topicTitle}</h2>
          <p className="mt-1 text-sm text-indigo-500">
            {data.session.lessonTitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-10 text-sm font-bold text-indigo-600">
        <div className="flex items-center gap-3">
          <Calendar size={22} />
          <div>
            <p>{formatDate(data.session.completedAt)}</p>
            <p className="mt-1">{formatTime(data.session.completedAt)}</p>
          </div>
        </div>

        <div className="h-8 w-px bg-indigo-100" />

        <div className="flex items-center gap-3">
          <Timer size={22} />
          <div>
            <p>{data.session.durationText}</p>
            <p className="mt-1">Duration</p>
          </div>
        </div>

        <span className="rounded-lg bg-green-100 px-5 py-3 text-green-700">
          Completed
        </span>
      </div>
    </div>
  );
}

function Tabs({
  tab,
  setTab,
}: {
  tab: string;
  setTab: (value: 'OVERVIEW' | 'ANSWER' | 'FEEDBACK' | 'VOCAB') => void;
}) {
  const tabs = [
    { label: 'Overview', value: 'OVERVIEW' },
    { label: 'My Answer', value: 'ANSWER' },
    { label: 'AI Feedback', value: 'FEEDBACK' },
    { label: 'Vocabulary', value: 'VOCAB' },
  ] as const;

  return (
    <div className="mb-6 flex gap-12 border-b border-indigo-100">
      {tabs.map((item) => (
        <button
          key={item.value}
          onClick={() => setTab(item.value)}
          className={`pb-4 text-sm font-bold ${
            tab === item.value
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-indigo-400'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function OverviewTab({ data }: { data: SpeakingHistoryDetailResponse }) {
  return (
    <div className="space-y-6">
      <ScoreCards data={data} />

      <div className="rounded-2xl border border-indigo-100 bg-white p-6">
        <h2 className="mb-5 text-lg font-extrabold">🤖 AI Feedback</h2>

        <div className="rounded-xl border border-indigo-100 bg-purple-50 p-5 text-sm leading-7 text-indigo-600">
          {data.aiFeedback.feedback}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-5">
          <ListBox
            title="Strengths"
            icon="✅"
            items={data.aiFeedback.strengths}
          />

          <ListBox
            title="Areas to Improve"
            icon="⚠️"
            items={data.aiFeedback.areasToImprove}
          />
        </div>

        <DetailedFeedback details={data.aiFeedback.details} />
      </div>
    </div>
  );
}

function ScoreCards({ data }: { data: SpeakingHistoryDetailResponse }) {
  const items = [
    {
      title: 'Overall Score',
      score: data.scores.overallScore,
      label: data.scores.labels.overallScore,
      icon: '◔',
    },
    {
      title: 'Fluency',
      score: data.scores.fluency,
      label: data.scores.labels.fluency,
      icon: '🔊',
    },
    {
      title: 'Pronunciation',
      score: data.scores.pronunciation,
      label: data.scores.labels.pronunciation,
      icon: '🎙️',
    },
    {
      title: 'Vocabulary',
      score: data.scores.vocabulary,
      label: data.scores.labels.vocabulary,
      icon: '📖',
    },
    {
      title: 'Grammar',
      score: data.scores.grammar,
      label: data.scores.labels.grammar,
      icon: 'Aa',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-5">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-indigo-100 bg-white p-6 text-center"
        >
          <div className="text-4xl">{item.icon}</div>
          <p className="mt-4 text-sm font-bold">{item.title}</p>
          <p className="mt-4 text-4xl font-extrabold">
            {item.score}
            <span className="text-xl text-indigo-400"> /100</span>
          </p>
          <p className="mt-3 text-sm font-bold text-green-600">{item.label}</p>

          <div className="mt-4 h-2 rounded-full bg-indigo-100">
            <div
              className="h-2 rounded-full bg-purple-600"
              style={{ width: `${item.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListBox({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-5">
      <h3 className="mb-4 text-sm font-extrabold">
        {icon} {title}
      </h3>

      <ul className="space-y-3 text-sm text-indigo-600">
        {items.map((item) => (
          <li key={item}>● {item}</li>
        ))}
      </ul>
    </div>
  );
}

function DetailedFeedback({
  details,
}: {
  details: SpeakingHistoryDetailResponse['aiFeedback']['details'];
}) {
  return (
    <div className="mt-6 rounded-xl border border-indigo-100 bg-white">
      <h3 className="border-b border-indigo-100 px-5 py-4 text-sm font-extrabold">
        Detailed Feedback
      </h3>

      {details.map((item) => (
        <div
          key={item.key}
          className="grid grid-cols-12 items-center border-b border-indigo-50 px-5 py-4 last:border-b-0"
        >
          <div className="col-span-3 flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              {item.icon}
            </span>
            <span className="text-sm font-bold">{item.title}</span>
          </div>

          <p className="col-span-7 text-sm text-indigo-500">{item.comment}</p>

          <div className="col-span-2 text-right">
            <button className="rounded-lg border border-purple-600 px-6 py-2 text-sm font-bold text-purple-600">
              See Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnswerTab({ data }: { data: SpeakingHistoryDetailResponse }) {
  return (
    <div className="space-y-5 rounded-2xl border border-indigo-100 bg-white p-6">
      <InfoBlock title="Question" content={data.answer.question} />

      {data.answer.expectedText && (
        <InfoBlock title="Expected Answer" content={data.answer.expectedText} />
      )}

      <InfoBlock title="Your Transcript" content={data.answer.transcript} />

      {data.answer.correctedText && (
        <InfoBlock title="Corrected Text" content={data.answer.correctedText} />
      )}

      {data.answer.audioUrl && (
        <audio controls src={data.answer.audioUrl} className="w-full" />
      )}
    </div>
  );
}

function FeedbackTab({ data }: { data: SpeakingHistoryDetailResponse }) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6">
      <h2 className="text-xl font-extrabold">AI Feedback</h2>
      <p className="mt-5 rounded-xl bg-purple-50 p-5 text-sm leading-7 text-indigo-600">
        {data.aiFeedback.feedback}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <ListBox title="Strengths" icon="✅" items={data.aiFeedback.strengths} />
        <ListBox
          title="Areas to Improve"
          icon="⚠️"
          items={data.aiFeedback.areasToImprove}
        />
      </div>
    </div>
  );
}

function VocabularyTab() {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6">
      <h2 className="text-xl font-extrabold">Vocabulary</h2>
      <p className="mt-3 text-sm text-indigo-500">
        Chỗ này có thể hiển thị từ vựng Gemini gợi ý sau khi chấm bài.
      </p>
    </div>
  );
}

function InfoBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="text-sm font-extrabold">{title}</h3>
      <p className="mt-3 rounded-xl bg-purple-50 p-5 text-sm leading-7 text-indigo-600">
        {content || 'No data'}
      </p>
    </div>
  );
}

function SessionSummaryCard({
  data,
}: {
  data: SpeakingHistoryDetailResponse;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">Session Summary</h2>

      <SummaryRow label="Topic" value={data.summary.topic} />
      <SummaryRow label="Practice Type" value={data.summary.practiceType} />
      <SummaryRow label="Duration" value={data.summary.duration} />
      <SummaryRow
        label="Completed At"
        value={`${formatDate(data.summary.completedAt)} - ${formatTime(
          data.summary.completedAt,
        )}`}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 text-sm last:mb-0">
      <span className="font-semibold text-indigo-500">{label}</span>
      <span className="text-right font-bold text-indigo-700">{value}</span>
    </div>
  );
}

function ScoreBreakdownCard({
  data,
}: {
  data: SpeakingHistoryDetailResponse;
}) {
  const items = [
    ['Fluency', data.scores.fluency],
    ['Pronunciation', data.scores.pronunciation],
    ['Vocabulary', data.scores.vocabulary],
    ['Grammar', data.scores.grammar],
    ['Content', data.scores.content],
  ];

  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">Score Breakdown</h2>

      <div className="space-y-4">
        {items.map(([label, score]) => (
          <div key={label as string}>
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>{label}</span>
              <span>{score}</span>
            </div>

            <div className="h-2 rounded-full bg-indigo-100">
              <div
                className="h-2 rounded-full bg-purple-600"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressChartCard({
  data,
}: {
  data: SpeakingHistoryDetailResponse;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">Your Progress</h2>

      <div className="mb-5 flex justify-between gap-4">
        <select className="h-10 rounded-lg border border-indigo-100 px-3 text-sm font-bold">
          <option>Overall Score</option>
        </select>

        <select className="h-10 rounded-lg border border-indigo-100 px-3 text-sm font-bold">
          <option>Last 7 Sessions</option>
        </select>
      </div>

      <div className="space-y-3">
        {data.progressChart.map((item) => (
          <div key={item.date} className="flex items-center gap-3">
            <span className="w-20 text-xs text-indigo-400">
              {formatShortDate(item.date)}
            </span>

            <div className="h-2 flex-1 rounded-full bg-indigo-100">
              <div
                className="h-2 rounded-full bg-purple-600"
                style={{ width: `${item.score}%` }}
              />
            </div>

            <span className="w-8 text-right text-sm font-bold">
              {item.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
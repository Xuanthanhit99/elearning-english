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
  Play,
  RotateCcw,
  Search,
  Star,
  Timer,
} from 'lucide-react';
import {
  getSpeakingPracticeTypeDetail,
  practiceSpeakingAgain,
  SpeakingPracticeTypeDetailResponse,
} from '@/src/lib/speaking-api';

export default function SpeakingPracticeTypeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.slug);

  const [data, setData] =
    useState<SpeakingPracticeTypeDetailResponse | null>(null);

  const [tab, setTab] = useState<'OVERVIEW' | 'ANSWER' | 'FEEDBACK' | 'VOCAB'>(
    'ANSWER',
  );

  const [loading, setLoading] = useState(true);
  const [showDiff, setShowDiff] = useState(false);
  const [practicing, setPracticing] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const result = await getSpeakingPracticeTypeDetail(slug);
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [slug]);

  async function handlePracticeAgain() {
    try {
      setPracticing(true);
      const result = await practiceSpeakingAgain(slug);
      router.push(result.redirectUrl);
    } finally {
      setPracticing(false);
    }
  }

  if (loading || !data) {
    return <div className="p-10 text-purple-600">Loading practice detail...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#08083d]">
      <div className="flex">

        <main className="flex-1">

          <div className="grid grid-cols-12 gap-8 px-9 py-7">
            <section className="col-span-9">
              <Breadcrumb />

              <div className="mb-7 flex items-start justify-between">
                <PracticeHeader data={data} />

                <div className="flex gap-3">
                  <button
                    onClick={handlePracticeAgain}
                    disabled={practicing}
                    className="rounded-lg border border-purple-600 px-6 py-3 text-sm font-bold text-purple-600 disabled:opacity-60"
                  >
                    {practicing ? 'Starting...' : 'Practice Again'}
                  </button>

                  <button className="rounded-lg border border-indigo-100 bg-white px-4 py-3">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>

              <SessionMeta data={data} />

              <Tabs tab={tab} setTab={setTab} />

              {tab === 'ANSWER' && (
                <AnswerTab
                  data={data}
                  showDiff={showDiff}
                  setShowDiff={setShowDiff}
                />
              )}

              {tab === 'OVERVIEW' && <OverviewTab data={data} />}
              {tab === 'FEEDBACK' && <FeedbackTab data={data} />}
              {tab === 'VOCAB' && <VocabularyTab data={data} />}
            </section>

            <aside className="col-span-3 space-y-5">
              <PerformanceSummaryCard data={data} />
              <DetailedFeedbackCard data={data} />
              <VocabularyHighlightCard data={data} />
              <NextStepsCard
                items={data.nextSteps}
                onClick={(action) => {
                  if (action === 'SIMILAR_TOPIC') router.push('/speaking/topics');
                  if (action === 'SHADOWING') router.push('/speaking/practice-type/REPEAT_AFTER_ME');
                  if (action === 'TONGUE_TWISTER') router.push('/speaking/practice-type/READ_ALOUD');
                }}
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
      <span>History</span>
      <ChevronRight size={14} />
      <span>Detail</span>
      <ChevronRight size={14} />
      <span className="text-[#08083d]">Practice Type Detail</span>
    </div>
  );
}

function PracticeHeader({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  return (
    <div className="flex items-center gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
        <Mic size={36} />
      </div>

      <div>
        <h1 className="text-4xl font-extrabold">{data.header.title}</h1>
        <p className="mt-3 text-sm text-indigo-500">
          {data.header.description}
        </p>
      </div>
    </div>
  );
}

function SessionMeta({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-white px-4 py-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-3xl">
          {data.header.icon}
        </div>

        <div>
          <p className="text-sm font-extrabold">
            {data.header.topicTitle} - {data.header.lessonTitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-10 text-sm font-bold text-indigo-600">
        <div className="flex items-center gap-3">
          <Calendar size={22} />
          <div>
            <p>{formatDate(data.header.completedAt)}</p>
            <p className="mt-1">{formatTime(data.header.completedAt)}</p>
          </div>
        </div>

        <div className="h-8 w-px bg-indigo-100" />

        <div className="flex items-center gap-3">
          <Timer size={22} />
          <div>
            <p>{data.header.durationText}</p>
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

function AnswerTab({
  data,
  showDiff,
  setShowDiff,
}: {
  data: SpeakingPracticeTypeDetailResponse;
  showDiff: boolean;
  setShowDiff: (value: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <RecordingCard data={data} />

      <PassageCard data={data} />

      <TranscriptCard
        data={data}
        showDiff={showDiff}
        setShowDiff={setShowDiff}
      />
    </div>
  );
}

function RecordingCard({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6">
      <h2 className="mb-5 text-lg font-extrabold">Your Recording</h2>

      <div className="flex items-center gap-5 rounded-xl bg-purple-50 px-5 py-4">
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white">
          <Play size={24} fill="white" />
        </button>

        <div className="flex-1 text-4xl font-bold text-purple-600">
          ···|··|····|···|····|··|····|···
        </div>

        <span className="text-sm font-bold text-indigo-500">
          00:00 / {data.recording.durationText}
        </span>

        <a
          href={data.recording.audioUrl || '#'}
          download
          className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-6 py-3 text-sm font-bold text-purple-600"
        >
          <Download size={16} />
          Download
        </a>
      </div>
    </div>
  );
}

function PassageCard({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6">
      <h2 className="mb-5 text-lg font-extrabold">Passage</h2>

      <div className="flex gap-5 rounded-xl bg-purple-50 p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-3xl">
          {data.passage.icon}
        </div>

        <div>
          <h3 className="text-xl font-extrabold">{data.passage.title}</h3>
          <p className="mt-4 whitespace-pre-line text-base leading-8 text-indigo-700">
            {data.passage.text}
          </p>
        </div>
      </div>
    </div>
  );
}

function TranscriptCard({
  data,
  showDiff,
  setShowDiff,
}: {
  data: SpeakingPracticeTypeDetailResponse;
  showDiff: boolean;
  setShowDiff: (value: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-green-100 bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">
          Your Transcript <span className="text-sm text-indigo-400">(Auto-detected)</span>
        </h2>
      </div>

      <p className="whitespace-pre-line text-base leading-8 text-indigo-700">
        {showDiff && data.transcript.correctedText
          ? data.transcript.correctedText
          : data.transcript.text}
      </p>

      <div className="mt-6 flex items-center justify-end gap-3">
        <span className="text-sm font-semibold text-indigo-500">
          Show differences
        </span>

        <button
          onClick={() => setShowDiff(!showDiff)}
          className={`h-7 w-12 rounded-full p-1 transition ${
            showDiff ? 'bg-purple-600' : 'bg-indigo-200'
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white transition ${
              showDiff ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function PerformanceSummaryCard({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  const scores = data.performance.scores;

  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">Performance Summary</h2>

      <div className="flex items-center gap-7">
        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-[10px] border-purple-600">
          <p className="text-4xl font-extrabold">
            {data.performance.overallScore}
          </p>
          <p className="text-sm text-indigo-400">/100</p>
        </div>

        <div>
          <h3 className="text-xl font-extrabold">
            {data.performance.message}
          </h3>
          <p className="mt-4 text-sm leading-7 text-indigo-500">
            {data.performance.description}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <MiniScore
          icon="🔊"
          title="Fluency"
          score={scores.fluency}
          label={data.performance.labels.fluency}
        />
        <MiniScore
          icon="🎙️"
          title="Pronunciation"
          score={scores.pronunciation}
          label={data.performance.labels.pronunciation}
        />
        <MiniScore
          icon="🎯"
          title="Accuracy"
          score={scores.accuracy}
          label={data.performance.labels.accuracy}
        />
        <MiniScore
          icon="📄"
          title="Completeness"
          score={scores.completeness}
          label={data.performance.labels.completeness}
        />
      </div>
    </div>
  );
}

function MiniScore({
  icon,
  title,
  score,
  label,
}: {
  icon: string;
  title: string;
  score: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-4 text-center">
      <div className="text-2xl">{icon}</div>
      <p className="mt-2 text-xs font-bold">{title}</p>
      <p className="mt-3 text-2xl font-extrabold">{score}</p>
      <p className="mt-1 text-xs font-bold text-green-600">{label}</p>
    </div>
  );
}

function DetailedFeedbackCard({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="mb-6 text-lg font-extrabold">Detailed Feedback</h2>

      <FeedbackList
        title="Strengths"
        icon="✅"
        items={data.detailedFeedback.strengths}
      />

      <div className="mt-6">
        <FeedbackList
          title="Areas to Improve"
          icon="⚠️"
          items={data.detailedFeedback.areasToImprove}
        />
      </div>
    </div>
  );
}

function FeedbackList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: string[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-extrabold">
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

function VocabularyHighlightCard({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Vocabulary Highlight</h2>
        <button className="text-sm font-bold text-purple-600">
          View All <ChevronRight size={14} className="inline" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {data.vocabularyHighlight.map((item) => (
          <button
            key={item.word}
            className="rounded-lg bg-purple-50 px-3 py-3 text-xs font-bold text-purple-600"
          >
            {item.word}
            <div className="mt-1">🔊</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NextStepsCard({
  items,
  onClick,
}: {
  items: SpeakingPracticeTypeDetailResponse['nextSteps'];
  onClick: (action: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7 shadow-sm">
      <h2 className="text-lg font-extrabold">Next Steps</h2>
      <p className="mt-2 text-sm text-indigo-500">
        Try these to improve your Read Aloud skills
      </p>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {items.map((item) => (
          <button
            key={item.action}
            onClick={() => onClick(item.action)}
            className="rounded-xl border border-indigo-100 bg-white p-4 text-center text-xs font-bold hover:border-purple-500"
          >
            <div className="text-2xl">{item.icon}</div>
            <p className="mt-2">{item.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6">
      <h2 className="text-xl font-extrabold">Overview</h2>
      <p className="mt-4 text-sm leading-7 text-indigo-600">
        {data.performance.description}
      </p>
    </div>
  );
}

function FeedbackTab({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6">
      <h2 className="text-xl font-extrabold">AI Feedback</h2>

      <p className="mt-4 rounded-xl bg-purple-50 p-5 text-sm leading-7 text-indigo-600">
        {data.performance.description}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <FeedbackList
          title="Strengths"
          icon="✅"
          items={data.detailedFeedback.strengths}
        />

        <FeedbackList
          title="Areas to Improve"
          icon="⚠️"
          items={data.detailedFeedback.areasToImprove}
        />
      </div>
    </div>
  );
}

function VocabularyTab({
  data,
}: {
  data: SpeakingPracticeTypeDetailResponse;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6">
      <h2 className="text-xl font-extrabold">Vocabulary</h2>

      <div className="mt-5 flex flex-wrap gap-3">
        {data.vocabularyHighlight.map((item) => (
          <span
            key={item.word}
            className="rounded-lg bg-purple-50 px-4 py-3 text-sm font-bold text-purple-600"
          >
            {item.word} 🔊
          </span>
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
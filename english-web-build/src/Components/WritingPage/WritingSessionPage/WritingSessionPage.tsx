'use client';

import { api } from '@/src/lib/axios';
import {
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Eye,
  Flame,
  Gift,
  Home,
  PenLine,
  Play,
  Save,
  Search,
  Star,
  Timer,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type SessionData = {
  session: {
    id: string;
    content: string;
    wordCount: number;
    timeSpentSeconds: number;
    isSubmitted: boolean;
  };
  lesson: {
    id: string;
    title: string;
    prompt: string;
    description?: string;
    type: string;
    level: string;
    duration: number;
    minWords: number;
    maxWords: number;
    sampleEssay?: string;
  };
  topic: {
    id: string;
    title: string;
    slug: string;
  };
  progress: {
    overall: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    totalLessons: number;
  };
  tips: {
    title: string;
    description: string;
  }[];
};

export default function WritingSessionPage({sessionId}: {sessionId: string}) {
  const router = useRouter();
  const params = useParams();

  const [data, setData] = useState<SessionData | null>(null);
  const [content, setContent] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  async function loadData() {
    const res = await api.get(`/writing/sessions/${sessionId}`);
    setData(res.data);
    setContent(res.data.session.content || '');
    setTimeSpent(res.data.session.timeSpentSeconds || 0);
  }

  async function handleSave() {
    try {
      setSaving(true);
      await api.post(`/writing/sessions/${sessionId}/save`, {
        content,
        timeSpentSeconds: timeSpent,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleReview() {
    await api.post(`/writing/sessions/${sessionId}/review`, {
      content,
      timeSpentSeconds: timeSpent,
    });

    router.push(`/writing/sessions/${sessionId}/review`);
  }

  function toggleTimer() {
    setTimerRunning((prev) => !prev);
  }

  useEffect(() => {
    loadData();
  }, [sessionId]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  if (!data) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#09083f]">
      <div className="flex">

        <main className="min-h-screen flex-1">

          <div className="grid grid-cols-[minmax(0,1fr)_390px] gap-8 px-10 py-8">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <Breadcrumb
                    topic={data.topic.title}
                    type={formatType(data.lesson.type)}
                    title={data.lesson.title}
                  />

                  <LessonTitle data={data} />
                </div>

                <button
                  onClick={() => router.push(`/writing/topics/${data.topic.slug}`)}
                  className="h-11 rounded-xl border border-violet-500 px-6 text-sm font-bold text-violet-600"
                >
                  Leave
                </button>
              </div>

              <StepBar />

              <PromptBox data={data} />

              <EditorBox
                content={content}
                setContent={setContent}
                wordCount={wordCount}
                onSave={handleSave}
                saving={saving}
              />

              <div className="mt-7 flex items-center justify-between">
                <button
                  onClick={() => router.back()}
                  className="h-12 rounded-xl border border-violet-500 px-7 font-bold text-violet-600"
                >
                  Back
                </button>

                <div className="flex gap-4">
                  <button
                    onClick={handleSave}
                    className="flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 font-bold text-violet-600"
                  >
                    <Save className="h-5 w-5" />
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>

                  <button
                    onClick={handleReview}
                    className="flex h-12 items-center gap-2 rounded-xl bg-violet-600 px-7 font-bold text-white"
                  >
                    Review My Essay
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <ProgressCard data={data} />
              <TipsCard tips={data.tips} />
              <TimeTracker
                timeSpent={timeSpent}
                running={timerRunning}
                onToggle={toggleTimer}
              />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Breadcrumb({
  topic,
  type,
  title,
}: {
  topic: string;
  type: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
      <Home className="h-4 w-4" />
      <span>Writing</span>
      <ChevronRight className="h-4 w-4" />
      <span>{topic}</span>
      <ChevronRight className="h-4 w-4" />
      <span>{type}</span>
      <ChevronRight className="h-4 w-4" />
      <span className="text-[#09083f]">{title}</span>
    </div>
  );
}

function LessonTitle({ data }: { data: SessionData }) {
  return (
    <div className="mt-7 flex items-center gap-5">
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-violet-600 text-white">
        <BookOpen className="h-8 w-8" />
      </div>

      <div>
        <h1 className="text-3xl font-extrabold">{data.lesson.title}</h1>

        <div className="mt-2 flex items-center gap-4 text-sm font-semibold text-slate-500">
          <span className="flex items-center gap-1">
            <PenLine className="h-4 w-4 text-violet-600" />
            {formatType(data.lesson.type)}
          </span>

          <span>•</span>
          <span>{data.lesson.level} Level</span>

          <span>•</span>
          <span>{data.lesson.duration}–25 min</span>

          <span>•</span>
          <span>~{data.lesson.maxWords} words</span>
        </div>
      </div>
    </div>
  );
}

function StepBar() {
  const steps = [
    { label: 'Prompt', done: true },
    { label: 'Write', active: true },
    { label: 'Review' },
    { label: 'Submit' },
  ];

  return (
    <div className="mt-8 flex h-16 items-center justify-center rounded-xl border border-slate-200 bg-white">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center">
          <div className="flex items-center gap-3 px-8">
            <div
              className={`grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold ${
                step.done || step.active
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step.done ? <Check className="h-5 w-5" /> : index + 1}
            </div>

            <span
              className={`font-extrabold ${
                step.active || step.done ? 'text-[#09083f]' : 'text-slate-500'
              }`}
            >
              {step.label}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div className="h-px w-20 bg-slate-200" />
          )}
        </div>
      ))}
    </div>
  );
}

function PromptBox({ data }: { data: SessionData }) {
  return (
    <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50 p-7">
      <div className="flex gap-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet-100 text-3xl">
          💡
        </div>

        <div className="flex-1">
          <p className="text-base leading-7 text-[#09083f]">
            {data.lesson.prompt}
          </p>

          <p className="mt-4 font-extrabold">
            To what extent do you agree or disagree with this statement?
          </p>

          <p className="mt-3 text-slate-600">
            Give reasons for your answer and include any relevant examples from
            your own knowledge or experience.
          </p>

          <button className="mt-6 flex items-center gap-2 font-bold text-violet-600">
            <Eye className="h-4 w-4" />
            Show sample essay
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorBox({
  content,
  setContent,
  wordCount,
  onSave,
  saving,
}: {
  content: string;
  setContent: (value: string) => void;
  wordCount: number;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
        <div className="flex items-center gap-5 text-slate-600">
          <span className="text-xl">↶</span>
          <span className="text-xl">↷</span>

          <select className="rounded-lg border-none bg-transparent text-sm font-semibold outline-none">
            <option>Paragraph</option>
            <option>Heading</option>
          </select>

          <span className="text-xl font-bold text-[#09083f]">B</span>
          <span className="text-xl italic text-[#09083f]">I</span>
          <span className="text-xl underline text-[#09083f]">U</span>

          <span className="text-xl">≡</span>
          <span className="text-xl">☷</span>
          <span className="text-xl">🔗</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-500">
            Word count: {wordCount}
          </span>

          <button
            onClick={onSave}
            className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start writing your essay here..."
        className="h-[420px] w-full resize-none p-6 text-base leading-8 text-slate-700 outline-none"
      />

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
        Tips: Plan your essay before writing. Include introduction, body
        paragraphs, and conclusion.
      </div>
    </div>
  );
}

function ProgressCard({ data }: { data: SessionData }) {
  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-extrabold">Your Progress</h2>

      <div className="mt-7 flex items-center gap-6">
        <div className="grid h-36 w-36 place-items-center rounded-full bg-violet-100">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white">
            <div className="text-center">
              <p className="text-3xl font-extrabold">
                {data.progress.overall}%
              </p>
              <p className="text-xs text-slate-500">Overall</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <ProgressItem
            value={`${data.progress.completed} / ${data.progress.totalLessons}`}
            label="Lessons Completed"
          />
          <ProgressItem value={String(data.progress.inProgress)} label="In Progress" />
          <ProgressItem value={String(data.progress.notStarted)} label="Not Started" />
        </div>
      </div>

      <button className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-500 font-bold text-violet-600">
        View Topic Details
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function ProgressItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function TipsCard({ tips }: { tips: SessionData['tips'] }) {
  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-extrabold">Writing Tips</h2>

      <div className="mt-6 space-y-6">
        {tips.map((tip, index) => (
          <div key={tip.title} className="flex gap-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>

            <div>
              <p className="font-extrabold">{tip.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {tip.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeTracker({
  timeSpent,
  running,
  onToggle,
}: {
  timeSpent: number;
  running: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-extrabold">Time Tracker</h2>

      <div className="mt-7 flex items-center gap-5">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100">
          <Timer className="h-6 w-6 text-slate-600" />
        </div>

        <div>
          <p className="text-3xl font-extrabold">{formatTime(timeSpent)}</p>
          <p className="text-sm text-slate-500">Time spent writing</p>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-500 font-bold text-violet-600"
      >
        <Play className="h-5 w-5" />
        {running ? 'Pause Timer' : 'Start Timer'}
      </button>
    </div>
  );
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
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
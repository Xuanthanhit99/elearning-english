"use client";

import { api } from "@/src/lib/axios";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Home,
  PenLine,
  RefreshCcw,
  Star,
  TriangleAlert,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ResultData = {
  session: {
    id: string;
    content: string;
    wordCount: number;
    timeSpentSeconds: number;
    submittedAt: string;
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
  result: {
    overallScore: number;
    grade: string;
    taskAchievement: number;
    coherence: number;
    lexicalResource: number;
    grammar: number;
    feedback: string;
  };
  strengths: string[];
  improvements: string[];
  vocabularySuggestions: {
    original: string;
    suggestion: string;
  }[];
  detailedFeedback: {
    title: string;
    description: string;
    type: string;
  }[];
};

export default function WritingResultPage({
  sessionId,
}: {
  sessionId: string;
}) {
  const router = useRouter();
  const params = useParams();

  const [data, setData] = useState<ResultData | null>(null);
  const [tab, setTab] = useState<"ESSAY" | "DETAIL" | "CORRECTIONS" | "SAMPLE">(
    "ESSAY",
  );

  async function loadData() {
    const res = await api.get(`/writing/sessions/${sessionId}/result`);
    setData(res.data);
  }

  async function handleRetry() {
    const res = await api.post(`/writing/sessions/${sessionId}/retry`);
    router.push(`/writing/sessions/${res.data.sessionId}`);
  }

  useEffect(() => {
    loadData();
  }, [sessionId]);

  if (!data) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#09083f]">
      <div className="flex">

        <main className="min-h-screen flex-1">

          <div className="grid grid-cols-[minmax(0,1fr)_410px] gap-8 px-10 py-8">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <Breadcrumb data={data} />
                  <ResultTitle data={data} />
                </div>

                <button
                  onClick={() => router.push(`/writing/sessions/${sessionId}`)}
                  className="flex h-11 items-center gap-2 rounded-xl border border-violet-500 px-5 text-sm font-bold text-violet-600"
                >
                  <PenLine className="h-4 w-4" />
                  Review My Essay
                </button>
              </div>

              <ScoreOverview data={data} />

              <div className="mt-7 flex gap-8 border-b border-slate-200">
                <TabButton
                  active={tab === "ESSAY"}
                  onClick={() => setTab("ESSAY")}
                >
                  Your Essay
                </TabButton>
                <TabButton
                  active={tab === "DETAIL"}
                  onClick={() => setTab("DETAIL")}
                >
                  Detailed Feedback
                </TabButton>
                <TabButton
                  active={tab === "CORRECTIONS"}
                  onClick={() => setTab("CORRECTIONS")}
                >
                  Corrections
                </TabButton>
                <TabButton
                  active={tab === "SAMPLE"}
                  onClick={() => setTab("SAMPLE")}
                >
                  Sample Essay
                </TabButton>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_370px] gap-6">
                <EssayCard
                  content={data.session.content}
                  wordCount={data.session.wordCount}
                />
                <DetailedFeedbackCard items={data.detailedFeedback} />
              </div>

              <div className="mt-7 flex items-center justify-between">
                <button
                  onClick={() =>
                    router.push(`/writing/topics/${data.topic.slug}`)
                  }
                  className="flex h-12 items-center gap-2 rounded-xl border border-violet-500 px-7 font-bold text-violet-600"
                >
                  ← Back to Lessons
                </button>

                <button
                  onClick={handleRetry}
                  className="flex h-12 items-center gap-2 rounded-xl bg-violet-600 px-7 font-bold text-white"
                >
                  <RefreshCcw className="h-5 w-5" />
                  Try Another Essay
                </button>
              </div>
            </div>

            <aside className="space-y-6">
              <ResultSummary data={data} />
              <StrengthsCard
                strengths={data.strengths}
                improvements={data.improvements}
              />
              <VocabularyCard items={data.vocabularySuggestions} />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Breadcrumb({ data }: { data: ResultData }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
      <Home className="h-4 w-4" />
      <span>Writing</span>
      <ChevronRight className="h-4 w-4" />
      <span>{data.topic.title}</span>
      <ChevronRight className="h-4 w-4" />
      <span>{formatType(data.lesson.type)}</span>
      <ChevronRight className="h-4 w-4" />
      <span>{data.lesson.title}</span>
      <ChevronRight className="h-4 w-4" />
      <span className="text-[#09083f]">Result</span>
    </div>
  );
}

function ResultTitle({ data }: { data: ResultData }) {
  return (
    <div className="mt-6 flex items-center gap-4">
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-violet-600 text-white">
        <BookOpen className="h-8 w-8" />
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold">{data.lesson.title}</h1>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
            Completed
          </span>
        </div>

        <p className="mt-2 text-sm font-semibold text-slate-500">
          {formatType(data.lesson.type)} • {data.lesson.level} Level •{" "}
          {formatDate(data.session.submittedAt)} • ~{data.lesson.maxWords} words
        </p>
      </div>
    </div>
  );
}

function ScoreOverview({ data }: { data: ResultData }) {
  const scores = [
    {
      title: "Task Achievement",
      score: data.result.taskAchievement,
      color: "bg-green-500",
    },
    {
      title: "Coherence & Cohesion",
      score: data.result.coherence,
      color: "bg-blue-500",
    },
    {
      title: "Lexical Resource",
      score: data.result.lexicalResource,
      color: "bg-orange-500",
    },
    {
      title: "Grammar Range",
      score: data.result.grammar,
      color: "bg-violet-600",
    },
  ];

  return (
    <div className="mt-7 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="grid grid-cols-[190px_repeat(4,1fr)] gap-4">
        <div className="text-center">
          <div className="mx-auto grid h-36 w-36 place-items-center rounded-full bg-violet-100">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-white">
              <div>
                <p className="text-4xl font-extrabold">
                  {data.result.overallScore}
                </p>
                <p className="font-bold">/100</p>
              </div>
            </div>
          </div>

          <p className="mt-4 font-extrabold">Good Job! 🎉</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            You did better than {data.result.overallScore}% of learners in your
            level.
          </p>
        </div>

        {scores.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-100 p-5 text-center"
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50">
              <Star className="h-6 w-6 text-violet-600" />
            </div>

            <p className="mt-5 text-sm font-extrabold">{item.title}</p>

            <p className="mt-6 text-3xl font-extrabold">
              {item.score}
              <span className="text-base font-bold text-slate-500">/100</span>
            </p>

            <p className="mt-3 text-sm text-slate-500">
              {item.score >= 70 ? "Good" : "Fair"}
            </p>

            <div className="mt-5 h-1.5 rounded-full bg-slate-200">
              <div
                className={`h-1.5 rounded-full ${item.color}`}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-violet-50 p-5">
        <p className="font-extrabold text-violet-700">Overall Feedback</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {data.result.feedback}
        </p>
      </div>
    </div>
  );
}

function EssayCard({
  content,
  wordCount,
}: {
  content: string;
  wordCount: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h3 className="font-extrabold">Your Essay</h3>

      <p className="mt-6 whitespace-pre-line text-sm leading-8 text-slate-700">
        {content}
      </p>

      <p className="mt-6 text-sm text-slate-500">
        Word count: {wordCount} words
      </p>
    </div>
  );
}

function DetailedFeedbackCard({
  items,
}: {
  items: ResultData["detailedFeedback"];
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h3 className="font-extrabold">Detailed Feedback</h3>

      <div className="mt-6 space-y-5">
        {items.map((item) => (
          <div key={item.title} className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>

            <div className="flex-1">
              <p className="font-extrabold">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </div>

            <ChevronRight className="h-5 w-5 text-slate-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultSummary({ data }: { data: ResultData }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-extrabold">Your Result</h2>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-4xl font-extrabold">
            {data.result.overallScore}
            <span className="text-lg">/100</span>
          </p>
          <p className="text-sm text-slate-500">Overall Score</p>
        </div>

        <p className="text-xl font-extrabold text-green-600">
          {data.result.grade}
        </p>
      </div>

      <div className="mt-6 space-y-5 border-t border-slate-100 pt-5 text-sm">
        <p>⏱ Time spent: {formatTime(data.session.timeSpentSeconds)}</p>
        <p>📝 Words: {data.session.wordCount}</p>
        <p>📅 Date: {formatDate(data.session.submittedAt)}</p>
      </div>

      <button className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-500 font-bold text-violet-600">
        <Download className="h-4 w-4" />
        Download Report
      </button>
    </div>
  );
}

function StrengthsCard({
  strengths,
  improvements,
}: {
  strengths: string[];
  improvements: string[];
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-extrabold">Strengths</h2>

      <div className="mt-5 space-y-4">
        {strengths.map((item) => (
          <p
            key={item}
            className="flex items-center gap-3 text-sm text-slate-600"
          >
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {item}
          </p>
        ))}
      </div>

      <h2 className="mt-7 text-lg font-extrabold">Areas to Improve</h2>

      <div className="mt-5 space-y-4">
        {improvements.map((item) => (
          <p
            key={item}
            className="flex items-center gap-3 text-sm text-slate-600"
          >
            <TriangleAlert className="h-4 w-4 text-orange-500" />
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function VocabularyCard({
  items,
}: {
  items: ResultData["vocabularySuggestions"];
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Top Vocabulary Suggestions</h2>
        <button className="font-bold text-violet-600">View all</button>
      </div>

      <div className="mt-5 divide-y divide-slate-100">
        {items.map((item) => (
          <div
            key={item.original}
            className="grid grid-cols-[1fr_30px_1fr] py-3 text-sm"
          >
            <span>{item.original}</span>
            <span className="text-slate-400">→</span>
            <span className="font-bold text-green-600">{item.suggestion}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-4 text-sm font-extrabold ${
        active
          ? "border-b-2 border-violet-600 text-violet-600"
          : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

function formatType(type: string) {
  const map: Record<string, string> = {
    SENTENCE: "Sentence Writing",
    PARAGRAPH: "Paragraph",
    ESSAY: "Essay Writing",
    EMAIL: "Email",
    OPINION: "Opinion",
    STORY: "Story",
    IELTS_TASK_1: "IELTS Task 1",
    IELTS_TASK_2: "IELTS Task 2",
  };

  return map[type] ?? type;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m} min ${s} sec`;
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

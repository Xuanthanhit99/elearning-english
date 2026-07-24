"use client";

import { api } from "@/src/lib/axios";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Gift,
  Home,
  PenLine,
  Search,
  Star,
  TrendingUp,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LumiverseLoadingState } from "@/src/Components/UI/Lumiverse";

type LessonStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";

type TopicDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl?: string;
  difficulty: string;
  levelText: string;

  progress: {
    overall: number;
    totalLessons: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };

  stats: {
    averageScore: number;
    bestScore: number;
    totalAttempts: number;
    estimatedHours: number;
  };

  aiRecommendation?: {
    title: string;
    reason: string;
    estimatedTime: number;
    level: string;
    type: string;
  } | null;

  nextLesson?: TopicDetail["lessons"][number] | null;

  lessons: {
    id: string;
    title: string;
    slug: string;
    description: string;
    imageUrl?: string;
    type: string;
    level: string;
    duration: number;
    learnerCount: number;
    order: number;
    status: LessonStatus;
    progressPercent: number;
    sessionId?: string | null;
    score?: number | null;
  }[];

  about?: {
    overview: string;
    learningObjectives: string[];
    grammarFocus: string[];
    commonMistakes: string[];
    recommendedVocabulary: string[];
  };

  tips?: string[];
};

export default function WritingTopicDetailPage() {
  const router = useRouter();
  const params = useParams();

  const slug = params.slug as string;

  const [data, setData] = useState<TopicDetail | null>(null);
  const [tab, setTab] = useState<"LESSONS" | "ABOUT" | "TIPS">("LESSONS");
  const [sort, setSort] = useState("DEFAULT");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDetail() {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/writing/topics/${slug}`, {
        params: { sort },
      });

      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Không tải được chi tiết chủ đề.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartLesson(lesson: TopicDetail["lessons"][number]) {
    if (lesson.status === "COMPLETED" && lesson.sessionId) {
      router.push(`/writing/sessions/${lesson.sessionId}/result`);
      return;
    }

    if (lesson.status === "IN_PROGRESS" && lesson.sessionId) {
      router.push(`/writing/sessions/${lesson.sessionId}`);
      return;
    }

    const res = await api.post(`/writing/lessons/${lesson.id}/start`);
    router.push(`/writing/sessions/${res.data.sessionId}`);
  }

  async function handleContinueLearning() {
    if (!data?.nextLesson) return;
    await handleStartLesson(data.nextLesson);
  }

  useEffect(() => {
    if (slug) loadDetail();
  }, [slug, sort]);

  if (loading)
    return (
      <LumiverseLoadingState className="m-10" label="Đang tải bài luyện viết..." />
    );

  if (error) {
    return (
      <div className="p-10">
        <p className="font-semibold text-red-600">{error}</p>
        <button
          onClick={loadDetail}
          className="mt-4 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!data) return <div className="p-10">Không tìm thấy chủ đề.</div>;

  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#09083f]">
      <div className="flex">
        <main className="min-h-screen flex-1">
          <div className="px-10 py-8">
            <Breadcrumb title={data.title} />

            <div className="mt-7 grid grid-cols-[1fr_490px] gap-8">
              <TopicHero data={data} />

              <div className="space-y-6">
                <ProgressPanel
                  data={data}
                  onContinue={handleContinueLearning}
                />
                <StatsPanel stats={data.stats} />
                <AIRecommendationCard
                  recommendation={data.aiRecommendation}
                  onStart={handleContinueLearning}
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-b border-slate-200">
              <div className="flex gap-8">
                <TabButton
                  active={tab === "LESSONS"}
                  onClick={() => setTab("LESSONS")}
                >
                  Lessons ({data.lessons.length})
                </TabButton>

                <TabButton
                  active={tab === "ABOUT"}
                  onClick={() => setTab("ABOUT")}
                >
                  About Topic
                </TabButton>

                <TabButton
                  active={tab === "TIPS"}
                  onClick={() => setTab("TIPS")}
                >
                  Tips & Resources
                </TabButton>
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="mb-3 h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none"
              >
                <option value="DEFAULT">Sort by: Default</option>
                <option value="PROGRESS">Sort by: Progress</option>
                <option value="NEWEST">Sort by: Newest</option>
                <option value="TITLE">Sort by: Title</option>
              </select>
            </div>

            {tab === "LESSONS" && (
              <div className="mt-4 space-y-0">
                {data.lessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    onClick={() => handleStartLesson(lesson)}
                  />
                ))}
              </div>
            )}

            {tab === "ABOUT" && <AboutPanel data={data} />}

            {tab === "TIPS" && <TipsPanel tips={data.tips || []} />}
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

function TopicHero({ data }: { data: TopicDetail }) {
  return (
    <section className="flex items-center gap-9">
      <div
        className="h-[210px] w-[250px] shrink-0 rounded-2xl bg-cover bg-center shadow-sm"
        style={{
          backgroundImage: `url(${data.imageUrl || "/images/writing/default-topic.png"})`,
        }}
      />

      <div>
        <h1 className="text-4xl font-extrabold">{data.title}</h1>

        <p className="mt-4 max-w-[650px] text-lg leading-8 text-slate-600">
          {data.description}
        </p>

        <div className="mt-7 flex items-center gap-8">
          <DifficultyBadge difficulty={data.difficulty} />

          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <BookOpen className="h-5 w-5" />
            {data.levelText}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressPanel({
  data,
  onContinue,
}: {
  data: TopicDetail;
  onContinue: () => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-extrabold">Your Progress</h2>

      <div className="mt-6 flex items-center justify-between">
        <div className="grid h-40 w-40 place-items-center rounded-full bg-violet-100">
          <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
            <div className="text-center">
              <p className="text-4xl font-extrabold">
                {data.progress.overall}%
              </p>
              <p className="text-xs font-semibold text-slate-500">Overall</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <ProgressMeta
            icon={<BookOpen className="h-5 w-5 text-violet-600" />}
            value={data.progress.totalLessons}
            label="Lessons"
            bg="bg-violet-50"
          />
          <ProgressMeta
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
            value={data.progress.completed}
            label="Completed"
            bg="bg-green-50"
          />
          <ProgressMeta
            icon={<Timer className="h-5 w-5 text-orange-500" />}
            value={data.progress.inProgress}
            label="In Progress"
            bg="bg-orange-50"
          />
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={!data.nextLesson}
        className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 font-bold text-white disabled:opacity-50"
      >
        Continue Learning
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}

function ProgressMeta({
  icon,
  value,
  label,
  bg,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className={`grid h-10 w-10 place-items-center rounded-full ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-extrabold">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
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

function LessonRow({
  lesson,
  onClick,
}: {
  lesson: TopicDetail["lessons"][number];
  onClick: () => void;
}) {
  const progressColor =
    lesson.progressPercent >= 100
      ? "bg-green-500"
      : lesson.progressPercent >= 60
        ? "bg-violet-600"
        : lesson.progressPercent > 0
          ? "bg-orange-400"
          : "bg-slate-300";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-7 border border-slate-100 bg-white p-5 text-left shadow-sm first:rounded-t-2xl last:rounded-b-2xl hover:bg-violet-50/30"
    >
      <div
        className="h-[110px] w-[165px] shrink-0 rounded-xl bg-cover bg-center"
        style={{
          backgroundImage: `url(${lesson.imageUrl || "/images/writing/default-lesson.png"})`,
        }}
      />

      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50 text-sm font-extrabold">
        {lesson.order}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-xl font-extrabold">{lesson.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{lesson.description}</p>

        <div className="mt-4 flex items-center gap-6 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            {formatType(lesson.type)}
          </span>

          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {lesson.duration} min
          </span>

          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {lesson.learnerCount} learners
          </span>
        </div>
      </div>

      <div className="w-[330px]">
        <div className="flex items-center justify-between">
          <StatusBadge status={lesson.status} />
          <span className="text-sm font-extrabold">
            {lesson.progressPercent}%
          </span>
        </div>

        <div className="mt-4 h-1.5 rounded-full bg-slate-200">
          <div
            className={`h-1.5 rounded-full ${progressColor}`}
            style={{ width: `${lesson.progressPercent}%` }}
          />
        </div>
      </div>
      <span className="rounded-xl border border-violet-300 px-4 py-2 text-sm font-bold text-violet-600">
        {lesson.status === "COMPLETED"
          ? "Review"
          : lesson.status === "IN_PROGRESS"
            ? "Continue"
            : "Start"}
      </span>
      <ChevronRight className="h-7 w-7 text-slate-400" />
    </button>
  );
}

function StatusBadge({ status }: { status: LessonStatus }) {
  const config: Record<LessonStatus, string> = {
    COMPLETED: "bg-green-100 text-green-600",
    IN_PROGRESS: "bg-blue-100 text-blue-600",
    NOT_STARTED: "bg-orange-100 text-orange-600",
  };

  const label: Record<LessonStatus, string> = {
    COMPLETED: "Completed",
    IN_PROGRESS: "In Progress",
    NOT_STARTED: "Not Started",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-extrabold ${config[status]}`}
    >
      {label[status]}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config: Record<string, string> = {
    BEGINNER: "bg-green-100 text-green-600",
    INTERMEDIATE: "bg-blue-100 text-blue-600",
    ADVANCED: "bg-orange-100 text-orange-600",
  };

  const label: Record<string, string> = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1.5 text-sm font-extrabold ${config[difficulty]}`}
    >
      {label[difficulty] || difficulty}
    </span>
  );
}

function formatType(type: string) {
  const map: Record<string, string> = {
    SENTENCE: "Sentence Writing",
    PARAGRAPH: "Paragraph",
    ESSAY: "Essay",
    EMAIL: "Email",
    STORY: "Story",
    OPINION: "Opinion",
    IELTS_TASK_1: "IELTS Task 1",
    IELTS_TASK_2: "IELTS Task 2",
  };

  return map[type] ?? type;
}

function StatsPanel({ stats }: { stats: TopicDetail["stats"] }) {
  return (
    <section className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <StatItem label="Average Score" value={`${stats.averageScore}/100`} />
      <StatItem label="Best Score" value={`${stats.bestScore}/100`} />
      <StatItem label="Attempts" value={String(stats.totalAttempts)} />
      <StatItem label="Estimated" value={`${stats.estimatedHours}h`} />
    </section>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-violet-50 p-4">
      <p className="text-xl font-extrabold text-violet-700">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function AIRecommendationCard({
  recommendation,
  onStart,
}: {
  recommendation?: TopicDetail["aiRecommendation"];
  onStart: () => void;
}) {
  if (!recommendation) return null;

  return (
    <section className="rounded-3xl bg-violet-50 p-6 shadow-sm ring-1 ring-violet-100">
      <p className="text-lg font-extrabold text-violet-700">
        AI Recommendation
      </p>

      <h3 className="mt-4 text-xl font-extrabold">{recommendation.title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {recommendation.reason}
      </p>

      <div className="mt-4 flex items-center gap-4 text-xs font-bold text-slate-500">
        <span>{formatType(recommendation.type)}</span>
        <span>•</span>
        <span>{recommendation.level}</span>
        <span>•</span>
        <span>{recommendation.estimatedTime} min</span>
      </div>

      <button
        onClick={onStart}
        className="mt-5 h-11 w-full rounded-xl bg-violet-600 font-bold text-white"
      >
        Start Recommended Lesson
      </button>
    </section>
  );
}

function AboutPanel({ data }: { data: TopicDetail }) {
  const about = data.about;

  return (
    <div className="mt-5 grid grid-cols-2 gap-5">
      <InfoBox title="Overview" items={[about?.overview || data.description]} />
      <InfoBox
        title="Learning Objectives"
        items={about?.learningObjectives || []}
      />
      <InfoBox title="Grammar Focus" items={about?.grammarFocus || []} />
      <InfoBox title="Common Mistakes" items={about?.commonMistakes || []} />
      <InfoBox
        title="Recommended Vocabulary"
        items={about?.recommendedVocabulary || []}
      />
    </div>
  );
}

function InfoBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h3 className="font-extrabold">{title}</h3>

      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <p key={index} className="text-sm leading-6 text-slate-600">
            • {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function TipsPanel({ tips }: { tips: string[] }) {
  return (
    <div className="mt-5 rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-extrabold">Tips & Resources</h2>

      <div className="mt-5 grid grid-cols-2 gap-4">
        {tips.map((tip, index) => (
          <div key={index} className="rounded-xl bg-violet-50 p-5">
            <p className="font-bold text-violet-700">Tip {index + 1}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

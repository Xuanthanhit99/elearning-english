// app/grammar/lesson/[lessonId]/page.tsx
"use client";

import { api } from "@/src/lib/axios";
import { useSpeak } from "@/src/hooks/useSpeak";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Lock,
  Play,
  Star,
  Volume2,
  Lightbulb,
  BarChart3,
  Timer,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type LessonStatus = "COMPLETED" | "IN_PROGRESS" | "LOCKED" | "NOT_STARTED";

type LessonItem = {
  id: string;
  order: number;
  title: string;
  duration: string;
  type: "LÃ½ thuyáº¿t" | "BÃ i táº­p";
  completed?: boolean;
  locked?: boolean;
  status: LessonStatus;
};

type LessonAttachment = {
  id: string;
  title: string;
  meta: string;
  type: "PDF" | "VIDEO";
  url?: string | null;
};

type LessonExample = {
  en: string;
  vi: string;
};

type GrammarQuestion = {
  id: string;
  question: string;
  options: string[];
  difficulty?: string | null;
};

type LessonData = {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  duration: string;
  rewardXp: number;
  rewardCoin: number;
  currentIndex: number;
  totalLessons: number;
  progress: number;
  completedLessons: number;
  completedExercises: number;
  totalExercises: number;
  earnedXp: number;
  completed?: boolean;
  note?: string;
  prevLessonId?: string | null;
  nextLessonId?: string | null;
  topic?: {
    id: string;
    title: string;
    level?: string | null;
    category?: {
      id: string;
      title: string;
    };
  };
  content: {
    overview?: string;
    summary?: string;
    structure: string[];
    notes: string[];
    examples: LessonExample[];
    tips: string[];
  };
  lessons: LessonItem[];
  attachments: LessonAttachment[];
  questions: GrammarQuestion[];
};

type CompleteLessonResponse = {
  message: string;
  nextLessonId: string | null;
  missionUpdated?: boolean;
  progress?: {
    id: string;
    completed: boolean;
    score: number;
  };
};

type SubmitLessonResult = {
  score: number;
  correct: number;
  total: number;
  missionUpdated?: boolean;
  results: Array<{
    questionId: string;
    question: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string | null;
  }>;
};

export default function GrammarLessonLearningPage() {
  const params = useParams<{ lessonId: string | string[] }>();
  const router = useRouter();

  const rawLessonId = params?.lessonId;
  const lessonId = Array.isArray(rawLessonId)
    ? rawLessonId[rawLessonId.length - 1]
    : rawLessonId;

  const [activeTab, setActiveTab] = useState<
    "theory" | "examples" | "tips" | "exercise"
  >("theory");
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState("");

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const [quizResult, setQuizResult] = useState<SubmitLessonResult | null>(null);

  useEffect(() => {
    if (!lessonId) {
      return;
    }

    setAnswers({});
    setQuizResult(null);
    setActiveTab("theory");
    setMessage("");

    let active = true;

    async function loadLesson() {
      try {
        setLoading(true);

        await api.post(`/grammar/lessons/${lessonId}/start`).catch(() => null);

        const res = await api.get<LessonData>(
          `/grammar/lessons/${lessonId}/learning`,
        );

        if (!active) {
          return;
        }

        setLesson(res.data);
        setNote(res.data.note || "");
      } catch {
        if (active) {
          setMessage("ChÆ°a táº£i Ä‘Æ°á»£c dá»¯ liá»‡u bÃ i há»c.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLesson();

    return () => {
      active = false;
    };
  }, [lessonId]);

  const currentLesson = useMemo(
    () => lesson?.lessons.find((item) => item.status === "IN_PROGRESS"),
    [lesson?.lessons],
  );

  async function handleSaveNote() {
    if (!lessonId) return;

    try {
      setSavingNote(true);
      await api.post(`/grammar/lessons/${lessonId}/note`, { note });
      setMessage("ÄÃ£ lÆ°u ghi chÃº.");
    } catch {
      setMessage("LÆ°u ghi chÃº tháº¥t báº¡i.");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleCompleteAndNext() {
    if (!lessonId || !lesson) return;

    try {
      setCompleting(true);
      const res = await api.post<CompleteLessonResponse>(
        `/grammar/lessons/${lessonId}/complete`,
      );
      const nextLessonId = res.data.nextLessonId || lesson.nextLessonId;

      if (nextLessonId) {
        router.push(`/grammar/lesson/${nextLessonId}`);
        return;
      }

      setMessage("Báº¡n Ä‘Ã£ hoÃ n thÃ nh chá»§ Ä‘á» nÃ y.");
      const reload = await api.get<LessonData>(
        `/grammar/lessons/${lessonId}/learning`,
      );
      setLesson(reload.data);
    } catch {
      setMessage("ChÆ°a hoÃ n thÃ nh Ä‘Æ°á»£c bÃ i há»c.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleNextAction() {
    if (!lesson) {
      return;
    }

    if (!lesson) {
      return;
    }

    setMessage("");

    const hasQuiz = (lesson.questions?.length ?? 0) > 0;

    /*
     * Lesson Ä‘Ã£ hoÃ n thÃ nh rá»“i:
     * chá»‰ Ä‘iá»u hÆ°á»›ng, khÃ´ng gá»i /complete láº§n ná»¯a.
     */
    if (lesson.completed) {
      if (lesson.nextLessonId) {
        router.push(`/grammar/lesson/${lesson.nextLessonId}`);

        return;
      }

      setMessage("Báº¡n Ä‘Ã£ hoÃ n thÃ nh chá»§ Ä‘á» nÃ y.");

      return;
    }

    /*
     * Lesson lÃ½ thuyáº¿t khÃ´ng cÃ³ quiz:
     * gá»i API complete.
     */
    await handleCompleteAndNext();
  }

  function goToLesson(targetLessonId?: string | null) {
    if (!targetLessonId) return;
    router.push(`/grammar/lesson/${targetLessonId}`);
  }

  async function handleSubmitQuiz() {
    if (!lessonId || !lesson) {
      return;
    }

    if (!lesson.questions?.length) {
      setMessage("BÃ i há»c nÃ y chÆ°a cÃ³ cÃ¢u há»i.");
      return;
    }

    const unanswered = lesson.questions.filter(
      (question) => !answers[question.id],
    );

    if (unanswered.length > 0) {
      setMessage(`Báº¡n cÃ²n ${unanswered.length} cÃ¢u chÆ°a tráº£ lá»i.`);
      return;
    }

    try {
      setSubmittingQuiz(true);
      setMessage("");

      const response = await api.post<SubmitLessonResult>(
        `/grammar/lessons/${lessonId}/submit`,
        {
          answers: lesson.questions.map((question) => ({
            questionId: question.id,
            answer: answers[question.id],
          })),
        },
      );

      setQuizResult(response.data);

      setMessage(
        `Báº¡n Ä‘áº¡t ${response.data.score}% â€” Ä‘Ãºng ${response.data.correct}/${response.data.total} cÃ¢u.`,
      );

      const reload = await api.get<LessonData>(
        `/grammar/lessons/${lessonId}/learning`,
      );

      setLesson(reload.data);
    } catch {
      setMessage("KhÃ´ng thá»ƒ ná»™p bÃ i táº­p. Vui lÃ²ng thá»­ láº¡i.");
    } finally {
      setSubmittingQuiz(false);
    }
  }

  if (loading) {
    return (
      <LessonPageShell>
        <LoadingState />
      </LessonPageShell>
    );
  }

  if (!lesson) {
    return (
      <LessonPageShell>
        <div className="grid min-h-[500px] place-items-center rounded-2xl border bg-white p-8 text-center">
          <div>
            <h2 className="text-2xl font-black">KhÃ´ng tÃ¬m tháº¥y bÃ i há»c</h2>
            <p className="mt-2 text-slate-500">
              {message || "BÃ i há»c khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ bá»‹ khÃ³a."}
            </p>
          </div>
        </div>
      </LessonPageShell>
    );
  }

  return (
    <LessonPageShell>
      <div className="grid grid-cols-[1fr_430px] gap-8 p-8">
        <section>
          {message && (
            <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
              {message}
            </div>
          )}

          <div className="mb-7 text-sm font-medium text-slate-500">
            Ngá»¯ phÃ¡p <span className="mx-3">â€º</span>
            {lesson.topic?.category?.title || "Chá»§ Ä‘á»"}{" "}
            <span className="mx-3">â€º</span>
            <b className="text-[#10164f]">
              {lesson.topic?.title || lesson.title}
            </b>
          </div>

          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="grid h-[106px] w-[106px] place-items-center rounded-3xl bg-violet-100 text-violet-600">
                <BookOpen size={56} className="fill-violet-500/20" />
              </div>

              <div>
                <h2 className="text-4xl font-black">{lesson.title}</h2>
                <p className="mt-3 text-xl font-bold text-slate-500">
                  {lesson.subtitle}
                </p>

                <div className="mt-5 flex flex-wrap gap-8 text-sm font-bold text-slate-500">
                  <Meta icon={<Clock size={17} />} text={lesson.duration} />
                  <Meta icon={<BarChart3 size={17} />} text={lesson.level} />
                  <Meta
                    icon={<Star size={17} className="text-orange-400" />}
                    text={`+${lesson.rewardXp} XP`}
                  />
                  <Meta
                    icon={<Timer size={17} className="text-orange-400" />}
                    text={`+${lesson.rewardCoin} Xu`}
                  />
                </div>
              </div>
            </div>

            <button className="flex items-center gap-3 rounded-xl border bg-white px-8 py-4 font-bold shadow-sm">
              <Bookmark size={20} />
              LÆ°u bÃ i há»c
            </button>
          </div>

          <div className="mb-4 flex gap-8 border-b">
            <TabButton
              active={activeTab === "theory"}
              onClick={() => setActiveTab("theory")}
            >
              LÃ½ thuyáº¿t
            </TabButton>

            <TabButton
              active={activeTab === "examples"}
              onClick={() => setActiveTab("examples")}
            >
              VÃ­ dá»¥
            </TabButton>

            <TabButton
              active={activeTab === "tips"}
              onClick={() => setActiveTab("tips")}
            >
              Máº¹o ghi nhá»›
            </TabButton>

            <TabButton
              active={activeTab === "exercise"}
              onClick={() => setActiveTab("exercise")}
            >
              BÃ i táº­p
            </TabButton>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            {activeTab === "theory" && <TheoryContent lesson={lesson} />}

            {activeTab === "examples" && <ExampleContent lesson={lesson} />}

            {activeTab === "tips" && <TipsContent lesson={lesson} />}

            {activeTab === "exercise" && (
              <GrammarExercise
                questions={lesson.questions}
                answers={answers}
                result={quizResult}
                submitting={submittingQuiz}
                nextLessonId={lesson.nextLessonId}
                topicId={lesson.topic?.id}
                onSelect={(questionId, answer) => {
                  setAnswers((current) => ({
                    ...current,
                    [questionId]: answer,
                  }));
                }}
                onSubmit={handleSubmitQuiz}
                onContinue={() => {
                  if (lesson.nextLessonId) {
                    router.push(`/grammar/lesson/${lesson.nextLessonId}`);
                    return;
                  }

                  if (lesson.topic?.id) {
                    router.push(`/grammar/topic/${lesson.topic.id}`);
                    return;
                  }

                  router.push("/grammar");
                }}
              />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t pt-6">
            <button
              disabled={!lesson.prevLessonId}
              onClick={() => goToLesson(lesson.prevLessonId)}
              className="flex h-14 w-[190px] items-center justify-center gap-3 rounded-xl border bg-white font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={18} />
              BÃ i trÆ°á»›c
            </button>

            <div className="font-bold text-indigo-700">
              {lesson.currentIndex} / {lesson.totalLessons}
            </div>

            <button
              onClick={handleNextAction}
              disabled={completing}
              className="flex h-14 w-[190px] items-center justify-center gap-3 rounded-xl bg-violet-600 font-bold text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {completing
                ? "Äang lÆ°u..."
                : (lesson.questions?.length ?? 0) > 0 && !lesson.completed
                  ? "LÃ m bÃ i táº­p"
                  : lesson.nextLessonId
                    ? "Tiáº¿p theo"
                    : "HoÃ n thÃ nh"}

              <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <RightCard title="Tiáº¿n Ä‘á»™ cá»§a báº¡n">
            <div className="flex items-center gap-8">
              <CircularProgress value={lesson.progress} />

              <div className="space-y-5 text-sm">
                <ProgressLine
                  icon="ðŸ’œ"
                  main={`${lesson.completedLessons}/${lesson.totalLessons}`}
                  sub="BÃ i Ä‘Ã£ hoÃ n thÃ nh"
                />
                <ProgressLine
                  icon="ðŸ’œ"
                  main={`${lesson.completedExercises}/${lesson.totalExercises}`}
                  sub="BÃ i táº­p Ä‘Ã£ lÃ m"
                />
                <ProgressLine
                  icon="â­"
                  main={`+${lesson.earnedXp} XP`}
                  sub="Äiá»ƒm nháº­n Ä‘Æ°á»£c"
                />
              </div>
            </div>
          </RightCard>

          <RightCard title="Danh sÃ¡ch bÃ i há»c">
            <div className="relative">
              <div className="absolute bottom-6 left-[13px] top-6 w-[2px] bg-slate-200" />
              {lesson.lessons.map((item) => (
                <LessonListItem
                  key={item.id}
                  item={item}
                  active={
                    item.id === currentLesson?.id || item.id === lesson.id
                  }
                  onClick={() =>
                    !item.locked &&
                    item.status !== "LOCKED" &&
                    goToLesson(item.id)
                  }
                />
              ))}
            </div>
          </RightCard>

          <RightCard title="TÃ i liá»‡u bá»• trá»£">
            {lesson.attachments.length > 0 ? (
              lesson.attachments.map((item) => (
                <AttachmentItem key={item.id} item={item} />
              ))
            ) : (
              <p className="text-sm text-slate-500">
                ChÆ°a cÃ³ tÃ i liá»‡u bá»• trá»£ cho bÃ i há»c nÃ y.
              </p>
            )}
          </RightCard>

          <RightCard title="Ghi chÃº cá»§a báº¡n">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              className="h-[90px] w-full resize-none rounded-xl border bg-white p-4 text-sm outline-none focus:border-violet-400"
              placeholder="Viáº¿t ghi chÃº..."
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">{note.length}/500</span>
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="rounded-xl bg-violet-600 px-8 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingNote ? "Äang lÆ°u..." : "LÆ°u"}
              </button>
            </div>
          </RightCard>
        </aside>
      </div>
    </LessonPageShell>
  );
}

function LessonPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#10164f]">
      <div className="flex">

        <main className="flex-1">

          {children}
        </main>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-[1fr_430px] gap-8 p-8">
      <section className="space-y-5">
        <div className="h-6 w-80 animate-pulse rounded bg-slate-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-[520px] animate-pulse rounded-2xl bg-slate-200" />
      </section>
      <aside className="space-y-6">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
      </aside>
    </div>
  );
}

function TheoryContent({ lesson }: { lesson: LessonData }) {
  return (
    <div>
      {lesson.content.overview && (
        <p className="mb-6 leading-7 text-slate-600">
          {lesson.content.overview}
        </p>
      )}

      <h3 className="mb-4 text-2xl font-black">1. Cáº¥u trÃºc</h3>
      <div className="rounded-xl bg-gradient-to-r from-violet-50 to-violet-100 p-6 text-lg font-black leading-9 text-violet-700">
        {lesson.content.structure.length > 0 ? (
          lesson.content.structure.map((item) => <p key={item}>{item}</p>)
        ) : (
          <p>ChÆ°a cÃ³ cáº¥u trÃºc cho bÃ i há»c nÃ y.</p>
        )}
      </div>

      <div className="mt-4 rounded-xl border bg-violet-50/40 p-5">
        <div className="mb-2 flex items-center gap-3 font-bold text-violet-600">
          <Lightbulb size={22} />
          LÆ°u Ã½
        </div>
        {lesson.content.notes.length > 0 ? (
          <ul className="ml-12 list-disc space-y-1 font-medium">
            {lesson.content.notes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="ml-9 text-sm text-slate-500">ChÆ°a cÃ³ lÆ°u Ã½.</p>
        )}
      </div>

      <h3 className="mb-4 mt-8 text-2xl font-black">2. VÃ­ dá»¥</h3>
      <div className="space-y-3">
        {lesson.content.examples.length > 0 ? (
          lesson.content.examples.map((item) => (
            <ExampleRow key={item.en} item={item} />
          ))
        ) : (
          <p className="text-sm text-slate-500">ChÆ°a cÃ³ vÃ­ dá»¥.</p>
        )}
      </div>

      {lesson.content.tips[0] && (
        <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/40 p-5">
          <div className="mb-2 flex items-center gap-3 font-bold text-violet-600">
            <Lightbulb size={22} />
            Máº¹o nhá»
          </div>
          <p className="ml-9 text-sm font-medium">{lesson.content.tips[0]}</p>
        </div>
      )}
    </div>
  );
}

function ExampleContent({ lesson }: { lesson: LessonData }) {
  return (
    <div>
      <h3 className="mb-4 text-2xl font-black">VÃ­ dá»¥ thá»±c táº¿</h3>
      <div className="space-y-3">
        {lesson.content.examples.length > 0 ? (
          lesson.content.examples.map((item) => (
            <ExampleRow key={item.en} item={item} />
          ))
        ) : (
          <p className="text-sm text-slate-500">
            ChÆ°a cÃ³ vÃ­ dá»¥ cho bÃ i há»c nÃ y.
          </p>
        )}
      </div>
    </div>
  );
}

function TipsContent({ lesson }: { lesson: LessonData }) {
  return (
    <div>
      <h3 className="mb-4 text-2xl font-black">Máº¹o ghi nhá»›</h3>
      <div className="space-y-3">
        {lesson.content.tips.length > 0 ? (
          lesson.content.tips.map((tip) => (
            <div
              key={tip}
              className="rounded-xl border border-violet-200 bg-violet-50 p-5 font-medium"
            >
              ðŸ’¡ {tip}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">ChÆ°a cÃ³ máº¹o ghi nhá»›.</p>
        )}
      </div>
    </div>
  );
}

function ExampleRow({ item }: { item: LessonExample }) {
  const { speak, isSpeaking } = useSpeak();
  const speaking = isSpeaking(item.en);

  return (
    <div className="grid grid-cols-[52px_1fr] items-center rounded-xl border bg-white/70 p-4">
      <button
        type="button"
        onClick={() => speak(item.en, item.en)}
        disabled={speaking}
        className={`grid h-11 w-11 place-items-center rounded-xl bg-slate-50 text-indigo-600 transition disabled:cursor-not-allowed ${speaking ? "animate-pulse opacity-70" : "hover:bg-slate-100"}`}
      >
        <Volume2 size={18} />
      </button>
      <div>
        <p
          className="font-bold"
          dangerouslySetInnerHTML={{ __html: highlightNegative(item.en) }}
        />
        <p className="mt-1 text-sm text-slate-500">{item.vi}</p>
      </div>
    </div>
  );
}

function highlightNegative(text: string) {
  return text
    .replaceAll("don't", "<span class='text-red-500'>don't</span>")
    .replaceAll("doesnâ€™t", "<span class='text-red-500'>doesnâ€™t</span>")
    .replaceAll("donâ€™t", "<span class='text-red-500'>donâ€™t</span>")
    .replaceAll("doesn't", "<span class='text-red-500'>doesn't</span>");
}

function LessonListItem({
  item,
  active,
  onClick,
}: {
  item: LessonItem;
  active: boolean;
  onClick: () => void;
}) {
  const isCompleted = item.status === "COMPLETED";
  const isCurrent = active || item.status === "IN_PROGRESS";
  const isLocked = item.status === "LOCKED" || item.locked;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      className={`relative z-[1] mb-2 grid w-full grid-cols-[34px_1fr_24px] items-center rounded-xl p-3 text-left disabled:cursor-not-allowed ${isCurrent ? "bg-violet-50 text-violet-700" : ""}`}
    >
      <div
        className={`grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-black ${isCompleted ? "border-emerald-400 bg-emerald-100 text-emerald-600" : isCurrent ? "border-violet-500 bg-violet-100 text-violet-600" : "border-slate-300 bg-white text-slate-400"}`}
      >
        {isCompleted ? (
          <CheckCircle2 size={15} />
        ) : isLocked ? (
          item.order
        ) : (
          <Play size={13} />
        )}
      </div>

      <div>
        <p className="font-black">
          {item.order}. {item.title}
        </p>
        <p className="text-sm text-slate-500">{item.duration}</p>
      </div>

      <div className="text-right">
        {isCompleted && <CheckCircle2 size={18} className="text-emerald-500" />}
        {isCurrent && !isCompleted && (
          <span className="text-xs font-bold text-violet-600">Äang há»c</span>
        )}
        {isLocked && <Lock size={18} className="text-slate-400" />}
      </div>
    </button>
  );
}

function AttachmentItem({ item }: { item: LessonAttachment }) {
  const isVideo = item.type === "VIDEO";

  return (
    <div className="mb-4 flex items-center gap-4">
      <div
        className={`grid h-11 w-11 place-items-center rounded-xl ${isVideo ? "bg-violet-100 text-violet-600" : "bg-red-100 text-red-500"}`}
      >
        {isVideo ? <Play size={18} /> : <FileText size={18} />}
      </div>

      <div className="flex-1">
        <p className="font-black">{item.title}</p>
        <p className="text-sm text-slate-500">{item.meta}</p>
      </div>

      <button
        onClick={() => item.url && window.open(item.url, "_blank")}
        className="grid h-10 w-10 place-items-center rounded-xl border text-violet-600"
      >
        {isVideo ? <Play size={17} /> : <Download size={17} />}
      </button>
    </div>
  );
}

function CircularProgress({ value }: { value: number }) {
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;

  return (
    <div
      className="grid h-36 w-36 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#7c3aed ${safeValue * 3.6}deg, #ede9fe 0deg)`,
      }}
    >
      <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
        <div className="text-center">
          <p className="text-3xl font-black">{safeValue}%</p>
          <p className="text-xs text-slate-500">HoÃ n thÃ nh chá»§ Ä‘á»</p>
        </div>
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
      className={`pb-4 font-black ${active ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}
    >
      {children}
    </button>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      {text}
    </div>
  );
}

function RightCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm shadow-violet-50">
      <h3 className="mb-5 text-lg font-black">{title}</h3>
      {children}
    </div>
  );
}

function ProgressLine({
  icon,
  main,
  sub,
}: {
  icon: string;
  main: string;
  sub: string;
}) {
  return (
    <div>
      <p className="font-black">
        {icon} {main}
      </p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function GrammarExercise({
  questions,
  answers,
  result,
  submitting,
  nextLessonId,
  topicId,
  onSelect,
  onSubmit,
  onContinue,
}: {
  questions: GrammarQuestion[];
  answers: Record<string, string>;
  result: SubmitLessonResult | null;
  submitting: boolean;
  nextLessonId?: string | null;
  topicId?: string;
  onSelect: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  onContinue: () => void;
}) {
  if (!questions.length) {
    return (
      <div className="rounded-xl bg-slate-50 p-8 text-center">
        <h3 className="font-black">BÃ i há»c chÆ°a cÃ³ bÃ i táº­p</h3>

        <p className="mt-2 text-sm text-slate-500">
          Báº¡n cÃ³ thá»ƒ hoÃ n thÃ nh pháº§n lÃ½ thuyáº¿t Ä‘á»ƒ tiáº¿p tá»¥c.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-black">BÃ i táº­p ngá»¯ phÃ¡p</h3>

        <p className="mt-2 text-sm font-medium text-slate-500">
          Tráº£ lá»i Ä‘áº§y Ä‘á»§ {questions.length} cÃ¢u trÆ°á»›c khi ná»™p bÃ i.
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => {
          const questionResult = result?.results.find(
            (item) => item.questionId === question.id,
          );

          return (
            <article
              key={question.id}
              className="rounded-2xl border border-violet-100 p-5"
            >
              <h4 className="font-black leading-7">
                {index + 1}. {question.question}
              </h4>

              <div className="mt-4 grid gap-3">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option;

                  const isCorrect = questionResult?.correctAnswer === option;

                  const isWrongSelected = Boolean(
                    questionResult && selected && !questionResult.isCorrect,
                  );

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={Boolean(result)}
                      onClick={() => onSelect(question.id, option)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                        isCorrect
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : isWrongSelected
                            ? "border-red-400 bg-red-50 text-red-600"
                            : selected
                              ? "border-violet-500 bg-violet-50 text-violet-700"
                              : "border-slate-200 hover:border-violet-300"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {questionResult && (
                <div
                  className={`mt-4 rounded-xl p-4 text-sm font-bold ${
                    questionResult.isCorrect
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  <p>
                    {questionResult.isCorrect
                      ? "ChÃ­nh xÃ¡c"
                      : `ÄÃ¡p Ã¡n Ä‘Ãºng: ${questionResult.correctAnswer}`}
                  </p>

                  {questionResult.explanation && (
                    <p className="mt-2 font-medium leading-6">
                      {questionResult.explanation}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!result && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-violet-600 px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Äang cháº¥m bÃ i..." : "Ná»™p bÃ i táº­p"}
        </button>
      )}

      {result && (
        <>
          <div className="mt-6 rounded-2xl bg-violet-50 p-6 text-center">
            <p className="text-sm font-bold text-violet-600">Káº¿t quáº£</p>

            <p className="mt-2 text-4xl font-black">{result.score}%</p>

            <p className="mt-2 font-bold text-slate-500">
              {result.correct}/{result.total} cÃ¢u Ä‘Ãºng
            </p>
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="mt-4 w-full rounded-xl bg-violet-600 px-6 py-4 font-black text-white"
          >
            {nextLessonId
              ? "Há»c bÃ i tiáº¿p theo"
              : topicId
                ? "Quay láº¡i chá»§ Ä‘á»"
                : "Quay láº¡i Ngá»¯ phÃ¡p"}
          </button>
        </>
      )}
    </div>
  );
}

// app/grammar/lesson/[lessonId]/page.tsx
"use client";

import { api } from "@/src/lib/axios";
import { useSpeak } from "@/src/hooks/useSpeak";
import {
  Bell,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Flame,
  Gem,
  Gift,
  Headphones,
  Home,
  Lock,
  Mic,
  PenLine,
  Play,
  Search,
  Settings,
  Star,
  Trophy,
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
  type: "Lý thuyết" | "Bài tập";
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
          setMessage("Chưa tải được dữ liệu bài học.");
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
      setMessage("Đã lưu ghi chú.");
    } catch {
      setMessage("Lưu ghi chú thất bại.");
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

      setMessage("Bạn đã hoàn thành chủ đề này.");
      const reload = await api.get<LessonData>(
        `/grammar/lessons/${lessonId}/learning`,
      );
      setLesson(reload.data);
    } catch {
      setMessage("Chưa hoàn thành được bài học.");
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
     * Lesson đã hoàn thành rồi:
     * chỉ điều hướng, không gọi /complete lần nữa.
     */
    if (lesson.completed) {
      if (lesson.nextLessonId) {
        router.push(`/grammar/lesson/${lesson.nextLessonId}`);

        return;
      }

      setMessage("Bạn đã hoàn thành chủ đề này.");

      return;
    }

    /*
     * Lesson lý thuyết không có quiz:
     * gọi API complete.
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
      setMessage("Bài học này chưa có câu hỏi.");
      return;
    }

    const unanswered = lesson.questions.filter(
      (question) => !answers[question.id],
    );

    if (unanswered.length > 0) {
      setMessage(`Bạn còn ${unanswered.length} câu chưa trả lời.`);
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
        `Bạn đạt ${response.data.score}% — đúng ${response.data.correct}/${response.data.total} câu.`,
      );

      const reload = await api.get<LessonData>(
        `/grammar/lessons/${lessonId}/learning`,
      );

      setLesson(reload.data);
    } catch {
      setMessage("Không thể nộp bài tập. Vui lòng thử lại.");
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
            <h2 className="text-2xl font-black">Không tìm thấy bài học</h2>
            <p className="mt-2 text-slate-500">
              {message || "Bài học không tồn tại hoặc đã bị khóa."}
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
            Ngữ pháp <span className="mx-3">›</span>
            {lesson.topic?.category?.title || "Chủ đề"}{" "}
            <span className="mx-3">›</span>
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
              Lưu bài học
            </button>
          </div>

          <div className="mb-4 flex gap-8 border-b">
            <TabButton
              active={activeTab === "theory"}
              onClick={() => setActiveTab("theory")}
            >
              Lý thuyết
            </TabButton>

            <TabButton
              active={activeTab === "examples"}
              onClick={() => setActiveTab("examples")}
            >
              Ví dụ
            </TabButton>

            <TabButton
              active={activeTab === "tips"}
              onClick={() => setActiveTab("tips")}
            >
              Mẹo ghi nhớ
            </TabButton>

            <TabButton
              active={activeTab === "exercise"}
              onClick={() => setActiveTab("exercise")}
            >
              Bài tập
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
              Bài trước
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
                ? "Đang lưu..."
                : (lesson.questions?.length ?? 0) > 0 && !lesson.completed
                  ? "Làm bài tập"
                  : lesson.nextLessonId
                    ? "Tiếp theo"
                    : "Hoàn thành"}

              <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <RightCard title="Tiến độ của bạn">
            <div className="flex items-center gap-8">
              <CircularProgress value={lesson.progress} />

              <div className="space-y-5 text-sm">
                <ProgressLine
                  icon="💜"
                  main={`${lesson.completedLessons}/${lesson.totalLessons}`}
                  sub="Bài đã hoàn thành"
                />
                <ProgressLine
                  icon="💜"
                  main={`${lesson.completedExercises}/${lesson.totalExercises}`}
                  sub="Bài tập đã làm"
                />
                <ProgressLine
                  icon="⭐"
                  main={`+${lesson.earnedXp} XP`}
                  sub="Điểm nhận được"
                />
              </div>
            </div>
          </RightCard>

          <RightCard title="Danh sách bài học">
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

          <RightCard title="Tài liệu bổ trợ">
            {lesson.attachments.length > 0 ? (
              lesson.attachments.map((item) => (
                <AttachmentItem key={item.id} item={item} />
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Chưa có tài liệu bổ trợ cho bài học này.
              </p>
            )}
          </RightCard>

          <RightCard title="Ghi chú của bạn">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              className="h-[90px] w-full resize-none rounded-xl border bg-white p-4 text-sm outline-none focus:border-violet-400"
              placeholder="Viết ghi chú..."
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">{note.length}/500</span>
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="rounded-xl bg-violet-600 px-8 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingNote ? "Đang lưu..." : "Lưu"}
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
        <aside className="fixed left-0 top-0 h-screen w-[280px] border-r bg-white px-4 py-5">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="text-3xl">🦊</div>
            <h1 className="text-2xl font-black">
              Study<span className="text-violet-600">Arena</span>
            </h1>
          </div>

          <SidebarItem icon={<Home size={18} />} label="Trang chủ" />
          <SidebarTitle title="Học tập" />
          <SidebarItem icon={<BookOpen size={18} />} label="Tổng quan" />
          <SidebarItem icon={<BookOpen size={18} />} label="Từ vựng" />
          <SidebarItem active icon={<BookOpen size={18} />} label="Ngữ pháp" />
          <SidebarItem icon={<Headphones size={18} />} label="Nghe" />
          <SidebarItem icon={<Mic size={18} />} label="Nói" />
          <SidebarItem icon={<BookOpen size={18} />} label="Đọc hiểu" />
          <SidebarItem icon={<PenLine size={18} />} label="Viết" />

          <SidebarTitle title="Cộng đồng" />
          <SidebarItem icon={<Trophy size={18} />} label="Cộng đồng" />
          <SidebarItem icon={<Star size={18} />} label="Thành tích" />

          <SidebarTitle title="Khác" />
          <SidebarItem icon={<Settings size={18} />} label="Cài đặt" />

          <div className="absolute bottom-5 left-4 right-4 rounded-2xl border bg-gradient-to-br from-white to-violet-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold text-violet-700">
              <Star size={18} className="fill-orange-400 text-orange-400" />
              Nâng cấp Premium
            </div>
            <p className="text-sm text-slate-500">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
              Nâng cấp ngay
            </button>
            <div className="absolute bottom-0 right-2 text-6xl">🦊</div>
          </div>
        </aside>

        <main className="ml-[280px] flex-1">
          <header className="sticky top-0 z-10 flex h-[82px] items-center justify-between border-b bg-white/80 px-6 backdrop-blur">
            <div className="flex h-12 w-[700px] items-center gap-3 rounded-xl border bg-[#f7f5ff] px-4">
              <Search size={20} />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
              />
            </div>

            <div className="flex items-center gap-5 text-sm font-bold">
              <TopStat
                icon={<Flame className="text-red-500" />}
                value="18"
                label="Streak"
              />
              <TopStat
                icon={<Star className="text-orange-400" />}
                value="2,450"
                label="XP hôm nay"
              />
              <TopStat
                icon={<Gem className="text-sky-400" />}
                value="5,230"
                label="Xu"
              />
              <Gift className="text-violet-600" />
              <Bell className="text-indigo-500" />
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-orange-100 text-xl">
                  🦊
                </div>
                <div>
                  <p>Minh Anh</p>
                  <p className="text-xs text-slate-400">Level 18</p>
                </div>
              </div>
            </div>
          </header>

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

      <h3 className="mb-4 text-2xl font-black">1. Cấu trúc</h3>
      <div className="rounded-xl bg-gradient-to-r from-violet-50 to-violet-100 p-6 text-lg font-black leading-9 text-violet-700">
        {lesson.content.structure.length > 0 ? (
          lesson.content.structure.map((item) => <p key={item}>{item}</p>)
        ) : (
          <p>Chưa có cấu trúc cho bài học này.</p>
        )}
      </div>

      <div className="mt-4 rounded-xl border bg-violet-50/40 p-5">
        <div className="mb-2 flex items-center gap-3 font-bold text-violet-600">
          <Lightbulb size={22} />
          Lưu ý
        </div>
        {lesson.content.notes.length > 0 ? (
          <ul className="ml-12 list-disc space-y-1 font-medium">
            {lesson.content.notes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="ml-9 text-sm text-slate-500">Chưa có lưu ý.</p>
        )}
      </div>

      <h3 className="mb-4 mt-8 text-2xl font-black">2. Ví dụ</h3>
      <div className="space-y-3">
        {lesson.content.examples.length > 0 ? (
          lesson.content.examples.map((item) => (
            <ExampleRow key={item.en} item={item} />
          ))
        ) : (
          <p className="text-sm text-slate-500">Chưa có ví dụ.</p>
        )}
      </div>

      {lesson.content.tips[0] && (
        <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/40 p-5">
          <div className="mb-2 flex items-center gap-3 font-bold text-violet-600">
            <Lightbulb size={22} />
            Mẹo nhỏ
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
      <h3 className="mb-4 text-2xl font-black">Ví dụ thực tế</h3>
      <div className="space-y-3">
        {lesson.content.examples.length > 0 ? (
          lesson.content.examples.map((item) => (
            <ExampleRow key={item.en} item={item} />
          ))
        ) : (
          <p className="text-sm text-slate-500">
            Chưa có ví dụ cho bài học này.
          </p>
        )}
      </div>
    </div>
  );
}

function TipsContent({ lesson }: { lesson: LessonData }) {
  return (
    <div>
      <h3 className="mb-4 text-2xl font-black">Mẹo ghi nhớ</h3>
      <div className="space-y-3">
        {lesson.content.tips.length > 0 ? (
          lesson.content.tips.map((tip) => (
            <div
              key={tip}
              className="rounded-xl border border-violet-200 bg-violet-50 p-5 font-medium"
            >
              💡 {tip}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">Chưa có mẹo ghi nhớ.</p>
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
    .replaceAll("doesn’t", "<span class='text-red-500'>doesn’t</span>")
    .replaceAll("don’t", "<span class='text-red-500'>don’t</span>")
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
          <span className="text-xs font-bold text-violet-600">Đang học</span>
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
          <p className="text-xs text-slate-500">Hoàn thành chủ đề</p>
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

function SidebarTitle({ title }: { title: string }) {
  return (
    <p className="mb-3 mt-6 px-3 text-xs font-black uppercase text-slate-400">
      {title}
    </p>
  );
}

function SidebarItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${active ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}
    >
      {icon}
      {label}
    </div>
  );
}

function TopStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p>{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
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
        <h3 className="font-black">Bài học chưa có bài tập</h3>

        <p className="mt-2 text-sm text-slate-500">
          Bạn có thể hoàn thành phần lý thuyết để tiếp tục.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-black">Bài tập ngữ pháp</h3>

        <p className="mt-2 text-sm font-medium text-slate-500">
          Trả lời đầy đủ {questions.length} câu trước khi nộp bài.
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
                      ? "Chính xác"
                      : `Đáp án đúng: ${questionResult.correctAnswer}`}
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
          {submitting ? "Đang chấm bài..." : "Nộp bài tập"}
        </button>
      )}

      {result && (
        <>
          <div className="mt-6 rounded-2xl bg-violet-50 p-6 text-center">
            <p className="text-sm font-bold text-violet-600">Kết quả</p>

            <p className="mt-2 text-4xl font-black">{result.score}%</p>

            <p className="mt-2 font-bold text-slate-500">
              {result.correct}/{result.total} câu đúng
            </p>
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="mt-4 w-full rounded-xl bg-violet-600 px-6 py-4 font-black text-white"
          >
            {nextLessonId
              ? "Học bài tiếp theo"
              : topicId
                ? "Quay lại chủ đề"
                : "Quay lại Ngữ pháp"}
          </button>
        </>
      )}
    </div>
  );
}

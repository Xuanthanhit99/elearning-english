"use client";

import { lessonBuilderApi } from "@/src/lib/lesson-builder-api";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CourseLesson = {
  id: string;
  title: string;
  content?: string | null;
  duration?: number | null;
  completed?: boolean;
  hasContent?: boolean;
};

type BuilderCourse = {
  id: string;
  title: string;
  description?: string | null;
  level: string;
  sections: Array<{
    id: string;
    title: string;
    lessons: CourseLesson[];
  }>;
};

type Quiz = {
  id: string;
  question: string;
  options: string[];
};

export default function LessonBuilderCoursePage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  const [course, setCourse] = useState<BuilderCourse | null>(null);
  const [activeLessonId, setActiveLessonId] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const lessons = useMemo(
    () => course?.sections.flatMap((section) => section.lessons) || [],
    [course],
  );
  const activeLesson =
    lessons.find((lesson) => lesson.id === activeLessonId) || lessons[0] || null;
  const completedCount = lessons.filter((lesson) => lesson.completed).length;
  const progress = lessons.length
    ? Math.round((completedCount / lessons.length) * 100)
    : 0;

  useEffect(() => {
    void loadCourse();
  }, [courseId]);

  useEffect(() => {
    if (activeLesson?.id) {
      void loadQuiz(activeLesson.id);
    }
  }, [activeLesson?.id]);

  async function loadCourse() {
    setLoading("course");
    setError("");
    try {
      const res = await lessonBuilderApi.getCourse(courseId);
      setCourse(res.data);
      const first =
        res.data.sections?.flatMap((section: any) => section.lessons || [])?.[0];
      setActiveLessonId((current) => current || first?.id || "");
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tải được course.");
    } finally {
      setLoading("");
    }
  }

  async function loadQuiz(lessonId: string) {
    setQuizResult(null);
    setAnswers({});
    try {
      const res = await lessonBuilderApi.getLessonQuizzes(lessonId);
      setQuizzes(res.data || []);
    } catch {
      setQuizzes([]);
    }
  }

  async function submitQuiz() {
    if (!quizzes.length) return;
    setLoading("quiz");
    try {
      const payload = quizzes.map((quiz) => ({
        quizId: quiz.id,
        answer: answers[quiz.id] || "",
      }));
      const res = await lessonBuilderApi.submitQuiz(payload);
      setQuizResult(res.data);
    } finally {
      setLoading("");
    }
  }

  async function completeLesson() {
    if (!activeLesson) return;
    setLoading("complete");
    setError("");
    try {
      await lessonBuilderApi.completeLesson(activeLesson.id);
      await loadCourse();
      const index = lessons.findIndex((lesson) => lesson.id === activeLesson.id);
      const next = lessons[index + 1];
      if (next) {
        setActiveLessonId(next.id);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Bạn cần làm quiz đạt yêu cầu trước khi hoàn thành bài học.",
      );
    } finally {
      setLoading("");
    }
  }

  if (loading === "course" && !course) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfbff]">
        <Loader2 className="animate-spin text-violet-600" size={36} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfbff] px-5 py-8">
      <div className="mx-auto max-w-7xl">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 font-bold text-red-600">
            {error}
          </div>
        )}

        <section className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                <Sparkles size={16} />
                AI Course cá nhân
              </div>
              <h1 className="mt-4 text-4xl font-black text-slate-950">
                {course?.title || "Course"}
              </h1>
              <p className="mt-2 max-w-3xl font-semibold leading-7 text-slate-600">
                {course?.description}
              </p>
            </div>
            <div className="min-w-[260px] rounded-2xl bg-violet-50 p-4">
              <div className="flex items-center justify-between font-black text-violet-700">
                <span>Tiến độ</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-violet-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-bold text-slate-500">
                {completedCount}/{lessons.length} bài hoàn thành
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="h-fit rounded-[24px] border border-violet-100 bg-white p-4 shadow-sm">
            <h2 className="px-2 text-lg font-black text-slate-950">
              Danh sách bài học
            </h2>
            <div className="mt-4 space-y-5">
              {course?.sections.map((section) => (
                <div key={section.id}>
                  <p className="px-2 text-sm font-black uppercase text-slate-400">
                    {section.title}
                  </p>
                  <div className="mt-2 space-y-2">
                    {section.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          activeLesson?.id === lesson.id
                            ? "bg-violet-600 text-white"
                            : "bg-slate-50 text-slate-800 hover:bg-violet-50"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            activeLesson?.id === lesson.id
                              ? "bg-white/20"
                              : "bg-white"
                          }`}
                        >
                          {lesson.completed ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <BookOpen size={18} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-black">{lesson.title}</span>
                          <span
                            className={`text-xs font-bold ${
                              activeLesson?.id === lesson.id
                                ? "text-white/80"
                                : "text-slate-500"
                            }`}
                          >
                            {lesson.duration || 15} phút
                          </span>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="space-y-6">
            <article className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-black text-violet-600">
                    Lesson
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-slate-950">
                    {activeLesson?.title}
                  </h2>
                </div>
                <button
                  onClick={completeLesson}
                  disabled={loading === "complete" || !activeLesson}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white disabled:opacity-60"
                >
                  {loading === "complete" ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  Hoàn thành bài
                </button>
              </div>

              <div className="prose prose-slate mt-6 max-w-none whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 font-semibold leading-8 text-slate-700">
                {activeLesson?.content || "Bài học chưa có nội dung."}
              </div>
            </article>

            <section className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Mini Quiz
                  </h2>
                  <p className="mt-1 font-semibold text-slate-500">
                    Làm quiz để mở trạng thái hoàn thành bài.
                  </p>
                </div>
                <button
                  onClick={() => activeLesson && loadQuiz(activeLesson.id)}
                  className="rounded-xl bg-slate-50 p-3 text-slate-600"
                >
                  <RotateCcw size={18} />
                </button>
              </div>

              {quizzes.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-slate-50 p-5 font-bold text-slate-500">
                  Bài này chưa có quiz. Bạn có thể đánh dấu hoàn thành ngay.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {quizzes.map((quiz, index) => (
                    <div
                      key={quiz.id}
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <p className="font-black text-slate-950">
                        {index + 1}. {quiz.question}
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {quiz.options.map((option) => (
                          <button
                            key={option}
                            onClick={() =>
                              setAnswers({ ...answers, [quiz.id]: option })
                            }
                            className={`rounded-xl border px-4 py-3 text-left font-bold ${
                              answers[quiz.id] === option
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-slate-100 bg-white text-slate-600"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={submitQuiz}
                    disabled={
                      loading === "quiz" ||
                      quizzes.some((quiz) => !answers[quiz.id])
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white disabled:opacity-60"
                  >
                    {loading === "quiz" ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Play size={18} />
                    )}
                    Nộp quiz
                  </button>

                  {quizResult && (
                    <div
                      className={`rounded-2xl p-5 font-black ${
                        quizResult.score >= 80
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      Kết quả: {quizResult.correct}/{quizResult.total} câu đúng
                      - {quizResult.score} điểm
                    </div>
                  )}
                </div>
              )}
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Loader2,
  Play,
  RefreshCcw,
  Target,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getLearningPath,
  LearningPathCourse,
  LearningPathData,
  LearningPathLesson,
  startLearningPathLesson,
} from "@/src/lib/learning-path-api";

const statusLabels: Record<LearningPathLesson["status"], string> = {
  LOCKED: "Chua mo khoa",
  AVAILABLE: "Bat dau",
  IN_PROGRESS: "Tiep tuc",
  COMPLETED: "Da hoan thanh",
};

function LessonIcon({ status }: { status: LearningPathLesson["status"] }) {
  if (status === "COMPLETED") return <CheckCircle2 className="text-emerald-600" size={20} />;
  if (status === "LOCKED") return <Lock className="text-slate-400" size={20} />;
  if (status === "IN_PROGRESS") return <RefreshCcw className="text-violet-600" size={20} />;
  return <Play className="text-violet-600" size={20} fill="currentColor" />;
}

function CourseCard({
  course,
  onStartLesson,
  startingLessonId,
}: {
  course: LearningPathCourse;
  onStartLesson: (lesson: LearningPathLesson) => void;
  startingLessonId: string | null;
}) {
  return (
    <article className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative h-32 w-full overflow-hidden rounded-2xl bg-violet-50 lg:w-44">
          {course.thumbnail ? (
            <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
          ) : (
            <BookOpen className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-violet-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-950">{course.title}</h2>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{course.reason}</p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-black text-violet-700">
              {course.completedLessons}/{course.totalLessons} bai
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(course.progressPercent, 100)}%` }} />
          </div>
        </div>
      </div>

      {!course.available ? (
        <div className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
          Khoa hoc nay chua duoc lien ket voi noi dung that. Hay kiem tra courseId/slug trong ket qua placement.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {course.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50">
                <LessonIcon status={lesson.status} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-950">{lesson.title}</p>
                <p className="text-sm font-semibold text-slate-500">
                  {lesson.sectionTitle}
                  {lesson.duration ? ` - ${lesson.duration} phut` : ""}
                </p>
              </div>

              {lesson.status === "LOCKED" ? (
                <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-500">
                  {statusLabels[lesson.status]}
                </span>
              ) : lesson.status === "COMPLETED" ? (
                <Link
                  href={lesson.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-black text-emerald-700"
                >
                  Xem lai
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartLesson(lesson)}
                  disabled={startingLessonId === lesson.id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                >
                  {startingLessonId === lesson.id ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
                  {statusLabels[lesson.status]}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function LearningPathScreen() {
  const router = useRouter();
  const [data, setData] = useState<LearningPathData | null>(null);
  const [error, setError] = useState("");
  const [startingLessonId, setStartingLessonId] = useState<string | null>(null);

  async function loadLearningPath() {
    try {
      setError("");
      setData(await getLearningPath());
    } catch (err) {
      const response =
        (
          err as {
            response?: {
              data?: {
                code?: string;
                nextUrl?: string;
              };
            };
          }
        ).response?.data;

      if (response?.code === "PLACEMENT_REQUIRED" && response.nextUrl) {
        router.replace(response.nextUrl);
        return;
      }

      setError(err instanceof Error ? err.message : "Khong the tai lo trinh hoc.");
    }
  }

  useEffect(() => {
    void loadLearningPath();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartLesson(lesson: LearningPathLesson) {
    try {
      setStartingLessonId(lesson.id);
      await startLearningPathLesson(lesson.id);
      router.push(lesson.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the bat dau bai hoc.");
    } finally {
      setStartingLessonId(null);
    }
  }

  if (!data) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
          <p className="mt-4 font-black text-slate-900">Dang tai lo trinh hoc...</p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[30px] border border-violet-100 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="font-bold text-violet-600">Lo trinh hoc ca nhan hoa</p>
              <h1 className="mt-2 text-4xl font-black text-slate-950">
                Trinh do hien tai: {data.overallLevel}
              </h1>
              <p className="mt-3 text-slate-600">
                Diem placement: {Math.round(data.overallScore)}/100
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-violet-50 p-4 text-center">
                <p className="text-2xl font-black text-violet-700">{data.progressPercent}%</p>
                <p className="text-xs font-bold text-slate-500">Tien do</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-black text-emerald-700">{data.completedLessons}</p>
                <p className="text-xs font-bold text-slate-500">Da hoc</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4 text-center">
                <p className="text-2xl font-black text-sky-700">{data.totalLessons}</p>
                <p className="text-xs font-bold text-slate-500">Tong bai</p>
              </div>
            </div>
          </div>

          {data.currentLesson ? (
            <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-gradient-to-r from-violet-600 to-sky-500 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white/80">Bai tiep theo</p>
                <h2 className="mt-1 text-2xl font-black">{data.currentLesson.title}</h2>
                <p className="text-sm font-semibold text-white/80">
                  {data.currentLesson.sectionTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleStartLesson(data.currentLesson as LearningPathLesson)}
                disabled={startingLessonId === data.currentLesson.id}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-violet-700 disabled:opacity-60"
              >
                {startingLessonId === data.currentLesson.id ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                {data.currentLesson.status === "IN_PROGRESS" ? "Tiep tuc hoc" : "Bat dau hoc"}
              </button>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-3">
          {data.phases.map((phase) => (
            <article key={phase.id} className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-black text-violet-700">Giai doan {phase.phase}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{phase.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Clock size={15} />
                {phase.weeksMin}-{phase.weeksMax} tuan
              </p>
              <p className="mt-4 leading-7 text-slate-600">{phase.description}</p>
              <div className="mt-5 space-y-2">
                {phase.objectives.map((item) => (
                  <p key={item} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Bai hoc trong lo trinh</h2>
              <p className="text-sm font-semibold text-slate-500">
                Hoc theo thu tu de mo khoa tung bai va dong bo tien do dashboard.
              </p>
            </div>
            <Target className="h-10 w-10 text-violet-600" />
          </div>

          {data.courses.length ? (
            data.courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onStartLesson={handleStartLesson}
                startingLessonId={startingLessonId}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
              Chua co khoa hoc nao trong lo trinh. Hay cap nhat placement de he thong tao goi y moi.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

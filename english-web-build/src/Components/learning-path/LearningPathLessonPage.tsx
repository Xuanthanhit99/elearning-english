"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Clock,
  Loader2,
  RefreshCcw,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  completeLearningPathLesson,
  LearningPathLessonActionResult,
  resumeLearningPathLesson,
  startLearningPathLesson,
} from "@/src/lib/learning-path-api";

export default function LearningPathLessonPage() {
  const router = useRouter();
  const params = useParams<{ lessonId: string }>();
  const lessonId = params?.lessonId;
  const [data, setData] = useState<LearningPathLessonActionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadLesson() {
    if (!lessonId) return;

    try {
      setLoading(true);
      setError("");
      setData(await resumeLearningPathLesson(lessonId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the tai bai hoc.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadLesson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function handleStart() {
    if (!lessonId) return;

    try {
      setSaving(true);
      setError("");
      setData(await startLearningPathLesson(lessonId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the bat dau bai hoc.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!lessonId) return;

    try {
      setSaving(true);
      setError("");
      const result = await completeLearningPathLesson(lessonId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the hoan thanh bai hoc.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
          <p className="mt-4 font-black text-slate-900">Dang tai bai hoc...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
          <p className="font-black text-red-700">{error || "Khong co du lieu bai hoc."}</p>
          <button
            type="button"
            onClick={loadLesson}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-black text-white"
          >
            <RefreshCcw size={17} />
            Thu lai
          </button>
        </div>
      </main>
    );
  }

  const lesson = data.lesson;
  const completed = lesson.status === "COMPLETED";
  const started = lesson.status === "IN_PROGRESS" || completed;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link
          href="/learning-path"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-black text-slate-700"
        >
          <ArrowLeft size={17} />
          Quay lai lo trinh
        </Link>

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[30px] border border-violet-100 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-black text-violet-600">{lesson.sectionTitle}</p>
              <h1 className="mt-2 text-4xl font-black text-slate-950">{lesson.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Clock size={16} />
                {lesson.duration ? `${lesson.duration} phut` : "Thoi luong linh hoat"}
              </p>
            </div>

            <div className="rounded-3xl bg-violet-50 p-5 text-center">
              <p className="text-3xl font-black text-violet-700">
                {data.learningPath.progressPercent}%
              </p>
              <p className="text-sm font-bold text-slate-500">Tien do lo trinh</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-slate-50 p-6">
            <h2 className="text-2xl font-black text-slate-950">Noi dung bai hoc</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Bai hoc nay nam trong Learning Path cua ban. Hay hoc noi dung theo module
              tuong ung, sau do danh dau hoan thanh de mo khoa bai tiep theo va dong bo
              tien do tren dashboard.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-bold text-slate-500">Trang thai</p>
                <p className="mt-1 font-black text-slate-950">{lesson.status}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-bold text-slate-500">Da hoc</p>
                <p className="mt-1 font-black text-slate-950">
                  {data.learningPath.completedLessons}/{data.learningPath.totalLessons}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-bold text-slate-500">Khoa hoc</p>
                <p className="mt-1 truncate font-black text-slate-950">{lesson.courseSlug}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!started ? (
              <button
                type="button"
                onClick={handleStart}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-black text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : null}
                Bat dau bai hoc
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleComplete}
              disabled={saving || completed}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {completed ? "Da hoan thanh" : "Danh dau hoan thanh"}
            </button>

            {data.learningPath.nextLesson ? (
              <button
                type="button"
                onClick={() => router.push(data.learningPath.nextLesson?.href ?? "/learning-path")}
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-6 py-3 font-black text-violet-700"
              >
                Bai tiep theo
              </button>
            ) : null}
          </div>
        </section>

        {data.rewards ? (
          <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {data.rewards.applied ? "Phan thuong vua nhan" : "Bai hoc da duoc xu ly"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {data.rewards.applied
                    ? "Tien do, nhiem vu va diem cua ban da duoc dong bo tu backend."
                    : "Lan goi nay khong cong lai XP, coins hay streak."}
                </p>
              </div>
              {data.rewards.leaderboard.queued ? (
                <span className="rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
                  Leaderboard da dong bo
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-amber-50 p-4">
                <Star className="mb-2 text-amber-600" size={20} />
                <p className="text-2xl font-black text-amber-700">+{data.rewards.xp}</p>
                <p className="text-xs font-bold text-slate-500">XP</p>
              </div>
              <div className="rounded-2xl bg-yellow-50 p-4">
                <Coins className="mb-2 text-yellow-600" size={20} />
                <p className="text-2xl font-black text-yellow-700">+{data.rewards.coins}</p>
                <p className="text-xs font-bold text-slate-500">Coins</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <CheckCircle2 className="mb-2 text-emerald-600" size={20} />
                <p className="text-2xl font-black text-emerald-700">
                  {data.rewards.missionUpdates.length}
                </p>
                <p className="text-xs font-bold text-slate-500">Mission cap nhat</p>
              </div>
              <div className="rounded-2xl bg-violet-50 p-4">
                <RefreshCcw className="mb-2 text-violet-600" size={20} />
                <p className="text-2xl font-black text-violet-700">
                  {data.rewards.streak.current ?? "-"}
                </p>
                <p className="text-xs font-bold text-slate-500">Streak hien tai</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

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
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  completeLearningPathLesson,
  LearningPathLessonActionResult,
  resumeLearningPathLesson,
  startLearningPathLesson,
} from "@/src/lib/learning-path-api";
import { trackEvent } from "@/src/lib/ga";

const lessonStatusLabels: Record<string, string> = {
  LOCKED: "Đã khoá",
  AVAILABLE: "Chưa bắt đầu",
  IN_PROGRESS: "Đang học",
  COMPLETED: "Đã hoàn thành",
};

export default function LearningPathLessonPage() {
  const router = useRouter();
  const params = useParams<{ lessonId: string }>();
  const lessonId = params?.lessonId;
  const [data, setData] = useState<LearningPathLessonActionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loadAbortRef = useRef<AbortController | null>(null);

  async function loadLesson() {
    if (!lessonId) return;

    // Cancels any in-flight resume request (previous lessonId, or a manual
    // retry click) so a slower stale response can never overwrite newer
    // state.
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    try {
      setLoading(true);
      setError("");
      setData(await resumeLearningPathLesson(lessonId, controller.signal));
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError(err instanceof Error ? err.message : "Không thể tải bài học.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    void loadLesson();
    return () => loadAbortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function handleStart() {
    if (!lessonId) return;

    try {
      setSaving(true);
      setError("");
      const result = await startLearningPathLesson(lessonId);
      setData(result);
      trackEvent("lesson_start", { lesson_type: "learning_path" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể bắt đầu bài học.");
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

      // `alreadyCompleted` means this lesson was completed before this
      // click (e.g. re-visiting a finished lesson) — don't recount it.
      if (!result.alreadyCompleted) {
        trackEvent("lesson_complete", { lesson_type: "learning_path" });
        if (result.learningPath.completedLessons === 1) {
          trackEvent("first_lesson_complete", { lesson_type: "learning_path" });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hoàn thành bài học.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
          <p className="mt-4 font-black text-slate-900">Đang tải bài học...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
          <p className="font-black text-red-700">{error || "Không có dữ liệu bài học."}</p>
          <button
            type="button"
            onClick={loadLesson}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-black text-white"
          >
            <RefreshCcw size={17} />
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  const lesson = data.lesson;
  const completed = lesson.status === "COMPLETED";
  const started = lesson.status === "IN_PROGRESS" || completed;

  return (
    <main className="min-h-screen px-1 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-5 sm:pt-5 lg:pb-5">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5">
        <Link
          href="/learning-path"
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-[var(--BeaconVie-muted)] transition hover:bg-[var(--BeaconVie-hover-tint)] hover:text-[var(--BeaconVie-primary)]"
        >
          <ArrowLeft size={17} />
          Quay lại lộ trình
        </Link>

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="BeaconVie-surface rounded-[26px] p-5 shadow-sm sm:rounded-[30px] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-black text-[var(--BeaconVie-primary)]">{lesson.sectionTitle}</p>
              <h1 className="mt-2 text-3xl font-black text-[var(--BeaconVie-ink)] sm:text-4xl">{lesson.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--BeaconVie-muted)]">
                <Clock size={16} />
                {lesson.duration ? `${lesson.duration} phút` : "Thời lượng linh hoạt"}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--BeaconVie-primary-soft)] px-4 py-3 text-left sm:text-center">
              <p className="text-2xl font-black text-[var(--BeaconVie-primary)]">
                {data.learningPath.progressPercent}%
              </p>
              <p className="text-sm font-bold text-[var(--BeaconVie-muted)]">Tiến độ lộ trình</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--BeaconVie-primary)]">Focus lesson</p>
            <h2 className="mt-2 text-xl font-black text-[var(--BeaconVie-ink)]">Tập trung vào một bài học</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              {started
                ? "Bạn đang học bài này. Hoàn thành khi đã thực hiện xong nội dung của bài để mở bước tiếp theo."
                : "Bắt đầu bài để ghi nhận trạng thái học. Sau khi hoàn thành, lộ trình sẽ tự mở bước tiếp theo nếu có."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-[var(--BeaconVie-muted)]">
              <span className="rounded-full bg-[var(--BeaconVie-card)] px-3 py-2">{lessonStatusLabels[lesson.status] ?? lesson.status}</span>
              <span className="rounded-full bg-[var(--BeaconVie-card)] px-3 py-2">{data.learningPath.completedLessons}/{data.learningPath.totalLessons} bài đã hoàn thành</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {!started ? (
              <button
                type="button"
                onClick={handleStart}
                disabled={saving}
                className="BeaconVie-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 py-3 font-black disabled:opacity-60 sm:w-auto"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : null}
                Bắt đầu bài học
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleComplete}
              disabled={saving || completed}
              className="BeaconVie-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 py-3 font-black disabled:opacity-60 sm:w-auto"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {completed ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
            </button>

            {completed && data.learningPath.nextLesson ? (
              <button
                type="button"
                onClick={() => router.push(data.learningPath.nextLesson?.href ?? "/learning-path")}
                className="BeaconVie-button-soft inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 py-3 font-black text-[var(--BeaconVie-primary)] sm:w-auto"
              >
                Bài tiếp theo
              </button>
            ) : null}
          </div>
        </section>

        {data.rewards ? (
          <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {data.rewards.applied ? "Phần thưởng vừa nhận" : "Bài học đã được ghi nhận"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {data.rewards.applied
                    ? "Tiến độ, nhiệm vụ và điểm của bạn đã được cập nhật."
                    : "Lần này không cộng thêm XP, coins hay streak."}
                </p>
              </div>
              {data.rewards.leaderboard.queued ? (
                <span className="rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
                  Bảng xếp hạng đã cập nhật
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
                <p className="text-xs font-bold text-slate-500">Nhiệm vụ cập nhật</p>
              </div>
              <div className="rounded-2xl bg-violet-50 p-4">
                <RefreshCcw className="mb-2 text-violet-600" size={20} />
                <p className="text-2xl font-black text-violet-700">
                  {data.rewards.streak.current ?? "-"}
                </p>
                <p className="text-xs font-bold text-slate-500">Streak hiện tại</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

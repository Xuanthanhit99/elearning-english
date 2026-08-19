"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Compass,
  Flag,
  GraduationCap,
  Loader2,
  Lock,
  Play,
  Route,
  Star,
  Target,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getLearningPath,
  LearningPathCourse,
  LearningPathData,
  LearningPathLesson,
  LearningPathStartingLesson,
  startLearningPathLesson,
} from "@/src/lib/learning-path-api";
import {
  BeaconVieBadge,
  BeaconVieButton,
  BeaconVieCard,
  BeaconVieProgress,
  BeaconVieSectionHeader,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";

const statusCopy: Record<LearningPathLesson["status"], string> = {
  LOCKED: "Đã khoá",
  AVAILABLE: "Bắt đầu",
  IN_PROGRESS: "Tiếp tục",
  COMPLETED: "Ôn tập",
};

const skillLabels: Record<string, string> = {
  VOCABULARY: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
  LISTENING: "Nghe",
  READING: "Đọc",
  SPEAKING: "Nói",
  WRITING: "Viết",
};

// item.status is a free-form string from the backend (not a typed enum), so
// this only covers values actually observed in the product; anything else
// falls back to the raw value rather than crashing.
const skillStatusLabels: Record<string, string> = {
  SKIPPED: "Đã bỏ qua",
  NOT_ASSESSED: "Chưa đánh giá",
};

/** Distinguishes the full PLACEMENT lesson shape from the DEFAULT_FOUNDATION starting-lesson pointer. */
function isFullPathLesson(
  lesson: LearningPathLesson | LearningPathStartingLesson | null | undefined,
): lesson is LearningPathLesson {
  return !!lesson && "status" in lesson;
}

export default function LearningPathScreen() {
  const router = useRouter();
  const [data, setData] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingLessonId, setStartingLessonId] = useState<string | null>(null);

  const loadLearningPath = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setData(await getLearningPath());
    } catch (err) {
      // The backend no longer 404s for a user without a completed
      // Placement test — GET /learning-path always resolves to either a
      // PLACEMENT-sourced path or a DEFAULT_FOUNDATION per-skill starter
      // path (see LearningPathService.buildDefaultFoundationPath). A
      // request can still fail for genuine errors (network, 5xx), which
      // this catch handles the same way as before.
      setError(err instanceof Error ? err.message : "Không thể tải lộ trình học của bạn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadLearningPath);
  }, [loadLearningPath]);

  async function handleStartLesson(lesson: LearningPathLesson) {
    if (lesson.status === "LOCKED") return;

    try {
      setStartingLessonId(lesson.id);
      setError("");
      await startLearningPathLesson(lesson.id);
      router.push(lesson.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể mở bài học này.");
    } finally {
      setStartingLessonId(null);
    }
  }

  const allLessons = useMemo(
    () => data?.courses.flatMap((course) => course.lessons) ?? [],
    [data],
  );

  if (loading) return <LearningPathSkeleton />;

  if (!data) {
    return (
      <BeaconVieState
        title="Không thể mở lộ trình học"
        description={error}
        actionLabel="Thử lại"
        tone="error"
        onAction={() => void loadLearningPath()}
      />
    );
  }

  return (
    <main className="min-h-screen px-3 py-5 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <BeaconVieCard className="overflow-hidden p-0">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
            <section>
              <BeaconVieBadge>Lộ trình học</BeaconVieBadge>
              <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-[var(--BeaconVie-ink)] sm:text-5xl">
                {data.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--BeaconVie-muted)]">
                {data.source === "PLACEMENT" ? (
                  <>
                    Lộ trình này được xây dựng từ kết quả kiểm tra trình độ{" "}
                    {data.overallLevel} ({Math.round(data.overallScore ?? 0)}/100)
                    và luôn đồng bộ với tiến độ học thực tế của bạn.
                  </>
                ) : (
                  <>
                    Bạn chưa làm bài kiểm tra trình độ — đây là điểm khởi đầu cơ
                    bản cho từng kỹ năng. Bạn có thể làm bài kiểm tra bất cứ lúc
                    nào để nhận gợi ý phù hợp hơn.
                  </>
                )}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                <HeroMetric icon={GraduationCap} label="Trình độ" value={data.overallLevel ?? "—"} />
                <HeroMetric icon={Target} label="Tiến độ" value={`${data.progressPercent}%`} />
                <HeroMetric icon={CheckCircle2} label="Đã hoàn thành" value={`${data.completedLessons}`} />
                <HeroMetric icon={BookOpen} label="Bài học" value={`${data.totalLessons}`} />
              </div>
            </section>

            <NextLessonCard
              lesson={
                data.currentLesson ??
                (isFullPathLesson(data.nextLesson) ? data.nextLesson : null)
              }
              startingLessonId={startingLessonId}
              onStart={handleStartLesson}
            />
          </div>
        </BeaconVieCard>

        {error ? (
          <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
            {error}
          </p>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <BeaconVieCard className="p-6">
            <BeaconVieSectionHeader
              eyebrow="Hành trình"
              title="Bản đồ bài học"
              description="Bài đã khoá sẽ mở ra khi bạn hoàn thành các bài trước đó."
            />
            {allLessons.length ? (
              <PathTimeline
                courses={data.courses}
                startingLessonId={startingLessonId}
                onStart={handleStartLesson}
              />
            ) : data.source === "DEFAULT_FOUNDATION" ? (
              <BeaconVieState
                title="Lộ trình cơ bản — xem chi tiết theo kỹ năng"
                description="Làm bài kiểm tra trình độ để mở bản đồ học cá nhân hoá. Bài học khởi đầu cho từng kỹ năng đã có ở khung bên phải."
                tone="soft"
              />
            ) : (
              <BeaconVieState
                title="Chưa có bài học trong lộ trình này"
                description="Hãy làm lại bài kiểm tra trình độ hoặc thử tải lại trang."
                tone="empty"
              />
            )}
          </BeaconVieCard>

          <aside className="space-y-5">
            {data.phases.length ? <PhasePanel phases={data.phases} /> : null}
            {data.priorities.length ? (
              <PriorityPanel priorities={data.priorities} />
            ) : null}
            <SkillPanel skills={data.skills} />
          </aside>
        </section>

        {data.courses.length ? (
          <BeaconVieCard className="p-6">
            <BeaconVieSectionHeader
              eyebrow="Khoá học"
              title="Nhóm khoá học đề xuất"
              description="Các khoá học phù hợp với lộ trình của bạn."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {data.courses.map((course) => (
                <CourseSummary key={course.id} course={course} />
              ))}
            </div>
          </BeaconVieCard>
        ) : null}
      </div>
    </main>
  );
}

function NextLessonCard({
  lesson,
  startingLessonId,
  onStart,
}: {
  lesson: LearningPathLesson | null;
  startingLessonId: string | null;
  onStart: (lesson: LearningPathLesson) => void;
}) {
  if (!lesson) {
    return (
      <BeaconVieCard className="p-5">
        <Compass aria-hidden className="h-9 w-9 text-[var(--BeaconVie-primary)]" />
        <h2 className="mt-4 text-2xl font-black text-[var(--BeaconVie-ink)]">
          Lộ trình đã sẵn sàng
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
          Chưa có bài học hiện tại. Xem bản đồ bài học bên dưới.
        </p>
      </BeaconVieCard>
    );
  }

  return (
    <BeaconVieCard className="border-[var(--BeaconVie-primary)]/20 bg-[var(--BeaconVie-primary-soft)] p-5">
      <BeaconVieBadge>Bài học tiếp theo</BeaconVieBadge>
      <h2 className="mt-4 text-2xl font-black text-[var(--BeaconVie-ink)]">
        {lesson.title}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
        {lesson.sectionTitle}
        {lesson.duration ? ` • ${lesson.duration} phút` : ""}
      </p>
      <BeaconVieButton
        className="mt-6 w-full"
        loading={startingLessonId === lesson.id}
        disabled={lesson.status === "LOCKED"}
        onClick={() => onStart(lesson)}
      >
        {lesson.status === "IN_PROGRESS" ? "Tiếp tục bài học" : "Bắt đầu bài học"}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </BeaconVieButton>
      {lesson.status === "LOCKED" ? (
        <p className="mt-3 text-xs font-bold text-[var(--BeaconVie-muted)]">
          Bài học này sẽ mở khi bạn hoàn thành các bài trước đó.
        </p>
      ) : null}
    </BeaconVieCard>
  );
}

function PathTimeline({
  courses,
  startingLessonId,
  onStart,
}: {
  courses: LearningPathCourse[];
  startingLessonId: string | null;
  onStart: (lesson: LearningPathLesson) => void;
}) {
  return (
    <div className="space-y-8">
      {courses.map((course, courseIndex) => (
        <section key={course.id} className="relative">
          <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-[var(--BeaconVie-primary-soft)]">
                {course.thumbnail ? (
                  <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
                ) : (
                  <Route className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[var(--BeaconVie-primary)]" />
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-primary)]">
                  Chặng {courseIndex + 1}
                </p>
                <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
                  {course.title}
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                  {course.reason}
                </p>
              </div>
            </div>
            <div className="min-w-[160px]">
              <div className="flex justify-between text-xs font-black text-[var(--BeaconVie-muted)]">
                <span>{course.completedLessons}/{course.totalLessons}</span>
                <span>{course.progressPercent}%</span>
              </div>
              <BeaconVieProgress value={course.progressPercent} className="mt-2" />
            </div>
          </div>

          {!course.available ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              Khoá học này chưa có nội dung bài học. Các bài học tạm thời chưa
              thể mở.
            </div>
          ) : (
            <ol className="relative ml-3 space-y-4 border-l-2 border-dashed border-[var(--BeaconVie-border)] pl-6">
              {course.lessons.map((lesson) => (
                <PathNode
                  key={lesson.id}
                  lesson={lesson}
                  loading={startingLessonId === lesson.id}
                  onStart={() => onStart(lesson)}
                />
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}

function PathNode({
  lesson,
  loading,
  onStart,
}: {
  lesson: LearningPathLesson;
  loading: boolean;
  onStart: () => void;
}) {
  const locked = lesson.status === "LOCKED";
  const completed = lesson.status === "COMPLETED";
  const current = lesson.status === "IN_PROGRESS";

  return (
    <li className="relative">
      <span
        className={[
          "absolute -left-[35px] top-5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white",
          completed
            ? "bg-emerald-500 text-white"
            : current
              ? "bg-violet-600 text-white"
              : locked
                ? "bg-[var(--BeaconVie-disabled)]/20 text-[var(--BeaconVie-muted)]"
                : "bg-[var(--BeaconVie-primary)] text-white",
        ].join(" ")}
      >
        {completed ? (
          <CheckCircle2 aria-hidden className="h-4 w-4" />
        ) : locked ? (
          <Lock aria-hidden className="h-4 w-4" />
        ) : (
          <Play aria-hidden className="h-4 w-4" />
        )}
      </span>

      <article
        className={[
          "rounded-3xl border p-4 transition",
          current
            ? "border-violet-200 bg-violet-50/60"
            : completed
              ? "border-emerald-100 bg-emerald-50/35"
              : locked
                ? "border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)]"
                : "border-[var(--BeaconVie-primary)]/20 bg-[var(--BeaconVie-card)]",
        ].join(" ")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
              {lesson.sectionTitle}
            </p>
            <h3 className="mt-1 font-black text-[var(--BeaconVie-ink)]">
              {lesson.title}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm font-semibold text-[var(--BeaconVie-muted)]">
              {lesson.duration ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 aria-hidden className="h-4 w-4" />
                  {lesson.duration} phút
                </span>
              ) : null}
              <span>{statusCopy[lesson.status]}</span>
            </p>
          </div>

          {locked ? (
            <span aria-disabled="true" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--BeaconVie-disabled)]/20 px-4 py-3 text-sm font-black text-[var(--BeaconVie-muted)]">
              <Lock aria-hidden className="h-4 w-4" />
              Đã khoá
            </span>
          ) : completed ? (
            <Link href={lesson.href} className="BeaconVie-button-soft text-sm">
              Ôn tập <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={loading}
              className="BeaconVie-button-primary text-sm disabled:opacity-60"
            >
              {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />}
              {current ? "Tiếp tục" : "Bắt đầu"}
            </button>
          )}
        </div>

        {locked ? (
          <p className="mt-3 rounded-2xl bg-[var(--BeaconVie-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--BeaconVie-muted)]">
            Hoàn thành các bài học trước để mở bài này.
          </p>
        ) : null}
      </article>
    </li>
  );
}

function PhasePanel({ phases }: { phases: LearningPathData["phases"] }) {
  return (
    <BeaconVieCard className="p-5">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">
        Các chặng
      </h2>
      <div className="mt-4 space-y-3">
        {phases.map((phase) => (
          <div key={phase.id} className="rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-primary)]">
              Giai đoạn {phase.phase}
              {phase.targetLevel ? ` • ${phase.targetLevel}` : ""}
            </p>
            <h3 className="mt-2 font-black text-[var(--BeaconVie-ink)]">
              {phase.title}
            </h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              {phase.description}
            </p>
            <BeaconVieProgress value={phase.progress} className="mt-4" />
          </div>
        ))}
      </div>
    </BeaconVieCard>
  );
}

function PriorityPanel({ priorities }: { priorities: LearningPathData["priorities"] }) {
  return (
    <BeaconVieCard className="p-5">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">
        Kỹ năng ưu tiên
      </h2>
      <div className="mt-4 space-y-3">
        {priorities.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-2xl bg-[var(--BeaconVie-primary-soft)] p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--BeaconVie-primary)] font-black text-white">
              {item.priority}
            </span>
            <div>
              <p className="font-black text-[var(--BeaconVie-ink)]">
                {skillLabels[item.skill] ?? item.skill}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                {item.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </BeaconVieCard>
  );
}

function SkillPanel({ skills }: { skills: LearningPathData["skills"] }) {
  return (
    <BeaconVieCard className="p-5">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">
        Trình độ theo kỹ năng
      </h2>
      <div className="mt-4 space-y-3">
        {skills.map((item) => (
          <div key={item.skill} className="rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-[var(--BeaconVie-ink)]">
                {skillLabels[item.skill] ?? item.skill}
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {item.level ?? (item.status ? (skillStatusLabels[item.status] ?? item.status) : "—")}
              </span>
            </div>
            {typeof item.score === "number" ? (
              <BeaconVieProgress value={item.score} className="mt-3" />
            ) : null}
            {item.startingLesson ? (
              <Link
                href={item.startingLesson.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-black text-[var(--BeaconVie-primary)]"
              >
                Bắt đầu: {item.startingLesson.title}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </BeaconVieCard>
  );
}

function CourseSummary({ course }: { course: LearningPathCourse }) {
  return (
    <article className="rounded-3xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-4">
      <div className="flex gap-4">
        <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-[var(--BeaconVie-primary-soft)]">
          {course.thumbnail ? (
            <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
          ) : (
            <BookOpen className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[var(--BeaconVie-primary)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-[var(--BeaconVie-ink)]">
              {course.title}
            </h3>
            {!course.available ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">
                Chưa có nội dung
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
            {course.reason}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[var(--BeaconVie-muted)]">
            <span className="inline-flex items-center gap-1">
              <BookOpen aria-hidden className="h-4 w-4" />
              {course.lessonCount} bài học
            </span>
            {course.rating !== null ? (
              <span className="inline-flex items-center gap-1">
                <Star aria-hidden className="h-4 w-4 text-amber-500" />
                {course.rating}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Flag aria-hidden className="h-4 w-4" />
              {course.completedLessons}/{course.totalLessons}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof GraduationCap;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-4">
      <Icon aria-hidden className="h-5 w-5 text-[var(--BeaconVie-primary)]" />
      <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-[var(--BeaconVie-ink)]">
        {value}
      </p>
    </div>
  );
}

function LearningPathSkeleton() {
  return (
    <main className="min-h-screen px-3 py-5">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-[360px] rounded-[28px] bg-[var(--BeaconVie-card)]" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-[720px] rounded-[28px] bg-[var(--BeaconVie-card)]" />
          <div className="h-[720px] rounded-[28px] bg-[var(--BeaconVie-card)]" />
        </div>
      </div>
    </main>
  );
}

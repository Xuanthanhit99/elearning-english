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
  LOCKED: "Locked",
  AVAILABLE: "Bắt đầu",
  IN_PROGRESS: "Tiếp tục",
  COMPLETED: "Ôn tập",
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
      // Placement test â€” GET /learning-path always resolves to either a
      // PLACEMENT-sourced path or a DEFAULT_FOUNDATION per-skill starter
      // path (see LearningPathService.buildDefaultFoundationPath). A
      // request can still fail for genuine errors (network, 5xx), which
      // this catch handles the same way as before.
      setError(err instanceof Error ? err.message : "We could not load your learning path.");
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
      setError(err instanceof Error ? err.message : "We could not open this lesson.");
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
        title="Learning path is unavailable"
        description={error}
        actionLabel="Try again"
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
              <BeaconVieBadge>Learning Path</BeaconVieBadge>
              <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-[var(--BeaconVie-ink)] sm:text-5xl">
                {data.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--BeaconVie-muted)]">
                {data.source === "PLACEMENT" ? (
                  <>
                    Your path is generated from placement result {data.overallLevel}
                    {" "}({Math.round(data.overallScore ?? 0)}/100) and stays synced
                    with real lesson progress.
                  </>
                ) : (
                  <>
                    You haven&apos;t completed a placement test yet â€” here&apos;s a
                    foundation starting point for every skill. Take the placement
                    test any time for personalized recommendations.
                  </>
                )}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                <HeroMetric icon={GraduationCap} label="Level" value={data.overallLevel ?? "â€”"} />
                <HeroMetric icon={Target} label="Progress" value={`${data.progressPercent}%`} />
                <HeroMetric icon={CheckCircle2} label="Completed" value={`${data.completedLessons}`} />
                <HeroMetric icon={BookOpen} label="Lessons" value={`${data.totalLessons}`} />
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
              eyebrow="Journey"
              title="Milestones and lesson map"
              description="Nodes keep their real lock, progress and lesson links. Locked lessons are not clickable."
            />
            {allLessons.length ? (
              <PathTimeline
                courses={data.courses}
                startingLessonId={startingLessonId}
                onStart={handleStartLesson}
              />
            ) : data.source === "DEFAULT_FOUNDATION" ? (
              <BeaconVieState
                title="Foundation path â€” see your skill breakdown"
                description="Take the placement test to unlock a personalized milestone map. Each skill's starting lesson is listed in the panel to the right."
                tone="soft"
              />
            ) : (
              <BeaconVieState
                title="No lessons in this path yet"
                description="The backend returned an empty path. Retake placement or refresh after path generation finishes."
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
              eyebrow="Courses"
              title="Recommended course groups"
              description="Course cards are shown only from the learning path response."
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
          Path is ready
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
          There is no current lesson from the API yet. Check the timeline below.
        </p>
      </BeaconVieCard>
    );
  }

  return (
    <BeaconVieCard className="border-[var(--BeaconVie-primary)]/20 bg-[var(--BeaconVie-primary-soft)] p-5">
      <BeaconVieBadge>Next lesson</BeaconVieBadge>
      <h2 className="mt-4 text-2xl font-black text-[var(--BeaconVie-ink)]">
        {lesson.title}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
        {lesson.sectionTitle}
        {lesson.duration ? ` â€¢ ${lesson.duration} min` : ""}
      </p>
      <BeaconVieButton
        className="mt-6 w-full"
        loading={startingLessonId === lesson.id}
        disabled={lesson.status === "LOCKED"}
        onClick={() => onStart(lesson)}
      >
        {lesson.status === "IN_PROGRESS" ? "Continue lesson" : "Start lesson"}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </BeaconVieButton>
      {lesson.status === "LOCKED" ? (
        <p className="mt-3 text-xs font-bold text-[var(--BeaconVie-muted)]">
          This lesson is locked by the current path order.
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
                  Stage {courseIndex + 1}
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
              This course is not linked to live lesson content yet. Its lessons
              are kept disabled because the API marks the course unavailable.
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
                  {lesson.duration} min
                </span>
              ) : null}
              <span>{statusCopy[lesson.status]}</span>
            </p>
          </div>

          {locked ? (
            <span aria-disabled="true" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--BeaconVie-disabled)]/20 px-4 py-3 text-sm font-black text-[var(--BeaconVie-muted)]">
              <Lock aria-hidden className="h-4 w-4" />
              Locked
            </span>
          ) : completed ? (
            <Link href={lesson.href} className="BeaconVie-button-soft text-sm">
              Review <ArrowRight aria-hidden className="h-4 w-4" />
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
            Complete the previous available lessons to unlock this node.
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
        Stages
      </h2>
      <div className="mt-4 space-y-3">
        {phases.map((phase) => (
          <div key={phase.id} className="rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-primary)]">
              Phase {phase.phase}
              {phase.targetLevel ? ` â€¢ ${phase.targetLevel}` : ""}
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
        Skill priorities
      </h2>
      <div className="mt-4 space-y-3">
        {priorities.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-2xl bg-[var(--BeaconVie-primary-soft)] p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--BeaconVie-primary)] font-black text-white">
              {item.priority}
            </span>
            <div>
              <p className="font-black text-[var(--BeaconVie-ink)]">
                {item.skill}
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
        Skill baseline
      </h2>
      <div className="mt-4 space-y-3">
        {skills.map((item) => (
          <div key={item.skill} className="rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-[var(--BeaconVie-ink)]">
                {item.skill}
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {item.level ?? item.status ?? "â€”"}
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
                Start: {item.startingLesson.title}
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
                Not linked
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
            {course.reason}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[var(--BeaconVie-muted)]">
            <span className="inline-flex items-center gap-1">
              <BookOpen aria-hidden className="h-4 w-4" />
              {course.lessonCount} lessons
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

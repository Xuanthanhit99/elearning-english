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
  startLearningPathLesson,
} from "@/src/lib/learning-path-api";
import {
  LumiverseBadge,
  LumiverseButton,
  LumiverseCard,
  LumiverseProgress,
  LumiverseSectionHeader,
  LumiverseState,
} from "@/src/Components/UI/Lumiverse";

const statusCopy: Record<LearningPathLesson["status"], string> = {
  LOCKED: "Locked",
  AVAILABLE: "Start",
  IN_PROGRESS: "Continue",
  COMPLETED: "Review",
};

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
      const response = (
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

      setError(err instanceof Error ? err.message : "We could not load your learning path.");
    } finally {
      setLoading(false);
    }
  }, [router]);

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
      <LumiverseState
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
        <LumiverseCard className="overflow-hidden p-0">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
            <section>
              <LumiverseBadge>Learning Path</LumiverseBadge>
              <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-[var(--lumiverse-ink)] sm:text-5xl">
                {data.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--lumiverse-muted)]">
                Your path is generated from placement result {data.overallLevel}
                {" "}({Math.round(data.overallScore)}/100) and stays synced with
                real lesson progress.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                <HeroMetric icon={GraduationCap} label="Level" value={data.overallLevel} />
                <HeroMetric icon={Target} label="Progress" value={`${data.progressPercent}%`} />
                <HeroMetric icon={CheckCircle2} label="Completed" value={`${data.completedLessons}`} />
                <HeroMetric icon={BookOpen} label="Lessons" value={`${data.totalLessons}`} />
              </div>
            </section>

            <NextLessonCard
              lesson={data.currentLesson ?? data.nextLesson}
              startingLessonId={startingLessonId}
              onStart={handleStartLesson}
            />
          </div>
        </LumiverseCard>

        {error ? (
          <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
            {error}
          </p>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <LumiverseCard className="p-6">
            <LumiverseSectionHeader
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
            ) : (
              <LumiverseState
                title="No lessons in this path yet"
                description="The backend returned an empty path. Retake placement or refresh after path generation finishes."
                tone="empty"
              />
            )}
          </LumiverseCard>

          <aside className="space-y-5">
            <PhasePanel phases={data.phases} />
            <PriorityPanel priorities={data.priorities} />
            <SkillPanel skills={data.skills} />
          </aside>
        </section>

        <LumiverseCard className="p-6">
          <LumiverseSectionHeader
            eyebrow="Courses"
            title="Recommended course groups"
            description="Course cards are shown only from the learning path response."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {data.courses.map((course) => (
              <CourseSummary key={course.id} course={course} />
            ))}
          </div>
        </LumiverseCard>
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
      <LumiverseCard className="border-slate-100 bg-white/75 p-5">
        <Compass aria-hidden className="h-9 w-9 text-[var(--lumiverse-primary)]" />
        <h2 className="mt-4 text-2xl font-black text-[var(--lumiverse-ink)]">
          Path is ready
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
          There is no current lesson from the API yet. Check the timeline below.
        </p>
      </LumiverseCard>
    );
  }

  return (
    <LumiverseCard className="border-blue-100 bg-blue-50/50 p-5">
      <LumiverseBadge>Next lesson</LumiverseBadge>
      <h2 className="mt-4 text-2xl font-black text-[var(--lumiverse-ink)]">
        {lesson.title}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
        {lesson.sectionTitle}
        {lesson.duration ? ` • ${lesson.duration} min` : ""}
      </p>
      <LumiverseButton
        className="mt-6 w-full"
        loading={startingLessonId === lesson.id}
        disabled={lesson.status === "LOCKED"}
        onClick={() => onStart(lesson)}
      >
        {lesson.status === "IN_PROGRESS" ? "Continue lesson" : "Start lesson"}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </LumiverseButton>
      {lesson.status === "LOCKED" ? (
        <p className="mt-3 text-xs font-bold text-[var(--lumiverse-muted)]">
          This lesson is locked by the current path order.
        </p>
      ) : null}
    </LumiverseCard>
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
          <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-[var(--lumiverse-border)] bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-blue-50">
                {course.thumbnail ? (
                  <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
                ) : (
                  <Route className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[var(--lumiverse-primary)]" />
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--lumiverse-primary)]">
                  Stage {courseIndex + 1}
                </p>
                <h2 className="text-xl font-black text-[var(--lumiverse-ink)]">
                  {course.title}
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                  {course.reason}
                </p>
              </div>
            </div>
            <div className="min-w-[160px]">
              <div className="flex justify-between text-xs font-black text-[var(--lumiverse-muted)]">
                <span>{course.completedLessons}/{course.totalLessons}</span>
                <span>{course.progressPercent}%</span>
              </div>
              <LumiverseProgress value={course.progressPercent} className="mt-2" />
            </div>
          </div>

          {!course.available ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              This course is not linked to live lesson content yet. Its lessons
              are kept disabled because the API marks the course unavailable.
            </div>
          ) : (
            <ol className="relative ml-3 space-y-4 border-l-2 border-dashed border-blue-100 pl-6">
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
                ? "bg-slate-200 text-slate-500"
                : "bg-blue-500 text-white",
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
                ? "border-slate-200 bg-slate-50"
                : "border-blue-100 bg-white",
        ].join(" ")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--lumiverse-muted)]">
              {lesson.sectionTitle}
            </p>
            <h3 className="mt-1 font-black text-[var(--lumiverse-ink)]">
              {lesson.title}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm font-semibold text-[var(--lumiverse-muted)]">
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
            <span aria-disabled="true" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-500">
              <Lock aria-hidden className="h-4 w-4" />
              Locked
            </span>
          ) : completed ? (
            <Link href={lesson.href} className="lumiverse-button-soft text-sm">
              Review <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={loading}
              className="lumiverse-button-primary text-sm disabled:opacity-60"
            >
              {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />}
              {current ? "Continue" : "Start"}
            </button>
          )}
        </div>

        {locked ? (
          <p className="mt-3 rounded-2xl bg-white/70 p-3 text-xs font-bold leading-5 text-slate-500">
            Complete the previous available lessons to unlock this node.
          </p>
        ) : null}
      </article>
    </li>
  );
}

function PhasePanel({ phases }: { phases: LearningPathData["phases"] }) {
  return (
    <LumiverseCard className="p-5">
      <h2 className="text-lg font-black text-[var(--lumiverse-ink)]">
        Stages
      </h2>
      <div className="mt-4 space-y-3">
        {phases.map((phase) => (
          <div key={phase.id} className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/70 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--lumiverse-primary)]">
              Phase {phase.phase}
              {phase.targetLevel ? ` • ${phase.targetLevel}` : ""}
            </p>
            <h3 className="mt-2 font-black text-[var(--lumiverse-ink)]">
              {phase.title}
            </h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
              {phase.description}
            </p>
            <LumiverseProgress value={phase.progress} className="mt-4" />
          </div>
        ))}
      </div>
    </LumiverseCard>
  );
}

function PriorityPanel({ priorities }: { priorities: LearningPathData["priorities"] }) {
  return (
    <LumiverseCard className="p-5">
      <h2 className="text-lg font-black text-[var(--lumiverse-ink)]">
        Skill priorities
      </h2>
      <div className="mt-4 space-y-3">
        {priorities.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-2xl bg-blue-50/55 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--lumiverse-primary)] font-black text-white">
              {item.priority}
            </span>
            <div>
              <p className="font-black text-[var(--lumiverse-ink)]">
                {item.skill}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                {item.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </LumiverseCard>
  );
}

function SkillPanel({ skills }: { skills: LearningPathData["skills"] }) {
  return (
    <LumiverseCard className="p-5">
      <h2 className="text-lg font-black text-[var(--lumiverse-ink)]">
        Skill baseline
      </h2>
      <div className="mt-4 space-y-3">
        {skills.map((item) => (
          <div key={item.skill} className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-[var(--lumiverse-ink)]">
                {item.skill}
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {item.level ?? item.status}
              </span>
            </div>
            <LumiverseProgress value={item.score} className="mt-3" />
          </div>
        ))}
      </div>
    </LumiverseCard>
  );
}

function CourseSummary({ course }: { course: LearningPathCourse }) {
  return (
    <article className="rounded-3xl border border-[var(--lumiverse-border)] bg-white/70 p-4">
      <div className="flex gap-4">
        <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-blue-50">
          {course.thumbnail ? (
            <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
          ) : (
            <BookOpen className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[var(--lumiverse-primary)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-[var(--lumiverse-ink)]">
              {course.title}
            </h3>
            {!course.available ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">
                Not linked
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
            {course.reason}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[var(--lumiverse-muted)]">
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
    <div className="rounded-2xl border border-[var(--lumiverse-border)] bg-white/70 p-4">
      <Icon aria-hidden className="h-5 w-5 text-[var(--lumiverse-primary)]" />
      <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--lumiverse-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-[var(--lumiverse-ink)]">
        {value}
      </p>
    </div>
  );
}

function LearningPathSkeleton() {
  return (
    <main className="min-h-screen px-3 py-5">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-[360px] rounded-[28px] bg-white" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-[720px] rounded-[28px] bg-white" />
          <div className="h-[720px] rounded-[28px] bg-white" />
        </div>
      </div>
    </main>
  );
}

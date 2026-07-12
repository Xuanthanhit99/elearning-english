'use client';

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  Target,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getLearningPath,
  LearningPathData,
} from '@/src/lib/learning-path-api';

export default function LearningPathScreen() {
  const router = useRouter();
  const [data, setData] =
    useState<LearningPathData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setError('');
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

        if (
          response?.code ===
            'PLACEMENT_REQUIRED' &&
          response.nextUrl
        ) {
          router.replace(response.nextUrl);
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải lộ trình học.',
        );
      }
    })();
  }, [router]);

  if (!data) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
          <p className="mt-4 font-black text-slate-900">
            Đang tải lộ trình học...
          </p>
          {error ? (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}
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
              <p className="font-bold text-violet-600">
                Lộ trình học cá nhân hóa
              </p>
              <h1 className="mt-2 text-4xl font-black text-slate-950">
                Trình độ hiện tại: {data.overallLevel}
              </h1>
              <p className="mt-3 text-slate-600">
                Điểm tổng Placement:{' '}
                {Math.round(data.overallScore)}/100
              </p>
            </div>

            <Target className="h-16 w-16 text-violet-600" />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {data.phases.map((phase) => (
            <article
              key={phase.id}
              className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-black text-violet-700">
                Giai đoạn {phase.phase}
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {phase.title}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {phase.weeksMin}–{phase.weeksMax} tuần
              </p>

              <p className="mt-4 leading-7 text-slate-600">
                {phase.description}
              </p>

              <div className="mt-5 space-y-2">
                {phase.objectives.map((item) => (
                  <p
                    key={item}
                    className="flex gap-2 text-sm text-slate-700"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </p>
                ))}
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{
                    width: `${phase.progress}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            Khóa học đề xuất
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.recommendedCourses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  if (course.slug) {
                    router.push(
                      `/courses/${course.slug}`,
                    );
                  }
                }}
                className="flex gap-4 rounded-2xl border border-slate-100 p-4 text-left transition hover:bg-violet-50"
              >
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-violet-50">
                  {course.thumbnail ? (
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <BookOpen className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-violet-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-950">
                    {course.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {course.lessonCount ?? 0} bài học
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm font-bold text-violet-700">
                    Xem khóa học
                    <ArrowRight className="h-4 w-4" />
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

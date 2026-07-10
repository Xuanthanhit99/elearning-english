'use client';

import {
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  Clock3,
  FileText,
  Headphones,
  Loader2,
  LockKeyhole,
  Mic2,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Type,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getPlacementIntroduction,
  PlacementIntroductionData,
  PlacementStepKey,
  startPlacementTest,
} from '@/src/lib/placement-introduction-api';

const stepIcons: Record<PlacementStepKey, React.ReactNode> = {
  INTRODUCTION: <Sparkles className="h-5 w-5" />,
  VOCABULARY: <Type className="h-5 w-5" />,
  GRAMMAR: <BookOpen className="h-5 w-5" />,
  LISTENING: <Headphones className="h-5 w-5" />,
  READING: <BookOpen className="h-5 w-5" />,
  SPEAKING: <Mic2 className="h-5 w-5" />,
  WRITING: <PencilLine className="h-5 w-5" />,
  RESULT: <Trophy className="h-5 w-5" />,
};

const summaryIcons = {
  TIME: <Clock3 className="h-10 w-10 text-violet-600" />,
  QUESTIONS: <FileText className="h-10 w-10 text-blue-500" />,
  SPEAKING: <Mic2 className="h-10 w-10 text-emerald-500" />,
  WRITING: <PencilLine className="h-10 w-10 text-orange-500" />,
};

const benefitIcons = {
  ADAPTIVE: <Target className="h-7 w-7" />,
  AI: <Bot className="h-7 w-7" />,
  RETRY: <RefreshCw className="h-7 w-7" />,
  NO_RANK: <ShieldCheck className="h-7 w-7" />,
};

const skillConfig = {
  VOCABULARY: {
    label: 'Vocabulary',
    icon: <Type className="h-5 w-5 text-violet-600" />,
  },
  GRAMMAR: {
    label: 'Grammar',
    icon: <BookOpen className="h-5 w-5 text-emerald-500" />,
  },
  LISTENING: {
    label: 'Listening',
    icon: <Headphones className="h-5 w-5 text-blue-500" />,
  },
  READING: {
    label: 'Reading',
    icon: <BookOpen className="h-5 w-5 text-orange-500" />,
  },
  SPEAKING: {
    label: 'Speaking',
    icon: <Mic2 className="h-5 w-5 text-pink-500" />,
  },
  WRITING: {
    label: 'Writing',
    icon: <PencilLine className="h-5 w-5 text-cyan-500" />,
  },
};

export default function PlacementIntroduction() {
  const router = useRouter();
  const [data, setData] = useState<PlacementIntroductionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  async function loadIntroduction() {
    try {
      setLoading(true);
      setError('');
      const result = await getPlacementIntroduction();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải thông tin bài kiểm tra.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadIntroduction();
  }, []);

  async function handleStart() {
    try {
      setStarting(true);
      setError('');
      const result = await startPlacementTest();
      router.push(result.nextUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể bắt đầu bài kiểm tra.',
      );
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return <IntroductionSkeleton />;
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <p className="text-xl font-black text-slate-900">
            Không thể tải màn chuẩn bị
          </p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadIntroduction()}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_70%_10%,rgba(139,92,246,0.12),transparent_34%),linear-gradient(to_bottom,#faf9ff,#ffffff)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1460px] gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
          <h2 className="text-xl font-black text-slate-950">
            Tiến trình bài kiểm tra
          </h2>
          <div className="mt-4 h-px bg-slate-100" />

          <div className="mt-5">
            {data.content.steps.map((step, index) => {
              const active = step.key === data.test.currentStep;
              const completed = isStepCompleted(
                step.key,
                data.test.currentStep,
              );

              return (
                <div key={step.key} className="relative flex gap-4 pb-6">
                  {index !== data.content.steps.length - 1 ? (
                    <div className="absolute left-[18px] top-10 h-full w-px border-l-2 border-dashed border-slate-200" />
                  ) : null}

                  <div
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      active
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                        : completed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {completed ? <Check className="h-5 w-5" /> : step.order}
                  </div>

                  <div className="pt-0.5">
                    <div
                      className={`flex items-center gap-2 font-black ${
                        active ? 'text-violet-700' : 'text-slate-900'
                      }`}
                    >
                      {stepIcons[step.key]}
                      <span>{step.title}</span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {step.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <LegendDot className="border border-slate-300 bg-white" text="Chưa làm" />
            <LegendDot className="bg-violet-600" text="Đang làm" />
            <LegendDot className="bg-emerald-500" text="Hoàn thành" />
          </div>

          <div className="mt-8 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-violet-700">
                  Tiến trình được tự động lưu
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Bạn có thể tạm dừng và tiếp tục bất cứ lúc nào.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="overflow-hidden rounded-[30px] border border-violet-100 bg-white shadow-[0_18px_70px_rgba(76,29,149,0.08)]">
          <div className="grid items-center gap-8 px-6 pb-6 pt-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
            <div>
              <p className="text-xl font-medium text-slate-900">
                Xin chào{' '}
                <span className="font-black text-violet-600">
                  {data.user.name}!
                </span>{' '}
                👋
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                {data.content.title}
              </h1>

              <div className="mt-4 flex gap-3">
                <span className="h-1 w-9 rounded-full bg-amber-400" />
                <span className="h-1 w-12 rounded-full bg-orange-400" />
              </div>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
                {data.content.description}
              </p>

              <div className="mt-6 flex gap-4 rounded-2xl bg-violet-50 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                  <BrainCircuit className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-black text-violet-700">
                    {data.content.adaptive.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {data.content.adaptive.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[330px] overflow-hidden rounded-[34px] bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.16),transparent_52%)]" />
              <div className="absolute right-5 top-7 z-10 max-w-[190px] rounded-2xl bg-white/95 p-4 text-sm leading-6 text-slate-700 shadow-lg">
                <p>Đừng lo nhé!</p>
                <p>Đây không phải kỳ thi.</p>
                <p className="font-bold text-violet-600">
                  Poppy sẽ đồng hành cùng bạn 💜
                </p>
              </div>

              <Image
                src="/images/placement/poppy-test.png"
                alt="Poppy mascot chuẩn bị bài kiểm tra"
                fill
                priority
                className="object-contain object-bottom"
                sizes="(max-width: 1024px) 100vw, 55vw"
              />
            </div>
          </div>

          <div className="grid gap-4 px-6 pb-5 sm:grid-cols-2 xl:grid-cols-4 lg:px-10">
            {data.content.summaryCards.map((card) => (
              <article
                key={card.key}
                className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
              >
                <div className="flex justify-center">
                  {summaryIcons[card.key]}
                </div>
                <p className="mt-4 text-xl font-black text-slate-950">
                  {card.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{card.label}</p>
              </article>
            ))}
          </div>

          <div className="mx-6 grid gap-4 rounded-2xl bg-violet-50/80 p-5 sm:grid-cols-2 xl:grid-cols-4 lg:mx-10">
            {data.content.benefits.map((benefit) => (
              <div key={benefit.key} className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  {benefitIcons[benefit.key]}
                </div>
                <div>
                  <h3 className="font-black text-slate-900">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.2fr_0.5fr_0.8fr] lg:px-10">
            <div className="rounded-2xl bg-slate-50 p-5">
              <h3 className="font-black text-slate-900">
                Các kỹ năng sẽ được đánh giá
              </h3>
              <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6">
                {data.content.skills.map((skill) => (
                  <div key={skill} className="text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                      {skillConfig[skill].icon}
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-700">
                      {skillConfig[skill].label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center rounded-2xl bg-violet-50 p-5 text-center">
              <div>
                <p className="text-sm font-medium text-violet-700">
                  Thời gian dự kiến
                </p>
                <p className="mt-1 text-4xl font-black text-slate-950">
                  ~{data.content.estimatedMinutes}
                  <span className="ml-1 text-lg">phút</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              {error ? (
                <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting}
                className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-6 py-4 text-lg font-black text-white shadow-lg shadow-violet-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang chuẩn bị
                  </>
                ) : (
                  <>
                    {data.test.hasActiveSession
                      ? 'Tiếp tục bài kiểm tra'
                      : 'Bắt đầu bài kiểm tra'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <div className="mt-3 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{data.content.autosaveMessage}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function isStepCompleted(
  step: PlacementStepKey,
  current: PlacementStepKey,
): boolean {
  const order: PlacementStepKey[] = [
    'INTRODUCTION',
    'VOCABULARY',
    'GRAMMAR',
    'LISTENING',
    'READING',
    'SPEAKING',
    'WRITING',
    'RESULT',
  ];

  return order.indexOf(step) < order.indexOf(current);
}

function LegendDot({
  className,
  text,
}: {
  className: string;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3.5 w-3.5 rounded-full ${className}`} />
      {text}
    </span>
  );
}

function IntroductionSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto grid max-w-[1460px] animate-pulse gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
        <div className="h-[850px] rounded-[28px] bg-white" />
        <div className="h-[850px] rounded-[30px] bg-white" />
      </div>
    </main>
  );
}

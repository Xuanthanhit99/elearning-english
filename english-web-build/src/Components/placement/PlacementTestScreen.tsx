'use client';

import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Bot,
  Check,
  Clock3,
  Cloud,
  Flag,
  Headphones,
  Lightbulb,
  Loader2,
  Mic2,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Trophy,
  Type,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  answerPlacementQuestion,
  flagPlacementQuestion,
  getPlacementTest,
  LearningSkill,
  PlacementTestScreenData,
  skipPlacementQuestion,
} from '@/src/lib/placement-api';

const skillMeta: Record<
  LearningSkill,
  { label: string; icon: React.ReactNode; className: string }
> = {
  VOCABULARY: {
    label: 'Vocabulary',
    icon: <Type className="h-5 w-5" />,
    className: 'bg-violet-100 text-violet-700',
  },
  GRAMMAR: {
    label: 'Grammar',
    icon: <BookOpen className="h-5 w-5" />,
    className: 'bg-emerald-100 text-emerald-700',
  },
  LISTENING: {
    label: 'Listening',
    icon: <Headphones className="h-5 w-5" />,
    className: 'bg-orange-100 text-orange-700',
  },
  READING: {
    label: 'Reading',
    icon: <BookOpen className="h-5 w-5" />,
    className: 'bg-pink-100 text-pink-700',
  },
  SPEAKING: {
    label: 'Speaking',
    icon: <Mic2 className="h-5 w-5" />,
    className: 'bg-blue-100 text-blue-700',
  },
  WRITING: {
    label: 'Writing',
    icon: <PencilLine className="h-5 w-5" />,
    className: 'bg-cyan-100 text-cyan-700',
  },
};

export default function PlacementTestScreen({
  sessionId,
}: {
  sessionId: string;
}) {
  const [data, setData] = useState<PlacementTestScreenData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const questionStartedAt = useRef(Date.now());

  async function loadTest() {
    try {
      setLoading(true);
      setError('');
      const result = await getPlacementTest(sessionId);
      setData(result);
      setSelectedAnswer(result.currentQuestion.selectedAnswer);

      const startedAt = new Date(result.session.startedAt).getTime();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRemainingSeconds(
        Math.max(result.session.durationSeconds - elapsed, 0),
      );
      questionStartedAt.current = Date.now();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải phiên kiểm tra.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTest();
  }, [sessionId]);

  useEffect(() => {
    if (!data) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [data?.session.id]);

  useEffect(() => {
    if (!data) return;

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toUpperCase();
      const option = data.currentQuestion.options.find(
        (item) => item.key.toUpperCase() === key,
      );

      if (option && !saving) {
        setSelectedAnswer(option.text);
      }

      if (event.key === 'ArrowRight' && selectedAnswer && !saving) {
        void handleNext();
      }

      if (event.key.toLowerCase() === 'f' && !flagging) {
        void handleFlag();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, selectedAnswer, saving, flagging]);

  const currentSection = useMemo(() => {
    if (!data) return null;

    return data.sections.find(
      (section) => section.skill === data.currentQuestion.skill,
    );
  }, [data]);

  async function handleNext() {
    if (!data || !selectedAnswer || saving) return;

    try {
      setSaving(true);
      setError('');

      const result = await answerPlacementQuestion(sessionId, {
        questionId: data.currentQuestion.id,
        answer: selectedAnswer,
        spentSeconds: getQuestionSpentSeconds(),
      });

      setData(result);
      setSelectedAnswer(result.currentQuestion.selectedAnswer);
      questionStartedAt.current = Date.now();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể lưu câu trả lời.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (!data || saving) return;

    try {
      setSaving(true);
      setError('');

      const result = await skipPlacementQuestion(sessionId, {
        questionId: data.currentQuestion.id,
        spentSeconds: getQuestionSpentSeconds(),
      });

      setData(result);
      setSelectedAnswer(result.currentQuestion.selectedAnswer);
      questionStartedAt.current = Date.now();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể bỏ qua câu hỏi.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleFlag() {
    if (!data || flagging) return;

    try {
      setFlagging(true);
      setError('');

      const newValue = !data.currentQuestion.isFlagged;
      await flagPlacementQuestion(sessionId, {
        questionId: data.currentQuestion.id,
        isFlagged: newValue,
      });

      setData((current) =>
        current
          ? {
              ...current,
              currentQuestion: {
                ...current.currentQuestion,
                isFlagged: newValue,
              },
              questionNavigator: current.questionNavigator.map((item) =>
                item.id === current.currentQuestion.id
                  ? { ...item, flagged: newValue }
                  : item,
              ),
              autosave: {
                savedAt: new Date().toISOString(),
              },
            }
          : current,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể đánh dấu câu hỏi.',
      );
    } finally {
      setFlagging(false);
    }
  }

  function getQuestionSpentSeconds() {
    return Math.max(
      Math.floor((Date.now() - questionStartedAt.current) / 1000),
      0,
    );
  }

  if (loading) {
    return <PlacementTestSkeleton />;
  }

  if (!data) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-xl font-black text-slate-900">
            Không thể tải bài kiểm tra
          </p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadTest()}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  const meta = skillMeta[data.currentQuestion.skill];
  const sectionProgress =
    currentSection && currentSection.total > 0
      ? Math.round(
          (currentSection.answered / currentSection.total) * 100,
        )
      : 0;

  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,#faf9ff,#ffffff)] px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[300px_minmax(0,1fr)_310px]">
        <aside className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-[0_16px_50px_rgba(76,29,149,0.08)]">
          <h2 className="text-xl font-black text-slate-950">
            Tiến trình bài kiểm tra
          </h2>

          <div className="mt-6 flex items-center gap-5 border-b border-slate-100 pb-6">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[conic-gradient(#7c3aed_var(--progress),#ede9fe_0)] p-2"
              style={{ '--progress': `${data.session.progressPercent * 3.6}deg` } as React.CSSProperties}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                <span className="text-2xl font-black text-slate-950">
                  {data.session.progressPercent}%
                </span>
                <span className="text-xs text-violet-600">Hoàn thành</span>
              </div>
            </div>

            <div>
              <p className="font-black text-slate-900">
                Câu {data.currentQuestion.globalOrder} /{' '}
                {data.session.totalQuestions}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Clock3 className="h-4 w-4" />
                Khoảng 10 phút
              </p>
            </div>
          </div>

          <h3 className="mt-5 font-black text-slate-900">Các phần thi</h3>

          <div className="mt-3 space-y-2">
            {data.sections.map((section) => {
              const sectionMeta = skillMeta[section.skill];
              const active =
                section.skill === data.currentQuestion.skill;

              return (
                <div
                  key={section.skill}
                  className={`flex items-center justify-between rounded-2xl px-3 py-3 ${
                    active ? 'bg-violet-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${sectionMeta.className}`}
                    >
                      {sectionMeta.icon}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {sectionMeta.label}
                      </p>
                      {active ? (
                        <p className="text-xs font-semibold text-violet-600">
                          Đang làm
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <span className="text-sm text-slate-500">
                    {section.total > 1
                      ? `${section.answered} / ${section.total}`
                      : section.status === 'COMPLETED'
                        ? 'Đã xong'
                        : 'Chưa bắt đầu'}
                  </span>
                </div>
              );
            })}

            <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Trophy className="h-5 w-5" />
              </div>
              <p className="font-bold text-slate-900">Kết quả</p>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="font-black text-slate-900">Trạng thái</h3>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <LegendDot className="bg-slate-200" text="Chưa làm" />
              <LegendDot className="bg-violet-600" text="Đang làm" />
              <LegendDot className="bg-emerald-500" text="Đã làm" />
              <LegendDot className="bg-amber-400" text="Đánh dấu" />
            </div>
          </div>

          <div className="mt-8 flex items-end gap-2 rounded-2xl bg-violet-50 p-3">
            <div className="relative h-28 w-24 shrink-0">
              <Image
                src="/images/placement/poppy-cheer.png"
                alt="Poppy cổ vũ"
                fill
                className="object-contain object-bottom"
              />
            </div>
            <div className="pb-3">
              <p className="font-black text-violet-700">Tuyệt vời!</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Bạn đang làm rất tốt. Cố lên nhé 💜
              </p>
            </div>
          </div>
        </aside>

        <section className="overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-[0_16px_60px_rgba(76,29,149,0.08)]">
          <header className="border-b border-slate-100 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.className}`}
                >
                  {meta.icon}
                </div>
                <div>
                  <p className="font-black uppercase text-violet-700">
                    Phần {SKILL_INDEX[data.currentQuestion.skill]}:{' '}
                    {meta.label}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
                <Bot className="h-4 w-4" />
                Adaptive
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-300"
                  style={{ width: `${sectionProgress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-700">
                {data.currentQuestion.sectionOrder} /{' '}
                {data.currentQuestion.sectionTotal}
              </span>
            </div>
          </header>

          <div className="border-b border-violet-100 bg-violet-50/60 px-6 py-4">
            <div className="flex items-center gap-3 text-sm text-violet-800">
              <Bot className="h-5 w-5 shrink-0" />
              <span>
                <strong>AI gợi ý:</strong>{' '}
                {data.currentQuestion.adaptiveMessage}
              </span>
              <Sparkles className="ml-auto h-5 w-5 text-amber-400" />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <span className="rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
                Câu hỏi {data.currentQuestion.globalOrder}
              </span>

              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                {data.currentQuestion.level}
              </span>
            </div>

            {data.currentQuestion.passage ? (
              <div className="mb-5 rounded-2xl bg-slate-50 p-5 leading-7 text-slate-700">
                {data.currentQuestion.passage}
              </div>
            ) : null}

            <h1 className="max-w-3xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              {data.currentQuestion.prompt}
            </h1>

            <div className="mt-7 space-y-3">
              {data.currentQuestion.options.map((option) => {
                const active = selectedAnswer === option.text;

                return (
                  <button
                    type="button"
                    key={option.key}
                    disabled={saving}
                    onClick={() => setSelectedAnswer(option.text)}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-400'
                        : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        active
                          ? 'border-violet-600 bg-violet-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {active ? <Check className="h-4 w-4" /> : null}
                    </span>

                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                        active
                          ? 'bg-violet-600 text-white'
                          : 'bg-violet-50 text-slate-900'
                      }`}
                    >
                      {option.key}
                    </span>

                    <span>
                      <span className="block text-lg font-bold text-slate-900">
                        {option.text}
                      </span>
                      {option.translation ? (
                        <span className="mt-1 block text-sm text-slate-500">
                          {option.translation}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {error ? (
              <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}
          </div>

          <footer className="border-t border-slate-100 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-400"
              >
                <ArrowLeft className="h-5 w-5" />
                Câu trước
              </button>

              <span className="text-sm font-bold text-slate-500">
                {data.currentQuestion.globalOrder} /{' '}
                {data.session.totalQuestions}
              </span>

              <button
                type="button"
                onClick={() => void handleNext()}
                disabled={!selectedAnswer || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-7 py-3 font-black text-white shadow-lg shadow-violet-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang lưu
                  </>
                ) : (
                  <>
                    Câu tiếp theo
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-emerald-700">
                <Check className="h-4 w-4" />
                Đã lưu lúc{' '}
                {new Date(data.autosave.savedAt).toLocaleTimeString('vi-VN')}
              </span>
              <span className="inline-flex items-center gap-2 text-slate-600">
                <Cloud className="h-4 w-4" />
                Tiến trình được tự động lưu
              </span>
            </div>
          </footer>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-[0_16px_50px_rgba(76,29,149,0.07)]">
            <div className="flex items-center gap-3">
              <Clock3 className="h-6 w-6 text-violet-600" />
              <div>
                <p className="text-sm text-slate-500">Thời gian còn lại</p>
                <p
                  className={`text-3xl font-black ${
                    remainingSeconds <= 30
                      ? 'text-red-600'
                      : remainingSeconds <= 120
                        ? 'text-orange-500'
                        : 'text-slate-950'
                  }`}
                >
                  {formatTime(remainingSeconds)}
                </p>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{
                  width: `${Math.max(
                    (remainingSeconds / data.session.durationSeconds) * 100,
                    0,
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-[0_16px_50px_rgba(76,29,149,0.07)]">
            <h2 className="text-xl font-black text-slate-950">
              Danh sách câu hỏi
            </h2>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
              <LegendDot className="bg-slate-200" text="Chưa làm" />
              <LegendDot className="bg-violet-600" text="Đang làm" />
              <LegendDot className="bg-emerald-500" text="Đã làm" />
              <LegendDot className="bg-amber-400" text="Đánh dấu" />
            </div>

            <div className="mt-5 grid grid-cols-5 gap-3">
              {data.questionNavigator.map((item) => (
                <div key={item.id} className="relative">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black ${
                      item.active
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : item.answered
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : item.skipped
                            ? 'border-orange-300 bg-orange-50 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {item.order}
                  </span>

                  {item.flagged ? (
                    <Flag className="absolute -right-1 -top-1 h-4 w-4 fill-amber-400 text-amber-400" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-[0_16px_50px_rgba(76,29,149,0.07)]">
            <h2 className="text-lg font-black text-slate-950">Công cụ</h2>

            <button
              type="button"
              onClick={() => void handleFlag()}
              disabled={flagging}
              className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-violet-50"
            >
              <Bookmark
                className={`h-5 w-5 ${
                  data.currentQuestion.isFlagged
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-violet-600'
                }`}
              />
              <span>
                <span className="block font-bold text-slate-900">
                  {data.currentQuestion.isFlagged
                    ? 'Bỏ đánh dấu'
                    : 'Đánh dấu câu hỏi'}
                </span>
                <span className="text-sm text-slate-500">
                  Lưu câu hỏi để xem lại
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleSkip()}
              disabled={saving}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-violet-50"
            >
              <SkipForward className="h-5 w-5 text-violet-600" />
              <span>
                <span className="block font-bold text-slate-900">
                  Bỏ qua câu hỏi
                </span>
                <span className="text-sm text-slate-500">
                  Có thể quay lại sau
                </span>
              </span>
            </button>
          </div>

          <div className="rounded-2xl bg-violet-50 p-4">
            <div className="flex gap-3">
              <Lightbulb className="h-6 w-6 shrink-0 text-amber-500" />
              <div>
                <p className="font-black text-violet-700">Mẹo nhỏ</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Dùng phím A–D để chọn đáp án, phím F để đánh dấu và mũi tên
                  phải để chuyển câu.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

const SKILL_INDEX: Record<LearningSkill, number> = {
  VOCABULARY: 1,
  GRAMMAR: 2,
  LISTENING: 3,
  READING: 4,
  SPEAKING: 5,
  WRITING: 6,
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
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
      <span className={`h-3 w-3 rounded-full ${className}`} />
      {text}
    </span>
  );
}

function PlacementTestSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto grid max-w-[1500px] animate-pulse gap-5 xl:grid-cols-[300px_minmax(0,1fr)_310px]">
        <div className="h-[900px] rounded-[28px] bg-white" />
        <div className="h-[900px] rounded-[28px] bg-white" />
        <div className="h-[700px] rounded-[28px] bg-white" />
      </div>
    </main>
  );
}

'use client';

import {
  CheckCircle2,
  FileText,
  LoaderCircle,
  PenLine,
  Sparkles,
  WandSparkles,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getWritingProcessingStatus } from '@/src/lib/writing-processing-api';
import type { WritingProcessingStatus } from '@/src/lib/writing-processing.types';

const meta = {
  SUBMITTED: { icon: FileText, title: 'Đã nhận bài viết' },
  AI_EVALUATION: { icon: Sparkles, title: 'Gemini đang chấm bài' },
  SAVING_RESULT: { icon: WandSparkles, title: 'Đang lưu kết quả' },
  UPDATING_MISSIONS: { icon: CheckCircle2, title: 'Đang cập nhật tiến độ' },
  COMPLETED: { icon: CheckCircle2, title: 'Hoàn thành' },
  FAILED: { icon: XCircle, title: 'Chấm bài thất bại' },
} as const;

export default function WritingProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);
  const [status, setStatus] = useState<WritingProcessingStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function poll() {
      try {
        const result = await getWritingProcessingStatus(sessionId);
        if (cancelled) return;

        setStatus(result);
        setError('');

        if (result.status === 'COMPLETED') {
          window.setTimeout(
            () =>
              router.replace(
                result.resultUrl ?? `/writing/sessions/${sessionId}/result`,
              ),
            700,
          );
          return;
        }

        if (result.status !== 'FAILED') {
          timer = window.setTimeout(poll, 1800);
        }
      } catch (err) {
        if (cancelled) return;
        setError(errorText(err, 'Không tải được trạng thái chấm bài.'));
        timer = window.setTimeout(poll, 3000);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [router, sessionId]);

  const current = useMemo(
    () => meta[(status?.step as keyof typeof meta) ?? 'SUBMITTED'] ?? meta.SUBMITTED,
    [status],
  );
  const Icon = current.icon;
  const progress = Math.min(Math.max(status?.progress ?? 8, 0), 100);

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-8">
      <section className="w-full max-w-2xl rounded-[32px] border border-violet-100 bg-white p-6 text-center shadow-xl shadow-violet-100 sm:p-10">
        <div
          className={`mx-auto grid h-24 w-24 place-items-center rounded-full ${
            status?.status === 'FAILED'
              ? 'bg-red-100 text-red-600'
              : status?.status === 'COMPLETED'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-violet-100 text-violet-600'
          }`}
        >
          {!status || status.status === 'QUEUED' || status.status === 'PROCESSING' ? (
            <LoaderCircle size={44} className="animate-spin" />
          ) : (
            <Icon size={44} />
          )}
        </div>

        <p className="mt-7 text-sm font-black uppercase tracking-[0.2em] text-violet-500">
          Writing AI Coach
        </p>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">
          {current.title}
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-slate-500">
          {status?.message ??
            'Hệ thống đang chuẩn bị chấm bài viết của bạn bằng Gemini.'}
        </p>

        <div className="mt-8 h-4 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-sm font-black">
          <span className="text-slate-400">{status?.step ?? 'SUBMITTED'}</span>
          <span className="text-violet-600">{progress}%</span>
        </div>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-4">
          {['Submit', 'Gemini', 'Result', 'Progress'].map((label, index) => {
            const done = progress >= [10, 35, 70, 85][index];
            return (
              <div
                key={label}
                className={`rounded-2xl border p-4 ${
                  done
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 size={17} className="text-emerald-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                  )}
                  <span className="text-sm font-black">{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {(error || status?.status === 'FAILED') && (
          <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-left text-red-700">
            <p className="font-black">Không thể chấm bài viết</p>
            <p className="mt-2 text-sm">
              {status?.errorMessage || error || 'Vui lòng thử nộp lại bài viết.'}
            </p>
            <button
              onClick={() => router.replace(`/writing/sessions/${sessionId}`)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-black text-white"
            >
              <PenLine size={18} />
              Quay lại bài viết
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function errorText(error: unknown, fallback: string) {
  const value = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = value.response?.data?.message;
  return Array.isArray(message)
    ? message.join(', ')
    : message ?? value.message ?? fallback;
}

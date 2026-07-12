'use client';

import {
  FileText,
  Lightbulb,
  Loader2,
  Save,
  Send,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { submitPlacementWriting } from '@/src/lib/placement-special-response-api';

type Props = {
  sessionId: string;
  questionId: string;
  prompt: string;
  level: string;
  minWords?: number;
  maxWords?: number;
  onSubmitted: () => Promise<void> | void;
};

export default function PlacementWritingQuestion({
  sessionId,
  questionId,
  prompt,
  level,
  minWords = 80,
  maxWords = 120,
  onSubmitted,
}: Props) {
  const storageKey = `placement-writing:${sessionId}:${questionId}`;
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    const draft = window.localStorage.getItem(storageKey);

    if (draft) {
      setContent(draft);
    }
  }, [storageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, content);
      setSavedAt(new Date());
    }, 500);

    return () => window.clearTimeout(timer);
  }, [content, storageKey]);

  const wordCount = useMemo(
    () =>
      content
        .trim()
        .split(/\s+/)
        .filter(Boolean).length,
    [content],
  );

  const canSubmit =
    wordCount >= minWords &&
    wordCount <= maxWords &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError('');

      await submitPlacementWriting(sessionId, {
        questionId,
        content: content.trim(),
        spentSeconds: Math.floor(
          (Date.now() - startedAtRef.current) / 1000,
        ),
      });

      window.localStorage.removeItem(storageKey);
      await onSubmitted();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể gửi bài viết.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700">
          Writing · {level}
        </span>

        <span className="text-sm font-medium text-slate-500">
          Yêu cầu: {minWords}–{maxWords} từ
        </span>
      </div>

      <h1 className="mt-6 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
        {prompt}
      </h1>

      <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
        <div className="flex gap-3">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm leading-6 text-slate-600">
            Viết thành một đoạn hoàn chỉnh, có câu mở đầu, nội dung chính và
            câu kết. Hãy ưu tiên diễn đạt tự nhiên thay vì dùng từ quá khó.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <FileText className="h-5 w-5 text-violet-600" />
            Bài viết của bạn
          </div>

          <div
            className={`text-sm font-bold ${
              wordCount > maxWords
                ? 'text-red-600'
                : wordCount >= minWords
                  ? 'text-emerald-600'
                  : 'text-slate-500'
            }`}
          >
            {wordCount} / {maxWords} từ
          </div>
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Bắt đầu viết tại đây..."
          className="min-h-[340px] w-full resize-y border-0 p-5 text-base leading-8 text-slate-800 outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm">
          <span className="inline-flex items-center gap-2 text-slate-500">
            <Save className="h-4 w-4 text-emerald-500" />
            {savedAt
              ? `Đã lưu nháp lúc ${savedAt.toLocaleTimeString('vi-VN')}`
              : 'Bản nháp sẽ tự động lưu trên thiết bị'}
          </span>

          {wordCount < minWords ? (
            <span className="text-orange-600">
              Cần thêm {minWords - wordCount} từ
            </span>
          ) : null}

          {wordCount > maxWords ? (
            <span className="text-red-600">
              Vượt quá {wordCount - maxWords} từ
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-7 py-3.5 font-black text-white shadow-lg shadow-violet-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang gửi
            </>
          ) : (
            <>
              Gửi bài viết
              <Send className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

"use client";

import { FileText, Lightbulb, Loader2, Save, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { submitPlacementWriting } from "@/src/lib/placement-special-response-api";

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
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const startedAtRef = useRef(0);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [questionId]);

  useEffect(() => {
    const draft = window.localStorage.getItem(storageKey);
    if (draft) window.queueMicrotask(() => setContent(draft));
  }, [storageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, content);
      setSavedAt(new Date());
    }, 500);
    return () => window.clearTimeout(timer);
  }, [content, storageKey]);

  const wordCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content],
  );

  const canSubmit = wordCount >= minWords && wordCount <= maxWords && !submitting;
  const tooShort = wordCount < minWords;
  const tooLong = wordCount > maxWords;

  async function handleSubmit() {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError("");
      await submitPlacementWriting(sessionId, {
        questionId,
        content: content.trim(),
        spentSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
      });
      window.localStorage.removeItem(storageKey);
      await onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Writing submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-700">
          Writing • {level}
        </span>
        <span className="text-sm font-bold text-slate-500">
          {minWords}-{maxWords} words
        </span>
      </div>

      <h1 className="mt-6 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
        {prompt}
      </h1>

      <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/65 p-4">
        <div className="flex gap-3">
          <Lightbulb aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Write a complete response with a clear opening, supporting details,
            and a short conclusion. Your draft is saved locally for this
            question only and removed after successful submission.
          </p>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
          <label htmlFor="placement-writing-editor" className="flex items-center gap-2 font-black text-slate-700">
            <FileText aria-hidden className="h-5 w-5 text-violet-600" />
            Your response
          </label>
          <span
            className={[
              "rounded-full px-3 py-1 text-sm font-black",
              tooLong
                ? "bg-rose-50 text-rose-600"
                : tooShort
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
            aria-live="polite"
          >
            {wordCount}/{maxWords} words
          </span>
        </div>

        <textarea
          id="placement-writing-editor"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={submitting}
          placeholder="Start writing here..."
          className="min-h-[340px] w-full resize-y border-0 p-5 text-base font-medium leading-8 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-slate-500" aria-live="polite">
            <Save aria-hidden className="h-4 w-4 text-emerald-500" />
            {savedAt
              ? `Draft saved at ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Draft saves on this device"}
          </span>

          {tooShort ? (
            <span className="font-bold text-amber-700">
              Add {minWords - wordCount} more word{minWords - wordCount === 1 ? "" : "s"}
            </span>
          ) : null}

          {tooLong ? (
            <span className="font-bold text-rose-600">
              Remove {wordCount - maxWords} word{wordCount - maxWords === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-violet-600 px-7 py-3.5 font-black text-white shadow-[0_14px_34px_rgba(124,58,237,0.24)] transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Send aria-hidden className="h-5 w-5" />}
          Submit writing
        </button>
      </div>
    </div>
  );
}

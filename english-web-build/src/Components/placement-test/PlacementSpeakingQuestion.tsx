"use client";

import {
  CalendarClock,
  CircleStop,
  Loader2,
  Mic2,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  skipPlacementSpeaking,
  submitPlacementSpeaking,
} from "@/src/lib/placement-special-response-api";

type SkipAction = "SKIPPED" | "DEFERRED";

type Props = {
  sessionId: string;
  questionId: string;
  prompt: string;
  level: string;
  onSubmitted: () => Promise<void> | void;
};

export default function PlacementSpeakingQuestion({
  sessionId,
  questionId,
  prompt,
  level,
  onSubmitted,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skipAction, setSkipAction] = useState<SkipAction | null>(null);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [questionId]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setRecordSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  async function startRecording() {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support microphone recording. Use a recent Chrome or Edge browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startedAtRef.current = Date.now();
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setRecordedBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      setRecordedBlob(null);
      setRecordSeconds(0);
      setRecording(true);
      recorder.start(250);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone access failed.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setRecording(false);
  }

  function resetRecording() {
    if (recording) stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setRecordedBlob(null);
    setAudioUrl("");
    setRecordSeconds(0);
    setPlaying(false);
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (audio.paused) {
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  async function handleSubmit() {
    if (!recordedBlob || submitting) return;

    try {
      setSubmitting(true);
      setError("");
      await submitPlacementSpeaking(sessionId, {
        questionId,
        audio: recordedBlob,
        spentSeconds: getSpentSeconds(),
      });
      await onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speaking upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmSkip() {
    if (!skipAction || submitting) return;

    try {
      setSubmitting(true);
      setError("");
      if (recording) stopRecording();
      await skipPlacementSpeaking(sessionId, {
        questionId,
        action: skipAction,
        spentSeconds: getSpentSeconds(),
      });
      setSkipAction(null);
      await onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speaking status could not be updated.");
    } finally {
      setSubmitting(false);
    }
  }

  function getSpentSeconds() {
    return Math.max(Math.floor((Date.now() - startedAtRef.current) / 1000), 0);
  }

  return (
    <>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
            Speaking • {level}
          </span>
          <span className="text-sm font-bold text-slate-500">
            Recommended answer: 30-60 seconds
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
          {prompt}
        </h1>

        <section className="mt-7 rounded-3xl border border-blue-100 bg-blue-50/55 p-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
            <Mic2 aria-hidden className={`h-12 w-12 ${recording ? "animate-pulse text-rose-500" : "text-blue-600"}`} />
          </div>

          <p className="mt-5 text-4xl font-black tabular-nums text-slate-950">
            {formatTime(recordSeconds)}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600" aria-live="polite">
            {recording
              ? "Recording. Speak clearly and naturally."
              : recordedBlob
                ? "Recording ready. Listen back before submitting."
                : "Record now, skip, or defer Speaking through the existing backend flow."}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!recording && !recordedBlob ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={submitting}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
              >
                <Mic2 aria-hidden className="h-5 w-5" />
                Start recording
              </button>
            ) : null}

            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 font-black text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <CircleStop aria-hidden className="h-5 w-5" />
                Stop
              </button>
            ) : null}

            {recordedBlob ? (
              <>
                <button
                  type="button"
                  onClick={() => void togglePlayback()}
                  disabled={submitting}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-3 font-black text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
                >
                  {playing ? <Pause aria-hidden className="h-5 w-5" /> : <Play aria-hidden className="h-5 w-5" />}
                  {playing ? "Pause" : "Listen back"}
                </button>
                <button
                  type="button"
                  onClick={resetRecording}
                  disabled={submitting}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                >
                  <RotateCcw aria-hidden className="h-5 w-5" />
                  Record again
                </button>
              </>
            ) : null}
          </div>

          {audioUrl ? (
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
          ) : null}
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <SkipCard
            icon={SkipForward}
            title="Skip and continue"
            description="Use the existing skip endpoint. Speaking is not included in the overall score."
            disabled={submitting}
            onClick={() => setSkipAction("SKIPPED")}
          />
          <SkipCard
            icon={CalendarClock}
            title="Assess Speaking later"
            description="Use the existing deferred endpoint and continue this placement session."
            disabled={submitting}
            onClick={() => setSkipAction("DEFERRED")}
          />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
          <Volume2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
          This indicator is not an audio waveform. It only shows recording state.
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        {recordedBlob ? (
          <div className="mt-7 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-violet-600 px-7 py-3.5 font-black text-white shadow-[0_14px_34px_rgba(124,58,237,0.24)] transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-60"
            >
              {submitting ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Send aria-hidden className="h-5 w-5" />}
              Submit speaking
            </button>
          </div>
        ) : null}
      </div>

      {skipAction ? (
        <SkipDialog
          action={skipAction}
          loading={submitting}
          onClose={() => setSkipAction(null)}
          onConfirm={() => void confirmSkip()}
        />
      ) : null}
    </>
  );
}

function SkipCard({
  icon: Icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: typeof SkipForward;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-violet-200 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-60"
    >
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
      <span>
        <span className="block font-black text-slate-900">{title}</span>
        <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}

function SkipDialog({
  action,
  loading,
  onClose,
  onConfirm,
}: {
  action: SkipAction;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const deferred = action === "DEFERRED";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="speaking-skip-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !loading) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="speaking-skip-title" className="text-2xl font-black text-slate-950">
              {deferred ? "Assess Speaking later?" : "Skip Speaking?"}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              {deferred
                ? "The session will continue and Speaking will be marked as pending by the existing API."
                : "Speaking will be marked as not evaluated through the existing skip endpoint."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X aria-hidden className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : null}
            {deferred ? "Defer Speaking" : "Skip Speaking"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

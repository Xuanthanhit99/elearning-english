'use client';

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
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  skipPlacementSpeaking,
  submitPlacementSpeaking,
} from '@/src/lib/placement-special-response-api';

type SkipAction = 'SKIPPED' | 'DEFERRED';

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
  const [audioUrl, setAudioUrl] = useState('');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skipAction, setSkipAction] = useState<SkipAction | null>(null);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
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
      setError('');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Trình duyệt không hỗ trợ ghi âm. Hãy dùng Chrome hoặc Edge mới nhất.',
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported(
        'audio/webm;codecs=opus',
      )
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        const nextAudioUrl = URL.createObjectURL(blob);

        setRecordedBlob(blob);
        setAudioUrl(nextAudioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      setRecordedBlob(null);
      setRecordSeconds(0);
      setRecording(true);
      recorder.start(250);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể truy cập micro.',
      );
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    setRecording(false);
  }

  function resetRecording() {
    if (recording) {
      stopRecording();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setRecordedBlob(null);
    setAudioUrl('');
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
      setError('');

      await submitPlacementSpeaking(sessionId, {
        questionId,
        audio: recordedBlob,
        spentSeconds: getSpentSeconds(),
      });

      await onSubmitted();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể gửi bài nói.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmSkip() {
    if (!skipAction || submitting) return;

    try {
      setSubmitting(true);
      setError('');

      if (recording) {
        stopRecording();
      }

      await skipPlacementSpeaking(sessionId, {
        questionId,
        action: skipAction,
        spentSeconds: getSpentSeconds(),
      });

      setSkipAction(null);
      await onSubmitted();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật phần Speaking.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getSpentSeconds() {
    return Math.max(
      Math.floor((Date.now() - startedAtRef.current) / 1000),
      0,
    );
  }

  return (
    <>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            Speaking · {level}
          </span>

          <span className="text-sm font-medium text-slate-500">
            Gợi ý: nói từ 30–60 giây
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
          {prompt}
        </h1>

        <div className="mt-7 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50 p-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg">
            <Mic2
              className={`h-12 w-12 ${
                recording
                  ? 'animate-pulse text-red-500'
                  : 'text-blue-600'
              }`}
            />
          </div>

          <p className="mt-5 text-4xl font-black tabular-nums text-slate-950">
            {formatTime(recordSeconds)}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {recording
              ? 'Đang ghi âm... Hãy nói rõ ràng và tự nhiên.'
              : recordedBlob
                ? 'Đã ghi xong. Bạn có thể nghe lại trước khi gửi.'
                : 'Bạn có thể làm ngay, bỏ qua hoặc đánh giá Speaking sau.'}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!recording && !recordedBlob ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Mic2 className="h-5 w-5" />
                Làm Speaking ngay
              </button>
            ) : null}

            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-black text-white transition hover:bg-red-700"
              >
                <CircleStop className="h-5 w-5" />
                Dừng ghi âm
              </button>
            ) : null}

            {recordedBlob ? (
              <>
                <button
                  type="button"
                  onClick={() => void togglePlayback()}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                >
                  {playing ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  {playing ? 'Tạm dừng' : 'Nghe lại'}
                </button>

                <button
                  type="button"
                  onClick={resetRecording}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RotateCcw className="h-5 w-5" />
                  Ghi lại
                </button>
              </>
            ) : null}
          </div>

          {audioUrl ? (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSkipAction('SKIPPED')}
            disabled={submitting}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-orange-200 hover:bg-orange-50 disabled:opacity-50"
          >
            <SkipForward className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            <span>
              <span className="block font-black text-slate-900">
                Bỏ qua và tiếp tục
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-500">
                Speaking được lưu điểm kỹ thuật 0 nhưng không kéo giảm điểm
                tổng.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSkipAction('DEFERRED')}
            disabled={submitting}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-violet-200 hover:bg-violet-50 disabled:opacity-50"
          >
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
            <span>
              <span className="block font-black text-slate-900">
                Đánh giá Speaking sau
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-500">
                Hoàn thành bài test trước và giữ một đánh giá Speaking đang chờ.
              </span>
            </span>
          </button>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <Volume2 className="mt-0.5 h-5 w-5 shrink-0" />
          Khi bỏ qua, màn kết quả nên hiển thị “Chưa đánh giá” thay vì xem
          Speaking là trình độ thấp.
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}

        {recordedBlob ? (
          <div className="mt-7 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-7 py-3.5 font-black text-white shadow-lg shadow-violet-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang tải lên
                </>
              ) : (
                <>
                  Gửi bài nói
                  <Send className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {skipAction ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !submitting) {
              setSkipAction(null);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {skipAction === 'DEFERRED'
                    ? 'Đánh giá Speaking sau?'
                    : 'Bỏ qua phần Speaking?'}
                </h2>

                <p className="mt-3 leading-7 text-slate-600">
                  {skipAction === 'DEFERRED'
                    ? 'Bạn sẽ tiếp tục bài test. Speaking được đánh dấu đang chờ và có thể làm lại riêng sau.'
                    : 'Speaking sẽ được đánh dấu chưa đánh giá. Điểm kỹ thuật là 0 nhưng không được đưa vào phép tính điểm tổng.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSkipAction(null)}
                disabled={submitting}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-violet-50 p-4 text-sm leading-6 text-violet-800">
              Lộ trình Speaking tạm thời nên dùng trình độ tổng thể và khuyến
              nghị người dùng hoàn thành đánh giá sau.
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSkipAction(null)}
                disabled={submitting}
                className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Quay lại
              </button>

              <button
                type="button"
                onClick={() => void confirmSkip()}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-black text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang lưu
                  </>
                ) : skipAction === 'DEFERRED' ? (
                  <>
                    <CalendarClock className="h-5 w-5" />
                    Đánh giá sau
                  </>
                ) : (
                  <>
                    <SkipForward className="h-5 w-5" />
                    Bỏ qua và tiếp tục
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`;
}

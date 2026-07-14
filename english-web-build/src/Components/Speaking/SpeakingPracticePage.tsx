'use client';

import { AlertCircle, CheckCircle2, ChevronLeft, Mic, Pause, Play, RotateCcw, Square, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSpeakingPractice, uploadSpeakingAudio } from '@/src/lib/speaking-processing-api';
import type { SpeakingPracticeDetail } from '@/src/lib/speaking-processing.types';

type RecorderState = 'IDLE' | 'RECORDING' | 'PAUSED' | 'READY' | 'UPLOADING';

export default function SpeakingPracticePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = String(params.sessionId);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const [data, setData] = useState<SpeakingPracticeDetail | null>(null);
  const [state, setState] = useState<RecorderState>('IDLE');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getSpeakingPractice(sessionId)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(errorText(err, 'Không tải được bài luyện nói.')))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
      releaseRecorder();
    };
  }, [sessionId]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const formattedTime = useMemo(() => formatTime(elapsedSeconds), [elapsedSeconds]);

  async function startRecording() {
    try {
      setError('');
      releaseRecorder();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioBlob(null);
      setAudioUrl(null);
      setElapsedSeconds(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const mimeType = resolveMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState('READY');
        stopTimer();
        stopStream();
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      setState('RECORDING');
      startTimer();
    } catch (err) {
      setError(microphoneError(err));
      releaseRecorder();
    }
  }

  function pauseRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.pause();
      setState('PAUSED');
      stopTimer();
    }
  }

  function resumeRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'paused') {
      recorder.resume();
      startedAtRef.current = Date.now() - elapsedSeconds * 1000;
      setState('RECORDING');
      startTimer();
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }

  async function submitRecording() {
    if (!data || !audioBlob || state !== 'READY') return;

    try {
      setState('UPLOADING');
      setError('');
      await uploadSpeakingAudio({
        sessionId,
        audioBlob,
        question: data.lesson.prompt || data.lesson.title,
        expectedText: data.lesson.expectedText ?? undefined,
        duration: Math.max(elapsedSeconds, 1),
      });
      router.replace(`/speaking/sessions/${sessionId}/processing`);
    } catch (err) {
      setState('READY');
      setError(errorText(err, 'Không thể tải bản ghi âm lên.'));
    }
  }

  function releaseRecorder() {
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    stopStream();
    mediaRecorderRef.current = null;
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function startTimer() {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      if (!startedAtRef.current) return;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    }, 250);
  }

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  if (loading) return <PageState text="Đang tải bài luyện nói..." />;
  if (!data) return <PageState text={error || 'Không có dữ liệu bài học.'} />;

  return (
    <main className="min-h-screen bg-[#fbfbff] px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-[1350px]">
        <header className="flex flex-col gap-4 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 font-black text-violet-600">
            <ChevronLeft size={18} /> Quay lại
          </button>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400">{data.topic?.title ?? 'Speaking'}</p>
            <h1 className="text-xl font-black">{data.lesson.title}</h1>
          </div>
        </header>

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <article className="rounded-3xl border border-violet-100 bg-white p-7 shadow-sm">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700">{data.lesson.type.replaceAll('_', ' ')}</span>
                <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">{data.lesson.level}</span>
                <span className="rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-orange-700">{data.lesson.estimatedMinutes} phút</span>
              </div>
              <h2 className="mt-6 text-3xl font-black">{data.lesson.prompt}</h2>
              {data.lesson.expectedText && (
                <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-violet-500">Câu mẫu</p>
                  <p className="mt-3 text-lg font-bold leading-8 text-violet-900">{data.lesson.expectedText}</p>
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-violet-100 bg-white p-7 text-center shadow-sm">
              <div className={`mx-auto grid h-32 w-32 place-items-center rounded-full ${state === 'RECORDING' ? 'animate-pulse bg-red-100 text-red-600' : state === 'PAUSED' ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'}`}>
                <Mic size={52} />
              </div>
              <p className="mt-5 text-4xl font-black">{formattedTime}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{statusText(state)}</p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                {state === 'IDLE' && <Action onClick={startRecording} icon={<Mic size={18} />} label="Bắt đầu ghi âm" primary />}
                {state === 'RECORDING' && <>
                  <Action onClick={pauseRecording} icon={<Pause size={18} />} label="Tạm dừng" />
                  <Action onClick={stopRecording} icon={<Square size={18} />} label="Dừng" danger />
                </>}
                {state === 'PAUSED' && <>
                  <Action onClick={resumeRecording} icon={<Play size={18} />} label="Tiếp tục" primary />
                  <Action onClick={stopRecording} icon={<Square size={18} />} label="Dừng" danger />
                </>}
                {state === 'READY' && <>
                  <Action onClick={startRecording} icon={<RotateCcw size={18} />} label="Ghi lại" />
                  <Action onClick={submitRecording} icon={<Upload size={18} />} label="Gửi cho AI" primary />
                </>}
                {state === 'UPLOADING' && <Action disabled icon={<Upload size={18} />} label="Đang tải lên..." primary />}
              </div>

              {audioUrl && <audio controls src={audioUrl} className="mx-auto mt-7 w-full max-w-xl" />}
            </article>

            {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"><AlertCircle className="mt-0.5 shrink-0" /><p className="font-bold">{error}</p></div>}
          </section>

          <aside className="space-y-5">
            <SideCard title="Quy trình">
              <div className="space-y-4">{(data.steps ?? defaultSteps).map((step) => <div key={step.order} className="flex gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-black text-violet-700">{step.order}</div><div><p className="font-black">{step.title}</p><p className="mt-1 text-sm text-slate-500">{step.description}</p></div></div>)}</div>
            </SideCard>
            <SideCard title="Kỹ năng trọng tâm">
              <div className="space-y-4">{(data.focusSkills ?? []).map((item) => <div key={item.title} className="flex items-center gap-3"><span className="text-2xl">{item.icon}</span><div><p className="font-black">{item.title}</p><p className="text-sm text-slate-500">{item.description}</p></div></div>)}</div>
            </SideCard>
            <SideCard title="Mẹo ghi âm">
              <div className="space-y-4">{(data.tips ?? []).map((item) => <div key={item.title} className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /><div><p className="font-black">{item.title}</p><p className="text-sm text-slate-500">{item.description}</p></div></div>)}</div>
            </SideCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

const defaultSteps = [
  { order: 1, title: 'Đọc và ghi âm', description: 'Nói rõ ràng và tự nhiên.' },
  { order: 2, title: 'AI phân tích', description: 'Chuyển giọng nói và chấm điểm.' },
  { order: 3, title: 'Nhận phản hồi', description: 'Xem lỗi và cách cải thiện.' },
];

function Action({ onClick, icon, label, primary, danger, disabled }: { onClick?: () => void; icon: React.ReactNode; label: string; primary?: boolean; danger?: boolean; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 rounded-2xl px-6 py-4 font-black disabled:opacity-60 ${danger ? 'bg-red-600 text-white' : primary ? 'bg-violet-600 text-white' : 'border border-violet-200 bg-white text-violet-700'}`}>{icon}{label}</button>;
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><h2 className="text-lg font-black">{title}</h2><div className="mt-5">{children}</div></section>;
}

function PageState({ text }: { text: string }) {
  return <div className="grid min-h-screen place-items-center bg-[#fbfbff]"><p className="rounded-2xl bg-white px-8 py-6 font-black shadow-sm">{text}</p></div>;
}

function statusText(state: RecorderState) {
  return state === 'RECORDING' ? 'Đang ghi âm...' : state === 'PAUSED' ? 'Đã tạm dừng' : state === 'READY' ? 'Bản ghi đã sẵn sàng' : state === 'UPLOADING' ? 'Đang tải bản ghi lên' : 'Nhấn nút để bắt đầu';
}

function resolveMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((type) => MediaRecorder.isTypeSupported(type));
}

function microphoneError(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'Bạn chưa cấp quyền sử dụng microphone.';
  if (error instanceof DOMException && error.name === 'NotFoundError') return 'Không tìm thấy microphone trên thiết bị.';
  return 'Không thể mở microphone. Hãy kiểm tra quyền trình duyệt.';
}

function errorText(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = value.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message ?? value.message ?? fallback;
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

'use client';

import { AlertCircle, CheckCircle2, ChevronLeft, Headphones, Mic, Pause, Play, RotateCcw, Sparkles, Square, Upload, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSpeakingPractice, uploadSpeakingAudio } from '@/src/lib/speaking-processing-api';
import type { SpeakingPracticeDetail } from '@/src/lib/speaking-processing.types';
import { useSpeak } from '@/src/hooks/useSpeak';

type RecorderState = 'IDLE' | 'RECORDING' | 'PAUSED' | 'READY' | 'UPLOADING';

export default function SpeakingPracticePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = String(params.sessionId);
  const { speak, isSpeaking, error: ttsError } = useSpeak();

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
  const sampleText = data?.lesson.expectedText?.trim() || '';

  function playSample() {
    if (!sampleText || isSpeaking('speaking-sample')) return;
    void speak('speaking-sample', sampleText, null, 'en', 0.92);
  }

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
    <main className="min-h-screen bg-[#f6f9ff] px-4 pb-28 pt-5 text-slate-900 md:px-8 md:py-7">
      <div className="mx-auto max-w-[1350px]">
        <header className="flex flex-col gap-4 rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_12px_40px_rgba(37,99,235,0.08)] md:flex-row md:items-center md:justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 font-black text-blue-600">
            <ChevronLeft size={18} /> Quay lại
          </button>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400">{data.topic?.title ?? 'Speaking'}</p>
            <h1 className="text-xl font-black">{data.lesson.title}</h1>
          </div>
        </header>

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <article className="overflow-hidden rounded-[30px] border border-blue-100 bg-white shadow-[0_18px_55px_rgba(37,99,235,0.09)]">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">{data.lesson.type.replaceAll('_', ' ')}</span>
                    <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">{data.lesson.level}</span>
                    <span className="rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-orange-700">{data.lesson.estimatedMinutes} phút</span>
                  </div>
                  <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-blue-500">Beacon Speaking Coach</p>
                  <h2 className="mt-3 !text-[24px] !leading-[32px] font-black tracking-[-0.02em] md:!text-[30px] md:!leading-[40px]">{data.lesson.prompt}</h2>
                  {data.lesson.expectedText && (
                    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">Nghe câu mẫu rồi nói theo</p>
                        <button type="button" onClick={playSample} disabled={isSpeaking('speaking-sample')} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200 transition hover:-translate-y-0.5 disabled:opacity-60" aria-label="Nghe câu mẫu">
                          {isSpeaking('speaking-sample') ? <Headphones size={19} className="animate-pulse" /> : <Volume2 size={19} />}
                        </button>
                      </div>
                      <p className="mt-3 text-base font-bold leading-7 text-slate-800 md:text-lg">{data.lesson.expectedText}</p>
                      {ttsError && <p className="mt-3 text-xs font-bold text-red-600">{ttsError}</p>}
                    </div>
                  )}
                </div>
                <div className="flex min-h-[150px] items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white lg:min-h-full">
                  <div className="text-center">
                    <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-[36%_36%_44%_44%] bg-white shadow-xl">
                      <div className="absolute -top-3 left-4 h-7 w-4 -rotate-[28deg] rounded-full bg-blue-200" />
                      <div className="absolute -top-3 right-4 h-7 w-4 rotate-[28deg] rounded-full bg-blue-200" />
                      <div className="flex gap-5"><span className="h-3 w-3 rounded-full bg-slate-800" /><span className="h-3 w-3 rounded-full bg-slate-800" /></div>
                      <div className="absolute top-[54px] h-3 w-5 rounded-[50%] bg-orange-400" />
                      <div className="absolute -bottom-3 grid h-9 w-9 place-items-center rounded-xl bg-blue-700 text-sm font-black text-white">B</div>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black"><Sparkles size={15} /> Mình nghe bạn nhé!</div>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[30px] border border-blue-100 bg-white p-6 text-center shadow-[0_18px_55px_rgba(37,99,235,0.08)] md:p-8">
              <div className={`mx-auto grid h-32 w-32 place-items-center rounded-full ${state === 'RECORDING' ? 'animate-pulse bg-red-100 text-red-600' : state === 'PAUSED' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
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
              <div className="space-y-4">{(data.steps ?? defaultSteps).map((step) => <div key={step.order} className="flex gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-black text-blue-700">{step.order}</div><div><p className="font-black">{step.title}</p><p className="mt-1 text-sm text-slate-500">{step.description}</p></div></div>)}</div>
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
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 rounded-2xl px-6 py-4 font-black disabled:opacity-60 ${danger ? 'bg-red-600 text-white' : primary ? 'bg-blue-600 text-white' : 'border border-blue-200 bg-white text-blue-700'}`}>{icon}{label}</button>;
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm"><h2 className="text-lg font-black">{title}</h2><div className="mt-5">{children}</div></section>;
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

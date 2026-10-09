'use client';

import { AlertCircle, ChevronLeft, Headphones, Mic, Pause, Play, RotateCcw, Square, Upload, Volume2 } from 'lucide-react';
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

  const activeStep = state === 'READY' || state === 'UPLOADING' ? 3 : state === 'IDLE' ? 1 : 2;
  const steps = ['Nghe câu mẫu', 'Ghi âm câu của bạn', 'Nghe lại', 'Gửi để nhận phản hồi'];

  return (
    <main className="min-h-screen bg-[#f7fbff] px-4 pb-36 pt-3 text-[#0b1b42] md:px-7 md:pb-8 md:pt-6">
      <div className="mx-auto max-w-[1320px]">
        <header className="mb-3 flex items-center justify-between gap-4">
          <button onClick={() => router.back()} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-600 hover:bg-white">
            <ChevronLeft size={19} /> Quay lại
          </button>
          <div className="flex min-w-[140px] items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-blue-100"><div className="h-full w-[30%] rounded-full bg-[#1488ff]" /></div>
            <span className="text-xs font-bold text-slate-500">3 / 10</span>
          </div>
        </header>

        <section className="mb-3 px-1 md:mb-5 md:px-2">
          <p className="text-sm font-bold text-slate-500">{data.topic?.title ? `Unit 3 · ${data.topic.title}` : 'Speaking'}</p>
          <h1 className="mt-1 !text-[28px] !leading-[34px] font-black tracking-[-0.03em] md:!text-[36px] md:!leading-[42px]">Let’s practice speaking!</h1>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500 md:text-base">Nghe câu mẫu, sau đó nói theo. Bạn có thể nghe lại và gửi để nhận phản hồi phát âm.</p>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[#dcecff] bg-white shadow-[0_18px_55px_rgba(35,113,190,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="relative flex min-h-[210px] flex-col items-center justify-end bg-gradient-to-b from-[#f8fcff] to-white px-5 pb-3 pt-3 lg:min-h-[610px] lg:pb-8 lg:pt-5 lg:justify-center lg:pb-8">
              <div className="relative z-10 mb-0 max-w-[230px] rounded-[22px] border border-blue-100 bg-white px-5 py-4 text-sm font-semibold leading-6 text-slate-600 shadow-[0_8px_24px_rgba(38,112,190,0.1)]">
                Nghe kỹ câu mẫu nhé! Sau đó nhấn nút để bắt đầu ghi âm. Mình sẽ nghe và nhận xét cùng bạn!
                <span className="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rotate-45 border-b border-r border-blue-100 bg-white" />
              </div>
              <img src="/brand/beacon-speaking-coach.svg" alt="BeaconVie Speaking Coach" className="relative z-0 h-[150px] w-auto object-contain sm:h-[170px] lg:h-[285px]" />
            </div>

            <div className="px-5 py-4 md:px-8 md:py-7 md:py-7 lg:px-10">
              <span className="inline-flex rounded-full bg-[#e8f4ff] px-3 py-1.5 text-xs font-black text-[#0878f9]">Câu 3</span>
              <h2 className="mt-3 !text-[22px] !leading-[30px] font-black md:!text-[26px] md:!leading-[34px]">{data.lesson.prompt}</h2>

              {sampleText && (
                <div className="mt-4 rounded-2xl bg-[#eef7ff] px-4 py-4 md:px-5">
                  <div className="flex items-center gap-3">
                    <p className="min-w-0 flex-1 text-[18px] font-black leading-7 text-[#0878f9] md:text-[22px]">“{sampleText}”</p>
                    <button type="button" onClick={playSample} disabled={isSpeaking('speaking-sample')} aria-label="Nghe câu mẫu" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#0878f9] shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60">
                      {isSpeaking('speaking-sample') ? <Headphones size={20} className="animate-pulse" /> : <Volume2 size={20} />}
                    </button>
                  </div>
                  {ttsError && <p className="mt-2 text-xs font-bold text-red-600">{ttsError}</p>}
                </div>
              )}

              <div className="mt-4 grid grid-cols-4 md:mt-6 gap-1 md:gap-2">
                {steps.map((label, index) => {
                  const step=index+1; const active=step===activeStep; const done=step<activeStep;
                  return <div key={label} className="min-w-0 text-center">
                    <div className="flex items-center"><span className={`h-px flex-1 ${index===0?'bg-transparent':'bg-blue-100'}`} /><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${active?'bg-[#0878f9] text-white':done?'bg-blue-100 text-[#0878f9]':'bg-slate-100 text-slate-500'}`}>{step}</span><span className={`h-px flex-1 ${index===3?'bg-transparent':'bg-blue-100'}`} /></div>
                    <p className={`mt-2 hidden text-[11px] font-bold leading-4 md:block ${active?'text-[#0878f9]':'text-slate-500'}`}>{label}</p>
                    <p className={`mt-2 text-[10px] font-bold leading-3 md:hidden ${active?'text-[#0878f9]':'text-slate-500'}`}>{step===1?'Nghe mẫu':step===2?'Ghi âm':step===3?'Nghe lại':'Phản hồi'}</p>
                  </div>;
                })}
              </div>

              <div className="mt-5 text-center md:mt-7">
                <div className={`mx-auto grid h-24 w-24 place-items-center md:h-32 md:w-32 rounded-full border-[12px] ${state==='RECORDING'?'animate-pulse border-red-50 bg-red-500 text-white':state==='PAUSED'?'border-amber-50 bg-amber-500 text-white':'border-[#e7f3ff] bg-[#1488ff] text-white'}`}>
                  <Mic size={44} />
                </div>
                <p className="mt-3 text-base font-black">{state==='IDLE'?'Nhấn để bắt đầu ghi âm':statusText(state)}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{state==='IDLE'?'Thời lượng tối đa: 30 giây':formattedTime}</p>

                <div className="mt-3 flex flex-wrap justify-center gap-2 md:mt-5">
                  {state==='IDLE' && <Action onClick={startRecording} icon={<Mic size={17}/>} label="Bắt đầu ghi âm" primary />}
                  {state==='RECORDING' && <><Action onClick={pauseRecording} icon={<Pause size={17}/>} label="Tạm dừng"/><Action onClick={stopRecording} icon={<Square size={17}/>} label="Dừng" danger/></>}
                  {state==='PAUSED' && <><Action onClick={resumeRecording} icon={<Play size={17}/>} label="Tiếp tục" primary/><Action onClick={stopRecording} icon={<Square size={17}/>} label="Dừng" danger/></>}
                  {state==='READY' && <><Action onClick={startRecording} icon={<RotateCcw size={17}/>} label="Ghi lại"/><Action onClick={submitRecording} icon={<Upload size={17}/>} label="Gửi để nhận phản hồi" primary/></>}
                  {state==='UPLOADING' && <Action disabled icon={<Upload size={17}/>} label="Đang tải lên..." primary/>}
                </div>
                {audioUrl && <audio controls src={audioUrl} className="mx-auto mt-5 w-full max-w-xl" />}
              </div>
            </div>
          </div>

          <div className="hidden border-t border-blue-50 px-6 py-5 md:grid md:grid-cols-4 md:gap-3">
            {[
              ['🎧','Nghe câu mẫu','Nghe phát âm chuẩn nhiều lần'],
              ['🎙️','Ghi âm câu của bạn','Nói theo với tốc độ tự nhiên'],
              ['▶️','Nghe lại','Nghe lại giọng nói để tự đánh giá'],
              ['⭐','Gửi để nhận phản hồi','Nhận xét phát âm, gợi ý cải thiện'],
            ].map(([icon,title,desc])=><div key={title} className="flex gap-3 rounded-2xl bg-[#f5faff] p-4"><span className="text-2xl">{icon}</span><div><p className="text-sm font-black">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p></div></div>)}
          </div>

          <div className="mx-5 mb-5 mt-1 rounded-2xl bg-[#fff8df] px-5 py-4 md:mx-6">
            <p className="text-sm font-black">💡 Mẹo nhỏ để nói tự nhiên hơn:</p>
            <div className="mt-2 grid gap-1 text-xs font-medium leading-5 text-slate-600 md:grid-cols-3">
              <p>• Nói rõ ràng, với tốc độ tự nhiên.</p><p>• Bạn có thể nghe lại câu mẫu nhiều lần.</p><p>• Đừng lo lắng về lỗi, hãy thử và cải thiện dần nhé!</p>
            </div>
          </div>
        </section>

        {error && <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"><AlertCircle className="mt-0.5 shrink-0"/><p className="font-bold">{error}</p></div>}
      </div>
    </main>
  );
}


function Action({ onClick, icon, label, primary, danger, disabled }: { onClick?: () => void; icon: React.ReactNode; label: string; primary?: boolean; danger?: boolean; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 rounded-2xl px-6 py-4 font-black disabled:opacity-60 ${danger ? 'bg-red-600 text-white' : primary ? 'bg-blue-600 text-white' : 'border border-blue-200 bg-white text-blue-700'}`}>{icon}{label}</button>;
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

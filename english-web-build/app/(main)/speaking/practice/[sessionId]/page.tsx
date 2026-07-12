"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  HelpCircle,
  Home,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import {
  evaluateSpeakingPractice,
  finishSpeakingPractice,
  getSpeakingPracticeSession,
  SpeakingEvaluation,
  SpeakingPracticeSession,
  transcribeSpeakingAudio,
} from "@/src/lib/speaking-api";

export default function SpeakingPracticePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = String(params.sessionId);

  const [data, setData] = useState<SpeakingPracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [transcript, setTranscript] = useState("");
  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const startTimeRef = useRef<number>(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playingExample, setPlayingExample] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  async function fetchSession() {
    try {
      setLoading(true);
      const result = await getSpeakingPracticeSession(sessionId);
      setData(result);
      setStep(result.session.step || 1);
      if (result.latestAnswer?.transcript)
        setTranscript(result.latestAnswer.transcript);
      if (result.latestAnswer?.audioUrl)
        setAudioUrl(result.latestAnswer.audioUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không tải được phiên luyện nói",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSession();
    return () => {
      stopTimer();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      window.speechSynthesis.cancel();
    };
  }, [sessionId]);

  const wordCount = useMemo(() => {
    if (!data?.lesson.expectedText) return 0;
    return data.lesson.expectedText.trim().split(/\s+/).filter(Boolean).length;
  }, [data]);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopRecorderTracks() {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  }

  function startTimer(maxSeconds: number) {
    stopTimer();

    startTimeRef.current = Date.now();
    setSeconds(0);

    timerRef.current = setInterval(() => {
      const nextSeconds = Math.floor(
        (Date.now() - startTimeRef.current) / 1000,
      );

      setSeconds(nextSeconds);

      if (
        nextSeconds >= maxSeconds &&
        recorderRef.current?.state === "recording"
      ) {
        recorderRef.current.stop();
        setRecording(false);
        stopTimer();
      }
    }, 250);
  }

  async function handleStartRecording() {
    try {
      stopTimer();
      stopRecorderTracks();

      setSeconds(0);
      setError("");
      setAudioUrl("");
      setTranscript("");
      setEvaluation(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stopTimer();

        const finalSeconds = Math.floor(
          (Date.now() - startTimeRef.current) / 1000,
        );
        setSeconds(finalSeconds);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const localUrl = URL.createObjectURL(blob);
        setAudioUrl(localUrl);
        stream.getTracks().forEach((track) => track.stop());

        await handleEvaluate(localUrl);
      };

      recorder.start();
      setRecording(true);

      const maxSeconds = Math.max(
        Number(data?.lesson.estimatedMinutes || 5) * 60,
        10,
      );

      startTimer(maxSeconds);
    } catch {
      setError(
        "Không thể mở microphone. Hãy cấp quyền microphone cho trình duyệt.",
      );
    }
  }

  function handleStopRecording() {
    if (!recorderRef.current || recorderRef.current.state !== "recording") {
      return;
    }

    recorderRef.current.stop();
    setRecording(false);
    stopTimer();
  }

  async function handleEvaluate(localAudioUrl: string) {
    try {
      setChecking(true);
      setStep(2);

      const transcribed = await transcribeSpeakingAudio(sessionId, {
        audioUrl: localAudioUrl,
      });

      const nextTranscript = transcribed.transcript?.trim() || "";
      setTranscript(nextTranscript);

      if (!nextTranscript) {
        setEvaluation({
          overallScore: 0,
          pronunciation: 0,
          fluency: 0,
          grammar: 0,
          vocabulary: 0,
          confidence: 0,
          correctedText: "",
          feedback: "No speech detected. Please try recording again.",
          suggestions: ["Please speak clearly into the microphone."],
        });

        setStep(3);
        return;
      }

      const result = await evaluateSpeakingPractice(sessionId, {
        transcript: nextTranscript,
        audioUrl: localAudioUrl,
      });

      setEvaluation(result.evaluation);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể chấm bài nói");
    } finally {
      setChecking(false);
    }
  }

  async function handleFinish() {
    await finishSpeakingPractice(sessionId);
    router.push(`/speaking/history/${sessionId}`);
  }

  function playExample() {
    if (!data?.lesson.expectedText) return;

    if (playingExample) {
      window.speechSynthesis.cancel();
      setPlayingExample(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(data.lesson.expectedText);
    utterance.lang = "en-US";
    utterance.rate = 0.9;

    utterance.onend = () => setPlayingExample(false);
    utterance.onerror = () => setPlayingExample(false);

    utteranceRef.current = utterance;
    setPlayingExample(true);
    window.speechSynthesis.speak(utterance);
  }

  if (loading || !data) {
    return (
      <div className="p-10 text-purple-600">Loading speaking practice...</div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#08083d]">
      <div className="grid grid-cols-12 gap-8 px-10 py-8">
        <section className="col-span-9">
          <Breadcrumb />

          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-5xl">
                {data.lesson.icon || data.topic.icon}
              </div>
              <div>
                <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-extrabold">
                    {data.lesson.title}
                  </h1>
                  <span className="rounded-lg bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700">
                    {formatPracticeType(data.lesson.type)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-indigo-500">
                  {data.topic.title} • {data.lesson.level} •{" "}
                  {data.lesson.estimatedMinutes - 1}-
                  {data.lesson.estimatedMinutes + 1} min
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/speaking/topics")}
              className="rounded-xl border border-purple-600 px-7 py-4 text-sm font-bold text-purple-600"
            >
              ↔ Change Topic
            </button>
          </div>

          <StepProgress currentStep={step} steps={data.steps} />

          {step === 1 && (
            <ReadRecordStep
              data={data}
              seconds={seconds}
              maxSeconds={data.lesson.estimatedMinutes * 60}
              wordCount={wordCount}
              recording={recording}
              audioUrl={audioUrl}
              error={error}
              onPlayExample={playExample}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              playingExample={playingExample}
            />
          )}

          {step === 2 && <EvaluationLoading />}

          {step === 3 && evaluation && (
            <ImproveStep
              evaluation={evaluation}
              transcript={transcript}
              onRecordAgain={() => setStep(1)}
              onFinish={() => setStep(4)}
            />
          )}

          {step === 4 && evaluation && (
            <SummaryStep evaluation={evaluation} onFinish={handleFinish} />
          )}

          {checking && (
            <div className="mt-5 text-sm font-bold text-purple-600">
              AI đang chấm bài...
            </div>
          )}
        </section>

        <aside className="col-span-3 space-y-5">
          <ProgressCard currentStep={step} />
          <FocusSkillsCard items={data.focusSkills} />
          <PracticeTipsCard items={data.tips} />
          <HelpCard />
        </aside>
      </div>
    </div>
  );
}

function Breadcrumb() {
  return (
    <div className="mb-7 flex items-center gap-3 text-sm font-semibold text-indigo-400">
      <Home size={16} />
      <span>Home</span>
      <ChevronRight size={14} />
      <span>Speaking</span>
      <ChevronRight size={14} />
      <span>Practice</span>
      <ChevronRight size={14} />
      <span className="text-[#08083d]">Start Practice</span>
    </div>
  );
}

function StepProgress({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: { order: number; title: string; description: string }[];
}) {
  return (
    <div className="mb-8 rounded-2xl border border-indigo-100 bg-white p-7">
      <div className="grid grid-cols-4 gap-5">
        {steps.map((item) => (
          <div key={item.order} className="text-center">
            <div
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-500 data-[active=true]:bg-purple-600 data-[active=true]:text-white"
              data-active={currentStep >= item.order}
            >
              {item.order}
            </div>
            <p className="mt-4 text-sm font-extrabold text-purple-700">
              {item.title}
            </p>
            <p className="mt-2 text-sm text-indigo-500">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadRecordStep({
  data,
  seconds,
  maxSeconds,
  wordCount,
  recording,
  audioUrl,
  error,
  onPlayExample,
  onStartRecording,
  onStopRecording,
  playingExample,
}: any) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-7">
      <h2 className="text-xl font-extrabold">
        Step 1: Read the passage out loud
      </h2>
      <div className="mt-5 rounded-xl bg-purple-50 p-4 text-sm font-semibold text-indigo-600">
        🔊 Read the following passage out loud naturally and clearly. You can
        re-record if you want to try again.
      </div>
      <div className="mt-5 rounded-xl border border-indigo-100 bg-white p-7">
        <h3 className="text-2xl font-extrabold">{data.lesson.title}</h3>
        <p className="mt-5 whitespace-pre-line text-lg leading-9 text-[#08083d]">
          {data.lesson.expectedText}
        </p>
        <p className="mt-5 text-right text-sm text-indigo-500">
          {wordCount} words
        </p>
      </div>
      <div className="mt-7 text-center">
        <p className="text-3xl font-extrabold text-purple-600">
          {formatSeconds(seconds)}{" "}
          <span className="text-lg text-indigo-500">
            / {formatSeconds(maxSeconds)}
          </span>
        </p>
        <div className="mt-5 flex items-center justify-center gap-10">
          <button
            type="button"
            onClick={onPlayExample}
            className="flex items-center gap-2 rounded-xl border border-purple-600 px-7 py-4 text-sm font-bold text-purple-600"
          >
            {playingExample ? <Pause size={16} /> : <Play size={16} />}
            {playingExample ? "Stop Example" : "Play Example"}
          </button>
          {!recording ? (
            <button
              onClick={onStartRecording}
              className="flex h-28 w-28 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl shadow-purple-200"
            >
              <Mic size={54} />
            </button>
          ) : (
            <button
              onClick={onStopRecording}
              className="flex h-28 w-28 items-center justify-center rounded-full bg-red-500 text-white shadow-xl"
            >
              <Square size={44} />
            </button>
          )}
          <button
            onClick={onStopRecording}
            disabled={!recording}
            className="flex items-center gap-2 rounded-xl border border-indigo-100 px-7 py-4 text-sm font-bold text-indigo-400 disabled:opacity-40"
          >
            <Pause size={16} /> Stop Recording
          </button>
        </div>
        {audioUrl && (
          <audio
            controls
            src={audioUrl}
            className="mx-auto mt-5 w-full max-w-xl"
          />
        )}
        {error && (
          <p className="mt-5 text-sm font-bold text-red-500">{error}</p>
        )}
      </div>
      <div className="mt-7 rounded-xl border border-indigo-100 p-4 text-sm text-indigo-500">
        💡 Tips: Speak at a normal pace and try to pronounce each word clearly.
      </div>
    </div>
  );
}

function EvaluationLoading() {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-10 text-center text-lg font-bold text-purple-600">
      AI Evaluation... Checking pronunciation, fluency, grammar and vocabulary.
    </div>
  );
}

function ImproveStep({
  evaluation,
  transcript,
  onRecordAgain,
  onFinish,
}: {
  evaluation: SpeakingEvaluation;
  transcript: string;
  onRecordAgain: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-7">
      <h2 className="text-2xl font-extrabold">AI Evaluation</h2>
      <div className="mt-5 grid grid-cols-5 gap-4">
        <Score title="Overall" value={evaluation.overallScore} />
        <Score title="Pronunciation" value={evaluation.pronunciation} />
        <Score title="Fluency" value={evaluation.fluency} />
        <Score title="Grammar" value={evaluation.grammar} />
        <Score title="Vocabulary" value={evaluation.vocabulary} />
      </div>
      <div className="mt-6 rounded-xl bg-purple-50 p-5 text-sm leading-7 text-indigo-700">
        {evaluation.feedback}
      </div>
      <div className="mt-6 rounded-xl border border-indigo-100 p-5">
        <h3 className="font-bold">Your Transcript</h3>
        <p className="mt-3 text-sm leading-7 text-indigo-600">{transcript}</p>
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <button
          onClick={onRecordAgain}
          className="rounded-xl border border-purple-600 px-7 py-4 text-sm font-bold text-purple-600"
        >
          <RotateCcw size={16} className="inline" /> Record Again
        </button>
        <button
          onClick={onFinish}
          className="rounded-xl bg-purple-600 px-7 py-4 text-sm font-bold text-white"
        >
          Continue Summary
        </button>
      </div>
    </div>
  );
}

function SummaryStep({
  evaluation,
  onFinish,
}: {
  evaluation: SpeakingEvaluation;
  onFinish: () => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-10 text-center">
      <h2 className="text-3xl font-extrabold">Practice Summary</h2>
      <p className="mt-5 text-6xl font-extrabold text-purple-600">
        {evaluation.overallScore}
      </p>
      <p className="mt-3 text-indigo-500">Overall Score</p>
      <button
        onClick={onFinish}
        className="mt-8 rounded-xl bg-purple-600 px-10 py-4 text-sm font-bold text-white"
      >
        Finish & View History
      </button>
    </div>
  );
}

function Score({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-indigo-100 p-5 text-center">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-3 text-3xl font-extrabold text-purple-600">{value}</p>
    </div>
  );
}

function ProgressCard({ currentStep }: { currentStep: number }) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7">
      <h2 className="text-lg font-extrabold">Your Progress</h2>
      <div className="mt-5 text-center">
        <p className="text-4xl font-extrabold">{Math.min(currentStep, 3)}/3</p>
        <p className="text-sm text-indigo-500">Steps Completed</p>
      </div>
    </div>
  );
}
function FocusSkillsCard({ items }: any) {
  return <SideList title="Focus Skills" items={items} />;
}
function PracticeTipsCard({ items }: any) {
  return <SideList title="Practice Tips" items={items} />;
}
function SideList({ title, items }: any) {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7">
      <h2 className="mb-5 text-lg font-extrabold">{title}</h2>
      <div className="space-y-5">
        {items.map((item: any) => (
          <div key={item.title} className="flex gap-4">
            <div className="text-2xl">{item.icon}</div>
            <div>
              <p className="text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-sm text-indigo-500">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function HelpCard() {
  return (
    <div className="rounded-2xl border border-indigo-50 bg-white p-7">
      <h2 className="text-lg font-extrabold">Need Help?</h2>
      <p className="mt-4 text-sm leading-6 text-indigo-500">
        Watch our guide to improve your speaking skills.
      </p>
      <button className="mt-5 w-full rounded-xl border border-purple-600 py-4 text-sm font-bold text-purple-600">
        <HelpCircle size={16} className="inline" /> View Guide
      </button>
    </div>
  );
}
function formatSeconds(value: number) {
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function formatPracticeType(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

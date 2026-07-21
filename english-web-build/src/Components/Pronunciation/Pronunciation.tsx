"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/src/lib/axios";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { useSpeak } from "@/src/hooks/useSpeak";

type WordStatus = "good" | "warning" | "bad";

type WordFeedback = {
  word: string;
  status: WordStatus;
  correctIpa: string;
  userIpa: string;
  note: string;
};

type FocusSound = {
  word: string;
  sound: string;
  note: string;
};

type PronunciationExercise = {
  id: string;
  title: string;
  type: string;
  level: string;
  text: string;
  ipa: string;
  focusSounds: FocusSound[] | null;
};

type PronunciationFeedback = {
  wordFeedback: WordFeedback[];
  errors: { title: string; wrong: string; correct: string; note: string }[];
  miniDrill: string[];
  miuNote: string;
};

type PronunciationResult = {
  id: string;
  exerciseId: string;
  audioUrl: string | null;
  score: number;
  clarity: number;
  stress: number;
  endingSound: number;
  fluency: number;
  feedback: PronunciationFeedback;
  exercise: PronunciationExercise;
};

const LEVEL = "A2";
const GOAL = "Speaking";

function unwrap<T>(payload: unknown): T {
  return ((payload as { data?: T })?.data ?? payload) as T;
}

export default function PronunciationPage() {
  const [exercise, setExercise] = useState<PronunciationExercise | null>(null);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [history, setHistory] = useState<PronunciationResult[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const { speak, isSpeaking } = useSpeak();

  const loadExercise = async () => {
    setLoadingExercise(true);
    setError(null);
    setResult(null);
    setSelectedWord(null);

    try {
      const { data } = await api.post("/pronunciation/generate", {
        level: LEVEL,
        goal: GOAL,
      });
      setExercise(unwrap<PronunciationExercise>(data));
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tạo được bài luyện phát âm"));
    } finally {
      setLoadingExercise(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/pronunciation/history");
      setHistory(unwrap<PronunciationResult[]>(data) || []);
    } catch {
      // Lịch sử chỉ để hiển thị tiến độ, không chặn luyện tập nếu lỗi.
    }
  };

  useEffect(() => {
    loadExercise();
    loadHistory();
  }, []);

  const submitRecording = async (blob: Blob) => {
    if (!exercise) return;

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("exerciseId", exercise.id);
      formData.append("audio", blob, "recording.webm");

      const { data } = await api.post("/pronunciation/analyze", formData);
      const analyzed = unwrap<PronunciationResult>(data);
      setResult(analyzed);
      setSelectedWord(analyzed.feedback?.wordFeedback?.[0] ?? null);
      void loadHistory();
    } catch (err) {
      setError(getApiErrorMessage(err, "Không phân tích được phát âm. Thử lại nhé."));
    } finally {
      setAnalyzing(false);
    }
  };

  const startRecording = async () => {
    if (!exercise || recording || analyzing) return;
    setError(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Trình duyệt không hỗ trợ ghi âm.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        void submitRecording(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Không truy cập được microphone. Hãy cấp quyền ghi âm cho trình duyệt.");
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleRecord = () => {
    if (recording) {
      stopRecording();
      return;
    }
    void startRecording();
  };

  const retryExercise = () => {
    if (recording) stopRecording();
    setResult(null);
    setSelectedWord(null);
  };

  const nextExercise = () => {
    if (recording) stopRecording();
    void loadExercise();
  };

  const practiceCount = Math.min(history.length, 10);
  const practicePercent = Math.round((practiceCount / 10) * 100);

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff4e8] px-4 py-10">
      <section className="mx-auto max-w-7xl">
        <Hero />

        <div className="mt-10 grid gap-6 lg:grid-cols-[330px_1fr]">
          <aside className="space-y-5">
            <PracticeSummary
              exercise={exercise}
              speaking={exercise ? isSpeaking(`summary-${exercise.id}`) : false}
              onPlay={() => exercise && speak(`summary-${exercise.id}`, exercise.text, null, "en")}
            />
            <TodayProgress count={practiceCount} percent={practicePercent} />
            <PracticeSteps />
          </aside>

          <section className="space-y-6">
            <MainPractice
              exercise={exercise}
              loading={loadingExercise}
              recording={recording}
              analyzing={analyzing}
              error={error}
              onRecord={handleRecord}
              onNext={nextExercise}
              onPlay={() => exercise && speak(`main-${exercise.id}`, exercise.text, null, "en")}
              onSlow={() => exercise && speak(`main-slow-${exercise.id}`, exercise.text, null, "en", 0.6)}
              speaking={exercise ? isSpeaking(`main-${exercise.id}`) : false}
              speakingSlow={exercise ? isSpeaking(`main-slow-${exercise.id}`) : false}
            />

            {analyzing ? (
              <AnalyzingCard />
            ) : result ? (
              <>
                <ResultCard result={result} />
                <WordFeedbackPanel
                  words={result.feedback.wordFeedback}
                  selectedWord={selectedWord}
                  onSelect={setSelectedWord}
                />

                {selectedWord && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <WordDetail
                      word={selectedWord}
                      speaking={isSpeaking(`word-${selectedWord.word}`)}
                      onPlay={() => speak(`word-${selectedWord.word}`, selectedWord.word, null, "en", 0.75)}
                    />
                    <MiniDrill
                      drills={result.feedback.miniDrill}
                      isSpeaking={isSpeaking}
                      onPlay={speak}
                      onRetry={retryExercise}
                    />
                  </div>
                )}

                <AiCoach note={result.feedback.miuNote} />
              </>
            ) : (
              <EmptyResultCard hasExercise={!!exercise} />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden rounded-[38px] bg-gradient-to-br from-white via-[#fffaf5] to-[#f7f1fb] p-7 shadow-[0_30px_90px_rgba(31,42,68,0.10)] lg:p-10">
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#fff0dc]" />
      <div className="absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-[#ede9fe]/80 blur-3xl" />

      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-[#ffd4ad] bg-white px-4 py-2 text-sm font-black text-[#ff6b00] shadow-sm">
            🎤 AI Pronunciation Coach
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-tight text-[#1f2a44] lg:text-7xl">
            Luyện phát âm chuẩn hơn cùng{" "}
            <span className="text-[#ff6b00]">Lumi AI</span>
          </h1>

          <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-[#5b6b85]">
            Nghe mẫu, ghi âm, nhận điểm phát âm và xem lỗi từng từ. Lumi sẽ giúp
            bạn sửa âm cuối, trọng âm, độ rõ và độ trôi chảy.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1f2a44] via-[#4d4378] to-[#6b5796] p-7 text-white shadow-2xl">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute bottom-4 right-6 text-7xl opacity-20">🐱</div>

          <h2 className="relative z-10 text-3xl font-black">Hôm nay luyện gì?</h2>
          <p className="relative z-10 mt-3 font-bold leading-7 text-white/80">
            Lumi gợi ý luyện 10 câu ngắn để cải thiện âm cuối và trọng âm.
          </p>

          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
            <MiniHeroStat value="10" label="câu luyện" />
            <MiniHeroStat value="+20" label="XP" />
            <MiniHeroStat value="A2" label="level" />
            <MiniHeroStat value="5m" label="thời gian" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniHeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4">
      <div className="text-3xl font-black">{value}</div>
      <p className="mt-1 text-sm font-bold text-white/80">{label}</p>
    </div>
  );
}

function PracticeSummary({
  exercise,
  speaking,
  onPlay,
}: {
  exercise: PronunciationExercise | null;
  speaking: boolean;
  onPlay: () => void;
}) {
  return (
    <SoftCard title="Bài luyện hiện tại">
      <div className="rounded-3xl bg-gradient-to-br from-[#fffaf5] to-[#f7f1fb] p-5">
        <div className="text-sm font-black text-[#ff6b00]">
          {exercise?.type === "sentence" ? "Sentence practice" : exercise?.type || "..."}
        </div>
        <h3 className="mt-3 text-xl font-black leading-6 text-[#1f2a44]">
          {exercise?.text || "Đang tải câu luyện..."}
        </h3>
        <p className="mt-1 font-bold text-[#5b6b85]">{exercise?.ipa || ""}</p>

        <button
          type="button"
          onClick={onPlay}
          disabled={!exercise || speaking}
          className="mt-5 w-full rounded-2xl bg-[#1f2a44] py-3 font-black text-white transition hover:bg-[#ff6b00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {speaking ? "🔊 Đang phát..." : "🔊 Nghe mẫu"}
        </button>
      </div>
    </SoftCard>
  );
}

function TodayProgress({ count, percent }: { count: number; percent: number }) {
  return (
    <SoftCard title="Tiến độ hôm nay">
      <div className="flex items-center justify-between text-sm font-black text-[#1f2a44]">
        <span>{count} / 10 câu</span>
        <span>{percent}%</span>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#ff6b00]" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-4 rounded-2xl bg-[#fff0dc] px-4 py-3 text-sm font-black text-[#ff6b00]">
        🔥 Giữ chuỗi luyện nói hôm nay
      </div>
    </SoftCard>
  );
}

function PracticeSteps() {
  const steps = [
    ["1", "Nghe mẫu", "Nghe chậm trước."],
    ["2", "Ghi âm", "Nói rõ âm cuối."],
    ["3", "Sửa lỗi", "Xem lỗi từng từ."],
  ];

  return (
    <SoftCard title="Cách luyện">
      <div className="space-y-3">
        {steps.map(([num, title, desc]) => (
          <div key={num} className="flex gap-3 rounded-2xl bg-[#fffaf5] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f2a44] text-sm font-black text-white">
              {num}
            </span>
            <div>
              <p className="font-black text-[#1f2a44]">{title}</p>
              <p className="text-xs font-bold text-[#5b6b85]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </SoftCard>
  );
}

function MainPractice({
  exercise,
  loading,
  recording,
  analyzing,
  error,
  onRecord,
  onNext,
  onPlay,
  onSlow,
  speaking,
  speakingSlow,
}: {
  exercise: PronunciationExercise | null;
  loading: boolean;
  recording: boolean;
  analyzing: boolean;
  error: string | null;
  onRecord: () => void;
  onNext: () => void;
  onPlay: () => void;
  onSlow: () => void;
  speaking: boolean;
  speakingSlow: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[38px] border border-[#ead8c2] bg-white p-7 shadow-[0_30px_90px_rgba(31,42,68,0.10)]">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#fff0dc]" />
      <div className="absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-[#f7f1fb] blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#fff0dc] px-4 py-2 text-xs font-black text-[#ff6b00]">
            {exercise?.type === "sentence" ? "Sentence practice" : exercise?.type || "Practice"}
          </span>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#f7f1fb] px-4 py-2 text-xs font-black text-[#6b5796]">
              {exercise?.level || LEVEL} · {GOAL}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={loading}
              className="rounded-full border border-[#ead8c2] bg-white px-4 py-2 text-xs font-black text-[#5b6b85] transition hover:border-[#ff6b00] hover:text-[#ff6b00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              🔄 Đổi câu khác
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 text-center">
            <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-[#fff4e8] text-5xl shadow-inner">
              🐱
            </div>
            <p className="mt-6 font-bold text-[#5b6b85]">Lumi đang soạn câu luyện cho bạn...</p>
          </div>
        ) : (
          <div className="mt-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fff4e8] text-5xl shadow-inner">
              🐱
            </div>

            <p className="mt-6 text-4xl font-black leading-tight text-[#1f2a44]">
              {exercise?.text || "Chưa có câu luyện."}
            </p>

            <p className="mt-3 text-lg font-bold text-[#5b6b85]">{exercise?.ipa}</p>

            {!!exercise?.focusSounds?.length && (
              <p className="mx-auto mt-4 max-w-2xl font-bold leading-7 text-[#5b6b85]">
                Tập trung vào{" "}
                {exercise.focusSounds.map((item, index) => (
                  <span key={item.word}>
                    <b>{item.sound}</b> trong <b>{item.word}</b>
                    {index < exercise.focusSounds!.length - 1 ? ", " : "."}
                  </span>
                ))}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-center font-bold text-red-500">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onSlow}
            disabled={!exercise || speakingSlow}
            className="rounded-2xl bg-[#fff0dc] py-4 font-black text-[#ff6b00] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            🐢 {speakingSlow ? "Đang phát..." : "Nghe chậm"}
          </button>

          <button
            type="button"
            onClick={onPlay}
            disabled={!exercise || speaking}
            className="rounded-2xl bg-[#1f2a44] py-4 font-black text-white transition hover:bg-[#ff6b00] disabled:cursor-not-allowed disabled:opacity-60"
          >
            🔊 {speaking ? "Đang phát..." : "Nghe mẫu"}
          </button>
        </div>

        <div className="mt-9 flex flex-col items-center">
          <button
            type="button"
            onClick={onRecord}
            disabled={!exercise || analyzing}
            className={`relative flex h-28 w-28 items-center justify-center rounded-full text-5xl text-white shadow-2xl transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${
              recording ? "bg-red-500" : "bg-[#ff6b00]"
            }`}
          >
            {recording && (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400" />
                <span className="absolute -inset-4 animate-pulse rounded-full border-4 border-red-200" />
              </>
            )}
            <span className="relative z-10">🎙️</span>
          </button>

          <p className="mt-4 font-black text-[#1f2a44]">
            {analyzing
              ? "Lumi đang phân tích..."
              : recording
                ? "Đang nghe bạn nói, nhấn để dừng..."
                : "Nhấn để bắt đầu ghi âm"}
          </p>
        </div>

        <div className="mt-7 rounded-[28px] bg-slate-50 p-6">
          <Wave active={recording} />
        </div>
      </div>
    </div>
  );
}

function Wave({ active }: { active: boolean }) {
  const bars = [18, 38, 58, 34, 76, 46, 62, 32, 54, 70, 30, 50, 66, 28, 44];

  return (
    <div className="flex h-20 items-center justify-center gap-2">
      {bars.map((height, index) => (
        <span
          key={index}
          className={`w-2 rounded-full bg-[#ff6b00] transition-all ${
            active ? "animate-pulse" : "opacity-50"
          }`}
          style={{
            height: active ? `${height}px` : `${Math.max(14, height / 2)}px`,
            animationDelay: `${index * 70}ms`,
          }}
        />
      ))}
    </div>
  );
}

function AnalyzingCard() {
  return (
    <div className="rounded-[34px] border border-[#ead8c2] bg-white p-8 text-center shadow-[0_30px_90px_rgba(31,42,68,0.10)]">
      <div className="mx-auto flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-[#fff4e8] text-5xl">
        🐱
      </div>

      <h2 className="mt-5 text-3xl font-black text-[#1f2a44]">
        Lumi đang phân tích phát âm...
      </h2>

      <p className="mt-2 font-bold text-[#5b6b85]">
        AI đang kiểm tra độ rõ, trọng âm, âm cuối và độ trôi chảy.
      </p>

      <div className="mx-auto mt-6 h-3 max-w-md overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-[#ff6b00]" />
      </div>
    </div>
  );
}

function EmptyResultCard({ hasExercise }: { hasExercise: boolean }) {
  return (
    <div className="rounded-[34px] border border-dashed border-[#ead8c2] bg-white/60 p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fff4e8] text-4xl">
        🎙️
      </div>
      <h2 className="mt-4 text-2xl font-black text-[#1f2a44]">
        {hasExercise ? "Chưa có kết quả nào" : "Đang chuẩn bị câu luyện..."}
      </h2>
      <p className="mt-2 font-bold text-[#5b6b85]">
        Nghe mẫu rồi nhấn nút ghi âm để Lumi chấm điểm phát âm của bạn.
      </p>
    </div>
  );
}

function ResultCard({ result }: { result: PronunciationResult }) {
  const label = result.score >= 85 ? "Excellent" : result.score >= 70 ? "Good" : result.score >= 50 ? "Cần luyện thêm" : "Cần cố gắng hơn";

  return (
    <div className="rounded-[34px] border border-[#ead8c2] bg-white p-7 shadow-[0_30px_90px_rgba(31,42,68,0.10)]">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center">
        <div className="mx-auto flex h-40 w-40 shrink-0 items-center justify-center rounded-full bg-[#ecfdf5] shadow-inner">
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-[12px] border-emerald-500">
            <div className="text-center">
              <div className="text-5xl font-black text-emerald-500">{result.score}</div>
              <p className="text-xs font-black text-[#5b6b85]">{label}</p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-3xl font-black text-[#1f2a44]">
            Kết quả phát âm
          </h2>

          <p className="mt-2 font-bold leading-7 text-[#5b6b85]">
            {result.feedback.miuNote || "Lumi đã chấm xong bài luyện của bạn."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniScore label="Độ rõ" value={result.clarity} />
            <MiniScore label="Trọng âm" value={result.stress} />
            <MiniScore label="Âm cuối" value={result.endingSound} />
            <MiniScore label="Độ trôi chảy" value={result.fluency} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#fffaf5] p-4 ring-1 ring-[#ead8c2]/80">
      <div className="flex justify-between font-black">
        <span className="text-[#1f2a44]">{label}</span>
        <span className="text-[#ff6b00]">{value}%</span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-[#ff6b00]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function WordFeedbackPanel({
  words,
  selectedWord,
  onSelect,
}: {
  words: WordFeedback[];
  selectedWord: WordFeedback | null;
  onSelect: (word: WordFeedback) => void;
}) {
  if (!words.length) return null;

  return (
    <div className="rounded-[34px] border border-[#ead8c2] bg-white p-7 shadow-[0_30px_90px_rgba(31,42,68,0.10)]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#1f2a44]">Từng từ trong câu</h2>
        <span className="rounded-full bg-[#fff0dc] px-4 py-2 text-xs font-black text-[#ff6b00]">
          Click để xem lỗi
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {words.map((item) => {
          const active = selectedWord?.word === item.word;

          return (
            <button
              key={item.word}
              type="button"
              onClick={() => onSelect(item)}
              className={`rounded-2xl px-5 py-3 font-black transition hover:-translate-y-0.5 ${
                active
                  ? "bg-[#1f2a44] text-white shadow-xl"
                  : item.status === "good"
                    ? "bg-emerald-50 text-emerald-600"
                    : item.status === "warning"
                      ? "bg-orange-50 text-orange-500"
                      : "bg-red-50 text-red-500"
              }`}
            >
              {item.status === "good" ? "✅" : item.status === "warning" ? "⚠️" : "❌"}{" "}
              {item.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WordDetail({
  word,
  speaking,
  onPlay,
}: {
  word: WordFeedback;
  speaking: boolean;
  onPlay: () => void;
}) {
  return (
    <SoftCard title="Lỗi cần sửa">
      <div className="rounded-[26px] bg-gradient-to-br from-[#fffaf5] to-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-black text-[#ff6b00]">Đang phân tích</p>
            <h3 className="mt-1 text-4xl font-black text-[#1f2a44]">
              {word.word}
            </h3>
          </div>

          <StatusBadge status={word.status} />
        </div>

        <div className="mt-5 space-y-3">
          <InfoLine label="IPA đúng" value={word.correctIpa} />
          <InfoLine label="Bạn đọc" value={word.userIpa} />
        </div>

        <div className="mt-4 rounded-2xl bg-red-50 p-4 font-bold leading-7 text-red-500">
          {word.note}
        </div>

        <button
          type="button"
          onClick={onPlay}
          disabled={speaking}
          className="mt-4 w-full rounded-2xl bg-[#1f2a44] py-3 font-black text-white transition hover:bg-[#ff6b00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          🔊 {speaking ? "Đang phát..." : "Nghe từ này"}
        </button>
      </div>
    </SoftCard>
  );
}

function StatusBadge({ status }: { status: WordStatus }) {
  const config = {
    good: "bg-emerald-50 text-emerald-600 ✅ Tốt",
    warning: "bg-orange-50 text-orange-500 ⚠️ Cần sửa",
    bad: "bg-red-50 text-red-500 ❌ Sai âm",
  }[status];

  return <span className={`rounded-full px-3 py-2 text-xs font-black ${config}`} />;
}

function MiniDrill({
  drills,
  isSpeaking,
  onPlay,
  onRetry,
}: {
  drills: string[];
  isSpeaking: (key: string) => boolean;
  onPlay: (key: string, text: string, audioUrl?: string | null, lang?: "en" | "vi", rate?: number) => void;
  onRetry: () => void;
}) {
  return (
    <SoftCard title="Mini Drill">
      <div className="space-y-3">
        {drills.length ? (
          drills.map((item) => {
            const key = `drill-${item}`;
            const speaking = isSpeaking(key);
            return (
              <button
                key={item}
                type="button"
                onClick={() => onPlay(key, item, null, "en", 0.75)}
                disabled={speaking}
                className="flex w-full items-center justify-between rounded-2xl bg-[#fffaf5] px-4 py-3 text-left font-black text-[#1f2a44] transition hover:bg-[#fff0dc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{item}</span>
                <span>{speaking ? "⏳" : "🔊"}</span>
              </button>
            );
          })
        ) : (
          <p className="rounded-2xl bg-[#fffaf5] px-4 py-3 font-bold text-[#5b6b85]">
            Chưa có drill cho câu này.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 w-full rounded-2xl bg-[#ff6b00] py-3 font-black text-white shadow-lg shadow-orange-200"
      >
        🎙️ Luyện lại câu này
      </button>
    </SoftCard>
  );
}

function AiCoach({ note }: { note: string }) {
  return (
    <div className="rounded-[34px] bg-gradient-to-br from-[#1f2a44] via-[#4d4378] to-[#6b5796] p-7 text-white shadow-2xl">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-4xl">
          🐱
        </div>

        <div>
          <h2 className="text-3xl font-black">Lumi AI Coach</h2>
          <p className="mt-3 font-bold leading-7 text-white/80">
            {note || "Luyện thêm vài câu để Lumi đưa ra nhận xét chi tiết hơn nhé."}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-xl bg-white px-4 py-3 font-bold shadow-sm">
      <span className="text-[#5b6b85]">{label}</span>
      <span className="text-right text-[#1f2a44]">{value}</span>
    </div>
  );
}

function SoftCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[30px] border border-[#ead8c2] bg-white p-5 shadow-[0_20px_60px_rgba(31,42,68,0.06)]">
      <h2 className="mb-4 text-xl font-black text-[#1f2a44]">{title}</h2>
      {children}
    </div>
  );
}

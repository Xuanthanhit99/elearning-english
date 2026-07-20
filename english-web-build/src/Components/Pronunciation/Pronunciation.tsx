"use client";

import { useState } from "react";

type WordStatus = "good" | "warning" | "bad";

type WordFeedback = {
  word: string;
  status: WordStatus;
  correctIpa: string;
  userIpa: string;
  note: string;
};

const sentence = "I want to improve my English speaking skills.";
const ipa = "/aɪ wɑːnt tə ɪmˈpruːv maɪ ˈɪŋɡlɪʃ ˈspiːkɪŋ skɪlz/";

const words: WordFeedback[] = [
  { word: "I", status: "good", correctIpa: "/aɪ/", userIpa: "/aɪ/", note: "Tốt." },
  { word: "want", status: "good", correctIpa: "/wɑːnt/", userIpa: "/wɑːnt/", note: "Tốt." },
  { word: "improve", status: "warning", correctIpa: "/ɪmˈpruːv/", userIpa: "/ɪmˈpruv/", note: "Trọng âm cần rõ hơn." },
  { word: "English", status: "good", correctIpa: "/ˈɪŋɡlɪʃ/", userIpa: "/ˈɪŋɡlɪʃ/", note: "Tốt." },
  { word: "speaking", status: "good", correctIpa: "/ˈspiːkɪŋ/", userIpa: "/ˈspiːkɪŋ/", note: "Tốt." },
  { word: "skills", status: "bad", correctIpa: "/skɪlz/", userIpa: "/skɪl/", note: "Bạn đang thiếu âm cuối /z/." },
];

export default function PronunciationPage() {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordFeedback>(words[5]);

  const playText = (text = sentence, rate = 0.85) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  };

  const handleRecord = () => {
    if (recording) {
      setRecording(false);
      setAnalyzing(true);

      setTimeout(() => {
        setAnalyzing(false);
      }, 1800);

      return;
    }

    setRecording(true);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff4e8] px-4 py-10">
      <section className="mx-auto max-w-7xl">
        <Hero />

        <div className="mt-10 grid gap-6 lg:grid-cols-[330px_1fr]">
          <aside className="space-y-5">
            <PracticeSummary onPlay={() => playText()} />
            <TodayProgress />
            <PracticeSteps />
          </aside>

          <section className="space-y-6">
            <MainPractice
              recording={recording}
              analyzing={analyzing}
              onRecord={handleRecord}
              onPlay={() => playText()}
              onSlow={() => playText(sentence, 0.65)}
            />

            {analyzing ? (
              <AnalyzingCard />
            ) : (
              <>
                <ResultCard />
                <WordFeedbackPanel
                  words={words}
                  selectedWord={selectedWord}
                  onSelect={setSelectedWord}
                />

                <div className="grid gap-6 lg:grid-cols-2">
                  <WordDetail word={selectedWord} onPlay={() => playText(selectedWord.word, 0.75)} />
                  <MiniDrill onPlay={playText} />
                </div>

                <AiCoach />
              </>
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

function PracticeSummary({ onPlay }: { onPlay: () => void }) {
  return (
    <SoftCard title="Bài luyện hiện tại">
      <div className="rounded-3xl bg-gradient-to-br from-[#fffaf5] to-[#f7f1fb] p-5">
        <div className="text-sm font-black text-[#ff6b00]">Sentence practice</div>
        <h3 className="mt-3 text-3xl font-black text-[#1f2a44]">improve</h3>
        <p className="mt-1 font-bold text-[#5b6b85]">/ɪmˈpruːv/ · verb</p>

        <button
          type="button"
          onClick={onPlay}
          className="mt-5 w-full rounded-2xl bg-[#1f2a44] py-3 font-black text-white transition hover:bg-[#ff6b00]"
        >
          🔊 Nghe mẫu
        </button>
      </div>
    </SoftCard>
  );
}

function TodayProgress() {
  return (
    <SoftCard title="Tiến độ hôm nay">
      <div className="flex items-center justify-between text-sm font-black text-[#1f2a44]">
        <span>6 / 10 câu</span>
        <span>60%</span>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-[60%] rounded-full bg-[#ff6b00]" />
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
  recording,
  analyzing,
  onRecord,
  onPlay,
  onSlow,
}: {
  recording: boolean;
  analyzing: boolean;
  onRecord: () => void;
  onPlay: () => void;
  onSlow: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[38px] border border-[#ead8c2] bg-white p-7 shadow-[0_30px_90px_rgba(31,42,68,0.10)]">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#fff0dc]" />
      <div className="absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-[#f7f1fb] blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#fff0dc] px-4 py-2 text-xs font-black text-[#ff6b00]">
            Sentence practice
          </span>

          <span className="rounded-full bg-[#f7f1fb] px-4 py-2 text-xs font-black text-[#6b5796]">
            A2 · Speaking
          </span>
        </div>

        <div className="mt-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fff4e8] text-5xl shadow-inner">
            🐱
          </div>

          <p className="mt-6 text-4xl font-black leading-tight text-[#1f2a44]">
            {sentence}
          </p>

          <p className="mt-3 text-lg font-bold text-[#5b6b85]">{ipa}</p>

          <p className="mx-auto mt-4 max-w-2xl font-bold leading-7 text-[#5b6b85]">
            Tập trung vào âm <b>/pruːv/</b>, trọng âm trong{" "}
            <b>improve</b> và âm cuối <b>/z/</b> trong <b>skills</b>.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onSlow}
            className="rounded-2xl bg-[#fff0dc] py-4 font-black text-[#ff6b00] transition hover:scale-[1.01]"
          >
            🐢 Nghe chậm
          </button>

          <button
            type="button"
            onClick={onPlay}
            className="rounded-2xl bg-[#1f2a44] py-4 font-black text-white transition hover:bg-[#ff6b00]"
          >
            🔊 Nghe mẫu
          </button>
        </div>

        <div className="mt-9 flex flex-col items-center">
          <button
            type="button"
            onClick={onRecord}
            disabled={analyzing}
            className={`relative flex h-28 w-28 items-center justify-center rounded-full text-5xl text-white shadow-2xl transition hover:scale-105 ${
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
            {recording ? "Đang nghe bạn nói..." : "Nhấn để bắt đầu ghi âm"}
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

function ResultCard() {
  return (
    <div className="rounded-[34px] border border-[#ead8c2] bg-white p-7 shadow-[0_30px_90px_rgba(31,42,68,0.10)]">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center">
        <div className="mx-auto flex h-40 w-40 shrink-0 items-center justify-center rounded-full bg-[#ecfdf5] shadow-inner">
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-[12px] border-emerald-500">
            <div className="text-center">
              <div className="text-5xl font-black text-emerald-500">86</div>
              <p className="text-xs font-black text-[#5b6b85]">Excellent</p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-3xl font-black text-[#1f2a44]">
            Kết quả phát âm
          </h2>

          <p className="mt-2 font-bold leading-7 text-[#5b6b85]">
            Bạn phát âm khá tốt. Cần luyện thêm âm cuối trong “skills” và trọng
            âm của “improve”.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniScore label="Độ rõ" value={90} />
            <MiniScore label="Trọng âm" value={82} />
            <MiniScore label="Âm cuối" value={78} />
            <MiniScore label="Độ trôi chảy" value={88} />
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
  selectedWord: WordFeedback;
  onSelect: (word: WordFeedback) => void;
}) {
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
          const active = selectedWord.word === item.word;

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
  onPlay,
}: {
  word: WordFeedback;
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
          className="mt-4 w-full rounded-2xl bg-[#1f2a44] py-3 font-black text-white transition hover:bg-[#ff6b00]"
        >
          🔊 Nghe từ này
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

function MiniDrill({ onPlay }: { onPlay: (text: string, rate?: number) => void }) {
  const drills = [
    "skills",
    "improve skills",
    "improve my English",
    "improve my English speaking skills",
  ];

  return (
    <SoftCard title="Mini Drill">
      <div className="space-y-3">
        {drills.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPlay(item, 0.75)}
            className="flex w-full items-center justify-between rounded-2xl bg-[#fffaf5] px-4 py-3 text-left font-black text-[#1f2a44] transition hover:bg-[#fff0dc]"
          >
            <span>{item}</span>
            <span>🔊</span>
          </button>
        ))}
      </div>

      <button className="mt-4 w-full rounded-2xl bg-[#ff6b00] py-3 font-black text-white shadow-lg shadow-orange-200">
        🎙️ Luyện lại câu này
      </button>
    </SoftCard>
  );
}

function AiCoach() {
  return (
    <div className="rounded-[34px] bg-gradient-to-br from-[#1f2a44] via-[#4d4378] to-[#6b5796] p-7 text-white shadow-2xl">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-4xl">
          🐱
        </div>

        <div>
          <h2 className="text-3xl font-black">Lumi AI Coach</h2>
          <p className="mt-3 font-bold leading-7 text-white/80">
            Bạn có tốc độ nói tốt và âm chính khá rõ. Ngày mai nên luyện thêm âm
            cuối <b>/z/</b>, <b>/v/</b> và trọng âm trong từ có 2 âm tiết.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {["ending sound", "word stress", "connected speech"].map((item) => (
              <span
                key={item}
                className="rounded-full bg-white/15 px-4 py-2 text-xs font-black"
              >
                {item}
              </span>
            ))}
          </div>
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
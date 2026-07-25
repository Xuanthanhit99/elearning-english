// src/Components/Tools/CheckWritingPage.tsx
"use client";

import { api } from "@/src/lib/axios";
import { useState } from "react";

const samples = [
  "Email cÃ´ng viá»‡c",
  "BÃ i táº­p tiáº¿ng Anh",
  "IELTS Writing",
  "Speaking script",
];

type Correction = {
  type?: string;
  level?: string;
  wrong?: string;
  correct?: string;
  explanation?: string;
};

type LearningTip = {
  title?: string;
  content?: string;
};

type WritingCheckResult = {
  userId?: string | null;
  originalText?: string;
  detectedLanguage?: string;
  style?: string;
  level?: string;

  score?: number;
  grammarScore?: number;
  vocabularyScore?: number;
  clarityScore?: number;
  meaningScore?: number;
  summary?: string;
  corrections?: Correction[];
  suggestedVersion?: string;
  phrases?: string[];
  learningTips?: LearningTip[];
  miuNote?: string;
};

export default function CheckWritingPage() {
  const [text, setText] = useState(
    "I want improve my English speaking because I need talk with customer in my job. I usually afraid when I speak, but I try practice every day.",
  );
  const [style, setStyle] = useState("Office");
  const [level, setLevel] = useState("Beginner");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<"NOT_FOUND" | "SERVER_ERROR" | null>(null);

  const [result, setResult] = useState<WritingCheckResult | null>(null);

  const onClickCheckWork = async () => {
    if (!text.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await api.post("/writing/check", {
        text,
        style: style,
        level: level,
      });

      const data = res.data?.data ?? res.data;

      if (!data) {
        setError("NOT_FOUND");
        return;
      }

      setResult(data);
    } catch (error) {
      console.error(error);
      setError("SERVER_ERROR");
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  return (
    <main className="min-h-screen bg-[#fff4e8] px-4 py-14">
      <section className="mx-auto max-w-6xl">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-[#ffd4ad] bg-white px-4 py-2 text-sm font-extrabold text-[#ff6b00] shadow-sm">
              ðŸ“ CÃ´ng cá»¥ miá»…n phÃ­
            </div>

            <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-[#1f2a44] lg:text-6xl">
              Check bÃ i viáº¿t cÃ¹ng{" "}
              <span className="text-[#ff6b00]">BeaconVie</span>
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5b6b85]">
              DÃ¡n Ä‘oáº¡n vÄƒn tiáº¿ng Anh cá»§a báº¡n Ä‘á»ƒ Beacon kiá»ƒm tra ngá»¯ phÃ¡p, tá»« vá»±ng,
              cÃ¡ch diá»…n Ä‘áº¡t vÃ  gá»£i Ã½ phiÃªn báº£n tá»± nhiÃªn hÆ¡n.
            </p>
          </div>

          <div className="rounded-[28px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
            <h2 className="text-2xl font-extrabold text-[#1f2a44]">
              Beacon sáº½ kiá»ƒm tra gÃ¬?
            </h2>

            <p className="mt-3 leading-7 text-[#5b6b85]">
              KhÃ´ng chá»‰ sá»­a lá»—i, Beacon cÃ²n giáº£i thÃ­ch vÃ¬ sao sai vÃ  gá»£i Ã½ cÃ¡ch nÃ³i
              tá»± nhiÃªn.
            </p>

            <div className="mt-5 space-y-3">
              <Tip text="Grammar & spelling" />
              <Tip text="Vocabulary & word choice" />
              <Tip text="Natural expression" />
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="h-fit rounded-[26px] border border-[#ead8c2] bg-white p-5 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
            <h2 className="text-2xl font-extrabold text-[#1f2a44]">
              DÃ¡n bÃ i viáº¿t cáº§n check
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#5b6b85]">
              PhÃ¹ há»£p cho cÃ¢u ngáº¯n, Ä‘oáº¡n vÄƒn, email, bÃ i speaking script.
            </p>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-extrabold text-[#5b6b85]">
                BÃ i viáº¿t tiáº¿ng Anh
              </span>

              <button
                disabled={!result}
                onClick={() => speakText(result?.suggestedVersion || text)}
                className="mb-2 block text-xs font-extrabold text-[#5b6b85]"
              >
                ðŸ”Š Nghe bÃ i viáº¿t
              </button>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold leading-7 text-[#1f2a44] outline-none placeholder:text-slate-300 focus:border-[#ff6b00] focus:bg-white"
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
              >
                <option value="Office">Style: Office English</option>
                <option value="Casual">Casual English</option>
                <option value="Academic">Academic English</option>
              </select>

              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
              >
                <option value="Beginner">Level: Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onClickCheckWork}
              disabled={loading || !text.trim()}
              className="mt-4 w-full rounded-2xl bg-[#ff6b00] py-4 font-extrabold text-white shadow-lg shadow-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Beacon Ä‘ang sá»­a bÃ i..." : "Check bÃ i"}
            </button>

            <div className="mt-5">
              <h3 className="font-extrabold text-[#1f2a44]">Máº«u hay dÃ¹ng</h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {samples.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-full bg-[#fff0dc] px-3 py-2 text-xs font-extrabold text-[#92400e]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            {loading ? (
              <WritingLoading />
            ) : error === "NOT_FOUND" ? (
              <WritingNotFound />
            ) : error === "SERVER_ERROR" ? (
              <WritingError />
            ) : result ? (
              <>
                <ScoreCard data={result} />
                <ErrorList data={result} />
                <ImprovedVersion data={result} />
                <SuggestionGrid data={result} />
                <StudyNote note={result.miuNote} />
              </>
            ) : (
              <EmptyWritingResult />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function ScoreCard({ data }: { data: WritingCheckResult }) {
  return (
    <div className="rounded-[30px] border border-[#ead8c2] bg-white p-7 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* Circle */}
        <div className="relative">
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-[10px] border-[#ff6b00]">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-[#ff6b00]">
                {data.score}
              </p>

              <p className="text-sm font-bold text-[#5b6b85]">XP</p>
            </div>
          </div>

          <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#ff6b00] px-4 py-1 text-xs font-extrabold text-white shadow-lg shadow-orange-200 animate-[scoreBadge_2s_ease-in-out_infinite]">
            <span className="animate-bounce">ðŸ†</span>
            <span>Äiá»ƒm tá»•ng thá»ƒ</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h2 className="text-4xl font-extrabold text-[#1f2a44]">
            {data.level}
          </h2>

          <p className="mt-3 leading-7 text-[#5b6b85]">
            Beacon Ä‘Ã£ kiá»ƒm tra ngá»¯ phÃ¡p, tá»« vá»±ng, cÃ¡ch diá»…n Ä‘áº¡t vÃ  kháº£ nÄƒng truyá»n
            Ä‘áº¡t Ã½ nghÄ©a cá»§a bÃ i viáº¿t.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#fff0dc] px-3 py-2 text-xs font-extrabold text-[#ff6b00]">
              âœï¸ Writing
            </span>

            <span className="rounded-full bg-[#f7f1fb] px-3 py-2 text-xs font-extrabold text-[#6b5796]">
              ðŸ“š {data.detectedLanguage || "English"}
            </span>

            <span className="rounded-full bg-[#e8fff1] px-3 py-2 text-xs font-extrabold text-emerald-600">
              ðŸŽ¯ {data.style || "General"}
            </span>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <ScoreItem
          title="Ngữ pháp"
          value={data.grammarScore || 0}
          color="bg-red-50 text-red-500"
          icon="ðŸ“–"
        />

        <ScoreItem
          title="Từ vựng"
          value={data.vocabularyScore || 0}
          color="bg-orange-50 text-orange-500"
          icon="ðŸ“š"
        />

        <ScoreItem
          title="Clarity"
          value={data.clarityScore || 0}
          color="bg-blue-50 text-blue-500"
          icon="ðŸ’¬"
        />

        <ScoreItem
          title="Meaning"
          value={data.meaningScore || 0}
          color="bg-green-50 text-green-500"
          icon="ðŸŽ¯"
        />
      </div>
    </div>
  );
}
function MiniScore({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-4 text-center">
      <div className="text-xl font-extrabold text-[#ff6b00]">{value}</div>
      <p className="mt-1 text-xs font-extrabold text-[#5b6b85]">{label}</p>
    </div>
  );
}

function ErrorList({ data }: { data: WritingCheckResult }) {
  const errors = data.corrections ?? [];

  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <h2 className="text-xl font-extrabold text-[#1f2a44]">Lá»—i cáº§n sá»­a</h2>

      <div className="mt-4 space-y-3">
        {errors.length > 0 ? (
          errors.map((item, index) => (
            <div
              key={`${item.wrong}-${index}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-extrabold text-[#1f2a44]">{item.type}</h3>

                <span className="rounded-full bg-[#fff0dc] px-3 py-1 text-xs font-extrabold text-[#ff6b00]">
                  {item.level}
                </span>
              </div>

              <p className="font-bold text-red-500">{item.wrong}</p>

              <p className="font-bold text-emerald-600">â†’ {item.correct}</p>

              <p className="mt-2 text-sm leading-6 text-[#5b6b85]">
                {item.explanation}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-center font-bold text-emerald-600">
            ðŸŽ‰ KhÃ´ng phÃ¡t hiá»‡n lá»—i ngá»¯ phÃ¡p Ä‘Ã¡ng ká»ƒ
          </div>
        )}
      </div>
    </div>
  );
}

function ImprovedVersion({ data }: { data: WritingCheckResult }) {
  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <h2 className="text-xl font-extrabold text-[#1f2a44]">
        PhiÃªn báº£n Beacon gá»£i Ã½
      </h2>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 font-bold leading-7 text-[#1f2a44]">
        {data.suggestedVersion || "Beacon chÆ°a cÃ³ phiÃªn báº£n gá»£i Ã½."}
      </div>
    </div>
  );
}

function SuggestionGrid({ data }: { data: WritingCheckResult }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <SuggestionBox title="Tá»«/cá»¥m tá»« nÃªn há»c" items={data.phrases ?? []} />

      <SuggestionBox
        title="BÃ i há»c gá»£i Ã½"
        items={
          data.learningTips?.map((item) => `${item.title}: ${item.content}`) ??
          []
        }
      />
    </div>
  );
}
function SuggestionBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[22px] border border-[#ead8c2] bg-white p-5 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <h3 className="font-extrabold text-[#1f2a44]">{title}</h3>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl bg-slate-50 px-4 py-3 font-bold text-[#1f2a44]"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function StudyNote({ note }: { note?: string }) {
  return (
    <div className="rounded-[24px] bg-gradient-to-r from-[#1f2a44] to-[#6b5796] p-6 text-white shadow-[0_24px_70px_rgba(31,42,68,0.12)]">
      <h2 className="text-2xl font-extrabold">ðŸ’¡ Máº¹o há»c tá»« Beacon</h2>

      <p className="mt-3 leading-7 text-white/90">
        {note ||
          "Sau khi sá»­a bÃ i, hÃ£y Ä‘á»c láº¡i phiÃªn báº£n Ä‘Ã£ sá»­a 3 láº§n Ä‘á»ƒ ghi nhá»› cáº¥u trÃºc cÃ¢u tá»± nhiÃªn hÆ¡n."}
      </p>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-[#fff4e8] px-4 py-3 font-extrabold text-[#1f2a44]">
      âœ“ {text}
    </div>
  );
}

function WritingLoading() {
  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-10 text-center">
      <video
        src="/miu-writing.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="mx-auto h-72 w-72 rounded-[32px]"
      />

      <h2 className="mt-5 text-4xl font-extrabold text-[#1f2a44]">
        Beacon Ä‘ang sá»­a bÃ i...
      </h2>

      <p className="mt-3 text-[#5b6b85]">
        Äang kiá»ƒm tra ngá»¯ phÃ¡p, tá»« vá»±ng vÃ  cÃ¡ch diá»…n Ä‘áº¡t.
      </p>

      <div className="mt-5 flex justify-center gap-2">
        <span className="h-3 w-3 animate-bounce rounded-full bg-[#ff6b00]" />
        <span className="h-3 w-3 animate-bounce rounded-full bg-[#ff6b00] [animation-delay:0.2s]" />
        <span className="h-3 w-3 animate-bounce rounded-full bg-[#ff6b00] [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

function WritingNotFound() {
  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-10 text-center">
      <video
        src="/miu-sad.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="mx-auto h-72 w-72 rounded-[32px]"
      />

      <h2 className="mt-5 text-4xl font-extrabold text-[#1f2a44]">
        Beacon chÆ°a hiá»ƒu bÃ i viáº¿t nÃ y ðŸ˜¿
      </h2>

      <p className="mt-3 text-[#5b6b85]">HÃ£y thá»­ nháº­p Ä‘oáº¡n vÄƒn dÃ i hÆ¡n.</p>
    </div>
  );
}

function WritingError() {
  return (
    <div className="rounded-[26px] border border-red-200 bg-white p-10 text-center">
      <div className="text-7xl">ðŸ˜µ</div>

      <h2 className="mt-5 text-4xl font-extrabold text-[#1f2a44]">
        Beacon gáº·p sá»± cá»‘
      </h2>

      <p className="mt-3 text-[#5b6b85]">KhÃ´ng thá»ƒ káº¿t ná»‘i AI lÃºc nÃ y.</p>
    </div>
  );
}

function EmptyWritingResult() {
  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-12 text-center">
      <div className="text-7xl">ðŸ“</div>

      <h2 className="mt-5 text-3xl font-extrabold text-[#1f2a44]">
        HÃ£y dÃ¡n bÃ i viáº¿t Ä‘á»ƒ báº¯t Ä‘áº§u
      </h2>

      <p className="mt-3 text-[#5b6b85]">
        Beacon sáº½ phÃ¢n tÃ­ch ngá»¯ phÃ¡p, tá»« vá»±ng vÃ  cÃ¡ch diá»…n Ä‘áº¡t.
      </p>
    </div>
  );
}

function ScoreItem({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>

        <span
          className={`rounded-full px-3 py-1 text-xs font-extrabold ${color}`}
        >
          {value}%
        </span>
      </div>

      <h3 className="mt-4 font-extrabold text-[#1f2a44]">{title}</h3>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#ff6b00]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

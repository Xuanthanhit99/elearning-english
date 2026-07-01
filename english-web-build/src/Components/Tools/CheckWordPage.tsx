"use client";

import { api } from "@/src/lib/axios";
import { useState } from "react";

type WordCheckResult = {
  word?: string;
  ipa?: string;
  phonetic?: string;
  partOfSpeech?: string;
  level?: string;
  tags?: string[];
  mainMeaning?: string;
  meaning?: string;
  definition?: string;
  synonyms?: {
    word: string;
    meaning: string;
  }[];
  phrases?: {
    phrase: string;
    meaning: string;
  }[];
  examples?: {
    en: string;
    vi: string;
  }[];
  suggestion?: string;
};

const quickWords = ["confident", "schedule", "meeting", "responsibility"];

const languages = [
  { label: "Tiếng Anh", value: "en" },
  { label: "Tiếng Việt", value: "vi" },
  { label: "Tiếng Nhật", value: "ja" },
  { label: "Tiếng Hàn", value: "ko" },
  { label: "Tiếng Trung", value: "zh" },
];

const levels = ["Beginner", "Intermediate", "Advanced"];

export default function CheckWordPage() {
  const [word, setWord] = useState("improve");
  const [fromLang, setFromLang] = useState("en");
  const [toLang, setToLang] = useState("vi");
  const [level, setLevel] = useState("Beginner");
  const [searchData, setSearchData] = useState<WordCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClickCheckWork = async () => {
    if (!word.trim()) return;

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/words/check", {
        word: word.trim(),
        sourceLanguage: fromLang,
        targetLanguage: toLang,
        level,
      });

      const result = res.data?.data ?? res.data;
      if (!result || !result.word) {
        setSearchData(null);
        setError("NOT_FOUND");
        return;
      }
      setSearchData(result);
    } catch (error) {
      setError("SERVER_ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff4e8] px-4 py-14">
      <section className="mx-auto max-w-6xl">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-[#ffd4ad] bg-white px-4 py-2 text-sm font-extrabold text-[#ff6b00] shadow-sm">
              🔤 Công cụ miễn phí
            </div>

            <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-[#1f2a44] lg:text-6xl">
              Check từ nhanh cùng{" "}
              <span className="text-[#ff6b00]">PoppyLingo</span>
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5b6b85]">
              Tra nghĩa, IPA, phát âm, ví dụ, loại từ, từ đồng nghĩa và cách
              dùng theo ngữ cảnh. Phù hợp cho người mới học và cả người đang
              luyện giao tiếp.
            </p>
          </div>

          <div className="rounded-[28px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
            <h2 className="text-2xl font-extrabold text-[#1f2a44]">
              Miu gợi ý
            </h2>

            <p className="mt-3 leading-7 text-[#5b6b85]">
              Đừng chỉ học nghĩa của từ. Hãy học cả ví dụ, cụm từ đi kèm và cách
              phát âm.
            </p>

            <div className="mt-5 space-y-3">
              <Tip text="Có IPA và audio" />
              <Tip text="Có ví dụ Anh - Việt" />
              <Tip text="Có từ đồng nghĩa/trái nghĩa" />
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="h-fit rounded-[26px] border border-[#ead8c2] bg-white p-5 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
            <h2 className="text-2xl font-extrabold text-[#1f2a44]">
              Nhập từ cần check
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#5b6b85]">
              Ví dụ: improve, confident, responsibility, pronunciation...
            </p>

            <label className="mt-5 block rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs font-extrabold text-[#5b6b85]">
                Từ cần dịch
              </span>

              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                className="mt-2 w-full bg-transparent text-2xl font-extrabold text-[#1f2a44] outline-none placeholder:text-slate-300"
                placeholder="improve"
              />
            </label>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold text-[#5b6b85]">
                    Dịch từ
                  </span>
                  <select
                    value={fromLang}
                    onChange={(e) => setFromLang(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
                  >
                    {languages.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="pb-3 text-xl font-extrabold text-[#ff6b00]">
                  →
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold text-[#5b6b85]">
                    Sang
                  </span>
                  <select
                    value={toLang}
                    onChange={(e) => setToLang(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
                  >
                    {languages.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-[#5b6b85]">
                  Trình độ giải thích
                </span>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
                >
                  {levels.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={onClickCheckWork}
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff6b00] py-4 font-extrabold text-white shadow-lg shadow-orange-200 transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Đang check...
                </>
              ) : (
                "Check từ"
              )}
            </button>

            {error && (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
                {error}
              </p>
            )}

            <div className="mt-5 rounded-2xl bg-[#fffaf5] p-4">
              <p className="text-sm font-bold text-[#5b6b85]">Đang chọn:</p>
              <p className="mt-1 font-extrabold text-[#1f2a44]">
                {getLangLabel(fromLang)} → {getLangLabel(toLang)}
              </p>
            </div>

            <div className="mt-5">
              <h3 className="font-extrabold text-[#1f2a44]">Từ hay check</h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {quickWords.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setWord(item)}
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
              <WordLoading />
            ) : error === "NOT_FOUND" ? (
              <WordNotFound />
            ) : error === "SERVER_ERROR" ? (
              <ServerError />
            ) : (
              <>
                <WordResultCard
                  word={searchData}
                  loading={false}
                  fallbackWord={word}
                />

                <ExampleCard
                  examples={searchData?.examples?.map((example: any) => ({
                    source: example.source || example.en || "",
                    target: example.target || example.vi || "",
                  }))}
                />

                <StudySuggestion
                  suggestion={searchData?.suggestion}
                  word={searchData?.word || word}
                />
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function getLangLabel(value: string) {
  return languages.find((item) => item.value === value)?.label || value;
}

function WordResultCard({
  word,
  loading,
  fallbackWord,
}: {
  word: WordCheckResult | null;
  loading: boolean;
  fallbackWord: string;
}) {
  const handleSpeak = () => {
    const text = displayWord;

    if (!text || typeof window === "undefined") return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = displayWord.match(/[àáảãạăâ]/i) ? "vi-VN" : "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  if (loading) {
    return <WordLoading />;
  }

  if (!word) {
    return (
      <div className="rounded-[26px] border border-[#ead8c2] bg-white p-6 text-[#5b6b85]">
        Nhập từ và bấm Check từ để xem kết quả.
      </div>
    );
  }

  const displayWord = word.word || fallbackWord;
  const ipa = word.ipa || word.phonetic || "";
  const meaning =
    word.mainMeaning ||
    word.meaning ||
    word.definition ||
    "Chưa có nghĩa chính.";

  const tags = word.tags?.length
    ? word.tags
    : [word.level || "Beginner", word.partOfSpeech || "Từ vựng"];

  const synonyms =
    word.synonyms?.map(
      (item) => [item.word, item.meaning] as [string, string],
    ) ?? [];

  const phrases =
    word.phrases?.map(
      (item) => [item.phrase, item.meaning] as [string, string],
    ) ?? [];

  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-[#1f2a44]">
            {displayWord}
          </h2>

          <p className="mt-2 font-extrabold text-[#5b6b85]">
            {ipa} {word.partOfSpeech ? `· ${word.partOfSpeech}` : ""}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#f7f1fb] px-3 py-2 text-xs font-extrabold text-[#6b5796]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSpeak}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1f2a44] text-xl text-white"
        >
          🔊
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-5">
        <h3 className="font-extrabold text-[#1f2a44]">Nghĩa chính</h3>
        <p className="mt-2 leading-7 text-[#5b6b85]">
          <b>{displayWord}</b> {meaning}
        </p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <InfoBox
          title="Từ đồng nghĩa"
          items={synonyms}
          emptyText="Chưa có từ đồng nghĩa."
        />

        <InfoBox
          title="Cụm từ hay dùng"
          items={phrases}
          emptyText="Chưa có cụm từ."
        />
      </div>
    </div>
  );
}

function InfoBox({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: [string, string][];
  emptyText?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-white p-5">
      <h3 className="font-extrabold text-[#1f2a44]">{title}</h3>

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map(([en, vi]) => (
            <div
              key={`${en}-${vi}`}
              className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 font-bold"
            >
              <span className="text-[#1f2a44]">{en}</span>
              <span className="text-right text-[#ff6b00]">{vi}</span>
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-slate-50 px-4 py-3 font-bold text-[#5b6b85]">
            {emptyText || "Chưa có dữ liệu."}
          </div>
        )}
      </div>
    </div>
  );
}

function ExampleCard({
  examples,
}: {
  examples?: { source: string; target: string }[];
}) {
  console.log("examples", examples);
  const list = examples?.length ? examples : [];
  console.log("list", list);
  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <h2 className="text-xl font-extrabold text-[#1f2a44]">Ví dụ dễ hiểu</h2>

      <div className="mt-4 space-y-3">
        {list.length ? (
          list.map((item) => (
            <div key={item.source} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-extrabold text-[#1f2a44]">{item.source}</p>
              <p className="mt-1 text-[#5b6b85]">{item.target}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 font-bold text-[#5b6b85]">
            Sau khi check từ, ví dụ sẽ hiển thị ở đây.
          </div>
        )}
      </div>
    </div>
  );
}

function StudySuggestion({
  suggestion,
  word,
}: {
  suggestion?: string;
  word: string;
}) {
  return (
    <div className="rounded-[24px] bg-gradient-to-r from-[#1f2a44] to-[#6b5796] p-6 text-white shadow-[0_24px_70px_rgba(31,42,68,0.12)]">
      <h2 className="text-2xl font-extrabold">Gợi ý học từ này</h2>
      <p className="mt-3 leading-7 text-white/90">
        {suggestion ||
          `Hãy tự đặt 3 câu với từ “${word}”, sau đó dùng tính năng Check bài để Miu sửa giúp bạn.`}
      </p>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-[#fff4e8] px-4 py-3 font-extrabold text-[#1f2a44]">
      ✓ {text}
    </div>
  );
}

function WordLoading() {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-[#ead8c2] bg-white p-8 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      {/* Glow */}
      <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff6b00]/10 blur-3xl" />

      {/* Floating words */}
      <span className="absolute left-10 top-12 animate-float-slow text-xl font-bold text-[#ff6b00]/20">
        improve
      </span>

      <span className="absolute right-12 top-20 animate-float-medium text-lg font-bold text-[#6b5796]/20">
        pronunciation
      </span>

      <span className="absolute left-20 bottom-20 animate-float-fast text-lg font-bold text-[#ff6b00]/20">
        vocabulary
      </span>

      <span className="absolute right-20 bottom-16 animate-float-medium text-lg font-bold text-[#6b5796]/20">
        grammar
      </span>

      {/* Sparkles */}
      <div className="absolute left-1/4 top-1/4 animate-pulse text-2xl">✨</div>

      <div className="absolute right-1/4 top-1/3 animate-bounce text-xl">
        ⭐
      </div>

      <div className="absolute bottom-1/4 left-1/3 animate-pulse text-xl">
        📚
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <video
          src="/miu-search-book.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-64 w-64 rounded-[32px] shadow-xl"
        />

        <h3 className="mt-5 text-3xl font-extrabold text-[#1f2a44]">
          Miu đang tìm từ...
        </h3>

        <p className="mt-3 max-w-lg text-center text-lg leading-8 text-[#5b6b85]">
          Đang tra nghĩa, IPA, ví dụ và cách dùng phù hợp với trình độ của bạn.
        </p>

        <div className="mt-6 flex gap-2">
          <span className="h-3 w-3 animate-bounce rounded-full bg-[#ff6b00]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-[#ff6b00] [animation-delay:0.2s]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-[#ff6b00] [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}

function WordNotFound() {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-[#ead8c2] bg-white p-8 text-center">
      <div className="absolute left-10 top-16 animate-bounce text-4xl">❓</div>

      <div className="absolute right-12 top-20 animate-pulse text-4xl">❔</div>

      <div className="absolute bottom-20 left-20 animate-bounce text-4xl">
        ❓
      </div>

      <div className="absolute left-16 top-10 text-xl font-extrabold text-slate-200">
        improov
      </div>

      <div className="absolute right-16 bottom-24 text-xl font-extrabold text-slate-200">
        grammarr
      </div>

      <div className="absolute left-20 bottom-10 text-xl font-extrabold text-slate-200">
        vocabulary
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[320px] w-[320px] animate-spin rounded-full border-2 border-dashed border-[#ffb347]/30" />
      </div>

      <div className="relative z-10">
        <video
          src="/miu-sad.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="mx-auto h-72 w-72 rounded-[32px]"
        />

        <h2 className="mt-4 text-4xl font-extrabold text-[#1f2a44]">
          Miu chưa tìm thấy từ này 😿
        </h2>

        <p className="mx-auto mt-3 max-w-md text-lg leading-8 text-[#5b6b85]">
          Có thể từ chưa tồn tại hoặc bạn nhập sai chính tả.
        </p>

        <button className="mt-6 rounded-2xl bg-[#ff6b00] px-8 py-4 font-extrabold text-white">
          Thử từ khác
        </button>
      </div>
    </div>
  );
}

function ServerError() {
  return (
    <div className="rounded-[26px] border border-red-200 bg-white p-8 text-center">
      <div className="text-7xl">😵</div>

      <h2 className="mt-4 text-4xl font-extrabold text-[#1f2a44]">
        Miu gặp sự cố
      </h2>

      <p className="mt-3 text-lg text-[#5b6b85]">
        Máy chủ đang bận hoặc kết nối mạng có vấn đề.
      </p>

      <button className="mt-6 rounded-2xl bg-[#ff6b00] px-8 py-4 font-extrabold text-white">
        Thử lại
      </button>
    </div>
  );
}

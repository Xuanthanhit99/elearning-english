"use client";

import { api } from "@/src/lib/axios";
import { useState } from "react";
type WordCheckResult = {
  word?: string;
  ipa?: string;
  partOfSpeech?: string;
  level?: string;
  tags?: string[];
  mainMeaning?: string;
  synonyms?: {
    word: string;
    meaning: string;
  }[];
  phrases?: {
    phrase: string;
    meaning: string;
  }[];
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
  const onClickCheckWork = async () => {
    try {
      const getData = await api.post("/words/check", {
        word: "improve",
        sourceLanguage: "en",
        targetLanguage: "vi",
        level: "Beginner",
      });

      if(getData.status === 201) {
        setSearchData(getData.data)
      }
      console.log("getData", getData);
    } catch (error) {}
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
              <span className="text-[#ff6b00]">MiuLingo</span>
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

            <button onClick={onClickCheckWork} className="mt-4 w-full rounded-2xl bg-[#ff6b00] py-4 font-extrabold text-white shadow-lg shadow-orange-200 transition hover:bg-[#e85f00]">
              Check từ
            </button>

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
            <WordResultCard word={searchData} />
            <ExampleCard />
            <StudySuggestion />
          </section>
        </div>
      </section>
    </main>
  );
}

function getLangLabel(value: string) {
  return languages.find((item) => item.value === value)?.label || value;
}


function WordResultCard({ word }: { word: WordCheckResult | null }) {
  if (!word) {
    return (
      <div className="rounded-[26px] border border-[#ead8c2] bg-white p-6 text-[#5b6b85]">
        Nhập từ và bấm Check từ để xem kết quả.
      </div>
    );
  }

  const tags = word.tags?.length
    ? word.tags
    : [word.level || "Beginner", word.partOfSpeech || "Từ vựng"];

  const synonyms =
    word.synonyms?.map((item) => [item.word, item.meaning] as [string, string]) ||
    [];

  const phrases =
    word.phrases?.map((item) => [item.phrase, item.meaning] as [string, string]) ||
    [];

  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-[#1f2a44]">
            {word.word || "Không có dữ liệu"}
          </h2>

          <p className="mt-2 font-extrabold text-[#5b6b85]">
            {word.ipa || ""} {word.partOfSpeech ? `· ${word.partOfSpeech}` : ""}
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
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1f2a44] text-xl text-white"
        >
          🔊
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-5">
        <h3 className="font-extrabold text-[#1f2a44]">Nghĩa chính</h3>
        <p className="mt-2 leading-7 text-[#5b6b85]">
          <b>{word.word}</b> {word.mainMeaning || "Chưa có nghĩa chính."}
        </p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <InfoBox title="Từ đồng nghĩa" items={synonyms} />

        <InfoBox title="Cụm từ hay dùng" items={phrases} />
      </div>
    </div>
  );
}

function InfoBox({
  title,
  items,
}: {
  title: string;
  items: [string, string][];
}) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-white p-5">
      <h3 className="font-extrabold text-[#1f2a44]">{title}</h3>

      <div className="mt-4 space-y-3">
        {items.map(([en, vi]) => (
          <div
            key={en}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 font-bold"
          >
            <span className="text-[#1f2a44]">{en}</span>
            <span className="text-[#ff6b00]">{vi}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExampleCard() {
  const examples = [
    [
      "I want to improve my English speaking skills.",
      "Tôi muốn cải thiện kỹ năng nói tiếng Anh của mình.",
    ],
    [
      "Your pronunciation has improved a lot.",
      "Phát âm của bạn đã cải thiện rất nhiều.",
    ],
    [
      "Reading every day can improve your vocabulary.",
      "Đọc mỗi ngày có thể cải thiện vốn từ vựng của bạn.",
    ],
  ];

  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <h2 className="text-xl font-extrabold text-[#1f2a44]">Ví dụ dễ hiểu</h2>

      <div className="mt-4 space-y-3">
        {examples.map(([en, vi]) => (
          <div key={en} className="rounded-2xl bg-slate-50 p-4">
            <p className="font-extrabold text-[#1f2a44]">{en}</p>
            <p className="mt-1 text-[#5b6b85]">{vi}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudySuggestion() {
  return (
    <div className="rounded-[24px] bg-gradient-to-r from-[#1f2a44] to-[#6b5796] p-6 text-white shadow-[0_24px_70px_rgba(31,42,68,0.12)]">
      <h2 className="text-2xl font-extrabold">Gợi ý học từ này</h2>
      <p className="mt-3 leading-7 text-white/90">
        Hãy tự đặt 3 câu với từ “improve”: một câu về học tập, một câu về công
        việc và một câu về bản thân. Sau đó dùng tính năng Check bài để Miu sửa
        giúp bạn.
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

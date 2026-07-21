"use client";

import { api } from "@/src/lib/axios";
import { useState } from "react";
import { useSpeak } from "@/src/hooks/useSpeak";

type WordCheckResult = {
  word?: string;
  audio?: string;
  ipa?: string;
  phonetic?: string;
  partOfSpeech?: string;
  level?: string;
  tags?: string[];
  mainMeaning?: string;
  meaning?: string;
  definition?: string;
  synonyms?: { word: string; meaning: string }[];
  antonyms?: { word: string; meaning: string }[];
  phrases?: { phrase: string; meaning: string }[];
  examples?: { en?: string; vi?: string; source?: string; target?: string }[];
  suggestion?: string;
};

const quickWords = ["sustainable", "environment", "renewable", "carbon footprint", "go green"];
const histories = ["sustainable", "environment", "renewable", "carbon footprint", "go green"];
const savedWords = ["biodiversity", "conservation", "ecosystem", "sustainable", "pollution"];

const languages = [
  { label: "Tiếng Anh", value: "en" },
  { label: "Tiếng Việt", value: "vi" },
  { label: "Tiếng Nhật", value: "ja" },
  { label: "Tiếng Hàn", value: "ko" },
  { label: "Tiếng Trung", value: "zh" },
];

const levels = ["Beginner", "Intermediate", "Advanced"];

export default function CheckWordPage() {
  const [word, setWord] = useState("sustainable");
  const [fromLang, setFromLang] = useState("en");
  const [toLang, setToLang] = useState("vi");
  const [level, setLevel] = useState("Beginner");
  const [searchData, setSearchData] = useState<WordCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { speak, isSpeaking } = useSpeak();

  const onClickCheckWork = async () => {
    if (!word.trim()) return;

    try {
      setLoading(true);
      setError(null);

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
    } catch {
      setError("SERVER_ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8faff] px-4 py-6 text-[#0f1744] lg:px-8">
      <section className="mx-auto max-w-7xl">
        {/* <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-2xl">🦊</div>
            <div>
              <h1 className="text-2xl font-black">Lumi<span className="text-violet-600">Lingo</span></h1>
              <p className="text-sm font-semibold text-slate-500">Check từ nhanh</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[560px]">
            <TopBadge icon="🔥" value="18" label="Streak" />
            <TopBadge icon="⭐" value="2,450" label="XP hôm nay" />
            <TopBadge icon="💎" value="5,230" label="Xu" />
          </div>
        </div> */}

        <div className="mb-6">
          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-extrabold text-violet-700">🔤 Công cụ miễn phí</div>
          <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">Check từ nhanh ⚡</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
            Tra nghĩa, IPA, phát âm, ví dụ, loại từ, từ đồng nghĩa và cụm từ thường dùng theo ngữ cảnh.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(31,42,68,0.06)] lg:p-6">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-violet-500">
                <span className="text-xl">🔎</span>
                <input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onClickCheckWork()}
                  className="w-full bg-transparent font-extrabold outline-none"
                  placeholder="Nhập từ cần check..."
                />
                {word && (
                  <button type="button" onClick={() => setWord("")} className="text-xl text-slate-400">×</button>
                )}
              </div>

              <button
                type="button"
                onClick={onClickCheckWork}
                disabled={loading}
                className="h-14 rounded-2xl bg-violet-600 px-8 font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-60"
              >
                {loading ? "Đang tra cứu..." : "↻ Tra cứu"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_180px]">
              <SelectBox label="Dịch từ" value={fromLang} onChange={setFromLang} options={languages} />
              <SelectBox label="Sang" value={toLang} onChange={setToLang} options={languages} />
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-500">Trình độ</span>
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-500">
                  {levels.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {quickWords.map((item, index) => (
                <button key={item} type="button" onClick={() => setWord(item)} className={`rounded-full px-4 py-2 text-xs font-black ${index === 0 ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {loading ? (
                <WordLoading />
              ) : error === "NOT_FOUND" ? (
                <WordNotFound />
              ) : error === "SERVER_ERROR" ? (
                <ServerError onRetry={onClickCheckWork} />
              ) : (
                <>
                  <WordResultCard
                    word={searchData}
                    fallbackWord={word}
                    speaking={isSpeaking("check-word")}
                    onSpeak={(text, audio) => speak("check-word", text, audio, fromLang === "vi" ? "vi" : "en")}
                  />
                  <ExampleCard
                    examples={searchData?.examples}
                    word={searchData?.word || word}
                    lang={fromLang === "vi" ? "vi" : "en"}
                    isSpeaking={isSpeaking}
                    onSpeak={speak}
                  />
                  <StudySuggestion suggestion={searchData?.suggestion} word={searchData?.word || word} />
                </>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <RightCard title="Lịch sử tra cứu" action="Xóa tất cả">
              {histories.map((item, index) => (
                <button key={item} type="button" onClick={() => setWord(item)} className="flex w-full items-center justify-between rounded-2xl px-2 py-3 text-left transition hover:bg-slate-50">
                  <span className="flex items-center gap-3 font-bold text-slate-600"><span>🕘</span>{item}</span>
                  <span className={`rounded-lg px-3 py-1 text-xs font-black ${index > 2 ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600"}`}>{index > 2 ? "Cụm từ" : "Từ vựng"}</span>
                </button>
              ))}
              <button className="mt-3 w-full font-black text-violet-600">Xem tất cả lịch sử →</button>
            </RightCard>

            <RightCard title="Từ đã lưu" action="Xem tất cả">
              {savedWords.map((item, index) => (
                <div key={item} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-600">{item}</span>
                    <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-600">{index > 1 ? "B2" : "B1"}</span>
                  </div>
                  <span className="text-violet-600">🔖</span>
                </div>
              ))}
            </RightCard>

            <div className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-violet-50 p-6">
              <h3 className="text-xl font-black">💡 Mẹo học từ vựng</h3>
              <p className="mt-3 max-w-[230px] text-sm leading-6 text-slate-600">Tra cứu từ mới mỗi ngày giúp bạn mở rộng vốn từ và cải thiện kỹ năng giao tiếp hiệu quả.</p>
              <button className="mt-5 rounded-2xl border border-violet-200 bg-white px-5 py-3 font-black text-violet-600">Khám phá ngay →</button>
              <div className="absolute bottom-5 right-5 text-6xl">🦊</div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function WordResultCard({
  word,
  fallbackWord,
  speaking,
  onSpeak,
}: {
  word: WordCheckResult | null;
  fallbackWord: string;
  speaking: boolean;
  onSpeak: (text: string, audioUrl?: string | null) => void;
}) {
  if (!word) {
    return <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-8 text-center font-bold text-slate-500">Nhập từ và bấm Tra cứu để xem kết quả.</div>;
  }

  const displayWord = word.word || fallbackWord;
  const ipa = word.ipa || word.phonetic || "";
  const meaning = word.mainMeaning || word.meaning || word.definition || "Chưa có nghĩa chính.";
  const tags = word.tags?.length ? word.tags : [word.level || "B1", word.partOfSpeech || "Từ vựng"];

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_390px]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-black">{displayWord}</h2>
            <button
              type="button"
              onClick={() => displayWord && onSpeak(displayWord, word.audio)}
              disabled={speaking || !displayWord}
              className={`grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600 transition disabled:cursor-not-allowed ${speaking ? "animate-pulse opacity-70" : "hover:bg-violet-200"}`}
            >
              🔊
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ipa && <span className="font-bold text-slate-500">{ipa}</span>}
            {tags.map((tag) => <span key={tag} className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-600">{tag}</span>)}
          </div>

          <Info title="Loại từ" text={word.partOfSpeech || "Chưa có loại từ."} />
          <Info title="Nghĩa" text={meaning} />

          <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
            <p className="font-black text-emerald-700">Cụm từ hay dùng</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{word.phrases?.[0]?.phrase || "Chưa có cụm từ."} {word.phrases?.[0]?.meaning ? `- ${word.phrases[0].meaning}` : ""}</p>
          </div>
        </div>

        <div>
          <div className="grid h-56 place-items-center rounded-[26px] bg-gradient-to-br from-sky-100 via-emerald-100 to-violet-100 text-7xl">🌳</div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <ActionButton text="Lưu từ" icon="🔖" />
            <ActionButton text="Ôn tập" icon="▦" />
            <ActionButton text="Chia sẻ" icon="↗" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <MiniList title="Từ đồng nghĩa" items={word.synonyms?.map((x) => [x.word, x.meaning]) || []} />
        <MiniList title="Cụm từ liên quan" items={word.phrases?.map((x) => [x.phrase, x.meaning]) || []} />
      </div>
    </div>
  );
}

function ExampleCard({
  examples,
  word,
  lang,
  isSpeaking,
  onSpeak,
}: {
  examples?: WordCheckResult["examples"];
  word: string;
  lang: "en" | "vi";
  isSpeaking: (key: string) => boolean;
  onSpeak: (key: string, text: string, audioUrl?: string | null, lang?: "en" | "vi") => void;
}) {
  const list = examples?.map((item) => ({ source: item.source || item.en || "", target: item.target || item.vi || "" })).filter((x) => x.source || x.target) || [];

  return (
    <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6">
      <h3 className="text-xl font-black">Ví dụ</h3>
      <div className="mt-4 space-y-3">
        {list.length ? list.map((item, index) => {
          const key = `example-${index}`;
          const speaking = isSpeaking(key);
          return (
            <div key={`${item.source}-${item.target}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4">
              <button
                type="button"
                onClick={() => item.source && onSpeak(key, item.source, null, lang)}
                disabled={speaking || !item.source}
                className={`grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-violet-600 transition disabled:cursor-not-allowed ${speaking ? "animate-pulse opacity-70" : "hover:bg-violet-200"}`}
              >
                🔊
              </button>
              <div className="flex-1">
                <p className="font-bold text-[#0f1744]">{highlightWord(item.source, word)}</p>
                <p className="mt-1 text-sm text-slate-500">{item.target}</p>
              </div>
              <span className="text-slate-400">☆</span>
            </div>
          );
        }) : <div className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Sau khi check từ, ví dụ sẽ hiển thị ở đây.</div>}
      </div>
    </div>
  );
}

function StudySuggestion({ suggestion, word }: { suggestion?: string; word: string }) {
  return <div className="mt-6 rounded-[26px] bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white"><h3 className="text-2xl font-black">Gợi ý học từ này</h3><p className="mt-3 leading-7 text-white/90">{suggestion || `Hãy tự đặt 3 câu với từ “${word}”, sau đó dùng tính năng Check bài để Lumi sửa giúp bạn.`}</p></div>;
}

function SelectBox({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { label: string; value: string }[] }) {
  return <label className="block"><span className="mb-2 block text-xs font-black text-slate-500">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-500">{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>;
}

function TopBadge({ icon, value, label }: { icon: string; value: string; label: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"><span className="text-2xl">{icon}</span><div><p className="font-black">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></div>;
}

function RightCard({ title, action, children }: { title: string; action: string; children: React.ReactNode }) {
  return <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-black">{title}</h3><button className="text-xs font-black text-violet-600">{action}</button></div>{children}</div>;
}

function Info({ title, text }: { title: string; text: string }) {
  return <div className="mt-5"><p className="font-black">{title}</p><p className="mt-1 leading-7 text-slate-500">{text}</p></div>;
}

function ActionButton({ icon, text }: { icon: string; text: string }) {
  return <button className="h-14 rounded-2xl border border-slate-200 font-black text-violet-600"><span className="mr-1">{icon}</span>{text}</button>;
}

function MiniList({ title, items }: { title: string; items: string[][] }) {
  return <div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black">{title}</h3><div className="mt-3 space-y-2">{items.length ? items.slice(0, 4).map(([a, b]) => <div key={`${a}-${b}`} className="flex justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold"><span>{a}</span><span className="text-right text-violet-600">{b}</span></div>) : <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Chưa có dữ liệu.</div>}</div></div>;
}

function WordLoading() {
  return <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-10 text-center"><div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-50 to-transparent" /><div className="relative z-10"><div className="mx-auto grid h-24 w-24 animate-bounce place-items-center rounded-full bg-violet-100 text-5xl">🦊</div><h3 className="mt-5 text-3xl font-black">Lumi đang tìm từ...</h3><p className="mt-3 text-slate-500">Đang tra nghĩa, IPA, ví dụ và cách dùng phù hợp với trình độ của bạn.</p></div></div>;
}

function WordNotFound() {
  return <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center"><div className="text-7xl">😿</div><h3 className="mt-4 text-3xl font-black">Lumi chưa tìm thấy từ này</h3><p className="mt-3 text-slate-500">Có thể từ chưa tồn tại hoặc bạn nhập sai chính tả.</p></div>;
}

function ServerError({ onRetry }: { onRetry: () => void }) {
  return <div className="rounded-[28px] border border-red-200 bg-white p-10 text-center"><div className="text-7xl">😵</div><h3 className="mt-4 text-3xl font-black">Lumi gặp sự cố</h3><p className="mt-3 text-slate-500">Máy chủ đang bận hoặc kết nối mạng có vấn đề.</p><button onClick={onRetry} className="mt-6 rounded-2xl bg-violet-600 px-8 py-4 font-black text-white">Thử lại</button></div>;
}

function highlightWord(text: string, word: string) {
  if (!text || !word) return text;
  const index = text.toLowerCase().indexOf(word.toLowerCase());
  if (index < 0) return text;
  return <>{text.slice(0, index)}<span className="text-violet-600">{text.slice(index, index + word.length)}</span>{text.slice(index + word.length)}</>;
}

function getLangLabel(value: string) {
  return languages.find((item) => item.value === value)?.label || value;
}

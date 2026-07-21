"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";
import { useSpeak } from "@/src/hooks/useSpeak";

type TodayVocabulary = {
  id?: string;
  locked?: boolean;
  reason?: string;
  topic?: { id: string; name: string };
};

type Flashcard = {
  wordId: string;
  front: string;
  phonetic?: string | null;
  audio?: string | null;
  back?: string | null;
  example?: string | null;
  partOfSpeech?: string | null;
  progress?: { status?: string } | null;
};

type FlashcardSession = {
  dayId: string;
  topic?: { id: string; name: string };
  total: number;
  cards: Flashcard[];
};

const emojiMap: Record<string, string> = {
  banana: "1f34c",
  apple: "1f34e",
  bread: "1f35e",
  coffee: "2615",
  conservation: "1f331",
  conserve: "1f331",
  "eco-friendly": "1f331",
  environment: "1f30d",
  earth: "1f30d",
  ecosystem: "1f333",
  emission: "1f32b-fe0f",
  recycle: "267b-fe0f",
  recyclable: "267b-fe0f",
  renewable: "267b-fe0f",
  reusable: "267b-fe0f",
  tree: "1f333",
  forest: "1f332",
  water: "1f4a7",
  computer: "1f4bb",
  travel: "1f9f3",
  phone: "1f4f1",
  book: "1f4d6",
};

const escapeSvg = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildWordSvg = (word: string) => {
  const clean = word.toLowerCase().trim();
  const isNature = /(environment|eco|green|recycle|tree|forest|nature|conservation|sustain)/.test(clean);
  const isFood = /(banana|apple|orange|bread|rice|coffee|food|fruit)/.test(clean);
  const isTech = /(computer|phone|technology|internet|screen)/.test(clean);
  const bg = isFood ? "#f7e79a" : isNature ? "#dcfce7" : isTech ? "#dbeafe" : "#efe9ff";
  const fg = isFood ? "#f59e0b" : isNature ? "#16a34a" : isTech ? "#2563eb" : "#6d35ff";
  const initial = escapeSvg((word || "V").slice(0, 1).toUpperCase());
  const label = escapeSvg(word || "Vocabulary");
  const icon = isNature
    ? `<path d="M112 148c28-76 94-120 176-111 3 85-45 144-129 156 17-28 44-56 83-81-50 16-87 45-130 36Z" fill="${fg}"/><path d="M116 162c46-39 86-64 136-82" stroke="#065f46" stroke-width="10" stroke-linecap="round"/>`
    : isFood
      ? `<path d="M116 136c32-31 80-32 111-7-26 46-83 63-122 32 2-9 5-18 11-25Z" fill="${fg}"/><path d="M159 93c-4-18 5-35 23-49 12 23 9 45-7 64" fill="#7c3f12"/><path d="M181 112c43-17 83 2 100 29-42 25-93 18-117-13" fill="#facc15"/>`
      : isTech
        ? `<rect x="84" y="84" width="232" height="150" rx="24" fill="${fg}"/><rect x="110" y="112" width="180" height="86" rx="13" fill="#eff6ff"/><path d="M164 262h72M200 234v28" stroke="${fg}" stroke-width="14" stroke-linecap="round"/>`
        : `<circle cx="200" cy="142" r="78" fill="${fg}"/><text x="200" y="172" text-anchor="middle" font-family="Arial, sans-serif" font-size="84" font-weight="900" fill="#fff">${initial}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <rect width="400" height="300" rx="30" fill="${bg}"/>
    <circle cx="72" cy="58" r="42" fill="#fff" opacity=".35"/>
    <circle cx="330" cy="238" r="62" fill="#fff" opacity=".28"/>
    ${icon}
    <rect x="64" y="238" width="272" height="38" rx="19" fill="#fff" opacity=".84"/>
    <text x="200" y="263" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#111827">${label}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const imageForWord = (word: string) => {
  const clean = word.toLowerCase().trim();
  const code = emojiMap[clean];
  if (code) {
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${code}.svg`;
  }
  return buildWordSvg(word);
};

export default function VocabularyFlashcardsPage() {
  const [today, setToday] = useState<TodayVocabulary | null>(null);
  const [session, setSession] = useState<FlashcardSession | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reviewed, setReviewed] = useState<Record<string, string>>({});
  const { speak, isSpeaking } = useSpeak();

  const cards = session?.cards || [];
  const activeCard = cards[activeIndex] || null;
  const learnedCount = cards.filter((card) =>
    ["KNOWN", "MASTERED"].includes(card.progress?.status || ""),
  ).length;
  const completedCount = Object.keys(reviewed).length;
  const total = cards.length || 1;
  const percent = Math.round(((learnedCount + completedCount) / total) * 100);

  const loadFlashcards = async () => {
    setLoading(true);
    setMessage("");

    try {
      const todayRes = await api.get("/vocabulary/today");
      const todayData = todayRes.data;
      setToday(todayData);

      if (todayData?.locked || !todayData?.id) {
        setSession(null);
        setLoading(false);
        return;
      }

      const cardsRes = await api.get(
        `/vocabulary/daily/${todayData.id}/flashcards`,
      );
      setSession(cardsRes.data);
      setActiveIndex(0);
      setFlipped(false);
    } catch {
      setMessage("Không tải được flashcard hôm nay. Hãy đăng nhập lại rồi thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlashcards();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrevious();
      if (["1", "2", "3", "4"].includes(event.key)) {
        const map = {
          "1": "AGAIN",
          "2": "HARD",
          "3": "GOOD",
          "4": "EASY",
        } as const;
        reviewCard(map[event.key as "1" | "2" | "3" | "4"]);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const goNext = () => {
    setFlipped(false);
    setActiveIndex((index) => Math.min(cards.length - 1, index + 1));
  };

  const goPrevious = () => {
    setFlipped(false);
    setActiveIndex((index) => Math.max(0, index - 1));
  };

  const shuffleCards = () => {
    if (!session) return;
    setSession({
      ...session,
      cards: [...session.cards].sort(() => Math.random() - 0.5),
    });
    setActiveIndex(0);
    setFlipped(false);
  };

  const reviewCard = async (rating: "AGAIN" | "HARD" | "GOOD" | "EASY") => {
    if (!activeCard) return;

    await api.post(`/vocabulary/flashcards/${activeCard.wordId}/review`, {
      rating,
    });
    setReviewed((items) => ({ ...items, [activeCard.wordId]: rating }));

    if (activeIndex < cards.length - 1) {
      goNext();
    } else {
      setMessage("Bạn đã ôn hết bộ flashcard hôm nay.");
    }
  };

  const imageUrl = useMemo(
    () => (activeCard ? imageForWord(activeCard.front) : ""),
    [activeCard],
  );

  return (
    <div className="grid gap-7 px-4 py-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    href="/vocabulary"
                    className="inline-flex items-center gap-2 text-sm font-black text-[#4f5790]"
                  >
                    <AppIcon name="chevronLeft" bare size={18} />
                    Quay lại
                  </Link>
                  <h1 className="mt-7 text-3xl font-black">
                    Flashcard - {session?.topic?.name || today?.topic?.name || "Từ vựng"}{" "}
                    <AppIcon name="leaf" tone="emerald" />
                  </h1>
                  <p className="mt-3 text-sm font-bold text-[#69708b]">
                    Học từ vựng hiệu quả hơn với flashcard
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={shuffleCards}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#e8e9f5] bg-white px-5 py-3 text-sm font-black text-[#4f5790]"
                  >
                    <AppIcon name="sparkles" bare size={16} />
                    Trộn thẻ
                  </button>
                  <button className="grid h-12 w-12 place-items-center rounded-xl border border-[#e8e9f5] bg-white text-[#4f5790]">
                    <AppIcon name="settings" bare size={18} />
                  </button>
                </div>
              </div>

              {today?.locked ? (
                <div className="mt-8 rounded-2xl border border-orange-100 bg-orange-50 p-6 font-bold text-orange-700">
                  {today.reason || "Bạn cần mở khóa bài học hôm nay trước."}
                </div>
              ) : (
                <div className="mt-8">
                  <div className="grid items-center gap-4 lg:grid-cols-[56px_minmax(0,1fr)_56px]">
                    <button
                      onClick={goPrevious}
                      disabled={activeIndex === 0}
                      className="hidden h-14 w-14 place-items-center rounded-full border border-[#e8e9f5] bg-white text-[#6d35ff] shadow-sm disabled:opacity-40 lg:grid"
                    >
                      <AppIcon name="chevronLeft" bare size={24} />
                    </button>

                    <FlashcardView
                      card={activeCard}
                      flipped={flipped}
                      imageUrl={imageUrl}
                      index={activeIndex}
                      loading={loading}
                      total={cards.length}
                      onFlip={() => setFlipped((value) => !value)}
                      speaking={activeCard ? isSpeaking(activeCard.wordId) : false}
                      onSpeak={() =>
                        activeCard && speak(activeCard.wordId, activeCard.front, activeCard.audio)
                      }
                    />

                    <button
                      onClick={goNext}
                      disabled={activeIndex >= cards.length - 1}
                      className="hidden h-14 w-14 place-items-center rounded-full border border-[#e8e9f5] bg-white text-[#6d35ff] shadow-sm disabled:opacity-40 lg:grid"
                    >
                      <AppIcon name="chevronRight" bare size={24} />
                    </button>
                  </div>

                  <p className="mt-5 text-center text-sm font-bold text-[#69708b]">
                    <span className="text-amber-500">💡</span> Nhấn vào thẻ để xem
                    nghĩa và ví dụ
                  </p>

                  <div className="mt-8 grid gap-4 md:grid-cols-4">
                    <RatingButton
                      label="Không nhớ"
                      sub="Sẽ ôn lại sau"
                      tone="red"
                      onClick={() => reviewCard("AGAIN")}
                    />
                    <RatingButton
                      label="Khó nhớ"
                      sub="Ôn lại sau"
                      tone="orange"
                      onClick={() => reviewCard("HARD")}
                    />
                    <RatingButton
                      label="Dễ nhớ"
                      sub="Ôn lại sau"
                      tone="green"
                      onClick={() => reviewCard("GOOD")}
                    />
                    <RatingButton
                      label="Rất dễ nhớ"
                      sub="Không cần ôn lại"
                      tone="purple"
                      onClick={() => reviewCard("EASY")}
                    />
                  </div>

                  {message && (
                    <div className="mt-6 rounded-xl bg-[#ecfdf5] px-5 py-4 font-bold text-[#15803d]">
                      {message}
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <ProgressPanel
                completed={learnedCount + completedCount}
                percent={percent}
                remaining={Math.max(0, total - learnedCount - completedCount)}
                reviewToday={cards.filter((card) => card.progress?.status === "REVIEW").length}
                total={total}
              />
              <TopicPanel topic={session?.topic?.name || today?.topic?.name} total={total} />
              <StatsPanel total={total} />
              <TipsPanel />
              <ShortcutsPanel />
            </aside>
    </div>
  );
}

function FlashcardView({
  card,
  flipped,
  imageUrl,
  index,
  loading,
  onFlip,
  total,
  speaking,
  onSpeak,
}: {
  card: Flashcard | null;
  flipped: boolean;
  imageUrl: string;
  index: number;
  loading: boolean;
  onFlip: () => void;
  total: number;
  speaking: boolean;
  onSpeak: () => void;
}) {
  if (loading) {
    return (
      <div className="grid min-h-[620px] place-items-center rounded-[28px] border border-[#e8e9f5] bg-white font-bold text-[#69708b] shadow-sm">
        Đang tải flashcard...
      </div>
    );
  }

  if (!card) {
    return (
      <div className="grid min-h-[620px] place-items-center rounded-[28px] border border-[#e8e9f5] bg-white font-bold text-[#69708b] shadow-sm">
        Chưa có flashcard cho hôm nay.
      </div>
    );
  }

  return (
    <button
      onClick={onFlip}
      className="min-h-[620px] w-full rounded-[28px] border border-[#e8e9f5] bg-white p-8 text-center shadow-[0_20px_70px_rgba(109,53,255,0.12)]"
    >
      <div className="flex items-start justify-between">
        <span className="rounded-xl bg-[#efe9ff] px-5 py-2 text-lg font-black text-[#6d35ff]">
          {index + 1} / {Math.max(total, 1)}
        </span>
        <div className="flex gap-3 text-[#8b91aa]">
          <AppIcon name="star" bare size={24} />
          <span
            role="button"
            tabIndex={0}
            aria-label="Nghe phát âm"
            onClick={(event) => {
              event.stopPropagation();
              onSpeak();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onSpeak();
            }}
            className={`grid h-12 w-12 place-items-center rounded-full bg-[#efe9ff] text-[#6d35ff] transition hover:bg-[#e3d9ff] ${speaking ? "animate-pulse opacity-70" : ""}`}
          >
            <AppIcon name="volume" bare size={22} />
          </span>
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-xl">
        <h2 className="text-5xl font-black text-[#101733]">{card.front}</h2>
        <p className="mt-5 text-2xl font-bold text-[#69708b]">
          {card.phonetic || "/.../"}
        </p>
        <div className="mx-auto my-9 h-px w-16 bg-[#d9dced]" />
        {flipped ? (
          <div>
            <p className="text-sm font-black text-[#6d35ff]">
              ({card.partOfSpeech || "word"})
            </p>
            <p className="mt-4 text-2xl font-bold text-[#4f5790]">
              {card.back || "Chưa có nghĩa"}
            </p>
            <p className="mt-5 rounded-2xl bg-[#f8f6ff] p-4 text-sm font-bold leading-6 text-[#69708b]">
              {card.example || "Hãy thử đặt một câu với từ này."}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-black text-[#6d35ff]">
              ({card.partOfSpeech || "word"})
            </p>
            <p className="mt-4 text-xl font-bold text-[#4f5790]">
              Nhấn vào thẻ để xem nghĩa
            </p>
          </div>
        )}

        <div className="mt-12 grid place-items-center">
          <div className="grid h-56 w-72 place-items-center rounded-[30px] bg-[#f6e89f] p-8 shadow-inner">
            <img
              src={imageUrl}
              alt={`Ảnh minh họa ${card.front}`}
              className="h-40 w-52 object-contain drop-shadow-[0_18px_18px_rgba(107,67,12,0.22)]"
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function RatingButton({
  label,
  onClick,
  sub,
  tone,
}: {
  label: string;
  onClick: () => void;
  sub: string;
  tone: "red" | "orange" | "green" | "purple";
}) {
  const tones = {
    red: "border-red-200 bg-red-50 text-red-500",
    orange: "border-orange-200 bg-orange-50 text-orange-500",
    green: "border-emerald-200 bg-emerald-50 text-emerald-600",
    purple: "border-violet-200 bg-violet-50 text-[#6d35ff]",
  };
  const faces = {
    red: "😞",
    orange: "🤔",
    green: "😊",
    purple: "🙂",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-5 py-5 text-center font-black ${tones[tone]}`}
    >
      <span className="text-2xl">{faces[tone]}</span>
      <span className="ml-2">{label}</span>
      <span className="mt-2 block text-sm font-bold text-[#69708b]">{sub}</span>
    </button>
  );
}

function ProgressPanel({
  completed,
  percent,
  remaining,
  reviewToday,
  total,
}: {
  completed: number;
  percent: number;
  remaining: number;
  reviewToday: number;
  total: number;
}) {
  return (
    <Panel title="Tiến độ học">
      <div className="grid gap-5 sm:grid-cols-[150px_1fr] xl:grid-cols-1 2xl:grid-cols-[150px_1fr]">
        <div
          className="grid h-36 w-36 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#6d35ff ${Math.min(percent, 100) * 3.6}deg, #d8c9ff 0deg)`,
          }}
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
            <span>
              <span className="block text-3xl font-black">{Math.min(percent, 100)}%</span>
              <span className="block text-xs font-bold text-[#69708b]">
                Đã hoàn thành
              </span>
            </span>
          </div>
        </div>
        <div className="space-y-4 text-sm font-bold text-[#59627f]">
          <Legend color="#22c55e" label="Đã học" value={String(completed)} />
          <Legend color="#6d35ff" label="Còn lại" value={String(remaining)} />
          <Legend color="#f97316" label="Ôn lại hôm nay" value={String(reviewToday)} />
          <Legend color="#8b91aa" label="Tổng thẻ" value={String(total)} />
        </div>
      </div>
    </Panel>
  );
}

function TopicPanel({ topic, total }: { topic?: string; total: number }) {
  return (
    <Panel title="Chủ đề hiện tại">
      <div className="flex items-center gap-4">
        <AppIcon name="leaf" tone="emerald" className="h-14 w-14" size={28} />
        <div className="min-w-0 flex-1">
          <p className="font-black">{topic || "Vocabulary"}</p>
          <p className="mt-1 text-sm font-bold text-[#69708b]">{total} từ vựng</p>
        </div>
        <Link
          href="/vocabulary"
          className="rounded-xl border border-[#e8e9f5] px-4 py-2 text-sm font-black text-[#6d35ff]"
        >
          Đổi chủ đề
        </Link>
      </div>
    </Panel>
  );
}

function StatsPanel({ total }: { total: number }) {
  return (
    <Panel title="Thống kê">
      <div className="grid grid-cols-3 gap-3 text-center">
        <MiniStat icon="calendar" label="Ngày học" value="12" />
        <MiniStat icon="target" label="Từ đã học" value={String(total * 2)} />
        <MiniStat icon="trophy" label="Chuỗi ngày" value="5" />
      </div>
    </Panel>
  );
}

function TipsPanel() {
  return (
    <Panel title="Mẹo học flashcard">
      <div className="space-y-3 text-sm font-bold text-[#69708b]">
        {[
          "Học mỗi ngày một ít để ghi nhớ lâu hơn",
          "Sử dụng âm thanh để phát âm chuẩn",
          "Ôn tập thường xuyên để củng cố trí nhớ",
          "Kết hợp với ví dụ để hiểu sâu hơn",
        ].map((item) => (
          <p key={item} className="flex items-center gap-2">
            <AppIcon name="check" bare size={15} className="text-[#6d35ff]" />
            {item}
          </p>
        ))}
      </div>
    </Panel>
  );
}

function ShortcutsPanel() {
  return (
    <Panel title="Phím tắt">
      <div className="space-y-3 text-sm font-bold text-[#69708b]">
        <Shortcut keys="← →" label="Chuyển thẻ" />
        <Shortcut keys="Space" label="Lật thẻ" />
        <Shortcut keys="1" label="Không nhớ" />
        <Shortcut keys="2" label="Khó nhớ" />
        <Shortcut keys="3" label="Dễ nhớ" />
        <Shortcut keys="4" label="Rất dễ nhớ" />
      </div>
    </Panel>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-black text-[#101733]">{value}</span>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: AppIconName;
  label: string;
  value: string;
}) {
  return (
    <div>
      <AppIcon name={icon} tone="purple" className="mx-auto" />
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-[#69708b]">{label}</p>
    </div>
  );
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <p className="grid grid-cols-[70px_1fr] items-center gap-2">
      <span className="rounded-lg border border-[#e8e9f5] bg-white px-2 py-1 text-center font-black text-[#6d35ff]">
        {keys}
      </span>
      <span>: {label}</span>
    </p>
  );
}

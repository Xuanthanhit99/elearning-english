"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/axios";
import { AppIcon } from "@/src/Components/UI/AppIcon";

type ReviewWord = {
  progressId: string;
  wordId: string;
  word: string;
  phonetic?: string | null;
  audio?: string | null;
  meaningVi?: string | null;
  meaningEn?: string | null;
  example?: string | null;
  status: string;
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  reviewAt?: string | null;
};

type ReviewDashboard = {
  summary?: {
    totalReview: number;
    urgent: number;
    normal: number;
    later: number;
    memoryRate?: number;
    longestGap?: number;
  };
  today?: {
    reviewToday: number;
    completed: number;
    total: number;
    estimatedTime: number;
  };
  trend?: Array<{ date: string; label: string; value: number }>;
  topics?: Array<{ name: string; count: number }>;
};

type ReviewSession = {
  sessionId: string;
  total: number;
  cards: Array<{
    wordId: string;
    word: string;
    phonetic?: string | null;
    meaningVi?: string | null;
    meaningEn?: string | null;
    example?: string | null;
  }>;
};

const fallbackTrend = [
  { label: "15/05", value: 20 },
  { label: "16/05", value: 41 },
  { label: "17/05", value: 65 },
  { label: "18/05", value: 30 },
  { label: "19/05", value: 51 },
  { label: "20/05", value: 59 },
  { label: "21/05", value: 79 },
];

export default function ReviewVocabularyPage() {
  const [reviewWords, setReviewWords] = useState<ReviewWord[]>([]);
  const [dashboard, setDashboard] = useState<ReviewDashboard | null>(null);
  const [reviewSession, setReviewSession] = useState<ReviewSession | null>(
    null,
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"priority" | "topic">("priority");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<
    Array<{ wordId: string; quality: "AGAIN" | "HARD" | "GOOD" | "EASY" }>
  >([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 1,
  });

  const loadReview = async () => {
    setLoading(true);
    setMessage("");

    const [reviewRes, dashboardRes, sessionRes] = await Promise.allSettled([
      api.get("/vocabulary/review", {
        params: { page, limit: pagination.limit },
      }),
      api.get("/vocabulary/review/dashboard"),
      api.get("/vocabulary/review/session"),
    ]);

    if (reviewRes.status === "fulfilled") {
      const next = reviewRes.value.data || {};
      setReviewWords(next.words || []);
      const nextTotalPages = next.totalPages || 1;
      setPagination({
        page: next.page || page,
        limit: next.limit || pagination.limit,
        total: next.total || 0,
        totalPages: nextTotalPages,
      });
      if (page > nextTotalPages) {
        setPage(nextTotalPages);
      }
    }
    if (dashboardRes.status === "fulfilled") {
      setDashboard(dashboardRes.value.data);
    }
    if (sessionRes.status === "fulfilled") {
      setReviewSession(sessionRes.value.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadReview();
  }, [page]);

  const sortedWords = useMemo(() => {
    const items = [...reviewWords];
    if (activeTab === "topic") {
      return items.sort((a, b) => a.word.localeCompare(b.word));
    }
    return items.sort((a, b) => {
      const aScore = a.wrongCount * 3 + a.seenCount;
      const bScore = b.wrongCount * 3 + b.seenCount;
      return bScore - aScore;
    });
  }, [activeTab, reviewWords]);

  const totalReview =
    dashboard?.summary?.totalReview ?? pagination.total ?? reviewWords.length;
  const urgent = dashboard?.summary?.urgent ?? 0;
  const memoryRate = dashboard?.summary?.memoryRate ?? 0;
  const longestGap = dashboard?.summary?.longestGap ?? 0;
  const trend = dashboard?.trend?.length ? dashboard.trend : fallbackTrend;
  const currentCard = reviewSession?.cards?.[sessionIndex] || null;

  const startReview = () => {
    if (!reviewSession?.cards?.length) {
      setMessage("Hiện chưa có từ nào cần ôn.");
      return;
    }
    setSessionIndex(0);
    setSessionAnswers([]);
    setSessionOpen(true);
  };

  const answerCard = async (quality: "AGAIN" | "HARD" | "GOOD" | "EASY") => {
    if (!currentCard || !reviewSession) return;

    const nextAnswers = [
      ...sessionAnswers,
      { wordId: currentCard.wordId, quality },
    ];

    if (sessionIndex < reviewSession.cards.length - 1) {
      setSessionAnswers(nextAnswers);
      setSessionIndex((index) => index + 1);
      return;
    }

    await api.post("/vocabulary/review/session", {
      sessionId: reviewSession.sessionId,
      answers: nextAnswers,
    });
    setSessionOpen(false);
    setMessage("Đã lưu kết quả ôn tập. Lịch ôn của bạn đã được cập nhật.");
    await loadReview();
  };

  return (
    <>
      <div className="grid gap-7 px-4 py-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="min-w-0 space-y-6">
              <div>
                <Link
                  href="/vocabulary"
                  className="inline-flex items-center gap-2 text-sm font-black text-[#4f5790]"
                >
                  <AppIcon name="chevronLeft" bare size={18} />
                  Ôn tập
                </Link>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black">Cần ôn lại</h1>
                  <button
                    onClick={loadReview}
                    className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2edff] text-[#6d35ff]"
                  >
                    <AppIcon name="sparkles" bare size={18} />
                  </button>
                </div>
                <p className="mt-3 max-w-3xl text-sm font-bold text-[#69708b]">
                  Những từ bạn đã học nhưng chưa nhớ vững. Ôn lại thường xuyên
                  để ghi nhớ lâu hơn.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                  icon="book"
                  tone="purple"
                  value={String(totalReview)}
                  label="Từ cần ôn lại"
                  note={urgent ? `Tăng ${urgent} từ so với hôm qua` : "Đang ổn định"}
                />
                <MetricCard
                  icon="calendar"
                  tone="orange"
                  value={String(longestGap || dashboard?.today?.estimatedTime || 0)}
                  label="Ngày lâu nhất"
                  note="Bạn đã chưa ôn lại"
                />
                <MetricCard
                  icon="target"
                  tone="emerald"
                  value={`${memoryRate}%`}
                  label="Tỷ lệ ghi nhớ"
                  note="Hiệu quả ôn tập tốt"
                />
              </div>

              <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-[#eceef8] pb-4">
                  <button
                    onClick={() => setActiveTab("priority")}
                    className={`rounded-xl px-4 py-3 text-sm font-black ${
                      activeTab === "priority"
                        ? "bg-[#efe9ff] text-[#6d35ff]"
                        : "text-[#59627f]"
                    }`}
                  >
                    Theo độ ưu tiên
                  </button>
                  <button
                    onClick={() => setActiveTab("topic")}
                    className={`rounded-xl px-4 py-3 text-sm font-black ${
                      activeTab === "topic"
                        ? "bg-[#efe9ff] text-[#6d35ff]"
                        : "text-[#59627f]"
                    }`}
                  >
                    Theo chủ đề
                  </button>
                  <button className="ml-auto inline-flex items-center gap-2 rounded-xl border border-[#e8e9f5] px-4 py-3 text-sm font-black text-[#4f5790]">
                    <AppIcon name="settings" bare size={16} />
                    Bộ lọc
                  </button>
                  <button
                    onClick={startReview}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#6d35ff] px-5 py-3 text-sm font-black text-white"
                  >
                    <AppIcon name="play" bare size={16} />
                    Bắt đầu ôn tập ({reviewSession?.total || totalReview})
                  </button>
                </div>

                <ReviewTable
                  loading={loading}
                  selected={selected}
                  setSelected={setSelected}
                  words={sortedWords}
                />
              </section>

              {message && (
                <div className="rounded-xl bg-[#ecfdf5] px-5 py-4 font-bold text-[#15803d]">
                  {message}
                </div>
              )}

              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </section>

            <aside className="space-y-6">
              <ProgressChart memoryRate={memoryRate} trend={trend} />
              <ReviewTips urgent={urgent} />
              <TopicPanel topics={dashboard?.topics || []} />
              <FoxyTip />
            </aside>
      </div>

      {sessionOpen && currentCard && (
        <ReviewSessionModal
          card={currentCard}
          current={sessionIndex + 1}
          total={reviewSession?.cards.length || 1}
          onAnswer={answerCard}
          onClose={() => setSessionOpen(false)}
        />
      )}
    </>
  );
}

function MetricCard({
  icon,
  label,
  note,
  tone,
  value,
}: {
  icon: "book" | "calendar" | "target";
  label: string;
  note: string;
  tone: "purple" | "orange" | "emerald";
  value: string;
}) {
  const tones = {
    purple: "bg-[#efe9ff] text-[#6d35ff]",
    orange: "bg-orange-50 text-orange-500",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-[#e8e9f5] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-5">
        <span
          className={`grid h-16 w-16 place-items-center rounded-2xl ${tones[tone]}`}
        >
          <AppIcon name={icon} bare size={28} />
        </span>
        <div>
          <div className="text-3xl font-black">{value}</div>
          <p className="mt-1 font-bold text-[#69708b]">{label}</p>
          <p
            className={`mt-2 text-sm font-black ${
              tone === "emerald" ? "text-emerald-600" : "text-[#6d35ff]"
            }`}
          >
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewTable({
  loading,
  selected,
  setSelected,
  words,
}: {
  loading: boolean;
  selected: Record<string, boolean>;
  setSelected: (value: Record<string, boolean>) => void;
  words: ReviewWord[];
}) {
  if (loading) {
    return (
      <div className="py-14 text-center font-bold text-[#69708b]">
        Đang tải danh sách ôn tập...
      </div>
    );
  }

  if (!words.length) {
    return (
      <div className="py-14 text-center font-bold text-[#69708b]">
        Hôm nay chưa có từ cần ôn.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-[#eceef8] text-sm font-black text-[#8b91aa]">
            <th className="w-10 py-4">
              <input type="checkbox" className="h-4 w-4 rounded border-[#cfd3e8]" />
            </th>
            <th className="py-4">Từ vựng</th>
            <th className="py-4">Nghĩa</th>
            <th className="py-4">Lần quên</th>
            <th className="py-4">Lần cuối ôn</th>
            <th className="py-4">Độ ưu tiên</th>
            <th className="py-4 text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {words.map((item) => (
            <tr
              key={item.wordId}
              className="border-b border-[#f0f1f8] text-sm font-bold last:border-0"
            >
              <td className="py-4">
                <input
                  checked={Boolean(selected[item.wordId])}
                  onChange={(event) =>
                    setSelected({
                      ...selected,
                      [item.wordId]: event.target.checked,
                    })
                  }
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#cfd3e8]"
                />
              </td>
              <td className="py-4">
                <div className="flex items-center gap-3">
                  <span className="font-black text-[#101733]">{item.word}</span>
                  <button
                    onClick={() => item.audio && new Audio(item.audio).play()}
                    className="text-[#6d35ff]"
                  >
                    <AppIcon name="volume" bare size={16} />
                  </button>
                </div>
              </td>
              <td className="py-4 text-[#4f5790]">
                {item.meaningVi || item.meaningEn || "Chưa có nghĩa"}
              </td>
              <td className="py-4 text-[#4f5790]">{item.wrongCount} lần</td>
              <td className="py-4 text-[#4f5790]">
                {formatRelative(item.reviewAt)}
              </td>
              <td className="py-4">
                <PriorityBadge wrongCount={item.wrongCount} />
              </td>
              <td className="py-4 text-right text-[#8b91aa]">
                <AppIcon name="settings" bare size={17} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriorityBadge({ wrongCount }: { wrongCount: number }) {
  if (wrongCount >= 3) {
    return (
      <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-red-500">
        Cao
      </span>
    );
  }
  if (wrongCount >= 2) {
    return (
      <span className="rounded-lg bg-orange-50 px-3 py-1 text-xs font-black text-orange-500">
        Trung bình
      </span>
    );
  }
  return (
    <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
      Thấp
    </span>
  );
}

function ProgressChart({
  memoryRate,
  trend,
}: {
  memoryRate: number;
  trend: Array<{ label: string; value: number }>;
}) {
  const points = trend.map((item, index) => {
    const x = 20 + index * (280 / Math.max(trend.length - 1, 1));
    const y = 150 - item.value * 1.25;
    return `${x},${y}`;
  });

  return (
    <Panel title="Tiến độ ôn tập" action="7 ngày qua">
      <svg viewBox="0 0 330 180" className="h-56 w-full">
        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={line}
            x1="20"
            x2="310"
            y1={25 + line * 31}
            y2={25 + line * 31}
            stroke="#eef0fb"
          />
        ))}
        <polyline
          fill="none"
          points={points.join(" ")}
          stroke="#6d35ff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        {trend.map((item, index) => {
          const x = 20 + index * (280 / Math.max(trend.length - 1, 1));
          const y = 150 - item.value * 1.25;
          return <circle key={item.label} cx={x} cy={y} r="5" fill="#6d35ff" />;
        })}
        {trend.map((item, index) => {
          const x = 20 + index * (280 / Math.max(trend.length - 1, 1));
          return (
            <text
              key={item.label}
              x={x}
              y="174"
              textAnchor="middle"
              className="fill-[#59627f] text-[11px] font-bold"
            >
              {item.label}
            </text>
          );
        })}
      </svg>
      <p className="text-center text-sm font-bold text-[#69708b]">
        <span className="text-4xl font-black text-[#6d35ff]">{memoryRate}%</span>{" "}
        Hiệu quả ghi nhớ trung bình
      </p>
    </Panel>
  );
}

function ReviewTips({ urgent }: { urgent: number }) {
  const tips = [
    ["target", "Tập trung ôn các từ ưu tiên cao", `Bạn có ${urgent} từ cần ôn gấp`],
    ["calendar", "Ôn theo phương pháp Spaced Repetition", "Giúp ghi nhớ lâu hơn 2-3 lần"],
    ["sparkles", "Kết hợp Flashcard và Quiz", "Tăng hiệu quả ôn tập đáng kể"],
  ] as const;

  return (
    <Panel title="Gợi ý ôn tập hôm nay">
      <div className="space-y-3">
        {tips.map(([icon, title, desc]) => (
          <div
            key={title}
            className="flex gap-3 rounded-xl bg-[#f8f6ff] p-4"
          >
            <AppIcon name={icon} tone="purple" />
            <div>
              <p className="font-black">{title}</p>
              <p className="mt-1 text-sm font-bold text-[#69708b]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TopicPanel({ topics }: { topics: Array<{ name: string; count: number }> }) {
  const fallback = [
    { name: "Environment", count: 12 },
    { name: "Technology", count: 7 },
    { name: "Health", count: 5 },
    { name: "Education", count: 4 },
    { name: "Travel", count: 4 },
  ];
  const list = topics.length ? topics : fallback;

  return (
    <Panel title="Chủ đề cần ôn lại nhiều">
      <div className="space-y-3">
        {list.map((topic) => (
          <div key={topic.name} className="flex items-center justify-between">
            <span className="font-bold text-[#101733]">{topic.name}</span>
            <span className="rounded-full bg-[#efe9ff] px-3 py-1 text-xs font-black text-[#6d35ff]">
              {topic.count}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FoxyTip() {
  return (
    <section className="overflow-hidden rounded-2xl bg-[#f1edff] p-5">
      <div className="flex items-center gap-4">
        <AppIcon name="sparkles" tone="yellow" />
        <p className="text-sm font-bold leading-6 text-[#4f5790]">
          Ôn tập mỗi ngày chỉ 10-15 phút sẽ giúp bạn nhớ lâu hơn rất nhiều.
        </p>
        <AppIcon name="paw" bare size={70} className="ml-auto text-orange-500" />
      </div>
    </section>
  );
}

function Pagination({
  onPageChange,
  page,
  totalPages,
}: {
  onPageChange: (page: number) => void;
  page: number;
  totalPages: number;
}) {
  const pages = getPaginationItems(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-xl border border-[#e8e9f5] bg-white px-4 py-2 text-sm font-black text-[#4f5790] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Trước
      </button>
      {pages.map((item, index) => (
        <button
          key={`${item}-${index}`}
          disabled={item === "..."}
          onClick={() => typeof item === "number" && onPageChange(item)}
          className={`rounded-xl border border-[#e8e9f5] px-4 py-2 text-sm font-black ${
            item === page
              ? "bg-[#6d35ff] text-white"
              : item === "..."
                ? "cursor-default bg-white text-[#4f5790]"
                : "bg-white text-[#4f5790]"
          }`}
        >
          {item}
        </button>
      ))}
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-xl border border-[#e8e9f5] bg-white px-4 py-2 text-sm font-black text-[#4f5790] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Tiếp
      </button>
    </div>
  );
}

function getPaginationItems(page: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (page >= totalPages - 3) {
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", page - 1, page, page + 1, "...", totalPages];
}

function ReviewSessionModal({
  card,
  current,
  onAnswer,
  onClose,
  total,
}: {
  card: ReviewSession["cards"][number];
  current: number;
  onAnswer: (quality: "AGAIN" | "HARD" | "GOOD" | "EASY") => void;
  onClose: () => void;
  total: number;
}) {
  return (
    <Modal onClose={onClose}>
      <p className="text-sm font-black uppercase text-[#6d35ff]">
        Ôn tập {current}/{total}
      </p>
      <h2 className="mt-3 text-5xl font-black">{card.word}</h2>
      <p className="mt-3 text-lg font-bold text-[#69708b]">{card.phonetic}</p>
      <div className="mt-6 rounded-2xl bg-[#f8f6ff] p-6">
        <p className="text-2xl font-black">
          {card.meaningVi || card.meaningEn || "Chưa có nghĩa"}
        </p>
        <p className="mt-3 font-bold text-[#69708b]">{card.example}</p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <ReviewButton label="Again" tone="red" onClick={() => onAnswer("AGAIN")} />
        <ReviewButton label="Hard" tone="orange" onClick={() => onAnswer("HARD")} />
        <ReviewButton label="Good" tone="green" onClick={() => onAnswer("GOOD")} />
        <ReviewButton label="Easy" tone="purple" onClick={() => onAnswer("EASY")} />
      </div>
    </Modal>
  );
}

function ReviewButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone: "red" | "orange" | "green" | "purple";
}) {
  const tones = {
    red: "border-red-100 text-red-500",
    orange: "border-orange-100 text-orange-500",
    green: "border-emerald-100 text-emerald-600",
    purple: "border-[#6d35ff] bg-[#6d35ff] text-white",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4 py-4 font-black ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

function Panel({
  action,
  children,
  title,
}: {
  action?: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">{title}</h2>
        {action && (
          <button className="rounded-xl border border-[#e8e9f5] px-3 py-2 text-sm font-black text-[#4f5790]">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101733]/45 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-[#efe9ff] font-black text-[#6d35ff]"
        >
          ×
        </button>
        {children}
      </section>
    </div>
  );
}

function formatRelative(value?: string | null) {
  if (!value) return "Hôm nay";
  const date = new Date(value);
  const diff = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 86400000),
  );
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return `${diff} ngày trước`;
}

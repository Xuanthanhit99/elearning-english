// app/vocabulary/review/page.tsx
"use client";

import {
  CalendarDays,
  Gift,
  MoreHorizontal,
  Search,
  Settings,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  Zap,
} from "lucide-react";
import { TopBar, VocabularySidebar } from "../VocabularyPage";
import { useAuthStore } from "@/src/store/authStore";
import { api } from "@/src/lib/axios";
import { useEffect, useState } from "react";

const words = [
  {
    word: "sustainable",
    ipa: "/səˈsteɪ.nə.bəl/",
    type: "adj",
    meaning: "bền vững, có thể duy trì lâu dài",
    image: "🌿",
    last: "2 ngày trước",
    date: "24/05/2026",
    level: "Sắp quên",
    levelStyle: "bg-pink-100 text-pink-600",
  },
  {
    word: "pollution",
    ipa: "/pəˈluː.ʃən/",
    type: "n",
    meaning: "sự ô nhiễm",
    image: "🌎",
    last: "3 ngày trước",
    date: "23/05/2026",
    level: "Cần ôn",
    levelStyle: "bg-orange-100 text-orange-600",
  },
  {
    word: "recycle",
    ipa: "/ˌriːˈsaɪ.kəl/",
    type: "v",
    meaning: "tái chế",
    image: "♻️",
    last: "5 ngày trước",
    date: "21/05/2026",
    level: "Cần ôn",
    levelStyle: "bg-orange-100 text-orange-600",
  },
  {
    word: "innovation",
    ipa: "/ˌɪn.əˈveɪ.ʃən/",
    type: "n",
    meaning: "sự đổi mới, sáng tạo",
    image: "💡",
    last: "9 ngày trước",
    date: "17/05/2026",
    level: "Nên ôn",
    levelStyle: "bg-emerald-100 text-emerald-600",
  },
  {
    word: "transportation",
    ipa: "/ˌtræn.spɔːˈteɪ.ʃən/",
    type: "n",
    meaning: "phương tiện giao thông",
    image: "🚲",
    last: "12 ngày trước",
    date: "14/05/2026",
    level: "Nên ôn",
    levelStyle: "bg-emerald-100 text-emerald-600",
  },
];

export default function ReviewVocabularyPage() {
  const user = useAuthStore((state) => state.user);

  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/avatar-default.png";

  const [suggestions, setSuggestions] = useState<any>(null);
  const [suggestionsDashboard, setSuggestionsDashboard] = useState<any>(null);
  const [reviewSession, setReviewSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  console.log("suggestions", suggestions);

  const loadVocabulary = async () => {
    setLoading(true);
    setMessage("");

    const [ReviewWordRes, ReviewDashboardRes, reviewSessionRes] = await Promise.allSettled([
      api.get("/vocabulary/review"),
      api.get("/vocabulary/review/dashboard"),
      api.get("/vocabulary/review/session"),
    ]);

    if (ReviewWordRes.status === "fulfilled") {
      setSuggestions(ReviewWordRes.value.data);
    }
    if (ReviewDashboardRes.status === "fulfilled") {
      setSuggestionsDashboard(ReviewDashboardRes.value.data);
    }if (reviewSessionRes.status === "fulfilled") {
      setReviewSession(reviewSessionRes.value.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadVocabulary();
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfbff] text-[#101733]">
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <VocabularySidebar />
        <section className="min-w-0 flex-1">
          <TopBar displayName={displayName} avatar={avatar} />
          <section className="px-8 py-7">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="mb-3 text-sm font-semibold text-slate-400">
                  ← Từ vựng / <span className="text-slate-600">Cần ôn lại</span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900">
                  Cần ôn lại ⏰
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Những từ vựng bạn đã học nhưng cần ôn lại để ghi nhớ lâu hơn.
                </p>
              </div>

              <button className="rounded-xl border border-purple-100 bg-white px-4 py-2 text-sm font-bold text-purple-600 shadow-sm">
                Giải thích
              </button>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <SummaryCard suggestionsDashboard={suggestionsDashboard} />
              <ScheduleCard />
              <StreakCard />
            </div>

            <div className="mt-6 rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex gap-3">
                  {[
                    "Tất cả (36)",
                    "Sắp quên (12)",
                    "Cần ôn (16)",
                    "Nên ôn (8)",
                  ].map((tab, index) => (
                    <button
                      key={tab}
                      className={`rounded-xl px-4 py-2 text-sm font-bold ${
                        index === 0
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button className="flex items-center gap-2 rounded-xl border border-purple-100 px-4 py-2 text-sm font-bold text-slate-500">
                    <Search size={15} />
                    Mới nhất
                  </button>
                  <button className="rounded-xl bg-purple-50 p-2 text-purple-600">
                    <Settings size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[1.3fr_1.4fr_1fr_1fr_1fr] border-b border-slate-100 pb-3 text-xs font-bold text-slate-400">
                <div>Từ vựng</div>
                <div>Nghĩa</div>
                <div>Lần cuối học</div>
                <div>Mức độ quên</div>
                <div className="text-right">Hành động</div>
              </div>

              <div>
                {words.map((item) => (
                  <div
                    key={item.word}
                    className="grid grid-cols-[1.3fr_1.4fr_1fr_1fr_1fr] items-center border-b border-slate-100 py-4 last:border-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-3xl">
                        {item.image}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-extrabold text-indigo-700">
                          {item.word}
                          <Volume2 size={15} className="text-purple-400" />
                        </div>
                        <div className="text-xs text-slate-400">{item.ipa}</div>
                        <div className="text-xs text-purple-500">
                          ({item.type})
                        </div>
                      </div>
                    </div>

                    <div className="text-sm font-medium text-slate-600">
                      {item.meaning}
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-600">
                        {item.last}
                      </div>
                      <div className="text-xs text-slate-400">{item.date}</div>
                    </div>

                    <div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${item.levelStyle}`}
                      >
                        {item.level}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button className="rounded-xl bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700">
                        Ôn ngay
                      </button>
                      <button className="rounded-xl border border-slate-100 p-2 text-slate-400">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[260px_1fr] gap-5">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="text-6xl">🐰</div>
                <div className="mt-3 font-extrabold text-slate-800">
                  Ôn tập một chút mỗi ngày 💜
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Chỉ 10-15 phút mỗi ngày sẽ giúp bạn ghi nhớ lâu hơn.
                </p>
              </div>

              <div className="rounded-3xl bg-gradient-to-r from-purple-50 to-indigo-50 p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-extrabold text-slate-800">
                    Mục tiêu ôn tập hôm nay
                  </div>
                  <Gift className="text-purple-500" />
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div className="h-full w-1/2 rounded-full bg-purple-500" />
                </div>

                <div className="mt-2 text-right text-sm font-bold text-purple-600">
                  6 / 12 từ
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function TopStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="text-sm font-extrabold">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function SummaryCard({ suggestionsDashboard }: { suggestionsDashboard: any }) {
  return (
    <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="grid size-28 place-items-center rounded-full border-[8px] border-purple-400 border-t-orange-400">
          <div className="text-center">
            <div className="text-3xl font-extrabold">{suggestionsDashboard ? suggestionsDashboard?.totalReview.toString() : '0'}</div>
            <div className="text-xs text-slate-400">Từ cần ôn lại</div>
          </div>
        </div>

        <div className="flex-1 space-y-3 text-sm font-bold">
          <Row label="Sắp quên (≤ 1 ngày)" value={suggestionsDashboard ? suggestionsDashboard?.urgentReview.toString() : '0'} />
          <Row label="Cần ôn (2 - 7 ngày)" value={suggestionsDashboard ? suggestionsDashboard?.normalReview.toString() : '0'} />
          <Row label="Nên ôn (8 - 30 ngày)" value={suggestionsDashboard ? suggestionsDashboard?.laterReview.toString() : '0'} />
        </div>
      </div>

      <button className="mt-5 w-full rounded-xl bg-purple-600 py-3 font-extrabold text-white shadow-lg shadow-purple-200">
        ⚡ Ôn tập ngay
      </button>
    </div>
  );
}

function ScheduleCard() {
  return (
    <div className="rounded-3xl border border-purple-100 bg-white p-6 text-center shadow-sm">
      <CalendarDays className="mx-auto mb-3 text-purple-500" />
      <div className="font-extrabold text-indigo-700">Lịch ôn tập gợi ý</div>
      <p className="mt-1 text-xs text-slate-400">
        Ôn hôm nay để ghi nhớ tốt nhất!
      </p>

      <div className="mt-5 rounded-2xl bg-orange-50 p-5">
        <div className="text-sm text-slate-400">Từ cần ôn hôm nay</div>
        <div className="mt-2 text-2xl font-extrabold text-indigo-700">
          12 từ
        </div>
        <button className="mt-4 rounded-xl bg-orange-100 px-5 py-2 text-sm font-bold text-orange-600">
          Bắt đầu ôn
        </button>
      </div>
    </div>
  );
}

function StreakCard() {
  return (
    <div className="rounded-3xl border border-purple-100 bg-white p-6 text-center shadow-sm">
      <div className="font-extrabold text-slate-800">🔥 Chuỗi ôn tập</div>

      <div className="mx-auto my-5 grid size-24 place-items-center rounded-full border-[6px] border-orange-300">
        <div>
          <div className="text-3xl font-extrabold text-orange-500">7</div>
          <div className="text-xs text-slate-400">ngày</div>
        </div>
      </div>

      <p className="text-sm font-bold text-slate-500">
        Giữ chuỗi để nhận thưởng!
      </p>

      <div className="mt-4 flex justify-center gap-2 text-xs">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
          <div key={d} className="text-center">
            <div>{i < 6 ? "✅" : "🎁"}</div>
            <div className="mt-1 text-slate-400">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-indigo-700">{value}</span>
    </div>
  );
}

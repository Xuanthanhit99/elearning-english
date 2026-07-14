"use client";

import {
  BookOpen,
  ChevronDown,
  Diamond,
  Flame,
  Gift,
  Grid2X2,
  Heart,
  Home,
  Import,
  List,
  Mic,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Trophy,
  Upload,
  Volume2,
  X,
} from "lucide-react";

const cards = [
  {
    word: "adventure",
    ipa: "/ədˈventʃər/",
    mean: "(n) cuộc phiêu lưu",
    topic: "Daily Life",
    level: "A2",
    status: "Khó",
    last: "Hôm qua",
    liked: true,
  },
  {
    word: "memorable",
    ipa: "/ˈmemərəbl/",
    mean: "(adj) đáng nhớ",
    topic: "Daily Life",
    level: "A2",
    status: "Dễ",
    last: "2 ngày trước",
  },
  {
    word: "explore",
    ipa: "/ɪkˈsplɔːr/",
    mean: "(v) khám phá",
    topic: "Travel",
    level: "B1",
    status: "Trung bình",
    last: "Hôm qua",
    liked: true,
  },
  {
    word: "experience",
    ipa: "/ɪkˈspɪəriəns/",
    mean: "(n) trải nghiệm",
    topic: "Personal Growth",
    level: "B1",
    status: "Dễ",
    last: "3 ngày trước",
  },
  {
    word: "destination",
    ipa: "/ˌdestɪˈneɪʃn/",
    mean: "(n) điểm đến",
    topic: "Travel",
    level: "A2",
    status: "Trung bình",
    last: "Hôm qua",
  },
  {
    word: "delicious",
    ipa: "/dɪˈlɪʃəs/",
    mean: "(adj) ngon, hấp dẫn",
    topic: "Food",
    level: "A2",
    status: "Dễ",
    last: "5 ngày trước",
  },
  {
    word: "confidence",
    ipa: "/ˈkɒnfɪdəns/",
    mean: "(n) sự tự tin",
    topic: "Personal Growth",
    level: "B1",
    status: "Khó",
    last: "Hôm qua",
    liked: true,
  },
  {
    word: "curious",
    ipa: "/ˈkjʊəriəs/",
    mean: "(adj) tò mò",
    topic: "Personality",
    level: "A2",
    status: "Dễ",
    last: "4 ngày trước",
  },
];

export default function AllFlashcardsPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#120b5f]">
      <div className="flex">
        <div className="hidden">
          <Sidebar />
        </div>

        <main className="flex-1">
          <div className="grid grid-cols-[1fr_420px] gap-9 px-9 py-8">
            <section>
              <p className="mb-5 text-sm font-bold text-purple-500">
                ← Trang chủ › Flashcards › Tất cả thẻ
              </p>

              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h1 className="mb-3 text-4xl font-black">
                    Tất cả Flashcards <span className="text-purple-600">♟</span>
                  </h1>
                  <p className="text-lg font-medium text-purple-500">
                    Quản lý và ôn tập tất cả thẻ của bạn
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button className="rounded-xl border border-purple-500 px-5 py-3 font-black text-purple-600">
                    <Plus className="mr-2 inline" size={18} />
                    Tạo bộ thẻ
                  </button>
                  <button className="rounded-xl border border-purple-200 px-5 py-3 font-black text-purple-500">
                    <Import className="mr-2 inline" size={18} />
                    Import
                  </button>
                  <button className="rounded-xl border border-purple-200 px-5 py-3 font-black text-purple-500">
                    <Upload className="mr-2 inline" size={18} />
                    Export
                  </button>
                </div>
              </div>

              <div className="mb-7 flex items-center justify-between border-b border-purple-100 pb-7">
                <div className="flex gap-4">
                  {["Tất cả", "Mới học", "Đang ôn", "Khó", "Đã thuộc", "Yêu thích"].map(
                    (item, i) => (
                      <button
                        key={item}
                        className={`rounded-xl border px-6 py-3 font-black ${
                          i === 0
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-purple-200 bg-white"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-5">
                  <div className="rounded-2xl border border-purple-200 bg-purple-50 px-6 py-4 text-sm font-bold leading-6">
                    Học đều mỗi ngày <br /> sẽ giúp bạn nhớ lâu hơn nhé! 💪
                  </div>
                  <div className="text-7xl">🦊</div>
                </div>
              </div>

              <div className="mb-7 flex gap-4">
                <div className="relative flex-1">
                  <Search
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300"
                  />
                  <input
                    className="h-12 w-full rounded-xl border border-purple-200 pl-12 outline-none"
                    placeholder="Tìm kiếm từ, nghĩa, ví dụ..."
                  />
                </div>

                {["Chủ đề: Tất cả", "Cấp độ: Tất cả", "Sắp xếp: Mới nhất"].map((item) => (
                  <button
                    key={item}
                    className="rounded-xl border border-purple-200 bg-white px-5 font-black text-purple-600"
                  >
                    {item} <ChevronDown className="inline" size={16} />
                  </button>
                ))}

                <div className="flex overflow-hidden rounded-xl border border-purple-200">
                  <button className="bg-purple-50 px-4 text-purple-700">
                    <Grid2X2 />
                  </button>
                  <button className="px-4 text-purple-400">
                    <List />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-5">
                {cards.map((item) => (
                  <Flashcard key={item.word} item={item} />
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <div />

                <div className="flex items-center gap-3">
                  {["‹", "1", "2", "3", "...", "12", "›"].map((p, i) => (
                    <button
                      key={i}
                      className={`grid h-10 w-10 place-items-center rounded-lg border font-black ${
                        p === "1"
                          ? "border-purple-600 bg-purple-600 text-white"
                          : "border-purple-200 bg-white text-purple-600"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <p className="font-medium text-purple-500">
                  Hiển thị 1 - 8 của 92 thẻ
                </p>
              </div>
            </section>

            <RightPanel />
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const menu = [
    ["Trang chủ", Home],
    ["Tổng quan", BookOpen],
    ["Từ vựng", BookOpen],
    ["Ngữ pháp", BookOpen],
    ["Nghe", Volume2],
    ["Nói", Mic],
    ["Đọc hiểu", BookOpen],
    ["Viết", X],
    ["Flashcards", Star],
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-purple-100 bg-white px-5 py-6">
      <div className="mb-10 flex items-center gap-3">
        <div className="text-3xl">🦊</div>
        <h1 className="text-3xl font-black">
          Study<span className="text-purple-600">Arena</span>
        </h1>
      </div>

      <nav className="space-y-2">
        <p className="px-3 text-xs font-bold uppercase tracking-widest text-purple-400">
          Học tập
        </p>

        {menu.map(([label, Icon]: any) => (
          <button
            key={label}
            className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-black ${
              label === "Flashcards"
                ? "bg-purple-50 text-purple-700"
                : "hover:bg-purple-50"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}

        <div className="ml-7 border-l border-purple-200 pl-4">
          <button className="w-full px-4 py-2 text-left text-sm font-bold">
            Ôn tập hôm nay
          </button>
          <button className="mb-2 w-full rounded-xl bg-purple-100 px-4 py-3 text-left text-sm font-black text-purple-700">
            Tất cả thẻ
          </button>
          <button className="w-full px-4 py-2 text-left text-sm font-bold">
            Tạo bộ thẻ
          </button>
        </div>

        <p className="px-3 pt-6 text-xs font-bold uppercase tracking-widest text-purple-400">
          Cộng đồng
        </p>

        {["Cộng đồng", "Hỏi đáp", "Thành tích"].map((item) => (
          <button
            key={item}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-black hover:bg-purple-50"
          >
            <Trophy size={18} />
            {item}
          </button>
        ))}

        <p className="px-3 pt-6 text-xs font-bold uppercase tracking-widest text-purple-400">
          Khác
        </p>

        {[
          ["Khoá học", BookOpen],
          ["Shop", ShoppingBag],
          ["Cài đặt", Settings],
        ].map(([label, Icon]: any) => (
          <button
            key={label}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-black hover:bg-purple-50"
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-purple-50 p-5">
        <p className="mb-3 font-black text-purple-700">👑 Nâng cấp Premium</p>
        <p className="mb-4 text-sm leading-6 text-purple-500">
          Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
        </p>
        <button className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white">
          Nâng cấp ngay
        </button>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="flex h-[92px] items-center justify-between border-b border-purple-100 bg-white px-9">
      <div className="relative w-[520px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
        <input
          className="h-14 w-full rounded-xl border border-purple-200 pl-12 outline-none"
          placeholder="Tìm bài học, từ vựng, ngữ pháp..."
        />
      </div>

      <div className="flex items-center gap-8">
        <Top icon={<Flame className="text-red-500" />} value="18" label="Streak" />
        <Top icon={<Star className="text-yellow-400" />} value="2,450" label="XP hôm nay" />
        <Top icon={<Diamond className="text-sky-400" />} value="5,230" label="Xu" />
        <Gift className="text-purple-600" />
        <span>🔔</span>

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-cyan-100 text-xl">
            👦
          </div>
          <div>
            <p className="text-sm font-black">Minh Anh</p>
            <p className="text-xs text-purple-400">Level 18</p>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}

function Flashcard({ item }: any) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
      <div className="mb-8 flex justify-between">
        <button className="rounded-lg bg-purple-50 p-2 text-purple-600">
          <Volume2 size={18} />
        </button>
        <Heart
          className={item.liked ? "fill-red-500 text-red-500" : "text-purple-300"}
        />
      </div>

      <div className="mb-7 text-center">
        <h3 className="mb-3 text-2xl font-black">{item.word}</h3>
        <p className="mb-4 text-lg font-black text-purple-600">{item.ipa}</p>
        <p className="font-bold">{item.mean}</p>
      </div>

      <div className="mb-8 flex justify-center gap-3">
        <span className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-bold text-purple-500">
          {item.topic}
        </span>
        <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-black text-blue-600">
          {item.level}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span
          className={`rounded-lg px-3 py-2 font-black ${
            item.status === "Khó"
              ? "bg-red-50 text-red-500"
              : item.status === "Trung bình"
              ? "bg-orange-50 text-orange-500"
              : "bg-green-50 text-green-600"
          }`}
        >
          {item.status}
        </span>
        <span className="font-medium text-purple-400">
          Ôn lần cuối: {item.last}
        </span>
      </div>
    </div>
  );
}

function RightPanel() {
  return (
    <aside className="space-y-6">
      <Card>
        <div className="mb-6 flex justify-between">
          <h3 className="text-xl font-black">Tổng quan thẻ</h3>
          <button className="font-bold text-purple-600">Chi tiết ›</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Overview icon="♟" value="92" label="Tổng số thẻ" />
          <Overview icon="✅" value="28" label="Đã thuộc" />
          <Overview icon="🕘" value="48" label="Cần ôn" />
          <Overview icon="🔥" value="16" label="Thẻ khó" />
        </div>
      </Card>

      <Card>
        <div className="mb-6 flex justify-between">
          <h3 className="text-xl font-black">Chuỗi ngày học</h3>
          <p className="font-black text-purple-600">18 ngày</p>
        </div>

        <div className="grid grid-cols-7 gap-3 text-center">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
            <div key={d}>
              <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-green-100">
                {i === 6 ? "" : "✓"}
              </div>
              <p className="text-sm font-bold text-purple-400">{d}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <h3 className="mb-3 text-xl font-black">Gợi ý từ Poppy</h3>
          <p className="leading-7 text-purple-500">
            Ôn tập các thẻ “Khó” nhiều hơn một chút nhé! Bạn sẽ tiến bộ nhanh
            hơn đó! 🚀
          </p>
        </div>
        <div className="text-6xl">🦊</div>
      </Card>

      <Card>
        <div className="mb-6 flex justify-between">
          <h3 className="text-xl font-black">Bộ thẻ của bạn</h3>
          <button className="font-black text-purple-600">Xem tất cả ›</button>
        </div>

        {[
          ["☕", "Daily Life", "32 thẻ", "75%"],
          ["✈️", "Travel", "18 thẻ", "60%"],
          ["🍴", "Food & Drink", "15 thẻ", "80%"],
          ["🌿", "Personal Growth", "27 thẻ", "65%"],
        ].map(([icon, title, count, percent]) => (
          <div key={title} className="mb-5 flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-purple-50 text-xl">
              {icon}
            </div>
            <div className="flex-1">
              <p className="font-black">{title}</p>
              <p className="text-sm text-purple-400">{count}</p>
            </div>
            <div className="h-2 w-24 rounded-full bg-purple-100">
              <div className="h-2 w-2/3 rounded-full bg-green-400" />
            </div>
            <span className="rounded-lg bg-green-50 px-3 py-1 text-sm font-black text-green-600">
              {percent}
            </span>
          </div>
        ))}

        <button className="mt-4 w-full rounded-xl bg-purple-600 py-4 font-black text-white shadow-lg shadow-purple-200">
          ▶ Bắt đầu ôn tập
        </button>
      </Card>
    </aside>
  );
}

function Card({ children, className = "" }: any) {
  return (
    <div className={`rounded-2xl border border-purple-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Top({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="font-black">{value}</p>
        <p className="text-xs font-bold text-purple-400">{label}</p>
      </div>
    </div>
  );
}

function Overview({ icon, value, label }: any) {
  return (
    <div className="rounded-xl border border-purple-100 p-5">
      <div className="mb-3 text-3xl">{icon}</div>
      <p className="text-3xl font-black">{value}</p>
      <p className="font-medium text-purple-400">{label}</p>
    </div>
  );
}

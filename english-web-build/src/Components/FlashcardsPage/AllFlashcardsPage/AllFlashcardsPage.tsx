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
import { speakWord } from "@/src/lib/tts-api";

const cards = [
  {
    word: "adventure",
    ipa: "/É™dËˆventÊƒÉ™r/",
    mean: "(n) cuá»™c phiÃªu lÆ°u",
    topic: "Daily Life",
    level: "A2",
    status: "KhÃ³",
    last: "HÃ´m qua",
    liked: true,
  },
  {
    word: "memorable",
    ipa: "/ËˆmemÉ™rÉ™bl/",
    mean: "(adj) Ä‘Ã¡ng nhá»›",
    topic: "Daily Life",
    level: "A2",
    status: "Dá»…",
    last: "2 ngÃ y trÆ°á»›c",
  },
  {
    word: "explore",
    ipa: "/ÉªkËˆsplÉ”Ër/",
    mean: "(v) khÃ¡m phÃ¡",
    topic: "Travel",
    level: "B1",
    status: "Trung bÃ¬nh",
    last: "HÃ´m qua",
    liked: true,
  },
  {
    word: "experience",
    ipa: "/ÉªkËˆspÉªÉ™riÉ™ns/",
    mean: "(n) tráº£i nghiá»‡m",
    topic: "Personal Growth",
    level: "B1",
    status: "Dá»…",
    last: "3 ngÃ y trÆ°á»›c",
  },
  {
    word: "destination",
    ipa: "/ËŒdestÉªËˆneÉªÊƒn/",
    mean: "(n) Ä‘iá»ƒm Ä‘áº¿n",
    topic: "Travel",
    level: "A2",
    status: "Trung bÃ¬nh",
    last: "HÃ´m qua",
  },
  {
    word: "delicious",
    ipa: "/dÉªËˆlÉªÊƒÉ™s/",
    mean: "(adj) ngon, háº¥p dáº«n",
    topic: "Food",
    level: "A2",
    status: "Dá»…",
    last: "5 ngÃ y trÆ°á»›c",
  },
  {
    word: "confidence",
    ipa: "/ËˆkÉ’nfÉªdÉ™ns/",
    mean: "(n) sá»± tá»± tin",
    topic: "Personal Growth",
    level: "B1",
    status: "KhÃ³",
    last: "HÃ´m qua",
    liked: true,
  },
  {
    word: "curious",
    ipa: "/ËˆkjÊŠÉ™riÉ™s/",
    mean: "(adj) tÃ² mÃ²",
    topic: "Personality",
    level: "A2",
    status: "Dá»…",
    last: "4 ngÃ y trÆ°á»›c",
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
                â† Trang chá»§ â€º Flashcards â€º Táº¥t cáº£ tháº»
              </p>

              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h1 className="mb-3 text-4xl font-black">
                    Táº¥t cáº£ Flashcards <span className="text-purple-600">â™Ÿ</span>
                  </h1>
                  <p className="text-lg font-medium text-purple-500">
                    Quáº£n lÃ½ vÃ  Ã´n táº­p táº¥t cáº£ tháº» cá»§a báº¡n
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button className="rounded-xl border border-purple-500 px-5 py-3 font-black text-purple-600">
                    <Plus className="mr-2 inline" size={18} />
                    Táº¡o bá»™ tháº»
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
                  {["Táº¥t cáº£", "Má»›i há»c", "Äang Ã´n", "KhÃ³", "ÄÃ£ thuá»™c", "YÃªu thÃ­ch"].map(
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
                    Há»c Ä‘á»u má»—i ngÃ y <br /> sáº½ giÃºp báº¡n nhá»› lÃ¢u hÆ¡n nhÃ©! ðŸ’ª
                  </div>
                  <div className="text-7xl">ðŸ¦Š</div>
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
                    placeholder="TÃ¬m kiáº¿m tá»«, nghÄ©a, vÃ­ dá»¥..."
                  />
                </div>

                {["Chá»§ Ä‘á»: Táº¥t cáº£", "Cáº¥p Ä‘á»™: Táº¥t cáº£", "Sáº¯p xáº¿p: Má»›i nháº¥t"].map((item) => (
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
                  {["â€¹", "1", "2", "3", "...", "12", "â€º"].map((p, i) => (
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
                  Hiá»ƒn thá»‹ 1 - 8 cá»§a 92 tháº»
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
    ["Trang chá»§", Home],
    ["Tá»•ng quan", BookOpen],
    ["Tá»« vá»±ng", BookOpen],
    ["Ngá»¯ phÃ¡p", BookOpen],
    ["Nghe", Volume2],
    ["NÃ³i", Mic],
    ["Äá»c hiá»ƒu", BookOpen],
    ["Viáº¿t", X],
    ["Flashcards", Star],
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-purple-100 bg-white px-5 py-6">
      <div className="mb-10 flex items-center gap-3">
        <div className="text-3xl">ðŸ¦Š</div>
        <h1 className="text-3xl font-black">
          Study<span className="text-purple-600">Arena</span>
        </h1>
      </div>

      <nav className="space-y-2">
        <p className="px-3 text-xs font-bold uppercase tracking-widest text-purple-400">
          Há»c táº­p
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
            Ã”n táº­p hÃ´m nay
          </button>
          <button className="mb-2 w-full rounded-xl bg-purple-100 px-4 py-3 text-left text-sm font-black text-purple-700">
            Táº¥t cáº£ tháº»
          </button>
          <button className="w-full px-4 py-2 text-left text-sm font-bold">
            Táº¡o bá»™ tháº»
          </button>
        </div>

        <p className="px-3 pt-6 text-xs font-bold uppercase tracking-widest text-purple-400">
          Cá»™ng Ä‘á»“ng
        </p>

        {["Cá»™ng Ä‘á»“ng", "Há»i Ä‘Ã¡p", "ThÃ nh tÃ­ch"].map((item) => (
          <button
            key={item}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-black hover:bg-purple-50"
          >
            <Trophy size={18} />
            {item}
          </button>
        ))}

        <p className="px-3 pt-6 text-xs font-bold uppercase tracking-widest text-purple-400">
          KhÃ¡c
        </p>

        {[
          ["KhoÃ¡ há»c", BookOpen],
          ["Shop", ShoppingBag],
          ["CÃ i Ä‘áº·t", Settings],
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
        <p className="mb-3 font-black text-purple-700">ðŸ‘‘ NÃ¢ng cáº¥p Premium</p>
        <p className="mb-4 text-sm leading-6 text-purple-500">
          Há»c khÃ´ng giá»›i háº¡n, nháº­n nhiá»u Ä‘áº·c quyá»n háº¥p dáº«n!
        </p>
        <button className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white">
          NÃ¢ng cáº¥p ngay
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
          placeholder="TÃ¬m bÃ i há»c, tá»« vá»±ng, ngá»¯ phÃ¡p..."
        />
      </div>

      <div className="flex items-center gap-8">
        <Top icon={<Flame className="text-red-500" />} value="18" label="Streak" />
        <Top icon={<Star className="text-yellow-400" />} value="2,450" label="XP hÃ´m nay" />
        <Top icon={<Diamond className="text-sky-400" />} value="5,230" label="Xu" />
        <Gift className="text-purple-600" />
        <span>ðŸ””</span>

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-cyan-100 text-xl">
            ðŸ‘¦
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
        <button
          type="button"
          onClick={() => speakWord(item.word)}
          className="rounded-lg bg-purple-50 p-2 text-purple-600 transition hover:bg-purple-100"
        >
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
            item.status === "KhÃ³"
              ? "bg-red-50 text-red-500"
              : item.status === "Trung bÃ¬nh"
              ? "bg-orange-50 text-orange-500"
              : "bg-green-50 text-green-600"
          }`}
        >
          {item.status}
        </span>
        <span className="font-medium text-purple-400">
          Ã”n láº§n cuá»‘i: {item.last}
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
          <h3 className="text-xl font-black">Tá»•ng quan tháº»</h3>
          <button className="font-bold text-purple-600">Chi tiáº¿t â€º</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Overview icon="â™Ÿ" value="92" label="Tá»•ng sá»‘ tháº»" />
          <Overview icon="âœ…" value="28" label="ÄÃ£ thuá»™c" />
          <Overview icon="ðŸ•˜" value="48" label="Cáº§n Ã´n" />
          <Overview icon="ðŸ”¥" value="16" label="Tháº» khÃ³" />
        </div>
      </Card>

      <Card>
        <div className="mb-6 flex justify-between">
          <h3 className="text-xl font-black">Chuá»—i ngÃ y há»c</h3>
          <p className="font-black text-purple-600">18 ngÃ y</p>
        </div>

        <div className="grid grid-cols-7 gap-3 text-center">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
            <div key={d}>
              <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-green-100">
                {i === 6 ? "" : "âœ“"}
              </div>
              <p className="text-sm font-bold text-purple-400">{d}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <h3 className="mb-3 text-xl font-black">Gá»£i Ã½ tá»« Beacon</h3>
          <p className="leading-7 text-purple-500">
            Ã”n táº­p cÃ¡c tháº» â€œKhÃ³â€ nhiá»u hÆ¡n má»™t chÃºt nhÃ©! Báº¡n sáº½ tiáº¿n bá»™ nhanh
            hÆ¡n Ä‘Ã³! ðŸš€
          </p>
        </div>
        <div className="text-6xl">ðŸ¦Š</div>
      </Card>

      <Card>
        <div className="mb-6 flex justify-between">
          <h3 className="text-xl font-black">Bá»™ tháº» cá»§a báº¡n</h3>
          <button className="font-black text-purple-600">Xem táº¥t cáº£ â€º</button>
        </div>

        {[
          ["â˜•", "Daily Life", "32 tháº»", "75%"],
          ["âœˆï¸", "Travel", "18 tháº»", "60%"],
          ["ðŸ´", "Food & Drink", "15 tháº»", "80%"],
          ["ðŸŒ¿", "Personal Growth", "27 tháº»", "65%"],
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
          â–¶ Báº¯t Ä‘áº§u Ã´n táº­p
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

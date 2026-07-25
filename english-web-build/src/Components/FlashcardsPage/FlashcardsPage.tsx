"use client";

import {
  BookOpen,
  ChevronDown,
  Clock,
  Diamond,
  Flame,
  Gift,
  GraduationCap,
  Home,
  Mic,
  RotateCcw,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import { speakWord } from "@/src/lib/tts-api";

const navs = [
  ["Trang chá»§", Home],
  ["Tá»•ng quan", BookOpen],
  ["Tá»« vá»±ng", BookOpen],
  ["Ngá»¯ phÃ¡p", GraduationCap],
  ["Nghe", Volume2],
  ["NÃ³i", Mic],
  ["Äá»c hiá»ƒu", BookOpen],
  ["Viáº¿t", X],
  ["Flashcards", Star],
];

const reviewWords = [
  ["adventure", "/É™dËˆventÊƒÉ™r/", "KhÃ³", "red"],
  ["memorable", "/ËˆmemÉ™rÉ™bl/", "Trung bÃ¬nh", "orange"],
  ["explore", "/ÉªkËˆsplÉ”Ër/", "Dá»…", "green"],
  ["experience", "/ÉªkËˆspÉªÉ™riÉ™ns/", "Trung bÃ¬nh", "orange"],
  ["destination", "/ËŒdestÉªËˆneÉªÊƒn/", "Dá»…", "green"],
];

export default function FlashcardsPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#130b5f]">
      <div className="flex">
        <aside className="hidden fixed left-0 top-0 h-screen w-[280px] border-r border-purple-100 bg-white px-5 py-6">
          <div className="mb-10 flex items-center gap-3">
            {/* <div className="text-3xl">ðŸ¦Š</div> */}
            <h1 className="text-3xl font-black">
              Study<span className="text-purple-600">Arena</span>
            </h1>
          </div>

          <nav className="space-y-2">
            <p className="px-3 text-xs font-bold uppercase tracking-widest text-purple-400">
              Há»c táº­p
            </p>

            {navs.map(([label, Icon]: any) => (
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
              <button className="mb-2 w-full rounded-xl bg-purple-100 px-4 py-3 text-left text-sm font-black text-purple-700">
                Ã”n táº­p hÃ´m nay
              </button>
              <button className="mb-2 w-full px-4 py-2 text-left text-sm font-bold">
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

        <main className="flex-1">
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

          <div className="grid grid-cols-[1fr_420px] gap-9 px-9 py-8">
            <section>
              <p className="mb-5 text-sm font-bold text-purple-500">
                â† Trang chá»§ â€º Flashcards â€º Ã”n táº­p hÃ´m nay
              </p>

              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="mb-3 text-4xl font-black">
                    Flashcards <span className="text-purple-600">â™Ÿ</span>
                  </h2>
                  <p className="text-lg font-medium text-purple-500">
                    Ã”n táº­p tá»« vá»±ng hiá»‡u quáº£ vá»›i phÆ°Æ¡ng phÃ¡p láº·p láº¡i ngáº¯t quÃ£ng (SRS)
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="rounded-2xl border border-purple-200 bg-purple-50 px-6 py-5 text-sm font-bold leading-6">
                    CÃ¹ng Ã´n táº­p má»—i ngÃ y <br /> Ä‘á»ƒ ghi nhá»› tá»« vá»±ng lÃ¢u hÆ¡n nhÃ©!
                  </div>
                  {/* <div className="text-7xl">ðŸ¦Š</div> */}
                </div>
              </div>

              <div className="mb-6 flex gap-4">
                {["Ã”n táº­p hÃ´m nay 28", "Má»›i há»c 15", "Dá»… 32", "Trung bÃ¬nh 48", "KhÃ³ 16"].map(
                  (item, i) => (
                    <button
                      key={item}
                      className={`rounded-xl border px-6 py-3 font-black ${
                        i === 0
                          ? "border-purple-600 bg-purple-600 text-white"
                          : "border-purple-200 bg-white text-purple-600"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>

              <div className="rounded-3xl bg-purple-100/60 p-8">
                <div className="mx-auto mb-8 max-w-[760px] rounded-2xl bg-white p-8 text-center shadow-xl shadow-purple-200">
                  <div className="mb-16 flex justify-between">
                    <span className="rounded-lg bg-green-100 px-4 py-2 font-black text-green-600">
                      A2
                    </span>
                    <Star className="text-purple-400" />
                  </div>

                  <h3 className="mb-5 text-5xl font-black">
                    adventure{" "}
                    <button
                      type="button"
                      onClick={() => speakWord("adventure")}
                      className="rounded-full bg-purple-100 p-3 text-purple-600 transition hover:bg-purple-200"
                    >
                      <Volume2 />
                    </button>
                  </h3>

                  <p className="mb-8 text-2xl font-black text-purple-600">
                    /É™dËˆventÊƒÉ™r/
                  </p>

                  <div className="mx-auto mb-8 h-px w-[560px] bg-purple-100" />

                  <p className="mb-12 text-2xl font-bold">
                    (n) cuá»™c phiÃªu lÆ°u, cuá»™c máº¡o hiá»ƒm
                  </p>

                  <p className="font-semibold text-purple-400">
                    âŸ³ Nháº¥n vÃ o tháº» hoáº·c nÃºt bÃªn dÆ°á»›i Ä‘á»ƒ láº­t tháº»
                  </p>
                </div>

                <div className="mb-8 flex items-center justify-between">
                  <button className="rounded-xl border border-purple-200 bg-white px-6 py-4 font-black text-purple-500">
                    <RotateCcw className="mr-2 inline" />
                    Bá» qua
                  </button>

                  <div className="w-[520px] text-center">
                    <p className="mb-3 text-xl font-black">7 / 28</p>
                    <div className="h-2 rounded-full bg-purple-200">
                      <div className="h-2 w-[35%] rounded-full bg-purple-600" />
                    </div>
                  </div>

                  <button className="rounded-xl border border-purple-200 bg-white px-6 py-4 font-black text-purple-500">
                    âŒ¨ BÃ n phÃ­m
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  <Rate title="Again" desc="ChÆ°a nhá»›" icon="ðŸ”" color="red" />
                  <Rate title="Hard" desc="KhÃ³ nhá»›" icon="â˜¹ï¸" color="orange" />
                  <Rate title="Good" desc="Ghi nhá»› tá»‘t" icon="ðŸ™‚" color="green" />
                  <Rate title="Easy" desc="Ráº¥t dá»… nhá»›" icon="â­" color="purple" />
                </div>

                <div className="mt-8 flex items-center justify-between rounded-2xl border border-purple-200 bg-white/70 p-6">
                  <div className="flex items-center gap-5">
                    <div className="text-5xl">ðŸ’¡</div>
                    <div>
                      <p className="mb-1 text-lg font-black text-purple-700">
                        Máº¹o há»c Flashcards
                      </p>
                      <p className="font-medium text-purple-500">
                        ÄÃ¡nh giÃ¡ chÃ­nh xÃ¡c má»©c Ä‘á»™ nhá»› cá»§a báº¡n. Há»‡ thá»‘ng sáº½ sáº¯p xáº¿p
                        lá»‹ch Ã´n táº­p phÃ¹ há»£p.
                      </p>
                    </div>
                  </div>
                  {/* <div className="text-6xl">ðŸ¦Š</div> */}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <Card>
                <div className="mb-8 flex justify-between">
                  <h3 className="text-xl font-black">Tiáº¿n Ä‘á»™ buá»•i há»c</h3>
                  <button className="font-bold text-purple-600">Sá»­a má»¥c tiÃªu âœŽ</button>
                </div>

                <div className="mx-auto mb-8 grid h-40 w-40 place-items-center rounded-full bg-[conic-gradient(#7c16ff_60%,#eee8ff_0)]">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                    <div>
                      <p className="text-4xl font-black">60%</p>
                      <p className="font-bold">HoÃ n thÃ nh</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 text-center">
                  <Mini value="28" label="Tháº» cáº§n Ã´n" icon="â™Ÿ" />
                  <Mini value="17" label="ÄÃ£ Ã´n xong" icon="âœ…" />
                  <Mini value="12:45" label="Thá»i gian" icon={<Clock size={18} />} />
                </div>
              </Card>

              <Card className="flex items-center justify-between">
                <div>
                  <p className="mb-2 text-xl font-black">ðŸ”¥ Duy trÃ¬ chuá»—i ngÃ y!</p>
                  <p className="font-medium text-purple-500">
                    Báº¡n Ä‘Ã£ Ã´n táº­p 18 ngÃ y liÃªn tá»¥c ðŸ”¥
                  </p>
                </div>
                <div className="text-6xl">ðŸ¦Š</div>
              </Card>

              <Card>
                <h3 className="mb-6 text-xl font-black">Danh sÃ¡ch tá»« cáº§n Ã´n</h3>

                <div className="space-y-5">
                  {reviewWords.map(([word, ipa, level, color]) => (
                    <div key={word} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-3 w-3 rounded-full ${
                            color === "red"
                              ? "bg-red-500"
                              : color === "orange"
                              ? "bg-orange-400"
                              : "bg-green-500"
                          }`}
                        />
                        <div>
                          <p className="font-black">{word}</p>
                          <p className="text-sm font-medium text-purple-400">{ipa}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-black text-purple-600">
                          {level}
                        </span>
                        <button
                          type="button"
                          onClick={() => speakWord(word)}
                          className="rounded-lg bg-purple-50 p-2 text-purple-600 transition hover:bg-purple-100"
                        >
                          <Volume2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="mt-8 w-full rounded-xl border border-purple-300 py-4 font-black text-purple-600">
                  Xem táº¥t cáº£ tháº» â†’
                </button>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-purple-100 bg-white p-7 shadow-sm ${className}`}>
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

function Mini({ icon, value, label }: any) {
  return (
    <div>
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
        {icon}
      </div>
      <p className="text-xl font-black">{value}</p>
      <p className="text-sm font-bold text-purple-400">{label}</p>
    </div>
  );
}

function Rate({
  title,
  desc,
  icon,
  color,
}: {
  title: string;
  desc: string;
  icon: string;
  color: string;
}) {
  const styles: Record<string, string> = {
    red: "border-red-200 bg-red-50 text-red-500",
    orange: "border-orange-200 bg-orange-50 text-orange-500",
    green: "border-green-200 bg-green-50 text-green-600",
    purple: "border-purple-200 bg-purple-50 text-purple-600",
  };

  return (
    <button className={`rounded-2xl border p-8 text-center ${styles[color]}`}>
      <div className="mb-4 text-4xl">{icon}</div>
      <p className="mb-2 text-xl font-black">{title}</p>
      <p className="font-bold">{desc}</p>
    </button>
  );
}

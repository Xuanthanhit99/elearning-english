"use client";

import {
  Search,
  Flame,
  Star,
  Gem,
  Gift,
  Bell,
  Volume2,
  Play,
  Clock,
  ChevronDown,
  ChevronRight,
  Headphones,
  BookOpen,
  Home,
  GraduationCap,
  MessageCircle,
  Trophy,
  Settings,
  ShoppingBag,
  Users,
  PenTool,
  Mic,
  ScrollText,
  CheckCircle2,
} from "lucide-react";

const topics = [
  { icon: "â˜•", name: "Daily Life", count: 12, active: true },
  { icon: "ðŸŽ’", name: "School", count: 10 },
  { icon: "ðŸ§³", name: "Travel", count: 10 },
  { icon: "ðŸ’¼", name: "Work", count: 10 },
  { icon: "ðŸ’—", name: "Health", count: 8 },
  { icon: "ðŸ”", name: "Food", count: 10 },
  { icon: "ðŸ’»", name: "Technology", count: 8 },
];

const lessons = [
  {
    title: "My Morning Routine",
    img: "ðŸŒ…",
    level: "A1",
    difficulty: "Dá»…",
    time: "02:45",
  },
  {
    title: "At the Supermarket",
    img: "ðŸ›’",
    level: "A1",
    difficulty: "Dá»…",
    time: "03:12",
    active: true,
  },
  {
    title: "Family Dinner",
    img: "ðŸ½ï¸",
    level: "A2",
    difficulty: "Trung bÃ¬nh",
    time: "03:08",
  },
  {
    title: "Weekend in the Park",
    img: "ðŸŒ³",
    level: "A2",
    difficulty: "Trung bÃ¬nh",
    time: "02:58",
  },
  {
    title: "At the Doctor's",
    img: "ðŸ‘¨â€âš•ï¸",
    level: "B1",
    difficulty: "KhÃ³",
    time: "03:34",
  },
  {
    title: "Birthday Party",
    img: "ðŸŽ‚",
    level: "B1",
    difficulty: "KhÃ³",
    time: "03:21",
  },
];

export default function ListeningTopicPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#101043]">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[270px] border-r border-violet-100 bg-white px-5 py-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="text-4xl">ðŸ¦Š</div>
            <h1 className="text-2xl font-black">
              Study<span className="text-violet-600">Arena</span>
            </h1>
          </div>

          <SidebarItem icon={<Home size={18} />} text="Trang chá»§" />

          <SidebarTitle text="Há»c táº­p" />
          <SidebarItem icon={<GraduationCap size={18} />} text="Tá»•ng quan" />
          <SidebarItem icon={<BookOpen size={18} />} text="Tá»« vá»±ng" />
          <SidebarItem icon={<ScrollText size={18} />} text="Ngá»¯ phÃ¡p" />
          <SidebarItem icon={<Volume2 size={18} />} text="Nghe" active />

          <div className="ml-7 mt-2 space-y-1 border-l border-violet-200 pl-4">
            <SubItem text="Luyá»‡n nghe" />
            <SubItem text="Nghe chÃ©p chÃ­nh táº£" />
            <SubItem text="Nghe hiá»ƒu Ä‘oáº¡n" />
            <SubItem text="Nghe theo chá»§ Ä‘á»" active />
          </div>

          <SidebarItem icon={<Mic size={18} />} text="NÃ³i" />
          <SidebarItem icon={<BookOpen size={18} />} text="Äá»c hiá»ƒu" />
          <SidebarItem icon={<PenTool size={18} />} text="Viáº¿t" />

          <SidebarTitle text="Cá»™ng Ä‘á»“ng" />
          <SidebarItem icon={<Users size={18} />} text="Cá»™ng Ä‘á»“ng" />
          <SidebarItem icon={<MessageCircle size={18} />} text="Há»i Ä‘Ã¡p" />
          <SidebarItem icon={<Trophy size={18} />} text="ThÃ nh tÃ­ch" />

          <SidebarTitle text="KhÃ¡c" />
          <SidebarItem icon={<ShoppingBag size={18} />} text="Shop" />
          <SidebarItem icon={<Settings size={18} />} text="CÃ i Ä‘áº·t" />

          <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-violet-50 p-4">
            <p className="font-bold text-violet-700">ðŸ‘‘ NÃ¢ng cáº¥p Premium</p>
            <p className="mt-1 text-xs text-slate-500">
              Há»c khÃ´ng giá»›i háº¡n, nháº­n nhiá»u Ä‘áº·c quyá»n háº¥p dáº«n!
            </p>
            <button className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">
              NÃ¢ng cáº¥p ngay
            </button>
            <div className="absolute bottom-0 right-2 text-5xl">ðŸ¦Š</div>
          </div>
        </aside>

        <main className="ml-[270px] flex-1">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-violet-100 bg-white/90 px-12 backdrop-blur">
            <div className="relative w-[520px]">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400"
                size={22}
              />
              <input
                className="h-12 w-full rounded-xl border border-violet-100 bg-white pl-12 text-sm outline-none focus:border-violet-400"
                placeholder="TÃ¬m bÃ i há»c, tá»« vá»±ng, ngá»¯ phÃ¡p..."
              />
            </div>

            <div className="flex items-center gap-8">
              <TopStat icon={<Flame />} value="18" label="Streak" />
              <TopStat icon={<Star />} value="2,450" label="XP hÃ´m nay" />
              <TopStat icon={<Gem />} value="5,230" label="Xu" />

              <button className="rounded-full bg-violet-50 p-3 text-violet-600">
                <Gift size={22} />
              </button>

              <button className="relative rounded-full bg-white p-3 text-slate-500 shadow-sm">
                <Bell size={22} />
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs text-white">
                  3
                </span>
              </button>

              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-2xl">
                  ðŸ§‘
                </div>
                <div>
                  <p className="text-sm font-bold">Minh Anh</p>
                  <p className="text-xs text-slate-500">Level 18</p>
                </div>
                <ChevronDown size={16} />
              </div>
            </div>
          </header>

          <section className="grid grid-cols-[1fr_380px] gap-8 px-12 py-8">
            <div>
              <div className="mb-6 text-sm text-violet-500">
                â† Trang chá»§ â€º Nghe â€º{" "}
                <span className="font-bold text-[#101043]">
                  Nghe theo chá»§ Ä‘á»
                </span>
              </div>

              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h2 className="flex items-center gap-3 text-4xl font-black">
                    Nghe theo chá»§ Ä‘á»
                    <Volume2 className="text-violet-600" />
                  </h2>
                  <p className="mt-3 text-lg text-slate-500">
                    Luyá»‡n nghe cÃ¡c bÃ i há»™i thoáº¡i, bÃ i nÃ³i theo tá»«ng chá»§ Ä‘á» quen
                    thuá»™c.
                  </p>
                </div>

                <div className="text-8xl">ðŸ¦ŠðŸŽ§</div>
              </div>

              <div className="mb-10 flex gap-4">
                {topics.map((topic) => (
                  <button
                    key={topic.name}
                    className={`h-[135px] w-[125px] rounded-2xl border bg-white transition ${
                      topic.active
                        ? "border-violet-500 shadow-[0_15px_40px_rgba(124,58,237,0.15)]"
                        : "border-violet-100 hover:border-violet-300"
                    }`}
                  >
                    <div className="text-4xl">{topic.icon}</div>
                    <p
                      className={`mt-2 font-bold ${
                        topic.active ? "text-violet-700" : ""
                      }`}
                    >
                      {topic.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {topic.count} bÃ i
                    </p>
                  </button>
                ))}

                <button className="grid h-[135px] w-12 place-items-center rounded-2xl border border-violet-100 bg-white text-violet-500">
                  <ChevronRight />
                </button>
              </div>

              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black">Danh sÃ¡ch bÃ i há»c</h3>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-600">
                    12 bÃ i
                  </span>
                </div>

                <button className="flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-6 py-3 font-bold">
                  Má»›i nháº¥t <ChevronDown size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.title}
                    className={`flex items-center rounded-2xl border bg-white p-3 transition ${
                      lesson.active
                        ? "border-violet-300 bg-violet-50 shadow-sm"
                        : "border-violet-100"
                    }`}
                  >
                    <div className="w-14 text-center font-bold text-violet-500">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="mr-5 grid h-16 w-24 place-items-center rounded-xl bg-orange-50 text-4xl">
                      {lesson.img}
                    </div>

                    <div className="flex-1">
                      <h4 className="text-lg font-black">{lesson.title}</h4>
                    </div>

                    <Badge type={lesson.difficulty} />
                    <span className="ml-2 rounded-lg bg-violet-100 px-3 py-1 text-sm font-bold text-violet-600">
                      {lesson.level}
                    </span>

                    <div className="ml-16 flex items-center gap-2 text-violet-500">
                      <Clock size={17} />
                      {lesson.time}
                    </div>

                    <button className="ml-8 grid h-12 w-12 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-200">
                      <Play size={20} fill="white" />
                    </button>
                  </div>
                ))}
              </div>

              <button className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-50 font-bold text-violet-700">
                Xem thÃªm <ChevronDown size={18} />
              </button>
            </div>

            <aside className="space-y-8">
              <Card>
                <h3 className="mb-8 text-xl font-black">Tiáº¿n Ä‘á»™ chá»§ Ä‘á»</h3>

                <div className="mx-auto grid h-44 w-44 place-items-center rounded-full border-[14px] border-violet-600">
                  <div className="text-center">
                    <p className="text-5xl font-black">70%</p>
                    <p className="text-sm text-slate-500">ÄÃ£ hoÃ n thÃ nh</p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 text-center">
                  <div>
                    <p className="text-sm text-slate-500">ÄÃ£ há»c</p>
                    <p className="mt-2 text-xl font-black">7 bÃ i</p>
                  </div>
                  <div className="border-l border-violet-100">
                    <p className="text-sm text-slate-500">Tá»•ng sá»‘</p>
                    <p className="mt-2 text-xl font-black">12 bÃ i</p>
                  </div>
                </div>

                <button className="mt-8 h-14 w-full rounded-xl bg-violet-600 font-bold text-white">
                  Ã”n táº­p chá»§ Ä‘á»
                </button>
              </Card>

              <Card>
                <h3 className="mb-6 text-xl font-black">Thá»‘ng kÃª nghe</h3>

                <StatRow icon={<BookOpen />} value="28" label="BÃ i Ä‘Ã£ há»c" />
                <StatRow icon={<Clock />} value="5h 32m" label="Tá»•ng thá»i gian nghe" />
                <StatRow icon={<CheckCircle2 />} value="89%" label="Äá»™ chÃ­nh xÃ¡c trung bÃ¬nh" />
              </Card>

              <div className="relative overflow-hidden rounded-2xl bg-violet-50 p-6">
                <h3 className="mb-4 text-lg font-black">ðŸ’¡ Máº¹o nhá»</h3>
                <p className="max-w-[230px] text-sm leading-6 text-slate-600">
                  HÃ£y nghe chá»§ Ä‘á»™ng: táº­p trung vÃ o ná»™i dung, ngá»¯ Ä‘iá»‡u vÃ  cÃ¡ch
                  phÃ¡t Ã¢m Ä‘á»ƒ cáº£i thiá»‡n ká»¹ nÄƒng nghe tá»‘t hÆ¡n!
                </p>
                <div className="absolute bottom-3 right-4 text-7xl">ðŸ¦ŠðŸŽ§</div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

function SidebarTitle({ text }: { text: string }) {
  return (
    <p className="mb-3 mt-7 text-xs font-black uppercase tracking-wider text-violet-400">
      {text}
    </p>
  );
}

function SidebarItem({
  icon,
  text,
  active,
}: {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={`mb-1 flex h-11 items-center gap-4 rounded-xl px-4 text-sm font-bold ${
        active ? "bg-violet-100 text-violet-700" : "text-[#1f1b4d]"
      }`}
    >
      <span className="text-violet-500">{icon}</span>
      {text}
    </div>
  );
}

function SubItem({ text, active }: { text: string; active?: boolean }) {
  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm font-bold ${
        active ? "bg-violet-100 text-violet-700" : "text-[#1f1b4d]"
      }`}
    >
      {text}
    </div>
  );
}

function TopStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-violet-600">{icon}</span>
      <div>
        <p className="font-black">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Badge({ type }: { type: string }) {
  const cls =
    type === "Dá»…"
      ? "bg-green-100 text-green-600"
      : type === "KhÃ³"
      ? "bg-red-100 text-red-600"
      : "bg-orange-100 text-orange-600";

  return (
    <span className={`rounded-lg px-3 py-1 text-sm font-bold ${cls}`}>
      {type}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

function StatRow({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-violet-100 text-violet-600">
        {icon}
      </div>
      <div>
        <p className="text-lg font-black">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
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
  { icon: "☕", name: "Daily Life", count: 12, active: true },
  { icon: "🎒", name: "School", count: 10 },
  { icon: "🧳", name: "Travel", count: 10 },
  { icon: "💼", name: "Work", count: 10 },
  { icon: "💗", name: "Health", count: 8 },
  { icon: "🍔", name: "Food", count: 10 },
  { icon: "💻", name: "Technology", count: 8 },
];

const lessons = [
  {
    title: "My Morning Routine",
    img: "🌅",
    level: "A1",
    difficulty: "Dễ",
    time: "02:45",
  },
  {
    title: "At the Supermarket",
    img: "🛒",
    level: "A1",
    difficulty: "Dễ",
    time: "03:12",
    active: true,
  },
  {
    title: "Family Dinner",
    img: "🍽️",
    level: "A2",
    difficulty: "Trung bình",
    time: "03:08",
  },
  {
    title: "Weekend in the Park",
    img: "🌳",
    level: "A2",
    difficulty: "Trung bình",
    time: "02:58",
  },
  {
    title: "At the Doctor's",
    img: "👨‍⚕️",
    level: "B1",
    difficulty: "Khó",
    time: "03:34",
  },
  {
    title: "Birthday Party",
    img: "🎂",
    level: "B1",
    difficulty: "Khó",
    time: "03:21",
  },
];

export default function ListeningTopicPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#101043]">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[270px] border-r border-violet-100 bg-white px-5 py-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="text-4xl">🦊</div>
            <h1 className="text-2xl font-black">
              Study<span className="text-violet-600">Arena</span>
            </h1>
          </div>

          <SidebarItem icon={<Home size={18} />} text="Trang chủ" />

          <SidebarTitle text="Học tập" />
          <SidebarItem icon={<GraduationCap size={18} />} text="Tổng quan" />
          <SidebarItem icon={<BookOpen size={18} />} text="Từ vựng" />
          <SidebarItem icon={<ScrollText size={18} />} text="Ngữ pháp" />
          <SidebarItem icon={<Volume2 size={18} />} text="Nghe" active />

          <div className="ml-7 mt-2 space-y-1 border-l border-violet-200 pl-4">
            <SubItem text="Luyện nghe" />
            <SubItem text="Nghe chép chính tả" />
            <SubItem text="Nghe hiểu đoạn" />
            <SubItem text="Nghe theo chủ đề" active />
          </div>

          <SidebarItem icon={<Mic size={18} />} text="Nói" />
          <SidebarItem icon={<BookOpen size={18} />} text="Đọc hiểu" />
          <SidebarItem icon={<PenTool size={18} />} text="Viết" />

          <SidebarTitle text="Cộng đồng" />
          <SidebarItem icon={<Users size={18} />} text="Cộng đồng" />
          <SidebarItem icon={<MessageCircle size={18} />} text="Hỏi đáp" />
          <SidebarItem icon={<Trophy size={18} />} text="Thành tích" />

          <SidebarTitle text="Khác" />
          <SidebarItem icon={<ShoppingBag size={18} />} text="Shop" />
          <SidebarItem icon={<Settings size={18} />} text="Cài đặt" />

          <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-violet-50 p-4">
            <p className="font-bold text-violet-700">👑 Nâng cấp Premium</p>
            <p className="mt-1 text-xs text-slate-500">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">
              Nâng cấp ngay
            </button>
            <div className="absolute bottom-0 right-2 text-5xl">🦊</div>
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
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
              />
            </div>

            <div className="flex items-center gap-8">
              <TopStat icon={<Flame />} value="18" label="Streak" />
              <TopStat icon={<Star />} value="2,450" label="XP hôm nay" />
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
                  🧑
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
                ← Trang chủ › Nghe ›{" "}
                <span className="font-bold text-[#101043]">
                  Nghe theo chủ đề
                </span>
              </div>

              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h2 className="flex items-center gap-3 text-4xl font-black">
                    Nghe theo chủ đề
                    <Volume2 className="text-violet-600" />
                  </h2>
                  <p className="mt-3 text-lg text-slate-500">
                    Luyện nghe các bài hội thoại, bài nói theo từng chủ đề quen
                    thuộc.
                  </p>
                </div>

                <div className="text-8xl">🦊🎧</div>
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
                      {topic.count} bài
                    </p>
                  </button>
                ))}

                <button className="grid h-[135px] w-12 place-items-center rounded-2xl border border-violet-100 bg-white text-violet-500">
                  <ChevronRight />
                </button>
              </div>

              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black">Danh sách bài học</h3>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-600">
                    12 bài
                  </span>
                </div>

                <button className="flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-6 py-3 font-bold">
                  Mới nhất <ChevronDown size={16} />
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
                Xem thêm <ChevronDown size={18} />
              </button>
            </div>

            <aside className="space-y-8">
              <Card>
                <h3 className="mb-8 text-xl font-black">Tiến độ chủ đề</h3>

                <div className="mx-auto grid h-44 w-44 place-items-center rounded-full border-[14px] border-violet-600">
                  <div className="text-center">
                    <p className="text-5xl font-black">70%</p>
                    <p className="text-sm text-slate-500">Đã hoàn thành</p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 text-center">
                  <div>
                    <p className="text-sm text-slate-500">Đã học</p>
                    <p className="mt-2 text-xl font-black">7 bài</p>
                  </div>
                  <div className="border-l border-violet-100">
                    <p className="text-sm text-slate-500">Tổng số</p>
                    <p className="mt-2 text-xl font-black">12 bài</p>
                  </div>
                </div>

                <button className="mt-8 h-14 w-full rounded-xl bg-violet-600 font-bold text-white">
                  Ôn tập chủ đề
                </button>
              </Card>

              <Card>
                <h3 className="mb-6 text-xl font-black">Thống kê nghe</h3>

                <StatRow icon={<BookOpen />} value="28" label="Bài đã học" />
                <StatRow icon={<Clock />} value="5h 32m" label="Tổng thời gian nghe" />
                <StatRow icon={<CheckCircle2 />} value="89%" label="Độ chính xác trung bình" />
              </Card>

              <div className="relative overflow-hidden rounded-2xl bg-violet-50 p-6">
                <h3 className="mb-4 text-lg font-black">💡 Mẹo nhỏ</h3>
                <p className="max-w-[230px] text-sm leading-6 text-slate-600">
                  Hãy nghe chủ động: tập trung vào nội dung, ngữ điệu và cách
                  phát âm để cải thiện kỹ năng nghe tốt hơn!
                </p>
                <div className="absolute bottom-3 right-4 text-7xl">🦊🎧</div>
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
    type === "Dễ"
      ? "bg-green-100 text-green-600"
      : type === "Khó"
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
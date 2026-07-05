"use client";

import {
  BookOpen,
  Bookmark,
  CheckCircle,
  ChevronDown,
  Diamond,
  Edit3,
  Flame,
  Gift,
  Home,
  Lightbulb,
  Mic,
  PenTool,
  Search,
  Send,
  Settings,
  ShieldQuestion,
  ShoppingBag,
  Star,
  Trophy,
  Undo2,
  User,
  Volume2,
  X,
} from "lucide-react";

const navItems = [
  { label: "Trang chủ", icon: Home },
  { label: "Tổng quan", icon: BookOpen },
  { label: "Từ vựng", icon: BookOpen },
  { label: "Ngữ pháp", icon: ShieldQuestion },
  { label: "Nghe", icon: Volume2 },
  { label: "Nói", icon: Mic },
  { label: "Đọc hiểu", icon: BookOpen },
  { label: "Viết", icon: PenTool, active: true },
  { label: "Flashcards", icon: Star },
];

const words = [
  ["memorable (adj)", "đáng nhớ"],
  ["trip (n)", "chuyến đi"],
  ["destination (n)", "điểm đến"],
  ["experience (n)", "trải nghiệm"],
  ["amazing (adj)", "tuyệt vời"],
  ["discover (v)", "khám phá"],
];

export default function WritingPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#17105f]">
      <div className="flex">
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

            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold transition ${
                    item.active
                      ? "border border-purple-300 bg-purple-50 text-purple-700"
                      : "text-[#21145f] hover:bg-purple-50"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                </button>
              );
            })}

            <p className="px-3 pt-6 text-xs font-bold uppercase tracking-widest text-purple-400">
              Cộng đồng
            </p>

            {["Cộng đồng", "Hỏi đáp", "Thành tích"].map((item) => (
              <button
                key={item}
                className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold hover:bg-purple-50"
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
                className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold hover:bg-purple-50"
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-purple-50 p-5">
            <div className="mb-3 flex items-center gap-2 font-black text-purple-700">
              👑 Nâng cấp Premium
            </div>
            <p className="mb-4 text-sm leading-6 text-purple-500">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white">
              Nâng cấp ngay
            </button>
          </div>
        </aside>

        <main className="ml-[280px] flex-1">
          <header className="sticky top-0 z-10 flex h-[92px] items-center justify-between border-b border-purple-100 bg-white/90 px-9 backdrop-blur">
            <div className="relative w-[520px]">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400"
                size={22}
              />
              <input
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
                className="h-14 w-full rounded-xl border border-purple-200 bg-white pl-12 pr-4 font-medium outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-8">
              <TopStat icon={<Flame className="text-red-500" />} value="18" label="Streak" />
              <TopStat icon={<Star className="text-yellow-400" />} value="2,450" label="XP hôm nay" />
              <TopStat icon={<Diamond className="text-sky-400" />} value="5,230" label="Xu" />

              <div className="relative">
                <Gift className="text-purple-600" />
              </div>

              <div className="relative">
                <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 text-xs text-white">
                  3
                </span>
                🔔
              </div>

              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-cyan-100 text-xl">
                  👩
                </div>
                <div>
                  <p className="text-sm font-black">Minh Anh</p>
                  <p className="text-xs text-purple-400">Level 18</p>
                </div>
                <ChevronDown size={16} />
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_430px] gap-10 px-9 py-8">
            <section>
              <div className="mb-8">
                <p className="mb-5 text-sm font-bold text-purple-500">
                  ← Trang chủ &nbsp;›&nbsp; Viết
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="mb-3 flex items-center gap-3 text-4xl font-black">
                      Luyện viết
                      <Edit3 className="text-purple-600" />
                    </h2>
                    <p className="text-lg font-medium text-purple-500">
                      Rèn luyện kỹ năng viết tiếng Anh qua các chủ đề thực tế.
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="rounded-2xl border border-purple-200 bg-purple-50 px-6 py-5 text-sm font-bold leading-6">
                      Hãy viết rõ ràng, đúng ngữ pháp <br />
                      và sử dụng từ vựng phù hợp nhé!
                    </div>
                    <div className="text-7xl">🦊</div>
                  </div>
                </div>
              </div>

              <div className="mb-7 flex gap-12 border-b border-purple-200">
                {["Viết câu", "Viết đoạn văn", "Viết bài luận"].map((tab, i) => (
                  <button
                    key={tab}
                    className={`flex items-center gap-2 border-b-4 px-2 pb-5 font-black ${
                      i === 1
                        ? "border-purple-600 text-purple-700"
                        : "border-transparent text-purple-400"
                    }`}
                  >
                    <BookOpen size={18} />
                    {tab}
                  </button>
                ))}
              </div>

              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black">Đề bài</h3>
                  <div className="flex gap-3">
                    <Badge>A2</Badge>
                    <Badge>Trung bình</Badge>
                  </div>
                </div>

                <p className="mb-5 font-semibold">
                  Viết một đoạn văn khoảng 120-150 từ về chủ đề sau:
                </p>

                <div className="flex gap-8 rounded-2xl border border-purple-200 bg-purple-50/40 p-6">
                  <div className="grid h-[130px] w-[190px] place-items-center rounded-xl bg-blue-100 text-6xl">
                    ✈️
                  </div>
                  <div>
                    <h4 className="mb-4 text-2xl font-black">A memorable trip</h4>
                    <p className="max-w-2xl text-lg font-medium leading-8 text-[#2b236f]">
                      Hãy viết về một chuyến đi đáng nhớ của bạn. Nói về địa điểm,
                      những việc bạn đã làm, những người đi cùng và cảm nhận của bạn
                      về chuyến đi đó.
                    </p>
                  </div>
                </div>
              </Card>

              <div className="mt-8">
                <h3 className="mb-4 text-xl font-black">Bài làm của bạn</h3>

                <div className="overflow-hidden rounded-2xl border border-purple-200 bg-white">
                  <div className="flex items-center justify-between border-b border-purple-100 px-5 py-4">
                    <div className="flex items-center gap-5 text-purple-400">
                      <Undo2 />
                      <Undo2 className="-scale-x-100" />
                      <b>B</b>
                      <i className="font-bold">I</i>
                      <u className="font-bold">U</u>
                      <span>☷</span>
                      <span>☰</span>
                      <span>▦</span>
                    </div>

                    <button className="flex items-center gap-2 font-bold text-purple-500">
                      <Lightbulb size={18} />
                      Gợi ý từ vựng
                    </button>
                  </div>

                  <textarea
                    className="h-[260px] w-full resize-none p-6 text-lg font-medium outline-none"
                    placeholder="Bắt đầu viết bài của bạn tại đây..."
                  />

                  <div className="flex justify-between border-t border-purple-100 px-5 py-4 font-semibold text-purple-400">
                    <span>Số từ: 0</span>
                    <span>Mục tiêu: 120 - 150 từ</span>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button className="flex items-center gap-3 rounded-xl border border-purple-200 bg-white px-9 py-4 font-black text-purple-700">
                    <BookOpen />
                    Hướng dẫn
                  </button>

                  <button className="flex items-center gap-3 rounded-xl border border-purple-200 bg-white px-9 py-4 font-black text-purple-400">
                    <Bookmark />
                    Lưu bài
                  </button>

                  <button className="flex items-center gap-3 rounded-xl bg-purple-600 px-20 py-4 font-black text-white shadow-lg shadow-purple-200">
                    <Send />
                    Nộp bài
                  </button>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <Card>
                <h3 className="mb-8 text-xl font-black">Tiến độ kỹ năng viết</h3>

                <div className="mx-auto mb-8 grid h-40 w-40 place-items-center rounded-full bg-[conic-gradient(#7c16ff_65%,#eee8ff_0)]">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
                    <div className="text-center">
                      <p className="text-4xl font-black">65%</p>
                      <p className="font-bold">Hoàn thành</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 text-center">
                  <MiniStat icon="✅" value="12" label="Bài đã nộp" />
                  <MiniStat icon="⭐" value="8.5" label="Điểm trung bình" />
                  <MiniStat icon="⬆️" value="3" label="Chuỗi ngày" />
                </div>
              </Card>

              <Card>
                <h3 className="mb-7 text-xl font-black">Tiêu chí chấm điểm</h3>
                {[
                  ["Nội dung", "Đầy đủ ý, phát triển ý tốt"],
                  ["Từ vựng", "Đa dạng, phù hợp chủ đề"],
                  ["Ngữ pháp", "Đúng cấu trúc, ít lỗi"],
                  ["Liên kết", "Mạch lạc, logic"],
                ].map(([title, desc]) => (
                  <div key={title} className="mb-6">
                    <div className="mb-2 flex justify-between font-black">
                      <span>{title}</span>
                      <span>25%</span>
                    </div>
                    <p className="mb-2 text-sm font-medium text-purple-400">{desc}</p>
                    <div className="h-2 rounded-full bg-purple-100">
                      <div className="h-2 w-1/2 rounded-full bg-purple-600" />
                    </div>
                  </div>
                ))}
              </Card>

              <Card className="bg-purple-50/70">
                <div className="mb-5 flex justify-between">
                  <h3 className="text-xl font-black">Gợi ý từ vựng</h3>
                  <button className="font-black text-purple-600">Xem thêm</button>
                </div>

                <div className="space-y-3">
                  {words.map(([en, vi]) => (
                    <div key={en} className="grid grid-cols-[1fr_1fr] gap-4">
                      <div className="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2 font-black">
                        🔊 {en}
                      </div>
                      <div className="px-3 py-2 font-semibold text-purple-400">{vi}</div>
                    </div>
                  ))}
                </div>
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-xl bg-green-100 px-5 py-2 font-black text-green-600">
      {children}
    </span>
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
      {icon}
      <div>
        <p className="font-black">{value}</p>
        <p className="text-xs font-bold text-purple-400">{label}</p>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div>
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-purple-50">
        {icon}
      </div>
      <p className="text-xl font-black">{value}</p>
      <p className="text-sm font-bold text-purple-400">{label}</p>
    </div>
  );
}
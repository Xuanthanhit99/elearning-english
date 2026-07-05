"use client";

import {
  BookOpen,
  Home,
  Search,
  Flame,
  Star,
  Gem,
  Gift,
  Bell,
  LogOut,
  Check,
  X,
  Clock,
  Lightbulb,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  Volume2,
  ChevronDown,
} from "lucide-react";

const menu = [
  "Trang chủ",
  "Tổng quan",
  "Từ vựng",
  "Ngữ pháp",
  "Nghe",
  "Nói",
  "Đọc hiểu",
  "Viết",
  "Flashcards",
];

const questions = [
  {
    id: 1,
    question: "What time does the writer usually wake up?",
    options: ["6 o'clock", "6:15", "7 o'clock", "7:30"],
    selected: "6 o'clock",
  },
  {
    id: 2,
    question: "What does the writer do after waking up?",
  },
  {
    id: 3,
    question: "What does the writer have for breakfast?",
  },
  {
    id: 4,
    question: "How does the writer go to school?",
  },
];

export default function ReadingHomePage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#16124a]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-screen w-[260px] border-r border-purple-100 bg-white px-5 py-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="text-3xl">🦊</div>
            <h1 className="text-2xl font-black">
              Study<span className="text-violet-600">Arena</span>
            </h1>
          </div>

          <nav className="space-y-2">
            {menu.map((item) => (
              <div
                key={item}
                className={`flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold ${
                  item === "Đọc hiểu"
                    ? "bg-violet-100 text-violet-700"
                    : "text-slate-600 hover:bg-violet-50"
                }`}
              >
                <BookOpen size={18} />
                {item}
              </div>
            ))}

            <div className="ml-8 mt-2 space-y-2 border-l border-violet-200 pl-4 text-sm font-semibold">
              <p className="text-slate-500">Luyện đọc</p>
              <p className="text-slate-500">Đọc theo chủ đề</p>
              <p className="rounded-lg bg-violet-100 px-3 py-2 text-violet-700">
                Đọc hiểu
              </p>
            </div>
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 p-4">
            <p className="font-black text-violet-700">👑 Nâng cấp Premium</p>
            <p className="mt-2 text-xs text-slate-600">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
              Nâng cấp ngay
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="ml-[260px] flex-1">
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-purple-100 bg-white/80 px-10 backdrop-blur">
            <div className="relative w-[520px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400" />
              <input
                className="h-14 w-full rounded-2xl border border-purple-100 bg-white pl-12 pr-4 font-semibold outline-none focus:border-violet-400"
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
              />
            </div>

            <div className="flex items-center gap-8">
              <Stat icon={<Flame />} value="18" label="Streak" />
              <Stat icon={<Star />} value="2,450" label="XP hôm nay" />
              <Stat icon={<Gem />} value="5,230" label="Xu" />

              <Gift className="text-violet-600" />
              <div className="relative">
                <Bell className="text-violet-600" />
                <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 text-xs text-white">
                  3
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-orange-100 text-xl">
                  🧑
                </div>
                <div>
                  <p className="text-sm font-black">Minh Anh</p>
                  <p className="text-xs text-slate-500">Level 18</p>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_380px] gap-8 px-10 py-8">
            {/* Content */}
            <section>
              <div className="mb-6 text-sm font-semibold text-slate-500">
                Trang chủ &gt; Đọc hiểu &gt;{" "}
                <span className="text-slate-800">Luyện đọc hiểu</span>
              </div>

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-black">
                    Luyện đọc hiểu{" "}
                    <BookOpen className="inline text-violet-600" />
                  </h2>
                  <p className="mt-2 font-semibold text-slate-500">
                    Đọc đoạn văn và trả lời câu hỏi
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-semibold">
                    Đọc kỹ đoạn văn <br /> và trả lời câu hỏi nhé!
                  </div>
                  <div className="text-7xl">🦊</div>
                  <button className="flex items-center gap-2 rounded-xl border border-purple-100 bg-white px-5 py-3 font-bold">
                    Thoát bài <LogOut size={16} className="text-red-500" />
                  </button>
                </div>
              </div>

              <div className="mb-6 flex gap-4">
                <Badge text="Câu 3 / 10" />
                <Badge text="Dễ" green />
                <Badge text="Chủ đề: Daily Life" white />
              </div>

              {/* Reading card */}
              <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black">
                  Đọc đoạn văn
                  <Volume2 className="rounded-full bg-violet-100 p-1 text-violet-600" />
                </h3>

                <div className="grid grid-cols-[1fr_230px] gap-5 rounded-2xl border border-purple-100 p-4">
                  <div>
                    <h4 className="mb-2 text-lg font-black">
                      My Morning Routine
                    </h4>
                    <p className="leading-8 text-slate-700">
                      I usually wake up at 6 o'clock every morning. After that,
                      I do some exercise for about 15 minutes.
                      <br />
                      Then I take a shower and have breakfast with my family. I
                      often have bread, eggs, and a glass of milk.
                      <br />
                      After breakfast, I go to school by bike. My school starts
                      at 7:30.
                      <br />I think having a good morning routine helps me feel
                      happy and ready for the day.
                    </p>
                  </div>

                  <div className="grid place-items-center rounded-xl bg-orange-50 text-8xl">
                    🛏️
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="mt-7">
                <h3 className="mb-4 text-xl font-black">Trả lời câu hỏi</h3>

                <div className="space-y-4">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className={`rounded-xl border bg-white ${
                        q.selected
                          ? "border-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
                          : "border-purple-100"
                      }`}
                    >
                      <div className="flex items-center justify-between px-4 py-4 font-black">
                        <span>
                          {q.id}. {q.question}
                        </span>
                        {q.selected ? (
                          <Check className="text-green-500" />
                        ) : (
                          <ChevronDown className="text-slate-500" />
                        )}
                      </div>

                      {q.options && (
                        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                          {q.options.map((option, index) => (
                            <button
                              key={option}
                              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-bold ${
                                q.selected === option
                                  ? "border-violet-500 bg-violet-50 text-violet-700"
                                  : "border-purple-100 bg-white"
                              }`}
                            >
                              <span
                                className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
                                  q.selected === option
                                    ? "bg-violet-600 text-white"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {String.fromCharCode(65 + index)}
                              </span>
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between">
                <button className="flex items-center gap-2 rounded-xl border border-violet-300 px-6 py-3 font-bold text-violet-700">
                  <ArrowLeft size={18} /> Câu trước
                </button>

                <button className="flex items-center gap-2 rounded-xl border border-purple-100 bg-white px-6 py-3 font-bold">
                  <Bookmark size={18} /> Đánh dấu
                </button>

                <button className="flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3 font-bold text-white shadow-lg shadow-violet-200">
                  Câu tiếp theo <ArrowRight size={18} />
                </button>
              </div>
            </section>

            {/* Right sidebar */}
            <aside className="space-y-5">
              <Card title="Tiến độ bài học">
                <div className="mb-5 h-3 rounded-full bg-violet-100">
                  <div className="h-full w-[30%] rounded-full bg-violet-600" />
                </div>

                <div className="grid grid-cols-3 text-center">
                  <MiniStat icon={<Check />} value="3" label="Đúng" green />
                  <MiniStat icon={<X />} value="0" label="Sai" red />
                  <MiniStat value="0" label="Bỏ qua" />
                </div>
              </Card>

              <Card title="Thời gian làm bài">
                <div className="flex items-center gap-4">
                  <Clock className="text-violet-600" size={42} />
                  <p className="text-3xl font-black">
                    07:45{" "}
                    <span className="text-lg text-slate-500">/ 15:00</span>
                  </p>
                </div>
              </Card>

              <Card title="💡 Mẹo nhỏ">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold leading-6 text-slate-600">
                    Đọc lướt đoạn văn trước, sau đó đọc kỹ từng câu hỏi và tìm
                    thông tin quan trọng nhé!
                  </p>
                  <div className="text-6xl">🦊</div>
                </div>
              </Card>

              <Card title="Tổng kết">
                <Summary label="Tổng số câu" value="10" />
                <Summary label="Đã trả lời" value="3" />
                <Summary label="Còn lại" value="7" />
                <button className="mt-4 w-full rounded-xl border border-violet-500 py-3 font-black text-violet-700">
                  Nộp bài
                </button>
              </Card>

              <Card title="Từ vựng trong bài">
                {["routine", "exercise", "ready"].map((word) => (
                  <div
                    key={word}
                    className="mb-3 flex items-center gap-3 rounded-xl bg-violet-50 p-3"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-white">
                      📘
                    </div>
                    <div>
                      <p className="font-black">{word}</p>
                      <p className="text-xs text-slate-500">từ vựng trong bài</p>
                    </div>
                  </div>
                ))}

                <button className="mt-2 flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-3 font-bold text-violet-700">
                  Xem thêm từ mới <ArrowRight size={16} />
                </button>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-orange-500">{icon}</div>
      <div>
        <p className="font-black">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Badge({ text, green, white }: any) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm font-black ${
        green
          ? "bg-green-100 text-green-700"
          : white
          ? "border border-purple-100 bg-white"
          : "bg-violet-100 text-violet-700"
      }`}
    >
      {text}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-black">{title}</h3>
      {children}
    </div>
  );
}

function MiniStat({ icon, value, label, green, red }: any) {
  return (
    <div>
      <div
        className={`mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full ${
          green ? "bg-green-100 text-green-600" : red ? "bg-red-100 text-red-500" : "bg-violet-100 text-violet-500"
        }`}
      >
        {icon || "×"}
      </div>
      <p className="text-xl font-black">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function Summary({ label, value }: any) {
  return (
    <div className="mb-3 flex items-center justify-between text-sm font-bold text-slate-600">
      <span>{label}</span>
      <span className="rounded-lg bg-violet-50 px-3 py-1 text-violet-700">
        {value}
      </span>
    </div>
  );
}
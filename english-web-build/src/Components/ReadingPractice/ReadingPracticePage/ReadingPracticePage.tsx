'use client';

import {
  BookOpen,
  Home,
  Search,
  Flame,
  Star,
  Gem,
  Gift,
  Bell,
  Volume2,
  Mic,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  Play,
  Lock,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function ReadingPracticePage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#14115f]">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[270px] border-r border-violet-100 bg-white px-5 py-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="text-3xl">🦊</div>
            <h1 className="text-2xl font-extrabold">
              Study<span className="text-violet-600">Arena</span>
            </h1>
          </div>

          <nav className="space-y-1 text-sm font-bold">
            <MenuItem icon={<Home size={18} />} text="Trang chủ" />
            <SectionTitle text="HỌC TẬP" />
            <MenuItem text="Tổng quan" />
            <MenuItem text="Từ vựng" />
            <MenuItem text="Ngữ pháp" />
            <MenuItem text="Nghe" />
            <MenuItem text="Nói" />

            <div className="rounded-xl bg-violet-100/80 p-3 text-violet-700">
              <div className="flex items-center gap-3">
                <BookOpen size={18} />
                Đọc hiểu
              </div>
            </div>

            <div className="ml-7 border-l-2 border-violet-100 pl-5">
              <div className="mb-2 rounded-xl bg-violet-100 px-3 py-3 text-violet-700">
                Luyện đọc
              </div>
              <div className="px-3 py-3">Đọc theo chủ đề</div>
              <div className="px-3 py-3">Đọc hiểu</div>
            </div>

            <MenuItem text="Viết" />
            <MenuItem text="Flashcards" />

            <SectionTitle text="CỘNG ĐỒNG" />
            <MenuItem text="Cộng đồng" />
            <MenuItem text="Hỏi đáp" />
            <MenuItem text="Thành tích" />
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-violet-50 p-4">
            <div className="mb-2 font-extrabold text-violet-700">🎁 Nâng cấp Premium</div>
            <p className="mb-3 text-xs text-slate-500">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
              Nâng cấp ngay
            </button>
          </div>
        </aside>

        <main className="ml-[270px] flex-1">
          <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b border-violet-100 bg-white/90 px-10 backdrop-blur">
            <div className="flex w-[520px] items-center gap-3 rounded-2xl border border-violet-100 bg-white px-5 py-4 shadow-sm">
              <Search size={22} className="text-violet-400" />
              <input
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-7">
              <Stat icon={<Flame className="text-red-500" />} value="18" label="Streak" />
              <Stat icon={<Star className="text-yellow-400" />} value="2,450" label="XP hôm nay" />
              <Stat icon={<Gem className="text-blue-500" />} value="5,230" label="Xu" />
              <Gift className="text-violet-600" />
              <Bell className="text-violet-400" />
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-orange-100">👩</div>
                <div>
                  <div className="text-sm font-extrabold">Minh Anh</div>
                  <div className="text-xs text-slate-400">Level 18</div>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_420px] gap-10 p-10">
            <section>
              <div className="mb-8 text-sm font-semibold text-violet-500">
                ← Trang chủ 〉 Đọc hiểu 〉 <span className="text-[#14115f]">Luyện đọc</span>
              </div>

              <div className="mb-8 flex justify-between">
                <div>
                  <h2 className="mb-2 flex items-center gap-3 text-4xl font-extrabold">
                    Luyện đọc <BookOpen className="text-violet-600" />
                  </h2>
                  <p className="text-violet-500">
                    Đọc to đoạn văn và cải thiện phát âm, ngữ điệu, tốc độ đọc của bạn.
                  </p>
                </div>

                <div className="flex items-end gap-4">
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 text-sm font-semibold">
                    Hãy đọc to đoạn văn <br /> bên dưới nhé!
                    <br />
                    Bạn làm rất tốt! 💪
                  </div>
                  <div className="text-8xl">🦊</div>
                </div>
              </div>

              <div className="mb-8 flex gap-5">
                <Badge text="Cấp độ: A2" />
                <Badge text="Chủ đề: Daily Life" green />
                <Badge text="Bài 3 / 10" />
              </div>

              <Card className="mb-6 grid grid-cols-[1fr_430px] gap-8">
                <div>
                  <div className="mb-7 flex items-center gap-3 text-xl font-extrabold">
                    Đoạn văn
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-violet-700">
                      <Volume2 size={18} />
                    </button>
                  </div>

                  <h3 className="mb-5 text-2xl font-extrabold">A Visit to the Library</h3>

                  <p className="leading-8 text-[#19136b]">
                    Last Saturday, I visited the library with my friend Anna. The library is not far
                    from my house, so we walked there. It was quiet and clean.
                    <br />
                    We found many interesting books on the shelves. I borrowed a book about space,
                    and Anna borrowed a storybook.
                    <br />
                    <br />
                    We read in the reading room for an hour. Then, we returned the books we had
                    finished. I love going to the library because it helps me learn new things and
                    relax at the same time.
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl bg-orange-100">
                  <div className="grid h-full min-h-[270px] place-items-center text-8xl">
                    📚👧👦
                  </div>
                </div>
              </Card>

              <Card className="mb-8">
                <h3 className="mb-8 text-xl font-extrabold">Bắt đầu luyện đọc</h3>

                <div className="grid grid-cols-[190px_1fr_260px] items-center gap-8">
                  <button className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 px-5 py-3 font-bold text-violet-700">
                    <Volume2 size={18} />
                    Nghe mẫu
                  </button>

                  <div className="text-center">
                    <div className="mx-auto mb-5 grid h-28 w-28 place-items-center rounded-full bg-violet-600 shadow-[0_0_0_14px_#eee6ff]">
                      <Mic size={42} className="text-white" />
                    </div>
                    <div className="mb-2 text-lg font-extrabold">Nhấn vào mic để bắt đầu đọc</div>
                    <div className="font-semibold text-violet-500">00:00 / 02:00</div>
                  </div>

                  <div className="rounded-2xl bg-violet-50 p-5">
                    <div className="mb-3 flex items-center gap-2 font-extrabold text-violet-700">
                      <Sparkles size={18} />
                      Mẹo luyện đọc
                    </div>
                    <ul className="space-y-2 text-sm font-medium">
                      <li>• Phát âm rõ ràng các từ</li>
                      <li>• Ngữ điệu tự nhiên</li>
                      <li>• Tốc độ vừa phải</li>
                      <li>• Ngắt nghỉ hợp lý</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <div className="flex items-center justify-between">
                <button className="flex items-center gap-2 rounded-xl border border-violet-200 px-6 py-4 font-bold text-violet-700">
                  <ArrowLeft size={18} /> Bài trước
                </button>

                <button className="flex items-center gap-2 rounded-xl border border-violet-200 px-8 py-4 font-bold">
                  <Bookmark size={18} /> Đánh dấu
                </button>

                <button className="flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-4 font-bold text-white shadow-lg shadow-violet-200">
                  Nộp bài <ArrowRight size={18} />
                </button>
              </div>
            </section>

            <aside className="space-y-6">
              <Card>
                <h3 className="mb-8 text-xl font-extrabold">Tiến độ bài học</h3>

                <div className="mx-auto mb-6 grid h-40 w-40 place-items-center rounded-full bg-[conic-gradient(#7c3aed_30%,#f0ebff_0)]">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                    <div>
                      <div className="text-4xl font-extrabold">30%</div>
                      <div className="text-sm font-bold">Hoàn thành</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 text-center">
                  <Mini icon={<CheckCircle2 />} value="3" label="Đã hoàn thành" />
                  <Mini icon={<Play />} value="1" label="Đang làm" />
                  <Mini icon={<Lock />} value="6" label="Còn lại" />
                </div>
              </Card>

              <Card>
                <h3 className="mb-6 flex items-center gap-2 text-xl font-extrabold">
                  Kết quả luyện đọc <HelpCircle size={16} className="text-violet-300" />
                </h3>

                <Score label="Phát âm" value={85} />
                <Score label="Ngữ điệu" value={80} />
                <Score label="Tốc độ" value={75} />
                <Score label="Lưu loát" value={90} orange />

                <div className="mt-8 flex items-center justify-between border-t border-violet-100 pt-6">
                  <div>
                    <div className="font-bold text-violet-700">Điểm tổng</div>
                    <div className="text-3xl font-extrabold">83 <span className="text-lg text-slate-400">/ 100</span></div>
                    <p className="mt-3 text-sm font-medium">Tuyệt vời! Bạn đang tiến bộ rất tốt!</p>
                  </div>
                  <div className="text-7xl">🦊</div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-5 text-xl font-extrabold">Lịch sử luyện đọc</h3>
                <History title="A Day at the Park" time="Hôm qua, 14:30" score="78" />
                <History title="My School Life" time="2 ngày trước" score="85" />
                <History title="My Family" time="3 ngày trước" score="90" />
                <button className="mt-4 font-extrabold text-violet-700">Xem tất cả →</button>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({ children, className = '' }: any) {
  return (
    <div className={`rounded-2xl border border-violet-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function MenuItem({ icon, text }: any) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-violet-50">
      {icon}
      {text}
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <div className="px-3 pt-5 text-xs font-black tracking-widest text-violet-400">{text}</div>;
}

function Stat({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <div className="font-extrabold">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function Badge({ text, green }: any) {
  return (
    <div className={`rounded-xl px-5 py-3 font-extrabold ${green ? 'bg-green-50 text-green-600' : 'bg-violet-50 text-violet-700'}`}>
      {text}
    </div>
  );
}

function Mini({ icon, value, label }: any) {
  return (
    <div>
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
        {icon}
      </div>
      <div className="font-extrabold">{value}</div>
      <div className="text-xs font-semibold text-violet-500">{label}</div>
    </div>
  );
}

function Score({ label, value, orange }: any) {
  return (
    <div className="mb-4 grid grid-cols-[80px_1fr_45px] items-center gap-4 text-sm font-bold">
      <div>{label}</div>
      <div className="h-2 rounded-full bg-violet-100">
        <div
          className={`h-2 rounded-full ${orange ? 'bg-orange-400' : 'bg-violet-600'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div>{value}%</div>
    </div>
  );
}

function History({ title, time, score }: any) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100">👦</div>
        <div>
          <div className="font-extrabold">{title}</div>
          <div className="text-xs text-slate-400">{time}</div>
        </div>
      </div>
      <div className="rounded-full bg-green-50 px-4 py-2 font-extrabold text-green-600">{score}</div>
    </div>
  );
}
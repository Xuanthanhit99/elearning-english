// app/grammar/present-simple/page.tsx
import {
  Home,
  BookOpen,
  Headphones,
  Mic,
  PenLine,
  Trophy,
  Settings,
  Star,
  Clock,
  Bookmark,
  CheckCircle2,
  Lock,
  ChevronRight,
  Gift,
  Bell,
  Flame,
  Gem,
  Search,
} from "lucide-react";

interface Props {
  slug: string[];
}

export default function GrammarDetailPage({ slug }: Props) {
  const lessons = [
    { id: 1, title: "Cách dùng & dấu hiệu nhận biết", done: true, time: "3–5 phút" },
    { id: 2, title: "Thành lập câu khẳng định", done: true, time: "3–4 phút" },
    { id: 3, title: "Thành lập câu phủ định", current: true, time: "3–4 phút" },
    { id: 4, title: "Thành lập câu nghi vấn", locked: true, time: "3–4 phút" },
    { id: 5, title: "Bài tập tổng hợp", locked: true, time: "5–8 phút", type: "Bài tập" },
  ];

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#10164f]">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[280px] border-r bg-white px-4 py-5">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="text-3xl">🦊</div>
            <h1 className="text-2xl font-black">
              Study<span className="text-violet-600">Arena</span>
            </h1>
          </div>

          <SidebarItem icon={<Home size={18} />} label="Trang chủ" />
          <SidebarTitle title="Học tập" />
          <SidebarItem icon={<BookOpen size={18} />} label="Tổng quan" />
          <SidebarItem icon={<BookOpen size={18} />} label="Từ vựng" />
          <SidebarItem active icon={<BookOpen size={18} />} label="Ngữ pháp" />
          <SidebarItem icon={<Headphones size={18} />} label="Nghe" />
          <SidebarItem icon={<Mic size={18} />} label="Nói" />
          <SidebarItem icon={<BookOpen size={18} />} label="Đọc hiểu" />
          <SidebarItem icon={<PenLine size={18} />} label="Viết" />

          <SidebarTitle title="Cộng đồng" />
          <SidebarItem icon={<Trophy size={18} />} label="Cộng đồng" />
          <SidebarItem icon={<Star size={18} />} label="Thành tích" />

          <SidebarTitle title="Khác" />
          <SidebarItem icon={<Settings size={18} />} label="Cài đặt" />

          <div className="absolute bottom-5 left-4 right-4 rounded-2xl border bg-gradient-to-br from-white to-violet-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold text-violet-700">
              <Star size={18} className="fill-orange-400 text-orange-400" />
              Nâng cấp Premium
            </div>
            <p className="text-sm text-slate-500">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
              Nâng cấp ngay
            </button>
          </div>
        </aside>

        <main className="ml-[280px] flex-1">
          <header className="sticky top-0 z-10 flex h-[82px] items-center justify-between border-b bg-white/80 px-6 backdrop-blur">
            <div className="flex h-12 w-[700px] items-center gap-3 rounded-xl border bg-[#f7f5ff] px-4">
              <Search size={20} />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
              />
            </div>

            <div className="flex items-center gap-5 text-sm font-bold">
              <TopStat icon={<Flame className="text-red-500" />} value="18" label="Streak" />
              <TopStat icon={<Star className="text-orange-400" />} value="2,450" label="XP hôm nay" />
              <TopStat icon={<Gem className="text-sky-400" />} value="5,230" label="Xu" />
              <Gift className="text-violet-600" />
              <Bell className="text-indigo-500" />
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-orange-100 text-xl">
                  🦊
                </div>
                <div>
                  <p>Minh Anh</p>
                  <p className="text-xs text-slate-400">Level 18</p>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_430px] gap-8 p-6">
            <section>
              <div className="mb-6 text-sm text-slate-500">
                Trang chủ &gt; Ngữ pháp &gt; Các thì &gt; Present &gt;{" "}
                <b className="text-[#10164f]">Present Simple</b>
              </div>

              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="flex items-center gap-3 text-4xl font-black">
                    Present Simple
                    <Star size={22} className="text-orange-400" />
                  </h2>
                  <p className="mt-3 text-slate-500">
                    Sử dụng để diễn tả thói quen, sự thật hiển nhiên, lịch trình hoặc cảm xúc, trạng thái.
                  </p>

                  <div className="mt-6 flex gap-4">
                    <Badge>🌐 Trung cấp (B1)</Badge>
                    <Badge>🕒 15–20 phút</Badge>
                    <Badge>⭐ +100 XP</Badge>
                    <Badge green>3/5 bài học hoàn thành</Badge>
                  </div>
                </div>

                <div className="flex items-end gap-5">
                  <div className="rounded-2xl bg-indigo-50 px-5 py-4 text-sm font-bold">
                    Giữ vững nhịp học nhé!
                    <p className="font-normal text-slate-500">Bạn đang làm rất tốt! 💜</p>
                  </div>
                  <div className="text-7xl">🦊</div>
                  <button className="rounded-xl border bg-white p-3">
                    <Bookmark size={20} />
                  </button>
                  <button className="rounded-xl bg-violet-600 px-8 py-4 font-bold text-white shadow-lg shadow-violet-200">
                    Tiếp tục học
                  </button>
                </div>
              </div>

              <div className="mb-6 flex gap-8 border-b">
                {["Tổng quan", "Bài học (5)", "Bài tập", "Mẹo ghi nhớ", "Thảo luận"].map((x, i) => (
                  <button
                    key={x}
                    className={`pb-4 font-bold ${
                      i === 0 ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"
                    }`}
                  >
                    {x}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-[1.5fr_1fr] gap-5">
                <div className="overflow-hidden rounded-2xl border bg-white">
                  <div className="grid grid-cols-2">
                    <div className="grid h-[370px] place-items-center bg-gradient-to-br from-violet-500 to-violet-300 text-white">
                      <div className="text-center">
                        <h3 className="text-4xl font-black">Present Simple</h3>
                        <div className="mt-8 text-8xl">⏰</div>
                      </div>
                    </div>

                    <div className="space-y-5 p-7 text-sm">
                      <Info label="Chủ đề" value="Các thì" />
                      <Info label="Nhóm" value="Present" />
                      <Info label="Cấp độ" value="Trung cấp (B1)" />
                      <Info label="Số bài học" value="5 bài học" />
                      <Info label="Tiến độ của bạn" value="60%" progress />
                      <Info label="Hoàn thành" value="3/5 bài học" />
                      <Info label="Ước tính thời gian" value="15–20 phút" />
                      <Info label="Phần thưởng" value="+100 XP  +50 Xu" />
                    </div>
                  </div>

                  <p className="p-5 text-sm leading-6 text-slate-500">
                    Present Simple được dùng để diễn tả những hành động xảy ra thường xuyên,
                    thói quen hằng ngày, sự thật hiển nhiên, lịch trình cố định hoặc cảm xúc,
                    trạng thái không thay đổi.
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-6">
                  <h3 className="mb-5 font-black">Cách dùng chính</h3>
                  <UseCase color="green" title="Thói quen & hành động lặp lại" text="I go to school every day." />
                  <UseCase color="blue" title="Sự thật hiển nhiên" text="The sun rises in the east." />
                  <UseCase color="orange" title="Lịch trình & thời gian biểu" text="The train leaves at 8 a.m." />
                  <UseCase color="pink" title="Cảm xúc, trạng thái" text="I love coffee." />

                  <button className="mt-4 w-full rounded-xl border py-3 font-bold text-violet-600">
                    Xem thêm ví dụ
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border bg-white">
                <h3 className="border-b p-5 font-black">Bài học trong chủ đề</h3>

                {lessons.map((lesson) => (
                  <div key={lesson.id} className="grid grid-cols-[50px_1fr_120px_160px_120px] items-center border-b px-5 py-4 text-sm">
                    <div
                      className={`grid h-7 w-7 place-items-center rounded-full font-bold ${
                        lesson.done
                          ? "bg-emerald-500 text-white"
                          : lesson.current
                          ? "bg-violet-600 text-white"
                          : "bg-slate-300 text-white"
                      }`}
                    >
                      {lesson.done ? <CheckCircle2 size={17} /> : lesson.id}
                    </div>
                    <div className="font-bold">{lesson.title}</div>
                    <span className={`w-fit rounded-lg px-3 py-1 text-xs font-bold ${lesson.type ? "bg-pink-100 text-pink-500" : "bg-blue-100 text-blue-500"}`}>
                      {lesson.type || "Lý thuyết"}
                    </span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock size={15} /> {lesson.time}
                    </div>
                    <div className="text-right">
                      {lesson.done && <span className="font-bold text-emerald-500">Hoàn thành</span>}
                      {lesson.current && (
                        <button className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white">
                          Tiếp tục
                        </button>
                      )}
                      {lesson.locked && <Lock size={18} className="ml-auto text-slate-400" />}
                    </div>
                  </div>
                ))}

                <button className="m-4 w-[calc(100%-32px)] rounded-xl border py-3 font-bold">
                  Xem tất cả bài học
                </button>
              </div>
            </section>

            <aside className="space-y-6">
              <RightCard title="Tiến độ chủ đề">
                <div className="flex items-center gap-8">
                  <div className="grid h-36 w-36 place-items-center rounded-full border-[12px] border-violet-600">
                    <div className="text-center">
                      <p className="text-3xl font-black">60%</p>
                      <p className="text-xs text-slate-500">Hoàn thành</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm">
                    <ProgressLine icon="✅" main="3/5" sub="Bài học hoàn thành" />
                    <ProgressLine icon="✅" main="8/15" sub="Bài tập hoàn thành" />
                    <ProgressLine icon="⭐" main="+60 XP" sub="Điểm nhận được" />
                    <ProgressLine icon="⏱" main="5 ngày" sub="Chuỗi học hiện tại" />
                  </div>
                </div>
              </RightCard>

              <RightCard title="Lộ trình ngữ pháp" action="Xem tất cả">
                <Roadmap done title="Các thì cơ bản" sub="Hoàn thành" />
                <Roadmap done title="Present" sub="Hoàn thành" />
                <Roadmap current title="Present Simple" sub="Đang học" />
                <Roadmap locked title="Present Continuous" sub="Chưa mở khóa" />
                <Roadmap locked title="Present Perfect" sub="Chưa mở khóa" />

                <button className="mt-5 w-full rounded-xl border py-3 font-bold text-violet-600">
                  Xem roadmap đầy đủ
                </button>
              </RightCard>

              <RightCard title="Chủ đề liên quan" action="Xem tất cả">
                <Related title="Present Continuous" percent="45%" />
                <Related title="Present Perfect" percent="20%" />
                <Related title="Past Simple" percent="75%" />
                <Related title="Past Continuous" percent="30%" />
              </RightCard>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarTitle({ title }: { title: string }) {
  return <p className="mb-3 mt-6 px-3 text-xs font-black uppercase text-slate-400">{title}</p>;
}

function SidebarItem({ icon, label, active }: any) {
  return (
    <div
      className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${
        active ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function TopStat({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p>{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function Badge({ children, green }: any) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${green ? "bg-emerald-50 text-emerald-600" : "bg-white"}`}>
      {children}
    </div>
  );
}

function Info({ label, value, progress }: any) {
  return (
    <div className="grid grid-cols-[1fr_1fr] items-center gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">
        {progress ? (
          <div className="flex items-center gap-3">
            <div className="h-2 w-20 rounded-full bg-slate-200">
              <div className="h-2 w-[60%] rounded-full bg-violet-600" />
            </div>
            {value}
          </div>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

function UseCase({ title, text, color }: any) {
  const colors: any = {
    green: "text-emerald-500",
    blue: "text-blue-500",
    orange: "text-orange-500",
    pink: "text-pink-500",
  };

  return (
    <div className="mb-5">
      <p className={`font-bold ${colors[color]}`}>● {title}</p>
      <p className="ml-5 mt-2 text-sm font-bold">{text}</p>
      <p className="ml-5 text-sm text-slate-500">(Ví dụ minh họa.)</p>
    </div>
  );
}

function RightCard({ title, action, children }: any) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-black">{title}</h3>
        {action && <button className="text-sm font-bold text-violet-600">{action}</button>}
      </div>
      {children}
    </div>
  );
}

function ProgressLine({ icon, main, sub }: any) {
  return (
    <div>
      <p className="font-black">
        {icon} {main}
      </p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function Roadmap({ title, sub, done, current, locked }: any) {
  return (
    <div className="mb-5 flex gap-4">
      <div
        className={`mt-1 grid h-6 w-6 place-items-center rounded-full text-xs text-white ${
          done ? "bg-emerald-500" : current ? "bg-violet-600" : "bg-slate-300"
        }`}
      >
        {locked ? <Lock size={13} /> : done ? "✓" : "●"}
      </div>
      <div>
        <p className={`font-bold ${current ? "text-violet-600" : ""}`}>{title}</p>
        <p className="text-sm text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function Related({ title, percent }: any) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
        <BookOpen size={18} />
      </div>
      <div className="flex-1">
        <div className="mb-2 flex justify-between text-sm font-bold">
          <span>{title}</span>
          <span>{percent}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-violet-600" style={{ width: percent }} />
        </div>
      </div>
      <ChevronRight size={18} />
    </div>
  );
}
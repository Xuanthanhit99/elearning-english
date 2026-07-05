"use client";

import {
  Bell,
  BookOpen,
  ChevronDown,
  Gift,
  Home,
  LogOut,
  Mic,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trophy,
  Volume2,
  Wand2,
  Users,
  Flame,
  Gem,
  CheckCircle2,
  XCircle,
  CircleX,
  Target,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

const menu = [
  { title: "Trang chủ", icon: Home },
  { title: "Tổng quan", icon: Trophy },
  { title: "Từ vựng", icon: BookOpen },
  { title: "Ngữ pháp", icon: Wand2 },
  { title: "Nghe", icon: Volume2 },
  { title: "Nói", icon: Mic, active: true },
  { title: "Đọc hiểu", icon: ShieldCheck },
  { title: "Viết", icon: Wand2 },
  { title: "Flashcards", icon: Gift },
];

const speakingSub = ["Luyện nói", "Nói theo chủ đề", "Nói theo tình huống"];

export default function SpeakingPracticePage() {
  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#101044]">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[285px] border-r border-[#ece9ff] bg-white px-5 py-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="text-4xl">🦊</div>
            <h1 className="text-2xl font-black">
              Study<span className="text-violet-600">Arena</span>
            </h1>
          </div>

          <nav className="space-y-2 text-sm font-bold">
            <SidebarTitle title="HỌC TẬP" />
            {menu.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title}>
                  <div
                    className={`flex items-center gap-4 rounded-xl px-4 py-3 ${
                      item.active
                        ? "bg-violet-100 text-violet-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.title}</span>
                  </div>

                  {item.active && (
                    <div className="ml-7 mt-2 border-l-2 border-violet-200 pl-5">
                      {speakingSub.map((sub, index) => (
                        <div
                          key={sub}
                          className={`py-2 text-sm ${
                            index === 0
                              ? "font-black text-violet-700"
                              : "text-slate-700"
                          }`}
                        >
                          {sub}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <SidebarTitle title="CỘNG ĐỒNG" />
            <SidebarItem icon={Users} title="Cộng đồng" />
            <SidebarItem icon={BookOpen} title="Hỏi đáp" />
            <SidebarItem icon={Trophy} title="Thành tích" />

            <SidebarTitle title="KHÁC" />
            <SidebarItem icon={BookOpen} title="Khoá học" />
            <SidebarItem icon={ShoppingBag} title="Shop" />
            <SidebarItem icon={Settings} title="Cài đặt" />
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 p-4">
            <div className="font-black text-violet-700">👑 Nâng cấp Premium</div>
            <p className="mt-2 text-xs text-slate-600">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-xs font-black text-white">
              Nâng cấp ngay
            </button>
            <div className="absolute bottom-0 right-2 text-5xl">🦊</div>
          </div>
        </aside>

        <main className="ml-[285px] flex-1">
          <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-[#ece9ff] bg-white px-10">
            <div className="flex h-12 w-[580px] items-center gap-3 rounded-xl border border-[#e4e0ff] bg-white px-4">
              <Search size={22} className="text-slate-400" />
              <input
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-8">
              <TopStat icon="🔥" value="18" label="Streak" />
              <TopStat icon="⭐" value="2,450" label="XP hôm nay" />
              <TopStat icon="💎" value="5,230" label="Xu" />

              <button className="rounded-full border border-violet-100 p-3">
                <Gift className="text-violet-600" />
              </button>

              <button className="relative rounded-full border border-violet-100 p-3">
                <Bell className="text-slate-500" />
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-bold text-white">
                  3
                </span>
              </button>

              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-orange-300 to-cyan-300 text-2xl">
                  🧑
                </div>
                <div>
                  <div className="font-black">Minh Anh</div>
                  <div className="text-xs text-slate-500">Level 18</div>
                </div>
                <ChevronDown size={18} />
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_410px] gap-8 px-10 py-8">
            <section>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <div className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-500">
                    <ArrowLeft size={18} />
                    Trang chủ <span>›</span> Nói <span>›</span>
                    <span className="text-[#101044]">Luyện nói</span>
                  </div>

                  <h2 className="flex items-center gap-3 text-4xl font-black">
                    Luyện nói <Mic className="text-violet-600" />
                  </h2>
                  <p className="mt-2 text-lg text-slate-500">
                    Luyện phát âm và nói tiếng Anh tự tin hơn mỗi ngày
                  </p>
                </div>

                <button className="flex items-center gap-2 rounded-xl border border-[#e4e0ff] bg-white px-6 py-4 font-black">
                  Thoát bài <LogOut size={18} />
                </button>
              </div>

              <div className="rounded-2xl border border-[#e4d8ff] bg-gradient-to-br from-white to-violet-50 p-8 shadow-sm">
                <div className="mb-8 flex items-center gap-5">
                  <Badge color="violet">⏱ Câu 3 / 10</Badge>
                  <Badge color="green">☘ Dễ</Badge>
                  <Badge color="white">🌿 Chủ đề: Daily Life</Badge>
                </div>

                <div className="relative">
                  <div>
                    <div className="mb-4 flex items-center gap-3 text-xl font-black">
                      Hãy đọc câu sau
                      <Volume2 className="text-violet-600" />
                    </div>
                    <h3 className="text-4xl font-black">
                      I usually go to school by bus.
                    </h3>
                    <p className="mt-5 text-lg text-slate-500">
                      (Tôi thường đi học bằng xe buýt.)
                    </p>
                  </div>

                  <div className="absolute right-5 top-0 flex items-end gap-4">
                    <div className="rounded-2xl border border-violet-100 bg-white px-6 py-4 font-bold shadow-sm">
                      Thử nói nào!
                    </div>
                    <div className="text-8xl">🦊</div>
                  </div>
                </div>

                <div className="mt-10 rounded-2xl border-2 border-violet-200 bg-white p-10">
                  <div className="flex items-center justify-center gap-8">
                    <Wave />
                    <button className="grid h-32 w-32 place-items-center rounded-full bg-violet-100">
                      <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-violet-700 text-white shadow-xl shadow-violet-200">
                        <Mic size={44} />
                      </div>
                    </button>
                    <Wave />
                  </div>

                  <div className="mt-8 text-center">
                    <div className="text-lg font-black">
                      Nhấn vào mic để bắt đầu nói
                    </div>
                    <div className="mt-2 text-lg font-black">
                      00:00 <span className="text-slate-400">/ 00:15</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between rounded-2xl border border-violet-100 bg-white p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">💡</div>
                    <div>
                      <div className="text-lg font-black">Mẹo nhỏ</div>
                      <p className="text-slate-500">
                        Hãy nói rõ ràng, phát âm từng từ và giữ tốc độ vừa phải nhé!
                      </p>
                    </div>
                  </div>
                  <div className="text-6xl">🦊</div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-8 py-4 font-black text-violet-700">
                    <ArrowLeft size={18} /> Câu trước
                  </button>

                  <button className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-8 py-4 font-black">
                    <Volume2 size={18} /> Nghe mẫu
                  </button>

                  <button className="flex items-center gap-2 rounded-xl bg-slate-100 px-8 py-4 font-black text-slate-400">
                    Câu tiếp theo <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <Card title="Tiến độ bài học">
                <div className="mb-8">
                  <div className="mb-2 flex justify-end font-black">30%</div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className="h-3 w-[30%] rounded-full bg-violet-600" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <ProgressStat icon={<CheckCircle2 />} value="3" label="Đúng" color="green" />
                  <ProgressStat icon={<XCircle />} value="0" label="Sai" color="red" />
                  <ProgressStat icon={<CircleX />} value="0" label="Bỏ qua" color="slate" />
                </div>
              </Card>

              <Card title="Độ chính xác phát âm">
                <div className="mx-auto grid h-36 w-36 place-items-center rounded-full bg-[conic-gradient(#8b5cf6_0_85%,#eee7ff_85%_100%)]">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                    <div>
                      <div className="text-4xl font-black">85%</div>
                      <div className="font-black">Tốt lắm!</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 text-center">
                  <SmallScore title="Phát âm" value="90%" />
                  <SmallScore title="Ngữ điệu" value="80%" />
                  <SmallScore title="Trôi chảy" value="85%" />
                </div>
              </Card>

              <Card title="Lịch sử luyện nói">
                <div className="space-y-4">
                  <History text="I usually go to school by bus." time="Hôm nay, 09:15" score="85%" />
                  <History text="My favorite food is pizza." time="Hôm nay, 09:12" score="78%" yellow />
                  <History text="She likes reading books." time="Hôm nay, 09:10" score="92%" />
                </div>

                <button className="mt-5 rounded-xl border border-violet-200 px-8 py-3 font-black text-violet-700">
                  Xem tất cả
                </button>
              </Card>

              <Card title="Mục tiêu hôm nay">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <Target className="text-green-600" />
                      <span className="font-bold">Luyện nói 10 câu</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 w-[30%] rounded-full bg-violet-600" />
                    </div>
                    <div className="mt-2 text-right font-black">3/10</div>
                  </div>
                  <div className="ml-5 text-7xl">🎁</div>
                </div>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarTitle({ title }: { title: string }) {
  return <div className="mt-6 px-4 text-xs font-black text-slate-400">{title}</div>;
}

function SidebarItem({ icon: Icon, title }: any) {
  return (
    <div className="flex items-center gap-4 rounded-xl px-4 py-3 text-slate-700 hover:bg-slate-50">
      <Icon size={18} />
      <span>{title}</span>
    </div>
  );
}

function TopStat({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-3xl">{icon}</span>
      <div>
        <div className="font-black">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function Badge({ children, color }: any) {
  const style =
    color === "violet"
      ? "bg-violet-100 text-violet-700"
      : color === "green"
      ? "bg-green-100 text-green-700"
      : "bg-white text-[#101044]";

  return <span className={`rounded-xl px-5 py-3 font-black ${style}`}>{children}</span>;
}

function Wave() {
  return (
    <div className="flex h-16 items-center gap-1">
      {Array.from({ length: 34 }).map((_, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-violet-300"
          style={{ height: `${10 + Math.abs(Math.sin(i)) * 34}px` }}
        />
      ))}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-2xl border border-[#e4e0ff] bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-black">{title}</h3>
      {children}
    </div>
  );
}

function ProgressStat({ icon, value, label, color }: any) {
  const bg =
    color === "green" ? "bg-green-100 text-green-600" :
    color === "red" ? "bg-red-100 text-red-500" :
    "bg-slate-100 text-slate-500";

  return (
    <div>
      <div className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl ${bg}`}>
        {icon}
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function SmallScore({ title, value }: any) {
  return (
    <div>
      <div className="text-slate-500">{title}</div>
      <div className="mt-2 font-black">{value}</div>
    </div>
  );
}

function History({ text, time, score, yellow }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
        🎙
      </div>
      <div className="flex-1">
        <div className="font-bold">{text}</div>
        <div className="text-xs text-slate-500">{time}</div>
      </div>
      <span
        className={`rounded-lg px-3 py-1 font-black ${
          yellow ? "bg-yellow-100 text-yellow-600" : "bg-green-100 text-green-600"
        }`}
      >
        {score}
      </span>
    </div>
  );
}
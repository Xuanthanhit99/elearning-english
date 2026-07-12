"use client";

import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Flame,
  Gift,
  Headphones,
  Home,
  LogOut,
  Search,
  Settings,
  ShieldQuestion,
  Star,
  Volume2,
  XCircle,
  Gem,
  Play,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  Users,
  PenTool,
  Mic,
  Crown,
} from "lucide-react";

export default function ListeningReadingPage() {
  const answers = [
    "Rainy and cold",
    "Sunny and cool",
    "Windy and warm",
    "Cloudy and hot",
  ];

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#111342]">
      <aside className="fixed left-0 top-0 h-screen w-[288px] border-r border-[#eeeefe] bg-white px-5 py-6">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
            🦊
          </div>
          <div className="text-3xl font-black">
            Study<span className="text-violet-600">Arena</span>
          </div>
        </div>

        <nav className="space-y-6 text-[15px] font-bold">
          <MenuItem icon={<Home size={18} />} label="Trang chủ" />

          <MenuGroup title="HỌC TẬP">
            <MenuItem icon={<ShieldQuestion size={18} />} label="Tổng quan" />
            <MenuItem icon={<BookOpen size={18} />} label="Từ vựng" />
            <MenuItem icon={<BookOpen size={18} />} label="Ngữ pháp" />
            <MenuItem active icon={<Volume2 size={18} />} label="Nghe" />

            <div className="ml-7 border-l border-violet-200 pl-5 text-[14px]">
              <SubItem label="Luyện nghe" />
              <SubItem label="Nghe chép chính tả" />
              <SubItem active label="Nghe hiểu đoạn" />
              <SubItem label="Nghe theo chủ đề" />
            </div>

            <MenuItem icon={<Mic size={18} />} label="Nói" />
            <MenuItem icon={<BookOpen size={18} />} label="Đọc hiểu" />
            <MenuItem icon={<PenTool size={18} />} label="Viết" />
          </MenuGroup>

          <MenuGroup title="CỘNG ĐỒNG">
            <MenuItem icon={<Users size={18} />} label="Cộng đồng" />
            <MenuItem icon={<ShieldQuestion size={18} />} label="Hỏi đáp" />
            <MenuItem icon={<Crown size={18} />} label="Thành tích" />
          </MenuGroup>

          <MenuGroup title="KHÁC">
            <MenuItem icon={<BookOpen size={18} />} label="Khoá học" />
            <MenuItem icon={<Gift size={18} />} label="Shop" />
            <MenuItem icon={<Settings size={18} />} label="Cài đặt" />
          </MenuGroup>
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-violet-50 p-4">
          <div className="font-black text-violet-700">👑 Nâng cấp Premium</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
          </p>
          <button className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">
            Nâng cấp ngay
          </button>
          <div className="absolute bottom-2 right-3 text-5xl">🦊</div>
        </div>
      </aside>

      <main className="ml-[288px]">
        <header className="flex h-[98px] items-center justify-between border-b border-[#eeeefe] bg-white px-12">
          <div className="relative w-[570px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400" />
            <input
              placeholder="Tìm bài học, từ vựng, ngữ pháp..."
              className="h-14 w-full rounded-xl border border-violet-100 bg-white pl-14 pr-4 text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-8">
            <TopStat icon={<Flame className="text-orange-500" />} value="18" label="Streak" />
            <TopStat icon={<Star className="fill-yellow-400 text-yellow-400" />} value="2,450" label="XP hôm nay" />
            <TopStat icon={<Gem className="text-blue-500" />} value="5,230" label="Xu" />

            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-100 text-violet-600">
              <Gift />
            </div>

            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-violet-100 text-violet-600">
              <Bell />
              <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs text-white">
                3
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-orange-100 text-3xl">👨🏽</div>
              <div>
                <div className="font-black">Minh Anh</div>
                <div className="text-xs text-slate-500">Level 18</div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-[1fr_405px] gap-14 px-12 py-9">
          <section>
            <div className="mb-7 flex items-center gap-3 text-sm font-medium text-violet-400">
              <span>←</span>
              <span>Trang chủ</span>
              <ChevronRight size={16} />
              <span>Nghe</span>
              <ChevronRight size={16} />
              <span className="font-bold text-[#111342]">Nghe hiểu đoạn</span>
            </div>

            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="flex items-center gap-3 text-4xl font-black">
                  Nghe hiểu đoạn <Volume2 className="text-violet-600" />
                </h1>
                <p className="mt-3 text-lg text-[#6e6ba8]">
                  Nghe đoạn hội thoại hoặc bài nói và trả lời câu hỏi.
                </p>
              </div>

              <button className="flex h-12 items-center gap-3 rounded-xl border border-violet-100 bg-white px-7 font-bold">
                Thoát bài <LogOut size={17} />
              </button>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-white p-7 shadow-sm">
              <div className="mb-7 flex gap-5">
                <Badge text="Câu 2 / 8" color="violet" />
                <Badge text="B1 - Trung cấp" color="green" />
                <Badge text="🌿 Chủ đề: Daily Life" color="plain" />
              </div>

              <div className="grid grid-cols-[305px_1fr] gap-9">
                <div className="relative h-[225px] overflow-hidden rounded-2xl bg-[url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=900')] bg-cover bg-center">
                  <button className="absolute right-4 top-4 rounded-lg bg-black/50 p-2 text-white">
                    <Maximize2 size={20} />
                  </button>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-black">Đoạn nghe 1</h3>
                  <p className="text-[17px] leading-8">
                    Last weekend, Tom and his friends went hiking in the mountains.
                    <br />
                    The weather was perfect — sunny and cool.
                    <br />
                    They started early in the morning and reached the top
                    <br />
                    after about three hours. The view was amazing.
                    <br />
                    They took some photos and had lunch there before
                    <br />
                    heading back home in the afternoon.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-6">
                <button className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-xl shadow-violet-200">
                  <Play className="ml-1 fill-white" size={34} />
                </button>

                <div className="flex-1">
                  <div className="mb-4 h-10 overflow-hidden text-violet-500">
                    {"||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||"}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">00:00</span>
                    <div className="h-2 flex-1 rounded-full bg-violet-100">
                      <div className="h-2 w-[70%] rounded-full bg-violet-400" />
                    </div>
                    <span className="text-sm">01:32</span>
                  </div>
                </div>

                <button className="rounded-xl border border-violet-200 px-5 py-3 font-black text-violet-700">
                  1.0x
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-violet-100 bg-white p-7 shadow-sm">
              <h3 className="mb-3 text-lg font-black">Câu hỏi 2:</h3>
              <p className="mb-5 text-lg">What was the weather like last weekend?</p>

              <div className="space-y-3">
                {answers.map((item, index) => (
                  <button
                    key={item}
                    className={`flex h-[52px] w-full items-center gap-5 rounded-xl border px-5 text-left font-medium ${
                      index === 1
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-violet-100 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                        index === 1 ? "bg-violet-600 text-white" : "bg-violet-50"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    {item}
                  </button>
                ))}
              </div>

              <div className="mt-7 flex justify-between">
                <button className="flex h-14 items-center gap-3 rounded-xl border border-violet-200 px-8 font-black text-violet-700">
                  <ArrowLeft size={20} /> Quay lại
                </button>
                <button className="flex h-14 items-center gap-3 rounded-xl bg-violet-600 px-16 font-black text-white shadow-lg shadow-violet-200">
                  Câu tiếp theo <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <Card>
              <h3 className="mb-5 text-xl font-black">Tiến độ bài học</h3>
              <div className="mb-8 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-violet-100">
                  <div className="h-2 w-1/4 rounded-full bg-violet-600" />
                </div>
                <span className="font-black">25%</span>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center">
                <ProgressItem icon={<CheckCircle2 />} value="2" label="Đúng" green />
                <ProgressItem icon={<XCircle />} value="0" label="Sai" red />
                <ProgressItem icon={<XCircle />} value="0" label="Chưa làm" />
              </div>
            </Card>

            <Card>
              <h3 className="mb-5 text-xl font-black">Danh sách câu hỏi</h3>
              <div className="space-y-3">
                {[1, 2, 3, 4, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className={`flex h-11 items-center gap-8 rounded-xl px-4 ${
                      n === 2 ? "bg-violet-100 text-violet-700" : ""
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 font-black">
                      {n}
                    </span>
                    {n === 1 && <CheckCircle2 className="text-green-500" />}
                    {n === 2 && <Volume2 className="text-violet-600" />}
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-4 text-sm text-slate-500">
                <span>✅ Đúng</span>
                <span>⭕ Sai</span>
                <span>○ Chưa làm</span>
                <span>⚑ Đánh dấu</span>
              </div>
            </Card>

            <div className="relative overflow-hidden rounded-2xl bg-violet-50 p-7">
              <h3 className="mb-5 text-xl font-black">💡 Mẹo nhỏ</h3>
              <ul className="space-y-4 text-sm leading-6">
                <li>• Nghe toàn bộ đoạn trước khi trả lời.</li>
                <li>• Ghi chú từ khóa quan trọng khi nghe.</li>
                <li>• Tập trung vào ý chính của đoạn.</li>
              </ul>
              <div className="absolute bottom-5 right-6 text-8xl">🦊</div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function MenuGroup({ title, children }: any) {
  return (
    <div>
      <div className="mb-3 text-sm font-black text-[#8682ba]">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MenuItem({ icon, label, active }: any) {
  return (
    <div
      className={`flex h-11 items-center gap-4 rounded-xl px-4 ${
        active ? "bg-violet-100 text-violet-700" : "text-[#171743]"
      }`}
    >
      <span className="text-[#726da8]">{icon}</span>
      {label}
    </div>
  );
}

function SubItem({ label, active }: any) {
  return (
    <div
      className={`my-1 rounded-lg px-4 py-2 font-bold ${
        active ? "bg-violet-100 text-violet-700" : ""
      }`}
    >
      {label}
    </div>
  );
}

function TopStat({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <div className="font-black">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function Badge({ text, color }: any) {
  return (
    <span
      className={`rounded-xl px-4 py-2 text-sm font-black ${
        color === "violet"
          ? "bg-violet-50 text-violet-700"
          : color === "green"
          ? "bg-green-50 text-green-700"
          : "bg-white"
      }`}
    >
      {text}
    </span>
  );
}

function Card({ children }: any) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-7 shadow-sm">
      {children}
    </div>
  );
}

function ProgressItem({ icon, value, label, green, red }: any) {
  return (
    <div>
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
          green ? "bg-green-50 text-green-500" : red ? "bg-red-50 text-red-500" : "bg-violet-50 text-[#6f6ca9]"
        }`}
      >
        {icon}
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-sm text-[#6e6ba8]">{label}</div>
    </div>
  );
}
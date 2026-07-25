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
          {/* <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
            ðŸ¦Š
          </div> */}
          <div className="text-3xl font-black">
            Study<span className="text-violet-600">Arena</span>
          </div>
        </div>

        <nav className="space-y-6 text-[15px] font-bold">
          <MenuItem icon={<Home size={18} />} label="Trang chá»§" />

          <MenuGroup title="Há»ŒC Táº¬P">
            <MenuItem icon={<ShieldQuestion size={18} />} label="Tá»•ng quan" />
            <MenuItem icon={<BookOpen size={18} />} label="Tá»« vá»±ng" />
            <MenuItem icon={<BookOpen size={18} />} label="Ngá»¯ phÃ¡p" />
            <MenuItem active icon={<Volume2 size={18} />} label="Nghe" />

            <div className="ml-7 border-l border-violet-200 pl-5 text-[14px]">
              <SubItem label="Luyá»‡n nghe" />
              <SubItem label="Nghe chÃ©p chÃ­nh táº£" />
              <SubItem active label="Nghe hiá»ƒu Ä‘oáº¡n" />
              <SubItem label="Nghe theo chá»§ Ä‘á»" />
            </div>

            <MenuItem icon={<Mic size={18} />} label="NÃ³i" />
            <MenuItem icon={<BookOpen size={18} />} label="Äá»c hiá»ƒu" />
            <MenuItem icon={<PenTool size={18} />} label="Viáº¿t" />
          </MenuGroup>

          <MenuGroup title="Cá»˜NG Äá»’NG">
            <MenuItem icon={<Users size={18} />} label="Cá»™ng Ä‘á»“ng" />
            <MenuItem icon={<ShieldQuestion size={18} />} label="Há»i Ä‘Ã¡p" />
            <MenuItem icon={<Crown size={18} />} label="ThÃ nh tÃ­ch" />
          </MenuGroup>

          <MenuGroup title="KHÃC">
            <MenuItem icon={<BookOpen size={18} />} label="KhoÃ¡ há»c" />
            <MenuItem icon={<Gift size={18} />} label="Shop" />
            <MenuItem icon={<Settings size={18} />} label="CÃ i Ä‘áº·t" />
          </MenuGroup>
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-violet-50 p-4">
          <div className="font-black text-violet-700">ðŸ‘‘ NÃ¢ng cáº¥p Premium</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Há»c khÃ´ng giá»›i háº¡n, nháº­n nhiá»u Ä‘áº·c quyá»n háº¥p dáº«n!
          </p>
          <button className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">
            NÃ¢ng cáº¥p ngay
          </button>
          {/* <div className="absolute bottom-2 right-3 text-5xl">ðŸ¦Š</div> */}
        </div>
      </aside>

      <main className="ml-[288px]">
        <header className="flex h-[98px] items-center justify-between border-b border-[#eeeefe] bg-white px-12">
          <div className="relative w-[570px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400" />
            <input
              placeholder="TÃ¬m bÃ i há»c, tá»« vá»±ng, ngá»¯ phÃ¡p..."
              className="h-14 w-full rounded-xl border border-violet-100 bg-white pl-14 pr-4 text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-8">
            <TopStat icon={<Flame className="text-orange-500" />} value="18" label="Streak" />
            <TopStat icon={<Star className="fill-yellow-400 text-yellow-400" />} value="2,450" label="XP hÃ´m nay" />
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
              <div className="h-12 w-12 rounded-full bg-orange-100 text-3xl">ðŸ‘¨ðŸ½</div>
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
              <span>â†</span>
              <span>Trang chá»§</span>
              <ChevronRight size={16} />
              <span>Nghe</span>
              <ChevronRight size={16} />
              <span className="font-bold text-[#111342]">Nghe hiá»ƒu Ä‘oáº¡n</span>
            </div>

            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="flex items-center gap-3 text-4xl font-black">
                  Nghe hiá»ƒu Ä‘oáº¡n <Volume2 className="text-violet-600" />
                </h1>
                <p className="mt-3 text-lg text-[#6e6ba8]">
                  Nghe Ä‘oáº¡n há»™i thoáº¡i hoáº·c bÃ i nÃ³i vÃ  tráº£ lá»i cÃ¢u há»i.
                </p>
              </div>

              <button className="flex h-12 items-center gap-3 rounded-xl border border-violet-100 bg-white px-7 font-bold">
                ThoÃ¡t bÃ i <LogOut size={17} />
              </button>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-white p-7 shadow-sm">
              <div className="mb-7 flex gap-5">
                <Badge text="CÃ¢u 2 / 8" color="violet" />
                <Badge text="B1 - Trung cáº¥p" color="green" />
                <Badge text="ðŸŒ¿ Chá»§ Ä‘á»: Daily Life" color="plain" />
              </div>

              <div className="grid grid-cols-[305px_1fr] gap-9">
                <div className="relative h-[225px] overflow-hidden rounded-2xl bg-[url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=900')] bg-cover bg-center">
                  <button className="absolute right-4 top-4 rounded-lg bg-black/50 p-2 text-white">
                    <Maximize2 size={20} />
                  </button>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-black">Äoáº¡n nghe 1</h3>
                  <p className="text-[17px] leading-8">
                    Last weekend, Tom and his friends went hiking in the mountains.
                    <br />
                    The weather was perfect â€” sunny and cool.
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
              <h3 className="mb-3 text-lg font-black">CÃ¢u há»i 2:</h3>
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
                  <ArrowLeft size={20} /> Quay láº¡i
                </button>
                <button className="flex h-14 items-center gap-3 rounded-xl bg-violet-600 px-16 font-black text-white shadow-lg shadow-violet-200">
                  CÃ¢u tiáº¿p theo <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <Card>
              <h3 className="mb-5 text-xl font-black">Tiáº¿n Ä‘á»™ bÃ i há»c</h3>
              <div className="mb-8 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-violet-100">
                  <div className="h-2 w-1/4 rounded-full bg-violet-600" />
                </div>
                <span className="font-black">25%</span>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center">
                <ProgressItem icon={<CheckCircle2 />} value="2" label="ÄÃºng" green />
                <ProgressItem icon={<XCircle />} value="0" label="Sai" red />
                <ProgressItem icon={<XCircle />} value="0" label="ChÆ°a lÃ m" />
              </div>
            </Card>

            <Card>
              <h3 className="mb-5 text-xl font-black">Danh sÃ¡ch cÃ¢u há»i</h3>
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
                <span>âœ… ÄÃºng</span>
                <span>â­• Sai</span>
                <span>â—‹ ChÆ°a lÃ m</span>
                <span>âš‘ ÄÃ¡nh dáº¥u</span>
              </div>
            </Card>

            <div className="relative overflow-hidden rounded-2xl bg-violet-50 p-7">
              <h3 className="mb-5 text-xl font-black">ðŸ’¡ Máº¹o nhá»</h3>
              <ul className="space-y-4 text-sm leading-6">
                <li>â€¢ Nghe toÃ n bá»™ Ä‘oáº¡n trÆ°á»›c khi tráº£ lá»i.</li>
                <li>â€¢ Ghi chÃº tá»« khÃ³a quan trá»ng khi nghe.</li>
                <li>â€¢ Táº­p trung vÃ o Ã½ chÃ­nh cá»§a Ä‘oáº¡n.</li>
              </ul>
              {/* <div className="absolute bottom-5 right-6 text-8xl">ðŸ¦Š</div> */}
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
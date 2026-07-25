"use client";

import {
  Bell,
  BookOpen,
  CheckCircle,
  Crown,
  Diamond,
  Flame,
  Gift,
  Headphones,
  Home,
  LogOut,
  Mic,
  PenLine,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Volume2,
  XCircle,
} from "lucide-react";

const questions = [
  { id: 1, status: "done", time: "00:38" },
  { id: 2, status: "done", time: "00:42" },
  { id: 3, status: "active", time: "00:45" },
  { id: 4, status: "none", time: "00:41" },
  { id: 5, status: "none", time: "00:37" },
  { id: 6, status: "none", time: "00:50" },
  { id: 7, status: "none", time: "00:43" },
  { id: 8, status: "none", time: "00:48" },
  { id: 9, status: "none", time: "00:39" },
  { id: 10, status: "none", time: "00:44" },
];

const menu = [
  { label: "Trang chá»§", icon: Home },
  { label: "Tá»•ng quan", icon: BookOpen },
  { label: "Tá»« vá»±ng", icon: BookOpen },
  { label: "Ngá»¯ phÃ¡p", icon: ShieldCheck },
  { label: "Nghe", icon: Volume2, active: true },
  { label: "NÃ³i", icon: Mic },
  { label: "Äá»c hiá»ƒu", icon: BookOpen },
  { label: "Viáº¿t", icon: PenLine },
];

export default function DictationPage() {
  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#14134f]">
      <aside className="fixed left-0 top-0 h-screen w-[285px] border-r border-indigo-100 bg-white px-6 py-6">
        <div className="mb-10 flex items-center gap-3">
          <div className="text-4xl">ðŸ¦Š</div>
          <h1 className="text-3xl font-black">
            Study<span className="text-violet-600">Arena</span>
          </h1>
        </div>

        <nav className="space-y-2">
          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold ${
                  item.active
                    ? "bg-violet-100 text-violet-700"
                    : "text-indigo-950 hover:bg-indigo-50"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </div>
            );
          })}
        </nav>

        <div className="mt-5 border-l-2 border-indigo-100 pl-5">
          {["Luyá»‡n nghe", "Nghe chÃ©p chÃ­nh táº£", "Nghe hiá»ƒu Ä‘oáº¡n", "Nghe theo chá»§ Ä‘á»"].map(
            (x) => (
              <div
                key={x}
                className={`my-2 rounded-lg px-3 py-2 text-sm font-bold ${
                  x === "Nghe chÃ©p chÃ­nh táº£"
                    ? "bg-violet-100 text-violet-700"
                    : "text-indigo-950"
                }`}
              >
                {x}
              </div>
            )
          )}
        </div>

        <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-violet-50 p-4">
          <div className="mb-2 font-black text-violet-700">ðŸ‘‘ NÃ¢ng cáº¥p Premium</div>
          <p className="text-xs text-indigo-500">
            Há»c khÃ´ng giá»›i háº¡n, nháº­n nhiá»u Ä‘áº·c quyá»n háº¥p dáº«n!
          </p>
          <button className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">
            NÃ¢ng cáº¥p ngay
          </button>
        </div>
      </aside>

      <main className="ml-[285px]">
        <header className="sticky top-0 z-10 flex h-[92px] items-center justify-between border-b border-indigo-100 bg-white px-12">
          <div className="flex h-14 w-[560px] items-center gap-3 rounded-xl border border-indigo-100 bg-white px-4 shadow-sm">
            <Search className="text-indigo-300" />
            <input
              className="w-full outline-none placeholder:text-indigo-300"
              placeholder="TÃ¬m bÃ i há»c, tá»« vá»±ng, ngá»¯ phÃ¡p..."
            />
          </div>

          <div className="flex items-center gap-8">
            <TopStat icon={<Flame className="text-red-500" />} value="18" label="Streak" />
            <TopStat icon={<Star className="text-yellow-400" />} value="2,450" label="XP hÃ´m nay" />
            <TopStat icon={<Diamond className="text-sky-500" />} value="5,230" label="Xu" />

            <div className="rounded-full border p-3 text-violet-600">
              <Gift />
            </div>

            <div className="relative rounded-full border p-3 text-indigo-500">
              <Bell />
              <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                3
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-2xl">
                ðŸ‘©
              </div>
              <div>
                <div className="font-black">Minh Anh</div>
                <div className="text-xs font-bold text-indigo-400">Level 18</div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-[1fr_400px] gap-10 px-12 py-8">
          <section>
            <div className="mb-8 text-sm font-semibold text-indigo-400">
              Trang chá»§ ã€‰ Nghe ã€‰{" "}
              <span className="font-black text-indigo-950">Nghe chÃ©p chÃ­nh táº£</span>
            </div>

            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-3 text-4xl font-black">
                  Nghe chÃ©p chÃ­nh táº£
                  <Volume2 className="text-violet-600" />
                </h2>
                <p className="mt-3 text-lg text-indigo-400">
                  Nghe vÃ  gÃµ láº¡i ná»™i dung báº¡n nghe Ä‘Æ°á»£c
                </p>
              </div>

              <button className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-6 py-4 font-bold shadow-sm">
                ThoÃ¡t bÃ i <LogOut size={18} />
              </button>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
              <div className="mb-7 flex gap-5">
                <Badge>ðŸŽ§ CÃ¢u 3 / 10</Badge>
                <Badge green>âœ… B1 - Trung cáº¥p</Badge>
                <Badge>ðŸŒ¿ Chá»§ Ä‘á»: Environment</Badge>
              </div>

              <div className="rounded-2xl bg-violet-50 p-7">
                <div className="flex items-center gap-7">
                  <button className="grid h-20 w-20 place-items-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-200">
                    <Play fill="white" size={34} />
                  </button>

                  <div className="flex-1">
                    <div className="mb-4 h-10 rounded-xl bg-[repeating-linear-gradient(90deg,#a855f7_0_3px,transparent_3px_8px)] opacity-60" />
                    <div className="flex items-center gap-4 text-sm font-bold text-indigo-600">
                      <span>0:00</span>
                      <div className="h-2 flex-1 rounded-full bg-violet-200" />
                      <span>0:45</span>
                    </div>
                  </div>

                  <button className="rounded-xl border border-violet-300 bg-white px-5 py-3 font-black text-violet-700">
                    1.0x
                  </button>
                </div>
              </div>

              <div className="mt-10 flex items-start gap-6">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-violet-50 text-violet-600">
                  <PenLine />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black">Nghe vÃ  chÃ©p láº¡i Ä‘oáº¡n vÄƒn báº¡n nghe Ä‘Æ°á»£c</h3>
                      <p className="mt-1 text-sm text-indigo-400">
                        Báº¡n cÃ³ thá»ƒ nghe láº¡i tá»‘i Ä‘a 3 láº§n
                      </p>
                    </div>

                    <div className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
                      ðŸŽ§ LÆ°á»£t nghe cÃ²n láº¡i: 3
                    </div>
                  </div>

                  <div className="relative mt-8">
                    <textarea
                      className="h-56 w-full resize-none rounded-xl border-2 border-violet-400 p-6 text-lg outline-none placeholder:text-indigo-300"
                      placeholder="Nháº­p ná»™i dung báº¡n nghe Ä‘Æ°á»£c á»Ÿ Ä‘Ã¢y..."
                    />
                    <span className="absolute bottom-5 right-6 text-sm font-bold text-indigo-400">
                      0 tá»«
                    </span>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button className="rounded-xl border border-violet-300 px-8 py-4 font-black text-violet-700">
                      â­ Bá» qua cÃ¢u nÃ y
                    </button>
                    <button className="rounded-xl bg-violet-700 px-20 py-4 font-black text-white shadow-lg shadow-violet-200">
                      Kiá»ƒm tra Ä‘Ã¡p Ã¡n
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-8 rounded-2xl bg-yellow-50 p-8">
              <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-yellow-300 text-3xl">
                â­
              </div>

              <div>
                <h3 className="mb-4 text-lg font-black">Ká»¹ nÄƒng báº¡n Ä‘ang luyá»‡n táº­p</h3>
                <div className="flex gap-5">
                  {["Nghe chi tiáº¿t", "ChÃ­nh táº£", "Táº­p trung", "Ghi nhá»›"].map((x) => (
                    <span
                      key={x}
                      className="rounded-full bg-white px-6 py-3 text-sm font-bold text-indigo-600"
                    >
                      ðŸ’  {x} âœ¨
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-xl font-black">Tiáº¿n Ä‘á»™ bÃ i há»c</h3>
              <div className="mb-7 flex items-center gap-4">
                <div className="h-3 flex-1 rounded-full bg-indigo-100">
                  <div className="h-3 w-[30%] rounded-full bg-violet-600" />
                </div>
                <span className="font-black">30%</span>
              </div>

              <div className="grid grid-cols-3 text-center">
                <Progress icon={<CheckCircle />} value="3" label="ÄÃºng" green />
                <Progress icon={<XCircle />} value="0" label="Sai" red />
                <Progress icon={<XCircle />} value="0" label="ChÆ°a lÃ m" />
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-xl font-black">Danh sÃ¡ch cÃ¢u</h3>

              <div className="space-y-2">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                      q.status === "active" ? "bg-violet-100 text-violet-700" : ""
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-50 text-sm font-black">
                        {q.id}
                      </span>
                      {q.status === "done" && <CheckCircle className="text-green-500" size={20} />}
                      {q.status === "active" && <Volume2 className="text-violet-700" size={20} />}
                    </div>
                    <span className="text-sm font-bold text-indigo-400">{q.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-violet-50 p-6">
              <div>
                <h3 className="mb-4 text-xl font-black">ðŸ’¡ Máº¹o nhá»</h3>
                <ul className="space-y-3 text-sm font-medium text-indigo-700">
                  <li>â€¢ Nghe toÃ n bá»™ trÆ°á»›c khi báº¯t Ä‘áº§u chÃ©p.</li>
                  <li>â€¢ ChÃº Ã½ Ä‘áº¿n dáº¥u cÃ¢u vÃ  chÃ­nh táº£.</li>
                  <li>â€¢ Sá»­ dá»¥ng tá»« viáº¿t táº¯t náº¿u cáº§n.</li>
                </ul>
              </div>
              <div className="text-7xl">ðŸ¦Š</div>
            </div>
          </aside>
        </div>
      </main>
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
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <div className="font-black">{value}</div>
        <div className="text-xs font-bold text-indigo-400">{label}</div>
      </div>
    </div>
  );
}

function Badge({
  children,
  green,
}: {
  children: React.ReactNode;
  green?: boolean;
}) {
  return (
    <span
      className={`rounded-lg px-4 py-2 text-sm font-black ${
        green ? "bg-green-100 text-green-700" : "bg-violet-100 text-violet-700"
      }`}
    >
      {children}
    </span>
  );
}

function Progress({
  icon,
  value,
  label,
  green,
  red,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div>
      <div
        className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl ${
          green
            ? "bg-green-50 text-green-500"
            : red
            ? "bg-red-50 text-red-500"
            : "bg-indigo-50 text-indigo-500"
        }`}
      >
        {icon}
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-sm font-medium text-indigo-500">{label}</div>
    </div>
  );
}
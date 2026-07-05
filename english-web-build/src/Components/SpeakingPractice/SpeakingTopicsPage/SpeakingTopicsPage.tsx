"use client";

import {
  Bell,
  BookOpen,
  Briefcase,
  Flame,
  Gift,
  Grid2X2,
  HeartPulse,
  Home,
  Mic,
  MoreHorizontal,
  Plane,
  Play,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Star,
  Trophy,
  Volume2,
} from "lucide-react";

const featured = [
  {
    title: "Ordering Food at a Restaurant",
    desc: "Luyện tập gọi món và giao tiếp khi đi nhà hàng.",
    lessons: 12,
    image: "/images/speaking/restaurant.jpg",
  },
  {
    title: "At the Airport",
    desc: "Các mẫu câu và hội thoại khi làm thủ tục bay.",
    lessons: 10,
    image: "/images/speaking/airport.jpg",
  },
  {
    title: "Job Interview",
    desc: "Luyện nói khi phỏng vấn xin việc bằng tiếng Anh.",
    lessons: 8,
    image: "/images/speaking/interview.jpg",
  },
  {
    title: "Traveling Abroad",
    desc: "Giao tiếp khi du lịch, hỏi đường, đặt phòng, mua sắm...",
    lessons: 12,
    image: "/images/speaking/travel.jpg",
  },
];

const topics = [
  {
    title: "Introducing Yourself",
    desc: "Giới thiệu bản thân và làm quen với người mới.",
    level: "Dễ",
    progress: "3/10",
    percent: 30,
    image: "/images/speaking/intro.jpg",
  },
  {
    title: "Talking about Hobbies",
    desc: "Chia sẻ sở thích, đam mê và hoạt động yêu thích.",
    level: "Dễ",
    progress: "5/10",
    percent: 50,
    image: "/images/speaking/hobby.jpg",
  },
  {
    title: "Shopping",
    desc: "Hội thoại khi mua sắm tại cửa hàng.",
    level: "Trung bình",
    progress: "2/10",
    percent: 20,
    image: "/images/speaking/shopping.jpg",
  },
  {
    title: "Family and Relationships",
    desc: "Nói về gia đình, mối quan hệ và người thân.",
    level: "Trung bình",
    progress: "4/10",
    percent: 40,
    image: "/images/speaking/family.jpg",
  },
  {
    title: "Environmental Issues",
    desc: "Thảo luận về các vấn đề môi trường.",
    level: "Khó",
    progress: "1/10",
    percent: 10,
    image: "/images/speaking/environment.jpg",
  },
];

const sidebarItems = [
  { icon: Home, label: "Trang chủ" },
  { icon: BookOpen, label: "Tổng quan" },
  { icon: BookOpen, label: "Từ vựng" },
  { icon: Shield, label: "Ngữ pháp" },
  { icon: Volume2, label: "Nghe" },
  { icon: Mic, label: "Nói", active: true },
  { icon: BookOpen, label: "Đọc hiểu" },
  { icon: Settings, label: "Viết" },
  { icon: Trophy, label: "Flashcards" },
];

export default function SpeakingTopicsPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#10104f]">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-purple-100 bg-white/90 px-5 py-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="text-4xl">🦊</div>
            <h1 className="text-3xl font-extrabold">
              Study<span className="text-violet-600">Arena</span>
            </h1>
          </div>

          <nav className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold ${
                    item.active
                      ? "bg-violet-100 text-violet-700"
                      : "text-indigo-900 hover:bg-violet-50"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </div>
              );
            })}

            <div className="ml-9 border-l border-violet-200 py-2">
              <div className="rounded-lg px-4 py-2 text-sm font-bold">
                Luyện nói
              </div>
              <div className="rounded-lg bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
                Nói theo chủ đề
              </div>
              <div className="rounded-lg px-4 py-2 text-sm font-bold">
                Nói theo tình huống
              </div>
            </div>
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-violet-50 p-4">
            <p className="font-extrabold text-violet-700">👑 Nâng cấp Premium</p>
            <p className="mt-2 text-xs text-indigo-500">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="mt-4 rounded-lg bg-violet-600 px-5 py-2 text-sm font-bold text-white">
              Nâng cấp ngay
            </button>
          </div>
        </aside>

        <main className="ml-[280px] flex-1">
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-purple-100 bg-white/90 px-9 backdrop-blur">
            <div className="relative w-[520px]">
              <Search className="absolute left-4 top-3 text-indigo-300" />
              <input
                className="h-12 w-full rounded-xl border border-purple-100 bg-white pl-12 pr-4 text-sm outline-none focus:border-violet-400"
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
              />
            </div>

            <div className="flex items-center gap-7">
              <Stat icon="🔥" value="18" label="Streak" />
              <Stat icon="⭐" value="2,450" label="XP hôm nay" />
              <Stat icon="💎" value="5,230" label="Xu" />
              <Gift className="text-violet-600" />
              <Bell className="text-indigo-500" />
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-orange-100 text-2xl">
                  🧑
                </div>
                <div>
                  <p className="text-sm font-extrabold">Minh Anh</p>
                  <p className="text-xs text-indigo-400">Level 18</p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-[1fr_380px] gap-10 px-11 py-8">
            <div>
              <div className="mb-4 text-sm font-bold text-indigo-400">
                ← Trang chủ › Nói ›{" "}
                <span className="text-indigo-900">Nói theo chủ đề</span>
              </div>

              <h2 className="flex items-center gap-3 text-3xl font-extrabold">
                Nói theo chủ đề <Mic className="text-violet-600" />
              </h2>
              <p className="mt-2 text-indigo-500">
                Chọn chủ đề bạn yêu thích và luyện nói để cải thiện kỹ năng giao
                tiếp!
              </p>

              <div className="mt-10 flex items-center gap-10 border-b border-purple-100 pb-4 text-sm font-extrabold">
                <Tab active icon={<Grid2X2 size={18} />} text="Tất cả chủ đề" />
                <Tab icon={<BookOpen size={18} />} text="Daily Life" />
                <Tab icon={<Briefcase size={18} />} text="Work & Study" />
                <Tab icon={<Plane size={18} />} text="Travel" />
                <Tab icon={<HeartPulse size={18} />} text="Health" />
                <Tab icon={<MoreHorizontal size={18} />} text="" />
              </div>

              <div className="mt-9 flex items-center justify-between">
                <h3 className="text-xl font-extrabold">Chủ đề nổi bật</h3>
                <button className="rounded-xl border border-violet-200 px-6 py-3 text-sm font-extrabold text-violet-700">
                  Xem tất cả
                </button>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-5">
                {featured.map((item) => (
                  <div
                    key={item.title}
                    className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-36 w-full object-cover"
                    />
                    <div className="p-4">
                      <h4 className="min-h-[48px] text-lg font-extrabold">
                        {item.title}
                      </h4>
                      <p className="mt-3 min-h-[52px] text-sm text-indigo-500">
                        {item.desc}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="rounded-full border border-purple-100 px-3 py-1 text-xs font-bold">
                          ♡ {item.lessons} bài
                        </span>
                        <button className="grid h-11 w-11 place-items-center rounded-full bg-violet-600 text-white">
                          <Mic size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mt-8 text-xl font-extrabold">Danh sách chủ đề</h3>

              <div className="mt-4 overflow-hidden rounded-2xl border border-purple-100 bg-white">
                {topics.map((item) => (
                  <div
                    key={item.title}
                    className="grid grid-cols-[70px_1fr_120px_180px_120px] items-center gap-4 border-b border-purple-50 px-5 py-3 last:border-none"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="font-extrabold">{item.title}</h4>
                      <p className="mt-1 text-sm text-indigo-500">
                        {item.desc}
                      </p>
                    </div>
                    <LevelBadge level={item.level} />
                    <div>
                      <p className="mb-2 text-sm font-bold text-indigo-500">
                        {item.progress}
                      </p>
                      <Progress value={item.percent} />
                    </div>
                    <button className="rounded-xl border border-violet-200 px-5 py-3 text-sm font-extrabold text-violet-700">
                      <Play className="mr-1 inline" size={15} /> Bắt đầu
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-6">
              <Card>
                <h3 className="text-xl font-extrabold">Tiến độ nói</h3>
                <div className="mx-auto mt-6 grid h-40 w-40 place-items-center rounded-full border-[10px] border-violet-100">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold">40%</p>
                    <p className="font-bold">Hoàn thành</p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                  <MiniStat icon="🎙️" value="12" label="Chủ đề đã học" />
                  <MiniStat icon="⭐" value="48" label="Bài đã hoàn thành" />
                  <MiniStat icon="⏱️" value="6h 30m" label="Tổng thời gian" />
                </div>
              </Card>

              <Card>
                <h3 className="text-xl font-extrabold">Chủ đề đang học</h3>
                <div className="mt-6 flex gap-5">
                  <img
                    src="/images/speaking/restaurant.jpg"
                    className="h-28 w-28 rounded-xl object-cover"
                    alt=""
                  />
                  <div>
                    <h4 className="text-lg font-extrabold">
                      Ordering Food at a Restaurant
                    </h4>
                    <span className="mt-3 inline-block rounded-md bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
                      Dễ
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-sm font-bold text-indigo-500">
                  <span>Tiến độ</span>
                  <span>60%</span>
                </div>
                <Progress value={60} />

                <button className="mt-7 w-full rounded-xl bg-violet-600 py-4 text-lg font-extrabold text-white">
                  <Mic className="mr-2 inline" /> Tiếp tục luyện nói
                </button>
              </Card>

              <Card className="bg-violet-50">
                <h3 className="text-xl font-extrabold">💡 Mẹo luyện nói</h3>
                <ul className="mt-5 space-y-3 text-sm text-indigo-700">
                  <li>• Nghe kỹ câu hỏi và gợi ý trước khi trả lời.</li>
                  <li>• Nói rõ ràng, chậm rãi và tự nhiên.</li>
                  <li>• Sử dụng từ vựng và cấu trúc đã học.</li>
                </ul>
                <div className="mt-4 text-right text-7xl">🦊</div>
              </Card>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="font-extrabold">{value}</p>
        <p className="text-xs text-indigo-400">{label}</p>
      </div>
    </div>
  );
}

function Tab({
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
      className={`relative flex items-center gap-2 ${
        active ? "text-violet-700" : "text-indigo-500"
      }`}
    >
      {icon}
      {text}
      {active && (
        <div className="absolute -bottom-[18px] left-0 h-[3px] w-full rounded-full bg-violet-600" />
      )}
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
    <div className={`rounded-2xl border border-purple-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-violet-100">
      <div
        className="h-2 rounded-full bg-violet-600"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const className =
    level === "Dễ"
      ? "bg-green-100 text-green-600"
      : level === "Trung bình"
      ? "bg-orange-100 text-orange-600"
      : "bg-red-100 text-red-600";

  return (
    <span className={`w-fit rounded-md px-3 py-2 text-xs font-extrabold ${className}`}>
      {level}
    </span>
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
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg bg-violet-50 text-xl">
        {icon}
      </div>
      <p className="font-extrabold">{value}</p>
      <p className="text-xs text-indigo-500">{label}</p>
    </div>
  );
}
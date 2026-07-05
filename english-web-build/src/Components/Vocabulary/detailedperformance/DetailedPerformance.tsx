"use client";

import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Flame,
  Gift,
  Headphones,
  Home,
  Lock,
  Medal,
  PenLine,
  Search,
  Share2,
  Shield,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
  Gem,
  Settings,
  ShoppingBag,
  GraduationCap,
  MessageCircle,
  Mic,
  ArrowLeft,
  Lightbulb,
} from "lucide-react";

const activities = [
  {
    icon: Headphones,
    title: "Luyện nghe chủ đề Du lịch",
    desc: "Bài 5: At the airport",
    time: "09:15",
    xp: "+20 XP",
    bg: "bg-purple-100",
    color: "text-purple-600",
  },
  {
    icon: BookOpen,
    title: "Học từ vựng mới",
    desc: "Học 15 từ mới",
    time: "09:30",
    xp: "+15 XP",
    bg: "bg-pink-100",
    color: "text-pink-600",
  },
  {
    icon: Target,
    title: "Làm bài tập ngữ pháp",
    desc: "Thì hiện tại hoàn thành",
    time: "09:40",
    xp: "+10 XP",
    bg: "bg-orange-100",
    color: "text-orange-600",
  },
  {
    icon: PenLine,
    title: "Viết câu",
    desc: "Viết 2 câu về chủ đề Du lịch",
    time: "09:42",
    xp: "+10 XP",
    bg: "bg-sky-100",
    color: "text-sky-600",
  },
];

const rewards = [
  { day: "1 ngày", reward: "+10 XP", active: true, received: true },
  { day: "3 ngày", reward: "+30 XP" },
  { day: "7 ngày", reward: "+100 X 💎" },
  { day: "14 ngày", reward: "+ 200 XP" },
  { day: "30 ngày", reward: "+ 500 XP" },
];

export default function AchievementDetailPage() {
  return (
    <div className="min-h-screen bg-[#fbfbff] text-slate-900">
      <div className="flex">

        {/* Main */}
        <main className="min-h-screen flex-1 xl:ml-[290px]">
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur md:px-10">
            <div className="relative w-full max-w-[520px]">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-900"
                size={22}
              />
              <input
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold outline-none focus:border-violet-400"
              />
            </div>

            <div className="hidden items-center gap-8 md:flex">
              <TopStat icon={<Flame />} value="18" label="Streak" />
              <TopStat icon={<Star />} value="2,450" label="XP hôm nay" />
              <TopStat icon={<Gem />} value="5,230" label="Xu" />

              <Gift className="text-violet-600" />
              <div className="relative">
                <Bell className="text-indigo-900" />
                <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-xs font-black text-white">
                  3
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-2xl">
                  🧑‍🎓
                </div>
                <div>
                  <p className="font-black">Minh Anh</p>
                  <p className="text-xs font-bold text-slate-400">Level 18</p>
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1fr_430px] md:px-10">
            <section>
              {/* Breadcrumb */}
              <div className="mb-8 flex items-center gap-3 text-sm font-bold text-indigo-400">
                <span>Trang chủ</span>
                <ChevronRight size={16} />
                <span>Tổng quan</span>
                <ChevronRight size={16} />
                <span>Thành tích gần đây</span>
                <ChevronRight size={16} />
                <span className="text-indigo-950">Chi tiết thành tích</span>
              </div>

              {/* Hero */}
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button className="grid h-11 w-11 place-items-center rounded-xl border border-violet-200 bg-white text-violet-600">
                    <ArrowLeft size={20} />
                  </button>

                  <div className="grid h-28 w-28 place-items-center rounded-full bg-orange-50">
                    <Flame size={58} className="text-orange-500" />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <h2 className="text-2xl font-black">
                        1 ngày liên tiếp
                      </h2>
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-600">
                        Chuỗi ngày học
                      </span>
                    </div>
                    <p className="mb-3 font-semibold text-indigo-400">
                      Chúc mừng! Bạn đã duy trì học tập 1 ngày liên tiếp.
                    </p>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-500">
                      ◎ Đạt được hôm nay lúc 09:42
                    </span>
                  </div>
                </div>

                <button className="hidden items-center gap-2 rounded-xl border border-violet-300 px-5 py-3 font-black text-violet-600 md:flex">
                  <Share2 size={18} />
                  Chia sẻ
                </button>
              </div>

              {/* Overview card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="mb-2 text-lg font-black">
                  Tổng quan thành tích
                </h3>
                <p className="mb-10 text-sm font-semibold text-indigo-950">
                  Duy trì học tập mỗi ngày để xây dựng thói quen và đạt chuỗi dài
                  hơn!
                </p>

                <p className="mb-5 font-black">Tiến độ của bạn</p>

                <div className="flex items-center gap-8">
                  <div className="min-w-[150px]">
                    <p className="text-4xl font-black">1 / 7 ngày</p>
                    <p className="mt-3 text-sm font-semibold text-indigo-400">
                      Học liên tục
                    </p>
                  </div>

                  <div className="flex flex-1 items-center">
                    {Array.from({ length: 7 }).map((_, index) => {
                      const active = index === 0;

                      return (
                        <div key={index} className="flex flex-1 items-center">
                          <div className="text-center">
                            <div
                              className={`grid h-11 w-11 place-items-center rounded-full border-4 font-black ${
                                active
                                  ? "border-orange-200 bg-orange-500 text-white"
                                  : "border-slate-200 bg-slate-100 text-slate-400"
                              }`}
                            >
                              {active ? index + 1 : <Lock size={16} />}
                            </div>
                            <p className="mt-3 text-sm font-bold text-indigo-500">
                              {index + 1} ngày
                            </p>
                            {active && (
                              <p className="mt-1 text-sm font-black text-orange-500">
                                26/05
                              </p>
                            )}
                          </div>

                          {index < 6 && (
                            <div className="mb-11 h-[3px] flex-1 bg-slate-200" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-10 flex items-center justify-between rounded-2xl bg-violet-50 px-6 py-4">
                  <div className="flex items-center gap-4">
                    <Lightbulb className="text-violet-600" />
                    <p className="text-sm font-bold text-indigo-900">
                      Mẹo:{" "}
                      <span className="font-semibold text-indigo-500">
                        Học mỗi ngày một chút sẽ giúp bạn tiến bộ nhanh hơn và
                        ghi nhớ lâu hơn!
                      </span>
                    </p>
                  </div>
                  <div className="hidden text-6xl md:block">🦊</div>
                </div>
              </div>

              {/* Activity */}
              <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-lg font-black">Lịch sử hoạt động</h3>
                <p className="mb-5 text-sm font-semibold text-slate-400">
                  Các hoạt động học tập của bạn trong ngày
                </p>

                <div className="divide-y divide-slate-100">
                  {activities.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between py-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`grid h-12 w-12 place-items-center rounded-2xl ${item.bg}`}
                        >
                          <item.icon className={item.color} size={22} />
                        </div>
                        <div>
                          <p className="font-black">{item.title}</p>
                          <p className="text-sm font-semibold text-slate-400">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 text-sm font-bold">
                        <span className="text-indigo-400">{item.time}</span>
                        <span className="text-violet-600">{item.xp}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <button className="rounded-xl border border-indigo-200 px-8 py-3 font-black text-indigo-950">
                    Xem chi tiết hoạt động
                  </button>
                </div>
              </div>
            </section>

            {/* Right sidebar */}
            <aside className="space-y-7">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black">Phần thưởng</h3>
                <p className="mb-5 text-sm font-semibold text-indigo-950">
                  Nhận khi hoàn thành các mốc chuỗi ngày
                </p>

                <div className="space-y-3">
                  {rewards.map((item, index) => (
                    <div
                      key={item.day}
                      className={`flex items-center justify-between rounded-xl border p-4 ${
                        item.active
                          ? "border-orange-300 bg-white"
                          : "border-transparent bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`grid h-11 w-11 place-items-center rounded-full ${
                            item.active ? "bg-orange-100" : "bg-slate-100"
                          }`}
                        >
                          {item.received ? (
                            <Medal className="text-orange-500" />
                          ) : (
                            <Lock className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-black">{item.day}</p>
                          {item.received && (
                            <p className="text-xs font-bold text-indigo-950">
                              Đã nhận
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="font-black text-violet-600">
                        {item.reward}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <Star className="text-violet-600" />
                  <h3 className="text-lg font-black">Gợi ý cho bạn</h3>
                </div>

                <div className="mb-5 rounded-xl bg-violet-50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-indigo-950">
                        Học thêm 6 ngày nữa để mở khóa mốc 3 ngày!
                      </p>
                      <p className="mt-2 text-sm font-semibold text-indigo-500">
                        Bạn sẽ nhận được{" "}
                        <span className="font-black">+30 XP</span>
                      </p>
                    </div>
                    <Calendar className="text-violet-500" size={46} />
                  </div>
                </div>

                <Suggest
                  icon={<CheckCircle />}
                  title="Đặt mục tiêu học mỗi ngày"
                  desc="Chỉ 15-20 phút mỗi ngày thôi!"
                  bg="bg-emerald-100"
                />
                <Suggest
                  icon={<Calendar />}
                  title="Học vào cùng một thời gian"
                  desc="Tạo thói quen dễ dàng hơn"
                  bg="bg-indigo-100"
                />
                <Suggest
                  icon={<Zap />}
                  title="Theo dõi tiến độ thường xuyên"
                  desc="Bạn sẽ có thêm động lực!"
                  bg="bg-violet-100"
                />

                <button className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-violet-600 px-5 py-4 font-black text-white">
                  Bắt đầu học ngay
                  <ChevronRight size={20} />
                </button>
              </div>
            </aside>
          </div>
        </main>
      </div>
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
      <div className="text-orange-500">{icon}</div>
      <div>
        <p className="font-black">{value}</p>
        <p className="text-xs font-bold text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function Suggest({
  icon,
  title,
  desc,
  bg,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bg: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${bg}`}>
        <div className="text-violet-600">{icon}</div>
      </div>
      <div>
        <p className="font-black">{title}</p>
        <p className="text-sm font-semibold text-slate-400">{desc}</p>
      </div>
    </div>
  );
}
"use client";

import {
  Home,
  BookOpen,
  Mic,
  Headphones,
  PenTool,
  Trophy,
  Search,
  Flame,
  Star,
  Gem,
  Gift,
  Bell,
  Heart,
  Clock,
  Users,
  Volume2,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

const situations = [
  {
    id: 1,
    title: "Gọi món tại nhà hàng",
    desc: "Thực hành gọi món, hỏi giá và yêu cầu đặc biệt tại nhà hàng.",
    level: "Dễ",
    time: "5 - 7 phút",
    users: "1.2k lượt luyện",
    progress: 85,
    img: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=500",
  },
  {
    id: 2,
    title: "Làm thủ tục tại sân bay",
    desc: "Thực hành hội thoại khi làm thủ tục check-in chuyến bay.",
    level: "Trung bình",
    time: "6 - 8 phút",
    users: "982 lượt luyện",
    progress: 78,
    img: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500",
  },
  {
    id: 3,
    title: "Phỏng vấn xin việc",
    desc: "Trả lời các câu hỏi thường gặp trong buổi phỏng vấn.",
    level: "Khó",
    time: "7 - 10 phút",
    users: "756 lượt luyện",
    progress: 92,
    img: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=500",
  },
  {
    id: 4,
    title: "Đi khám bác sĩ",
    desc: "Mô tả triệu chứng và nghe hướng dẫn từ bác sĩ.",
    level: "Dễ",
    time: "5 - 7 phút",
    users: "643 lượt luyện",
    progress: 80,
    img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500",
  },
  {
    id: 5,
    title: "Mua sắm quần áo",
    desc: "Hỏi size, màu sắc, giá cả và thanh toán khi mua sắm.",
    level: "Dễ",
    time: "5 - 7 phút",
    users: "1.1k lượt luyện",
    progress: 76,
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500",
  },
  {
    id: 6,
    title: "Nhận phòng khách sạn",
    desc: "Thực hành hội thoại khi nhận phòng và hỏi thông tin khách sạn.",
    level: "Trung bình",
    time: "6 - 8 phút",
    users: "812 lượt luyện",
    progress: 82,
    img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500",
  },
  {
    id: 7,
    title: "Hỏi đường",
    desc: "Hỏi đường và chỉ dẫn cách đến một địa điểm.",
    level: "Dễ",
    time: "4 - 6 phút",
    users: "921 lượt luyện",
    progress: 88,
    img: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500",
  },
  {
    id: 8,
    title: "Kết bạn mới",
    desc: "Giới thiệu bản thân và trò chuyện với người bạn mới.",
    level: "Dễ",
    time: "4 - 6 phút",
    users: "1.3k lượt luyện",
    progress: 90,
    img: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=500",
  },
];

const categories = [
  "Tất cả tình huống",
  "Hằng ngày",
  "Du lịch",
  "Mua sắm",
  "Công việc",
  "Học tập",
  "Y tế",
  "Khác",
];

const menus = [
  { label: "Trang chủ", icon: Home },
  { label: "Tổng quan", icon: ShieldCheck },
  { label: "Từ vựng", icon: BookOpen },
  { label: "Ngữ pháp", icon: BookOpen },
  { label: "Nghe", icon: Headphones },
  { label: "Nói", icon: Mic, active: true },
  { label: "Đọc hiểu", icon: BookOpen },
  { label: "Viết", icon: PenTool },
  { label: "Flashcards", icon: Star },
  { label: "Cộng đồng", icon: Users },
  { label: "Thành tích", icon: Trophy },
];

export default function SpeakingSituationsPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#121447]">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[285px] border-r border-violet-100 bg-white px-5 py-6">
          <div className="mb-9 flex items-center gap-3">
            <div className="text-4xl">🦊</div>
            <h1 className="text-3xl font-black">
              Study<span className="text-violet-600">Arena</span>
            </h1>
          </div>

          <nav className="space-y-2">
            {menus.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold ${
                    item.active
                      ? "bg-violet-100 text-violet-700"
                      : "text-slate-600 hover:bg-violet-50"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                </div>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-violet-100 p-4">
            <div className="font-extrabold text-violet-700">🎁 Nâng cấp Premium</div>
            <p className="mt-2 text-xs text-slate-600">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button className="mt-4 rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white">
              Nâng cấp ngay
            </button>
          </div>
        </aside>

        <main className="ml-[285px] flex-1">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-violet-100 bg-white/90 px-10 backdrop-blur">
            <div className="flex w-[520px] items-center gap-3 rounded-2xl border border-violet-200 bg-white px-5 py-3 text-slate-400">
              <Search size={22} />
              <input
                className="w-full outline-none"
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
              />
            </div>

            <div className="flex items-center gap-8">
              <Stat icon={<Flame className="text-red-500" />} value="18" label="Streak" />
              <Stat icon={<Star className="text-yellow-400" />} value="2,450" label="XP hôm nay" />
              <Stat icon={<Gem className="text-blue-500" />} value="5,230" label="Xu" />
              <Gift className="text-violet-600" />
              <Bell className="text-slate-500" />
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-full bg-orange-100 text-2xl">
                  👩
                </div>
                <div>
                  <div className="font-bold">Minh Anh</div>
                  <div className="text-xs text-slate-500">Level 18</div>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_420px] gap-8 px-10 py-8">
            <section>
              <div className="mb-6 text-sm font-bold text-slate-500">
                Trang chủ &nbsp;›&nbsp; Nói &nbsp;›&nbsp;
                <span className="text-[#121447]"> Nói theo tình huống</span>
              </div>

              <div className="mb-7 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-3 text-4xl font-black">
                    Nói theo tình huống <Mic className="text-violet-600" />
                  </h2>
                  <p className="mt-3 text-lg text-slate-500">
                    Luyện nói tiếng Anh thông qua các tình huống giao tiếp thực tế.
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-bold">
                    Cùng luyện nói mỗi ngày để tự tin hơn nhé!
                  </div>
                  <div className="text-8xl">🦊</div>
                </div>
              </div>

              <div className="mb-8 flex flex-wrap gap-4">
                {categories.map((item, index) => (
                  <button
                    key={item}
                    className={`rounded-xl border px-5 py-3 text-sm font-bold ${
                      index === 0
                        ? "border-violet-200 bg-violet-100 text-violet-700"
                        : "border-violet-200 bg-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <h3 className="mb-5 text-xl font-black">Chọn tình huống để luyện nói</h3>

              <div className="grid grid-cols-4 gap-5">
                {situations.map((item) => (
                  <SituationCard key={item.id} item={item} />
                ))}
              </div>

              <div className="mt-8 rounded-3xl bg-violet-50 p-6">
                <h3 className="mb-5 text-2xl font-black text-violet-700">
                  Mẹo luyện nói hiệu quả
                </h3>

                <div className="grid grid-cols-4 gap-6">
                  <Tip icon={<Lightbulb />} title="Nghe kỹ câu hỏi và hiểu yêu cầu." />
                  <Tip icon={<Volume2 />} title="Nói rõ ràng, phát âm tự nhiên." />
                  <Tip icon={<Mic />} title="Sử dụng từ vựng và cấu trúc đã học." />
                  <Tip icon={<Star />} title="Tự tin và đừng ngại mắc lỗi!" />
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <ProgressCard />
              <RecentCard />
              <SuggestCard />
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
      {icon}
      <div>
        <div className="font-black">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function SituationCard({ item }: any) {
  const levelStyle =
    item.level === "Khó"
      ? "bg-red-100 text-red-600"
      : item.level === "Trung bình"
      ? "bg-orange-100 text-orange-600"
      : "bg-green-100 text-green-600";

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-30">
        <img src={item.img} alt={item.title} className="h-full w-full object-cover" />
        <button className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white">
          <Heart size={18} />
        </button>
      </div>

      <div className="p-4">
        <h4 className="font-black">
          {item.id}. {item.title}
        </h4>
        <p className="mt-2 min-h-[42px] text-sm leading-6 text-slate-500">{item.desc}</p>

        <div className="mt-4 flex items-center gap-2 text-xs font-bold">
          <span className={`rounded-lg px-2 py-1 ${levelStyle}`}>{item.level}</span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock size={13} /> {item.time}
          </span>
          <span className="text-slate-500">{item.users}</span>
        </div>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 py-3 font-black text-violet-700 hover:bg-violet-600 hover:text-white">
          Bắt đầu <Mic size={16} />
        </button>
      </div>
    </div>
  );
}

function ProgressCard() {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Tiến độ nói</h3>

      <div className="mx-auto my-8 grid size-40 place-items-center rounded-full border-[14px] border-violet-100 border-r-violet-700 border-t-violet-700">
        <div className="text-center">
          <div className="text-4xl font-black">40%</div>
          <div className="text-sm font-bold">Hoàn thành</div>
        </div>
      </div>

      <div className="grid grid-cols-3 text-center">
        <SmallStat icon="🎙️" value="12" label="Tình huống" />
        <SmallStat icon="⭐" value="48" label="Bài đã hoàn thành" />
        <SmallStat icon="⏱️" value="6h 30m" label="Tổng thời gian" />
      </div>
    </div>
  );
}

function RecentCard() {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-xl font-black">Thành tích gần đây</h3>

      {situations.slice(0, 3).map((item) => (
        <div key={item.id} className="mb-4 flex items-center gap-4">
          <img src={item.img} className="size-14 rounded-xl object-cover" />
          <div className="flex-1">
            <div className="font-bold">{item.title}</div>
            <div className="text-xs text-slate-500">Hôm nay, 09:15</div>
          </div>
          <div className="rounded-lg bg-green-100 px-3 py-1 font-bold text-green-600">
            {item.progress}%
          </div>
        </div>
      ))}

      <button className="rounded-xl border border-violet-300 px-6 py-3 font-bold text-violet-700">
        Xem tất cả
      </button>
    </div>
  );
}

function SuggestCard() {
  return (
    <div className="rounded-3xl bg-violet-50 p-6">
      <h3 className="mb-5 text-xl font-black">Gợi ý cho bạn</h3>
      <div className="rounded-2xl bg-white p-5">
        <div className="font-black text-violet-700">🎧 Tình huống phù hợp với bạn</div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Dựa trên trình độ hiện tại, chúng tôi gợi ý bạn luyện thêm các tình huống Du lịch.
        </p>
        <button className="mt-5 rounded-xl border border-violet-300 px-6 py-3 font-bold text-violet-700">
          Khám phá ngay
        </button>
      </div>
    </div>
  );
}

function SmallStat({ icon, value, label }: any) {
  return (
    <div>
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 font-black">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Tip({ icon, title }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid size-14 place-items-center rounded-full bg-white text-violet-600">
        {icon}
      </div>
      <div className="text-sm font-bold leading-6">{title}</div>
    </div>
  );
}
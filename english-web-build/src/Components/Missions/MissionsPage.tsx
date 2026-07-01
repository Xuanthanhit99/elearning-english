"use client";

import Link from "next/link";
import { useState } from "react";
import SpiritPetAvatar from "@/src/Components/Pets/SpiritPetAvatar";
import { useAuthStore } from "@/src/store/authStore";
import { AppIcon, LegacyIcon } from "@/src/Components/UI/AppIcon";
import AppLogo from "@/src/Components/UI/AppLogo";

const mainMenu = [
  { icon: "⌂", label: "Tổng quan", href: "/" },
  { icon: "▰", label: "Học tập", href: "/courses" },
  { icon: "⚔", label: "Đấu trường", href: "/arena" },
  { icon: "🤖", label: "AI Tutor", href: "/check-writing", badge: "AI" },
  { icon: "▣", label: "Kiểm tra miễn phí", href: "/check-word", badge: "FREE" },
  { icon: "◇", label: "Thư viện", href: "/courses" },
  { icon: "●", label: "Cộng đồng", href: "/community" },
  { icon: "▣", label: "Khóa học", href: "/courses" },
  { icon: "◈", label: "Shop", href: "/pet" },
];

const personalMenu = [
  { icon: "●", label: "Hồ sơ của tôi", href: "/profile" },
  { icon: "🐾", label: "Linh thú của tôi", href: "/pet" },
  { icon: "🏆", label: "Thành tích", href: "/profile" },
  { icon: "✣", label: "Nhiệm vụ", href: "/missions", active: true },
  { icon: "👥", label: "Bạn bè", href: "/community" },
  { icon: "⚙", label: "Cài đặt", href: "/profile" },
];

const dailyTasks = [
  { icon: "📘", title: "Học 3 bài bất kỳ", progress: "2 / 3", width: "66%", xp: "+20 XP", coin: 50, action: "Đến học" },
  { icon: "🎙", title: "Luyện nói 15 phút", progress: "10 / 15", width: "66%", xp: "+25 XP", coin: 60, action: "Đến luyện" },
  { icon: "🟩", title: "Học 20 từ mới", progress: "20 / 20", width: "100%", xp: "+30 XP", coin: 80, action: "Nhận thưởng", done: true },
  { icon: "☑", title: "Hoàn thành 2 bài quiz", progress: "1 / 2", width: "50%", xp: "+20 XP", coin: 50, action: "Làm ngay" },
  { icon: "🐾", title: "Chăm sóc Foxy 1 lần", progress: "0 / 1", width: "5%", xp: "+15 XP", coin: 40, action: "Chăm sóc" },
];

const weeklyTasks = [
  { icon: "🏆", title: "Hoàn thành 20 bài học", desc: "Tiếp tục học tập mỗi ngày để đạt mục tiêu tuần!", progress: "14 / 20", width: "70%", xp: "+150 XP", coin: 200, action: "Đến học" },
  { icon: "👑", title: "Đạt 90% bài kiểm tra ngữ pháp", desc: "Củng cố ngữ pháp để tiến bộ hơn!", progress: "2 / 3", width: "66%", xp: "+120 XP", coin: 150, action: "Làm ngay" },
  { icon: "🛡", title: "Tham gia đấu trường 5 lần", desc: "Thử sức và giành chiến thắng!", progress: "3 / 5", width: "60%", xp: "+100 XP", coin: 120, action: "Đến đấu trường" },
  { icon: "📗", title: "Đọc 3 bài viết", desc: "Mở rộng vốn từ và hiểu biết!", progress: "3 / 3", width: "100%", xp: "+80 XP", coin: 100, action: "Đã nhận", done: true },
];

export default function MissionsPage() {
  const user = useAuthStore((state) => state.user);
  const [message, setMessage] = useState("");
  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/avatar-default.png";

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f7ff] text-[#121735]">
      <div className="mx-auto flex max-w-[1920px]">
        <Sidebar onAction={() => notify("Gói Premium sẽ được mở ở bước thanh toán.")} />
        <section className="min-w-0 flex-1">
          <TopBar displayName={displayName} avatar={avatar} />
          <div className="grid gap-5 p-4 lg:p-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 space-y-5">
              <header>
                <h1 className="flex items-center gap-2 text-3xl font-black">Nhiệm vụ <span className="text-base text-[#6d35ff]">?</span></h1>
                <p className="mt-2 font-bold text-[#69708b]">Hoàn thành nhiệm vụ để nhận XP, Xu và phần thưởng cho Foxy!</p>
              </header>
              <MissionTabs />
              <MissionScoreBanner />
              <DailyTaskGrid onAction={notify} />
              <WeeklyTasks onAction={notify} />
            </div>
            <aside className="space-y-5">
              <PetCard />
              <TodayProgress />
              <MissionStreak />
              <SpecialEvent onAction={notify} />
            </aside>
          </div>
        </section>
      </div>
      {message && <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-2xl bg-[#121735] px-5 py-3 text-sm font-black text-white shadow-2xl">{message}</div>}
    </main>
  );
}

function Sidebar({ onAction }: { onAction: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[238px] shrink-0 overflow-y-auto border-r border-[#e7e8f3] bg-white px-3.5 py-5 2xl:block">
      <AppLogo />
      <nav className="mt-7 space-y-1">{mainMenu.map((item) => <SideItem key={item.label} item={item} />)}</nav>
      <nav className="mt-6 space-y-1"><p className="px-3 text-[10px] font-black uppercase tracking-wide text-[#8b91aa]">Cá nhân</p>{personalMenu.map((item) => <SideItem key={item.label} item={item} />)}</nav>
      <section className="mt-5 rounded-2xl bg-[#f4f0ff] p-3.5"><AppIcon name="crown" tone="yellow" size={18} /><h3 className="mt-1.5 text-sm font-black text-[#652cff]">Nâng cấp Premium</h3>{["Học không giới hạn", "AI Tutor nâng cao", "Ưu đãi độc quyền", "Trang bị đặc biệt"].map((item) => <p key={item} className="mt-2 text-[11px] font-bold text-[#555d78]">✓ {item}</p>)}<button onClick={onAction} className="mt-3 w-full rounded-xl bg-[#6d35ff] px-3 py-2.5 text-xs font-black text-white">Nâng cấp ngay</button></section>
      <section className="mt-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#ececf7]"><div className="flex items-center gap-2.5"><SpiritPetAvatar petType="fox" level={18} size="sm" showLevelBadge={false} /><div className="min-w-0"><h3 className="text-xs font-black">Foxy đang chờ bạn!</h3><p className="mt-0.5 text-[10px] font-bold leading-4 text-[#69708b]">Cùng học để nhận thưởng nhé!</p><div className="mt-2 h-1.5 rounded-full bg-[#e4e6f2]"><div className="h-1.5 w-2/3 rounded-full bg-[#6d35ff]" /></div></div></div></section>
    </aside>
  );
}

function SideItem({ item }: { item: { icon: string; label: string; href: string; active?: boolean; badge?: string } }) {
  return <Link href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black transition ${item.active ? "bg-[#efe9ff] text-[#652cff]" : "text-[#69708b] hover:bg-[#f5f2ff] hover:text-[#652cff]"}`}><LegacyIcon icon={item.icon} label={item.label} tone={item.active ? "purple" : "slate"} className="h-8 w-8" size={16} /><span className="min-w-0 flex-1 truncate">{item.label}</span>{item.badge && <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${item.badge === "FREE" ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#efe9ff] text-[#652cff]"}`}>{item.badge}</span>}</Link>;
}

function TopBar({ displayName, avatar }: { displayName: string; avatar: string }) {
  return <header className="sticky top-0 z-40 border-b border-[#e7e8f3] bg-white/90 px-4 py-2.5 backdrop-blur"><div className="flex items-center gap-3"><AppLogo compact className="2xl:hidden" /><nav className="hidden flex-1 items-center justify-center gap-1.5 xl:flex">{["Trang chủ", "Học tập", "Đấu trường", "AI Tutor", "Thư viện", "Cộng đồng", "Shop"].map((label) => <Link key={label} href={label === "Trang chủ" ? "/" : label === "Đấu trường" ? "/arena" : label === "Cộng đồng" ? "/community" : label === "Shop" ? "/pet" : "/courses"} className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#303956] hover:bg-[#f5f2ff]">{label}</Link>)}</nav><div className="ml-auto flex items-center gap-2"><TopPill icon="🔥" value={18} label="Streak" /><TopPill icon="💎" value="5.230" label="Xu" /><TopPill icon="🪙" value="2.450" label="Coins" /><button className="hidden rounded-xl border border-[#e5e7f2] bg-white px-3 py-2 text-xs font-black sm:block"><AppIcon name="gift" tone="purple" size={16} bare /></button><button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7f2] bg-white text-sm"><AppIcon name="bell" tone="yellow" size={16} bare /><span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">3</span></button><Link href="/profile" className="hidden items-center gap-2 rounded-2xl px-2 py-1.5 hover:bg-[#f5f2ff] sm:flex"><img src={avatar} alt={displayName} className="h-9 w-9 rounded-full object-cover" /><span className="leading-tight"><span className="block text-[13px] font-black">{displayName}</span><span className="block text-[11px] font-bold text-[#69708b]">Level 18</span></span></Link></div></div></header>;
}

function TopPill({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return <div className="hidden items-center gap-2 rounded-xl border border-[#e8e9f5] bg-white px-3 py-2 shadow-sm lg:flex"><LegacyIcon icon={icon} label={label} tone={label === "Streak" ? "orange" : label === "Xu" ? "cyan" : "yellow"} size={16} /><span className="leading-tight"><span className="block text-xs font-black">{value}</span><span className="block text-[10px] font-bold text-[#69708b]">{label}</span></span></div>;
}

function MissionTabs() {
  return <div className="grid grid-cols-2 gap-2 border-b border-[#e8e9f5] text-sm font-black text-[#69708b] md:grid-cols-5">{["Tất cả nhiệm vụ", "Hằng ngày", "Hằng tuần", "Thành tựu", "Sự kiện"].map((tab, index) => <button key={tab} className={`px-4 py-4 text-left ${index === 0 ? "border-b-2 border-[#6d35ff] text-[#6d35ff]" : ""}`}>{tab}</button>)}</div>;
}

function MissionScoreBanner() {
  return <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4f20dc] via-[#6d35ff] to-[#9b5cff] p-6 text-white shadow-sm"><div className="relative z-10 grid items-center gap-5 lg:grid-cols-[190px_minmax(0,1fr)_220px]"><div><p className="font-black">Điểm nhiệm vụ</p><div className="mt-3 text-4xl font-black">120 ⭐</div><p className="mt-4 text-sm font-bold text-white/85">Còn 80 điểm để nhận rương bạc</p></div><div className="flex items-center justify-between gap-3 text-center text-sm font-black"><Reward done label="20" /><Reward icon="🧰" label="200" /><Reward icon="🧰" label="400" /><Reward icon="🎁" label="800" /></div><div className="hidden justify-end lg:flex"><SpiritPetAvatar petType="fox" level={18} size="lg" showLevelBadge={false} /></div></div></section>;
}

function Reward({ icon = "✓", label, done = false }: { icon?: string; label: string; done?: boolean }) {
  return <div className="min-w-0 flex-1"><div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${done ? "bg-emerald-400" : "bg-white/20"}`}><LegacyIcon icon={icon} label={label} tone={done ? "emerald" : "yellow"} size={18} /></div><p className="mt-2 inline-flex items-center justify-center gap-1"><AppIcon name="star" tone="yellow" size={14} bare /> {label}</p></div>;
}

function DailyTaskGrid({ onAction }: { onAction: (message: string) => void }) {
  return <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Nhiệm vụ hằng ngày <span className="text-xs text-[#69708b]">⏱ Cập nhật sau: 12:45:30</span></h2><button className="text-sm font-black text-[#6d35ff]">Xem tất cả →</button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{dailyTasks.map((task) => <article key={task.title} className="rounded-2xl border border-[#e8e9f5] bg-white p-5 text-center shadow-sm"><LegacyIcon icon={task.icon} label={task.title} tone={task.done ? "emerald" : "purple"} className="mx-auto h-16 w-16" size={30} /><h3 className="mt-4 min-h-10 text-sm font-black">{task.title}</h3><p className="text-sm font-bold">{task.progress}</p><div className="mt-2 h-1.5 rounded-full bg-[#e6e8f2]"><div className={`h-1.5 rounded-full ${task.done ? "bg-emerald-500" : "bg-[#6d35ff]"}`} style={{ width: task.width }} /></div><div className="mt-4 flex justify-between text-sm font-black"><span className="text-emerald-600">{task.xp}</span><span className="inline-flex items-center gap-1 text-amber-500"><AppIcon name="coin" tone="yellow" size={14} bare /> {task.coin}</span></div><button onClick={() => onAction(`${task.action}: ${task.title}`)} className={`mt-4 w-full rounded-xl px-3 py-3 text-sm font-black text-white ${task.done ? "bg-emerald-600" : "bg-[#6d35ff]"}`}>{task.action}</button></article>)}</div></section>;
}

function WeeklyTasks({ onAction }: { onAction: (message: string) => void }) {
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><h2 className="text-xl font-black">Nhiệm vụ hằng tuần</h2><span className="text-xs font-bold text-[#69708b]">⏱ Cập nhật sau: 2 ngày 12:45:30</span></div>{weeklyTasks.map((task) => <div key={task.title} className="grid gap-4 border-b border-[#eef0f6] py-4 last:border-b-0 md:grid-cols-[70px_minmax(0,1fr)_180px_90px_90px_120px] md:items-center"><LegacyIcon icon={task.icon} label={task.title} tone={task.done ? "emerald" : "yellow"} className="h-14 w-14" size={28} /><div><h3 className="font-black">{task.title}</h3><p className="mt-1 text-xs font-bold text-[#69708b]">{task.desc}</p></div><div><div className="h-1.5 rounded-full bg-[#e6e8f2]"><div className={`h-1.5 rounded-full ${task.done ? "bg-emerald-500" : "bg-[#6d35ff]"}`} style={{ width: task.width }} /></div></div><p className="text-sm font-black">{task.progress}</p><p className="inline-flex items-center gap-3 text-sm font-black text-emerald-600">{task.xp} <span className="inline-flex items-center gap-1 text-amber-500"><AppIcon name="coin" tone="yellow" size={14} bare /> {task.coin}</span></p><button onClick={() => onAction(`${task.action}: ${task.title}`)} className={`rounded-xl px-4 py-3 text-sm font-black ${task.done ? "bg-emerald-100 text-emerald-700" : "bg-[#6d35ff] text-white"}`}>{task.action}</button></div>)}<button className="mt-4 w-full text-center font-black text-[#6d35ff]">Xem tất cả nhiệm vụ →</button></section>;
}

function PetCard() {
  return <section className="relative overflow-hidden rounded-2xl border border-[#e8e9f5] bg-gradient-to-br from-[#f6f0ff] to-[#ffe9d5] p-5 shadow-sm"><h2 className="font-black">Linh thú của bạn</h2><div className="mt-4 flex justify-center"><SpiritPetAvatar petType="fox" level={18} size="lg" showLevelBadge={false} /></div><div className="mt-4 rounded-2xl bg-white/90 p-4 text-sm font-bold text-[#303956] shadow-sm">Cùng hoàn thành nhiệm vụ để mình mau lớn nhé! 🏆</div></section>;
}

function TodayProgress() {
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm"><h2 className="font-black">Nhiệm vụ ngày hôm nay</h2><div className="mt-5 grid grid-cols-2 items-center gap-5"><div className="flex h-32 w-32 items-center justify-center rounded-full border-[12px] border-[#6d35ff] border-b-emerald-500"><div className="text-center"><div className="text-2xl font-black">3/5</div><p className="text-xs font-bold text-[#69708b]">Đã hoàn thành</p></div></div><div className="text-center"><div className="text-6xl">🧰</div><p className="mt-2 text-sm font-bold text-[#69708b]">Rương đồng</p><p className="font-black text-emerald-600">+50 XP</p></div></div><button className="mt-5 w-full rounded-xl bg-[#6d35ff] px-4 py-3 font-black text-white">Xem chi tiết</button></section>;
}

function MissionStreak() {
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm"><h2 className="font-black">Chuỗi nhiệm vụ</h2><p className="mt-2 text-sm font-bold text-[#69708b]">18 ngày liên tiếp 🔥</p><div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-black">{[15, 16, 17, 18, 19, 20, 21].map((day) => <div key={day} className={`rounded-2xl p-2 ${day === 18 ? "bg-[#fff0ed] text-red-500" : day < 19 ? "bg-[#f0fdf4] text-emerald-600" : "bg-[#f4f4f7] text-[#9aa1b8]"}`}><div className="text-2xl">{day < 19 ? "🏅" : "🔒"}</div><p>{day}</p></div>)}</div></section>;
}

function SpecialEvent({ onAction }: { onAction: (message: string) => void }) {
  return <section className="rounded-2xl border border-[#ffe2bf] bg-gradient-to-br from-[#fff8ed] to-[#edf7ff] p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black">Sự kiện đặc biệt</h2><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-600">⏱ Còn 3 ngày</span></div><h3 className="mt-5 text-lg font-black">Thử thách học tập mùa hè</h3><p className="mt-2 text-sm font-bold text-[#69708b]">Hoàn thành nhiệm vụ để nhận trang bị hiếm cho Foxy!</p><div className="mt-4 flex items-end justify-between"><div className="flex-1"><div className="h-2 rounded-full bg-[#e6e8f2]"><div className="h-2 w-[45%] rounded-full bg-[#6d35ff]" /></div><p className="mt-2 text-sm font-black">450 / 1000</p><button onClick={() => onAction("Đã tham gia sự kiện mùa hè.")} className="mt-4 rounded-xl bg-[#6d35ff] px-6 py-3 font-black text-white">Tham gia ngay</button></div><SpiritPetAvatar petType="fox" level={30} size="md" showLevelBadge={false} /></div></section>;
}

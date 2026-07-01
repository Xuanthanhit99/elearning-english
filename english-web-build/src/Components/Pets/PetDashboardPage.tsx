"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import SpiritPetAvatar from "@/src/Components/Pets/SpiritPetAvatar";
import { AppIcon, LegacyIcon } from "@/src/Components/UI/AppIcon";
import AppLogo from "@/src/Components/UI/AppLogo";

type Pet = {
  petType?: string;
  petName?: string;
  isChosen?: boolean;
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
  hp?: number;
  energy?: number;
  happiness?: number;
  hunger?: number;
  coins?: number;
  food?: number;
  streak?: number;
};

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
  { icon: "🐾", label: "Linh thú của tôi", href: "/pet", active: true },
  { icon: "🏆", label: "Thành tích", href: "/profile" },
  { icon: "✣", label: "Nhiệm vụ", href: "/missions" },
  { icon: "👥", label: "Bạn bè", href: "/community" },
  { icon: "⚙", label: "Cài đặt", href: "/profile" },
];

const inventory = [
  { icon: "🍎", name: "Táo", count: 12 },
  { icon: "🍪", name: "Bánh quy", count: 8 },
  { icon: "🍣", name: "Cá hồi", count: 6 },
  { icon: "🥛", name: "Sữa", count: 4 },
  { icon: "🍔", name: "Burger", count: 2 },
];

const careCards = [
  { action: "feed", title: "Cho ăn", desc: "Cho Foxy ăn để tăng no bụng", button: "Cho ăn", icon: "🍲", bg: "from-orange-100 to-rose-50" },
  { action: "play", title: "Chơi đùa", desc: "Cùng chơi để tăng niềm vui", button: "Chơi ngay", icon: "🏀", bg: "from-blue-100 to-violet-50" },
  { action: "play", title: "Vuốt ve", desc: "Vuốt ve để tăng độ gắn kết", button: "Vuốt ve", icon: "💞", bg: "from-rose-100 to-orange-50" },
  { action: "clean", title: "Tắm rửa", desc: "Tắm rửa để giữ Foxy sạch sẽ", button: "Tắm ngay", icon: "🛁", bg: "from-cyan-100 to-blue-50" },
  { action: "rest", title: "Đi ngủ", desc: "Cho Foxy đi ngủ để khôi phục năng lượng", button: "Đi ngủ", icon: "🌙", bg: "from-violet-100 to-purple-50" },
];

export default function PetDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [pet, setPet] = useState<Pet | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  useEffect(() => {
    const loadPet = async () => {
      try {
        const res = await api.get("/pets/me");
        setPet(res.data?.pet || res.data || null);
      } catch (error) {
        console.error(error);
        setMessage("Bạn cần đăng nhập để xem linh thú.");
      }
    };

    loadPet();
  }, []);

  const petName = pet?.petName || "Foxy";
  const petType = pet?.petType || "fox";
  const level = pet?.level || 12;
  const xp = pet?.xp || 850;
  const xpMax = 1000;
  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/avatar-default.png";

  const care = async (action: string, title: string) => {
    try {
      setSaving(true);
      const res = await api.patch("/pets/me/care", { action });
      setPet(res.data?.pet || res.data || null);
      setMessage(`${title} thành công, chỉ số của Foxy đã cập nhật.`);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chưa thể chăm sóc Foxy lúc này.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMessage(""), 2600);
    }
  };
  const openComingSoon = () => setComingSoonOpen(true);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f7ff] text-[#121735]">
      <div className="mx-auto flex max-w-[1920px]">
        <Sidebar onAction={openComingSoon} />
        <section className="min-w-0 flex-1">
          <TopBar displayName={displayName} avatar={avatar} level={level} streak={pet?.streak || 18} gems={5230} coins={pet?.coins || 2450} />

          <div className="grid gap-5 p-4 lg:p-5 2xl:grid-cols-[minmax(0,1fr)_440px]">
            <div className="min-w-0 space-y-5">
              <PetHero petName={petName} petType={petType} level={level} xp={xp} xpMax={xpMax} pet={pet} onCare={care} saving={saving} onComingSoon={openComingSoon} />
              <PetTabs onComingSoon={openComingSoon} />
              <CareGrid onCare={care} saving={saving} />
              <EvolutionRoad level={level} />
            </div>
            <aside className="space-y-5">
              <InventoryPanel onAction={openComingSoon} />
              <GamesPanel onAction={openComingSoon} />
              <DailyMissions />
              <VisitorsPanel onAction={openComingSoon} />
            </aside>
          </div>
        </section>
      </div>
      <ComingSoonModal open={comingSoonOpen} onClose={() => setComingSoonOpen(false)} />
      {message && <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-2xl bg-[#121735] px-5 py-3 text-sm font-black text-white shadow-2xl">{message}</div>}
    </main>
  );
}

function Sidebar({ onAction }: { onAction: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[238px] shrink-0 overflow-y-auto border-r border-[#e7e8f3] bg-white px-3.5 py-5 2xl:block">
      <AppLogo />
      <nav className="mt-7 space-y-1">{mainMenu.map((item) => <SideItem key={item.label} item={item} />)}</nav>
      <nav className="mt-6 space-y-1">
        <p className="px-3 text-[10px] font-black uppercase tracking-wide text-[#8b91aa]">Cá nhân</p>
        {personalMenu.map((item) => <SideItem key={item.label} item={item} />)}
      </nav>
      <section className="mt-5 rounded-2xl bg-[#f4f0ff] p-3.5">
        <AppIcon name="crown" tone="yellow" size={18} />
        <h3 className="mt-1.5 text-sm font-black text-[#652cff]">Nâng cấp Premium</h3>
        {["Học không giới hạn", "AI Tutor nâng cao", "Ưu đãi độc quyền", "Trang bị đặc biệt"].map((item) => <p key={item} className="mt-2 text-[11px] font-bold text-[#555d78]">✓ {item}</p>)}
        <button onClick={onAction} className="mt-3 w-full rounded-xl bg-[#6d35ff] px-3 py-2.5 text-xs font-black text-white">Nâng cấp ngay</button>
      </section>
      <section className="mt-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#ececf7]">
        <div className="flex items-center gap-2.5">
          <SpiritPetAvatar petType="fox" level={18} size="sm" showLevelBadge={false} />
          <div className="min-w-0">
            <h3 className="text-xs font-black">Foxy đang chờ bạn!</h3>
            <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#69708b]">Cùng học để nhận thưởng nhé!</p>
            <div className="mt-2 h-1.5 rounded-full bg-[#e4e6f2]"><div className="h-1.5 w-2/3 rounded-full bg-[#6d35ff]" /></div>
          </div>
        </div>
      </section>
    </aside>
  );
}

function SideItem({ item }: { item: { icon: string; label: string; href: string; active?: boolean; badge?: string } }) {
  return (
    <Link href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black transition ${item.active ? "bg-[#efe9ff] text-[#652cff]" : "text-[#69708b] hover:bg-[#f5f2ff] hover:text-[#652cff]"}`}>
      <LegacyIcon icon={item.icon} label={item.label} tone={item.active ? "purple" : "slate"} className="h-8 w-8" size={16} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${item.badge === "FREE" ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#efe9ff] text-[#652cff]"}`}>{item.badge}</span>}
    </Link>
  );
}

function TopBar({ displayName, avatar, level, streak, gems, coins }: { displayName: string; avatar: string; level: number; streak: number; gems: number; coins: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e7e8f3] bg-white/90 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <AppLogo compact className="2xl:hidden" />
        <nav className="hidden flex-1 items-center justify-center gap-1.5 xl:flex">
          {["Trang chủ", "Học tập", "Đấu trường", "AI Tutor", "Thư viện", "Cộng đồng", "Shop"].map((label) => <Link key={label} href={label === "Trang chủ" ? "/" : label === "Đấu trường" ? "/arena" : label === "Cộng đồng" ? "/community" : label === "Shop" ? "/pet" : "/courses"} className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#303956] hover:bg-[#f5f2ff]">{label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <TopPill icon="🔥" value={streak} label="Streak" />
          <TopPill icon="💎" value={gems.toLocaleString("vi-VN")} label="Xu" />
          <TopPill icon="🪙" value={coins.toLocaleString("vi-VN")} label="Coins" />
          <button className="hidden rounded-xl border border-[#e5e7f2] bg-white px-3 py-2 text-xs font-black sm:block"><AppIcon name="gift" tone="purple" size={16} bare /></button>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7f2] bg-white text-sm"><AppIcon name="bell" tone="yellow" size={16} bare /><span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">3</span></button>
          <Link href="/profile" className="hidden items-center gap-2 rounded-2xl px-2 py-1.5 hover:bg-[#f5f2ff] sm:flex">
            <img src={avatar} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
            <span className="leading-tight"><span className="block text-[13px] font-black">{displayName}</span><span className="block text-[11px] font-bold text-[#69708b]">Level {level}</span></span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function TopPill({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return <div className="hidden items-center gap-2 rounded-xl border border-[#e8e9f5] bg-white px-3 py-2 shadow-sm lg:flex"><LegacyIcon icon={icon} label={label} tone={label === "Streak" ? "orange" : label === "Xu" ? "cyan" : "yellow"} size={16} /><span className="leading-tight"><span className="block text-xs font-black">{value}</span><span className="block text-[10px] font-bold text-[#69708b]">{label}</span></span></div>;
}

function PetHero({ petName, petType, level, xp, xpMax, pet, onCare, saving, onComingSoon }: { petName: string; petType: string; level: number; xp: number; xpMax: number; pet: Pet | null; onCare: (action: string, title: string) => void; saving: boolean; onComingSoon: () => void }) {
  const stats = [
    { icon: "💗", label: "Vui vẻ", value: pet?.happiness || 92, color: "bg-[#ff4d7d]" },
    { icon: "🍗", label: "No bụng", value: pet?.hunger || 75, color: "bg-[#ff7a22]" },
    { icon: "⚡", label: "Năng lượng", value: pet?.energy || 80, color: "bg-[#f5c12f]" },
    { icon: "🛁", label: "Sạch sẽ", value: pet?.hp || 70, color: "bg-[#2f80ff]" },
    { icon: "🧠", label: "Kiến thức", value: 60, color: "bg-[#8b5cf6]" },
    { icon: "🎯", label: "Động lực", value: 85, color: "bg-[#ef4444]" },
  ];

  return (
    <section>
      <h1 className="mb-3 flex items-center gap-2 text-xl font-black">Linh thú của tôi <span className="text-sm text-[#6d35ff]">ⓘ</span></h1>
      <div className="relative overflow-hidden rounded-3xl border border-[#e8e9f5] bg-gradient-to-r from-[#8b5a42] via-[#bb7b4b] to-[#65422d] p-4 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_35%,rgba(255,234,196,0.45),transparent_28%),linear-gradient(90deg,rgba(45,22,12,0.45),transparent_42%,rgba(45,22,12,0.25))]" />
        <div className="relative z-10 grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)_90px]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <SpiritPetAvatar petType={petType} level={level} size="sm" showLevelBadge={false} />
              <div>
                <h2 className="text-2xl font-black">{petName} <span className="text-sm">✎</span></h2>
                <p className="text-sm font-bold text-white/85">Cấp {level} ⭐⭐⭐⭐⭐</p>
                <span className="mt-2 inline-block rounded-full bg-[#7c3cff] px-3 py-1 text-xs font-black">Học giả</span>
              </div>
            </div>
            <p className="text-sm font-bold">{xp} / {xpMax} XP</p>
            <div className="h-2 rounded-full bg-white/25"><div className="h-2 rounded-full bg-[#9b6bff]" style={{ width: `${Math.min((xp / xpMax) * 100, 100)}%` }} /></div>
            <p className="text-xs font-bold text-white/85">Cấp tiếp theo: +150 XP</p>
            <div className="grid grid-cols-1 gap-2 pt-4">
              {["🖼 Album", "📜 Lịch sử", "💬 AI trò chuyện"].map((item) => <button key={item} onClick={onComingSoon} className="rounded-xl bg-white px-3 py-3 text-xs font-black text-[#4b2d1e] shadow-sm">{item}</button>)}
            </div>
          </div>
          <div className="flex min-h-[360px] items-end justify-center">
            <div className="relative">
              <div className="absolute -left-28 top-6 hidden rounded-2xl bg-white px-5 py-4 text-sm font-bold text-[#303956] shadow-xl lg:block">Hôm nay chúng ta<br />học thật vui nhé! 💜</div>
              <SpiritPetAvatar petType={petType} level={level} size="xl" showLevelBadge={false} />
            </div>
          </div>
          <div className="grid content-center gap-3">
            <button onClick={onComingSoon} disabled={saving} className="rounded-2xl bg-white px-3 py-4 text-xs font-black text-[#4b2d1e] shadow-sm">✎ Đổi tên</button>
            <button onClick={onComingSoon} className="rounded-2xl bg-white px-3 py-4 text-center text-xs font-black text-[#4b2d1e] shadow-sm">👕 Đổi skin</button>
            <button onClick={onComingSoon} className="rounded-2xl bg-white px-3 py-4 text-center text-xs font-black text-[#4b2d1e] shadow-sm">🏠 Nhà của Foxy</button>
          </div>
        </div>
        <div className="relative z-10 mt-3 grid gap-3 rounded-2xl bg-white/95 p-4 text-[#121735] sm:grid-cols-2 xl:grid-cols-6">
          {stats.map((item) => <MiniStat key={item.label} {...item} />)}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return <div><div className="flex items-center gap-2"><LegacyIcon icon={icon} label={label} tone={label.includes("bụng") ? "orange" : label.includes("lượng") ? "yellow" : label.includes("Sạch") ? "blue" : "purple"} className="h-10 w-10" size={20} /><span><span className="block text-lg font-black">{value}%</span><span className="block text-[11px] font-bold text-[#69708b]">{label}</span></span></div><div className="mt-2 h-1.5 rounded-full bg-[#e6e8f2]"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} /></div></div>;
}

function PetTabs({ onComingSoon }: { onComingSoon: () => void }) {
  return <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#e8e9f5] bg-white p-2 text-center text-xs font-black text-[#69708b] shadow-sm md:grid-cols-6">{["🐾 Chăm sóc", "🎽 Trang bị", "☑ Nhiệm vụ", "🧸 Đồ chơi", "🏠 Nhà cửa", "⚙ Tiến hóa"].map((tab, index) => <button key={tab} onClick={index === 0 ? undefined : onComingSoon} className={`rounded-xl px-3 py-3 ${index === 0 ? "bg-[#efe9ff] text-[#652cff]" : "hover:bg-[#f5f2ff]"}`}>{tab}</button>)}</div>;
}

function CareGrid({ onCare, saving }: { onCare: (action: string, title: string) => void; saving: boolean }) {
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{careCards.map((card, index) => <article key={card.title} className="relative overflow-hidden rounded-2xl border border-[#e8e9f5] bg-white p-3 text-center shadow-sm"><div className={`flex h-28 items-center justify-center rounded-xl bg-gradient-to-br ${card.bg}`}><LegacyIcon icon={card.icon} label={card.title} tone="orange" className="h-16 w-16" size={32} /></div>{index === 0 && <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">12</span>}<h3 className="mt-3 font-black">{card.title}</h3><p className="mx-auto mt-1 min-h-8 max-w-[130px] text-xs font-bold text-[#69708b]">{card.desc}</p><button disabled={saving} onClick={() => onCare(card.action, card.title)} className="mt-3 w-full rounded-xl bg-[#6d35ff] px-3 py-2 text-xs font-black text-white disabled:opacity-60">{card.button}</button></article>)}</section>;
}

function EvolutionRoad({ level }: { level: number }) {
  const stages = ["Trứng", "Foxy Baby\nCấp 1", "Foxy Học Sinh\nCấp 10", "Foxy Học Giả\nCấp 25", "Foxy Thông Thái\nCấp 50", "Foxy Huyền Thoại\nCấp 100"];
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm"><h2 className="font-black">Hành trình của Foxy</h2><div className="mt-4 grid gap-3 md:grid-cols-6">{stages.map((stage, index) => { const unlocked = level >= [0, 1, 10, 25, 50, 100][index]; return <div key={stage} className={`rounded-2xl p-3 text-center ${unlocked ? "bg-[#f4f0ff] text-[#652cff]" : "bg-[#f3f4f8] text-[#9aa1b8]"}`}><div className="text-4xl">{index === 0 ? "🥚" : unlocked ? "🦊" : "🔒"}</div><p className="mt-2 whitespace-pre-line text-xs font-black">{stage}</p></div>; })}</div></section>;
}

function InventoryPanel({ onAction }: { onAction: () => void }) {
  return <Panel title="Túi đồ của Foxy" action="Xem tất cả"><div className="flex gap-5 border-b border-[#e8e9f5] pb-3 text-sm font-black text-[#69708b]"><span className="text-[#6d35ff]">Thức ăn</span><span>Đồ chơi</span><span>Vật phẩm</span><span>Phụ kiện</span></div><div className="mt-4 grid grid-cols-5 gap-2">{inventory.map((item) => <button key={item.name} onClick={onAction} className="rounded-xl border border-[#e8e9f5] bg-[#fafbff] p-3 text-center"><LegacyIcon icon={item.icon} label={item.name} tone="orange" className="mx-auto h-12 w-12" size={24} /><p className="mt-2 text-xs font-black">{item.name}</p><p className="text-xs font-black text-[#ff6b00]">x{item.count}</p></button>)}</div><button onClick={onAction} className="mt-4 w-full rounded-xl bg-[#6d35ff] px-4 py-3 font-black text-white">Xem tất cả</button></Panel>;
}

function GamesPanel({ onAction }: { onAction: () => void }) {
  return <Panel title="Trò chơi cùng Foxy" action="Xem tất cả →" onAction={onAction}><div className="grid grid-cols-4 gap-3">{["Ném bóng", "Bắt sao", "Đoán từ", "Nhảy dây"].map((game, index) => <button key={game} onClick={onAction} className="rounded-xl bg-gradient-to-br from-[#dbeafe] to-[#fce7f3] p-2 text-center"><div className="text-3xl">{["⚽", "⭐", "🔤", "🦊"][index]}</div><p className="mt-2 text-[11px] font-black">{game}</p><p className="text-[10px] font-bold text-[#6d35ff]">+{15 + index * 5} ⭐</p></button>)}</div></Panel>;
}

function DailyMissions() {
  return <Panel title="Nhiệm vụ hằng ngày" action="Xem tất cả →">{[["🏅", "Học 3 bài bất kỳ", "2 / 3", "70%"], ["🎙", "Luyện nói 15 phút", "10 / 15", "66%"], ["▣", "Kiểm tra từ vựng 20 từ", "15 / 20", "75%"]].map(([icon, title, progress, width]) => <div key={title} className="flex items-center gap-3 py-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f0ff] text-xl">{icon}</span><div className="min-w-0 flex-1"><div className="flex justify-between text-xs font-black"><span>{title}</span><span>{progress}</span></div><div className="mt-2 h-1.5 rounded-full bg-[#e6e8f2]"><div className="h-1.5 rounded-full bg-[#6d35ff]" style={{ width }} /></div></div><span className="text-xs font-black text-emerald-600">+20 XP ⭐</span></div>)}<div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#fff7ed] p-3"><span className="text-5xl">🧰</span><p className="text-xs font-bold text-[#69708b]">Hoàn thành tất cả nhiệm vụ để nhận rương thưởng!</p></div></Panel>;
}

function VisitorsPanel({ onAction }: { onAction: () => void }) {
  return <Panel title="Bạn bè ghé thăm" action="Xem tất cả →" onAction={onAction}>{["Thảo Vy", "Đức Mạnh", "Mai Trang"].map((name, index) => <div key={name} className="flex items-center gap-3 py-2"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#dbeafe] to-[#fde68a] text-xl">{["👩", "👨", "👩"][index]}</span><div className="min-w-0 flex-1"><p className="text-xs font-black">{name}</p><p className="text-[11px] font-bold text-[#69708b]">{["đã ghé thăm nhà Foxy", "đã cho Foxy 1 bánh quy", "đã chơi cùng Foxy"][index]}</p></div><button onClick={onAction} className="rounded-xl bg-[#efe9ff] px-3 py-2 text-sm">💜</button></div>)}</Panel>;
}

function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-black">{title}</h2>{action && <button onClick={onAction} className="text-xs font-black text-[#6d35ff]">{action}</button>}</div>{children}</section>;
}

function ComingSoonModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/55 px-4 backdrop-blur-md">
      <section className="relative w-full max-w-4xl overflow-hidden rounded-[34px] bg-white px-6 py-8 text-center shadow-2xl sm:px-12 sm:py-10">
        <button onClick={onClose} className="absolute right-8 top-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#efe9ff] text-4xl font-light text-[#6d35ff]">
          ×
        </button>
        <div className="mx-auto max-w-2xl">
          <div className="relative mx-auto flex min-h-[330px] items-end justify-center">
            <div className="absolute inset-x-0 bottom-5 h-56 rounded-[40px] bg-[radial-gradient(circle_at_50%_70%,rgba(109,53,255,0.16),transparent_44%),linear-gradient(to_top,rgba(109,53,255,0.08),transparent)]" />
            <div className="absolute bottom-20 left-4 hidden h-16 w-32 rounded-full bg-[#efe9ff] sm:block" />
            <div className="absolute bottom-24 right-8 hidden text-8xl text-[#e6ddff] sm:block">🏗</div>
            <div className="absolute bottom-9 left-24 hidden text-6xl sm:block">🚧</div>
            <div className="absolute bottom-9 right-24 hidden text-6xl sm:block">🚧</div>
            <div className="absolute bottom-0 text-[120px] leading-none drop-shadow-xl sm:text-[190px]">🦊</div>
            <div className="absolute bottom-12 rounded-xl bg-yellow-400 px-10 py-4 text-5xl shadow-xl ring-4 ring-yellow-600/20">🐾</div>
          </div>
          <h2 className="mt-4 text-4xl font-black text-[#16184a] sm:text-5xl">✨ Tính năng đang phát triển! ✨</h2>
          <p className="mx-auto mt-5 max-w-xl text-xl font-bold leading-8 text-[#69708b]">
            Chúng mình đang nỗ lực hoàn thiện tính năng này để mang đến trải nghiệm tốt nhất cho bạn.
          </p>
          <div className="mx-auto mt-8 flex max-w-md items-center gap-4 rounded-2xl bg-[#f4f0ff] p-4 text-left">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#efe9ff] text-3xl">🗓</span>
            <div>
              <p className="font-bold text-[#69708b]">Dự kiến ra mắt trong</p>
              <p className="text-2xl font-black text-[#6d35ff]">Phiên bản sắp tới</p>
            </div>
          </div>
          <button onClick={onClose} className="mx-auto mt-8 block w-full max-w-lg rounded-2xl bg-[#6d35ff] px-6 py-5 text-xl font-black text-white shadow-[0_18px_34px_rgba(109,53,255,0.26)]">
            ♥ Cảm ơn bạn đã kiên nhẫn!
          </button>
          <p className="mt-6 text-lg font-bold text-[#69708b]">🦊 Foxy sẽ thông báo cho bạn khi tính năng sẵn sàng nhé!</p>
        </div>
      </section>
    </div>
  );
}

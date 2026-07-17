"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
import SpiritPetAvatar from "@/src/Components/Pets/SpiritPetAvatar";
import { useAuthStore } from "@/src/store/authStore";
import { AppIcon, LegacyIcon } from "@/src/Components/UI/AppIcon";
import AppLogo from "@/src/Components/UI/AppLogo";

export interface WordHistory {
  id: string;
  createdAt: string;
  word?: {
    word?: string;
    mainMeaning?: string;
    level?: string;
  };
}

export interface WritingHistory {
  id: string;
  originalText: string;
  score: number;
  createdAt: string;
}

type ArenaProfile = {
  arenaPoint?: number;
  arenaFood?: number;
  gold?: number;
  mmr?: number;
  winStreak?: number;
  level?: number;
};

type PetProfile = {
  petType?: string;
  name?: string;
  level?: number;
  xp?: number;
  coins?: number;
  energy?: number;
  happiness?: number;
  hunger?: number;
  hygiene?: number;
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
  { icon: "●", label: "Hồ sơ của tôi", href: "/profile", active: true },
  { icon: "🐾", label: "Linh thú của tôi", href: "/pet" },
  { icon: "🏆", label: "Thành tích", href: "/profile" },
  { icon: "✣", label: "Nhiệm vụ", href: "/missions" },
  { icon: "👥", label: "Bạn bè", href: "/community" },
  { icon: "⚙", label: "Cài đặt", href: "/profile" },
];

const careActions = [
  { title: "Cho ăn", icon: "🍔", reward: "+10", mood: "💗", bg: "from-orange-100 to-amber-50" },
  { title: "Chơi đùa", icon: "🏀", reward: "+15", mood: "😄", bg: "from-pink-100 to-purple-50" },
  { title: "Vuốt ve", icon: "💞", reward: "+10", mood: "💗", bg: "from-rose-100 to-orange-50" },
  { title: "Tắm rửa", icon: "🛁", reward: "+10", mood: "🙂", bg: "from-sky-100 to-blue-50" },
  { title: "Ngủ", icon: "💤", reward: "+20", mood: "⚡", bg: "from-violet-100 to-indigo-50" },
];

const inventory = [
  { icon: "🍎", name: "Táo", count: 12 },
  { icon: "🍪", name: "Bánh quy", count: 8 },
  { icon: "🍣", name: "Cá hồi", count: 6 },
  { icon: "🥛", name: "Sữa", count: 4 },
  { icon: "🍔", name: "Burger", count: 2 },
];

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [wordHistory, setWordHistory] = useState<WordHistory[]>([]);
  const [writingHistory, setWritingHistory] = useState<WritingHistory[]>([]);
  const [arenaProfile, setArenaProfile] = useState<ArenaProfile | null>(null);
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const [wordsRes, writingRes, arenaRes, petRes] = await Promise.allSettled([
        api.get("/words/history"),
        api.get("/writing/history"),
        api.get("/arena/lobby"),
        api.get("/pets/me"),
      ]);

      if (wordsRes.status === "fulfilled" && Array.isArray(wordsRes.value.data)) {
        setWordHistory(wordsRes.value.data);
      }

      if (writingRes.status === "fulfilled" && Array.isArray(writingRes.value.data)) {
        setWritingHistory(writingRes.value.data);
      }

      if (arenaRes.status === "fulfilled") {
        setArenaProfile(arenaRes.value.data?.profile || null);
      }

      if (petRes.status === "fulfilled") {
        setPet(petRes.value.data?.pet || petRes.value.data || null);
      }
    };

    loadProfile();
  }, []);

  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/cat-home.jpg";
  const level = pet?.level || arenaProfile?.level || 18;
  const petName = pet?.name || "Foxy";
  const petType = pet?.petType || "fox";
  const xp = pet?.xp || 850;
  const streak = arenaProfile?.winStreak || 18;
  const gems = arenaProfile?.gold || 5230;
  const coins = pet?.coins || arenaProfile?.arenaPoint || 2450;

  const learnedWords = wordHistory.length || 2458;
  const completedLessons = writingHistory.length || 128;
  const averageScore = useMemo(() => {
    if (!writingHistory.length) return 95;
    return Math.round(writingHistory.reduce((total, item) => total + (item.score || 0), 0) / writingHistory.length);
  }, [writingHistory]);
  const showAction = (message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(""), 2400);
  };
  const openEditProfile = () => {
    setNameInput(displayName);
    setEditingProfile(true);
  };
  const saveProfile = async () => {
    if (!nameInput.trim()) {
      showAction("Tên không được để trống.");
      return;
    }

    try {
      setSavingProfile(true);
      const res = await api.patch("/auth/me/profile", { fullname: nameInput.trim() });
      setUser({ ...user, ...res.data });
      setEditingProfile(false);
      showAction("Đã cập nhật hồ sơ.");
    } catch (error) {
      console.error(error);
      showAction("Cập nhật hồ sơ thất bại, thử lại nhé.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f7ff] text-[#121735]">
      <div className="mx-auto flex max-w-[1920px]">
        <ProfileSidebar onAction={showAction} />

        <section className="min-w-0 flex-1">
          <TopBar displayName={displayName} avatar={avatar} level={level} streak={streak} gems={gems} coins={coins} />

          <div className="grid gap-5 p-4 lg:p-5 2xl:grid-cols-[minmax(0,1fr)_500px]">
            <div className="min-w-0 space-y-5">
              <ProfileHero displayName={displayName} avatar={avatar} user={user} petName={petName} petType={petType} level={level} onEditProfile={openEditProfile} onAction={showAction} />
              <PetVitals pet={pet} averageScore={averageScore} />
              <CarePanel onAction={showAction} />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <AchievementPanel />
                <LearningStats learnedWords={learnedWords} completedLessons={completedLessons} />
              </div>

              <EvolutionRoad level={level} />
            </div>

            <aside className="space-y-5">
              <PetStatus petName={petName} level={level} xp={xp} />
              <InventoryPanel onAction={showAction} />
              <MiniGames onAction={showAction} />
              <FriendsPanel onAction={showAction} />
            </aside>
          </div>
        </section>
      </div>
      {actionMessage && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-2xl bg-[#121735] px-5 py-3 text-sm font-black text-white shadow-2xl">
          {actionMessage}
        </div>
      )}
      {editingProfile && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black">Chỉnh sửa hồ sơ</h2>
            <label className="mt-5 block text-sm font-black text-[#69708b]">Tên hiển thị</label>
            <input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#e8e9f5] px-4 py-3 font-bold outline-none focus:border-[#6d35ff]"
              placeholder="Nhập tên của bạn"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditingProfile(false)} className="rounded-xl border border-[#e8e9f5] px-4 py-3 text-sm font-black">
                Hủy
              </button>
              <button onClick={saveProfile} disabled={savingProfile} className="rounded-xl bg-[#6d35ff] px-4 py-3 text-sm font-black text-white disabled:opacity-60">
                {savingProfile ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileSidebar({ onAction }: { onAction: (message: string) => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[238px] shrink-0 overflow-y-auto border-r border-[#e7e8f3] bg-white px-3.5 py-5 2xl:block">
      <AppLogo />

      <nav className="mt-7 space-y-1">
        {mainMenu.map((item) => <SideItem key={item.label} item={item} />)}
      </nav>

      <nav className="mt-6 space-y-1">
        <p className="px-3 text-[10px] font-black uppercase tracking-wide text-[#8b91aa]">Cá nhân</p>
        {personalMenu.map((item) => <SideItem key={item.label} item={item} />)}
      </nav>

      <section className="mt-5 rounded-2xl bg-[#f4f0ff] p-3.5">
        <AppIcon name="crown" tone="yellow" size={18} />
        <h3 className="mt-1.5 text-sm font-black text-[#652cff]">Nâng cấp Premium</h3>
        {["Học không giới hạn", "AI Tutor nâng cao", "Ưu đãi độc quyền", "Bỏ quảng cáo"].map((item) => (
          <p key={item} className="mt-2 text-[11px] font-bold text-[#555d78]">✓ {item}</p>
        ))}
        <button onClick={() => onAction("Gói Premium sẽ được mở ở bước thanh toán tiếp theo.")} className="mt-3 w-full rounded-xl bg-[#6d35ff] px-3 py-2.5 text-xs font-black text-white">Nâng cấp ngay</button>
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
          {["Trang chủ", "Học tập", "Đấu trường", "AI Tutor", "Thư viện", "Cộng đồng", "Shop"].map((label) => (
            <Link key={label} href={label === "Trang chủ" ? "/" : label === "Đấu trường" ? "/arena" : label === "Cộng đồng" ? "/community" : label === "Shop" ? "/pet" : "/courses"} className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#303956] hover:bg-[#f5f2ff]">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <TopPill icon="🔥" value={streak} label="Streak" />
          <TopPill icon="💎" value={gems.toLocaleString("vi-VN")} label="Xu" />
          <TopPill icon="🪙" value={coins.toLocaleString("vi-VN")} label="Coins" />
          <button className="hidden items-center gap-1 rounded-xl border border-[#e5e7f2] bg-white px-3 py-2 text-xs font-black sm:flex"><AppIcon name="globe" tone="cyan" size={14} bare /> VI</button>
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

function ProfileHero({
  displayName,
  avatar,
  user,
  petName,
  petType,
  level,
  onEditProfile,
  onAction,
}: {
  displayName: string;
  avatar: string;
  user: any;
  petName: string;
  petType: string;
  level: number;
  onEditProfile: () => void;
  onAction: (message: string) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[#e9e5ff] bg-gradient-to-r from-[#fbf3ff] via-[#fff8fb] to-[#f0f5ff] p-5 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,202,221,0.55),transparent_28%),radial-gradient(circle_at_55%_80%,rgba(124,58,237,0.12),transparent_28%)]" />
      <div className="relative z-10 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_110px]">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-2xl font-black">Hồ sơ của tôi</h1><span className="rounded-full bg-[#6d35ff] px-2 py-1 text-[11px] font-black text-white">⭐ Pro</span></div>
          <div className="mt-5 flex items-center gap-4">
            <div className="relative">
              <img src={avatar} alt={displayName} className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-xl" />
              <button onClick={() => onAction("Đổi ảnh đại diện sẽ được mở ở bước tiếp theo.")} className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#6d35ff] text-white shadow-lg">📷</button>
            </div>
            <div>
              <h2 className="text-2xl font-black">{displayName}</h2>
              <p className="mt-1 text-sm font-bold text-[#3f4867]">@{user?.username || "minhanh_english"}</p>
              <p className="mt-3 text-sm font-bold text-[#69708b]">📅 Tham gia 15/03/2024</p>
              <p className="mt-2 text-sm font-bold text-[#69708b]">🎯 Mục tiêu: IELTS 7.0 trong năm nay!</p>
            </div>
          </div>
          <button onClick={onEditProfile} className="mt-5 rounded-xl border border-[#e0d9ff] bg-white px-4 py-3 text-sm font-black text-[#303956] shadow-sm">✎ Chỉnh sửa hồ sơ</button>
        </div>

        <div className="flex items-end justify-center">
          <div className="relative">
            <div className="absolute inset-6 rounded-full bg-[#ffb26b]/30 blur-3xl" />
            <SpiritPetAvatar petType={petType} level={level} size="xl" showLevelBadge={false} />
            <div className="absolute -left-20 top-6 hidden max-w-[180px] rounded-2xl bg-white/90 p-4 text-sm font-bold text-[#303956] shadow-lg lg:block">
              Hi {displayName}! 👋<br />Hôm nay chúng ta học thật vui nhé!
              <span className="absolute -bottom-2 right-6 text-pink-500">♥</span>
            </div>
          </div>
        </div>

        <div className="grid content-center gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <button onClick={onEditProfile} className="rounded-2xl bg-white px-3 py-4 text-xs font-black text-[#303956] shadow-sm">✎ Đổi tên</button>
          <Link href="/pet" className="rounded-2xl bg-white px-3 py-4 text-center text-xs font-black text-[#303956] shadow-sm">👕 Đổi skin</Link>
          <Link href="/pet" className="rounded-2xl bg-white px-3 py-4 text-center text-xs font-black text-[#303956] shadow-sm">🏠 Nhà của Foxy</Link>
        </div>
      </div>
    </section>
  );
}

function PetVitals({ pet, averageScore }: { pet: PetProfile | null; averageScore: number }) {
  const vitals = [
    { icon: "💗", label: "Vui vẻ", value: pet?.happiness || 92, color: "bg-[#ff4d7d]" },
    { icon: "🍗", label: "No bụng", value: pet?.hunger || 75, color: "bg-[#ff7a22]" },
    { icon: "⚡", label: "Năng lượng", value: pet?.energy || 80, color: "bg-[#f5c12f]" },
    { icon: "🙂", label: "Sạch sẽ", value: pet?.hygiene || averageScore, color: "bg-[#2f80ff]" },
  ];

  return (
    <section className="grid gap-4 rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
      {vitals.map((item) => <Vital key={item.label} {...item} />)}
    </section>
  );
}

function Vital({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 xl:border-r xl:border-[#e8e9f5] xl:last:border-r-0">
      <LegacyIcon icon={icon} label={label} tone={label.includes("bụng") ? "orange" : label.includes("lượng") ? "yellow" : label.includes("Sạch") ? "blue" : "pink"} className="h-12 w-12" size={24} />
      <div className="min-w-0 flex-1 pr-4">
        <div className="flex items-end gap-2"><span className="text-2xl font-black">{value}%</span><span className="pb-1 text-xs font-bold text-[#69708b]">{label}</span></div>
        <div className="mt-3 h-1.5 rounded-full bg-[#e6e8f2]"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
      </div>
    </div>
  );
}

function CarePanel({ onAction }: { onAction: (message: string) => void }) {
  return (
    <Panel title="Chăm sóc và tương tác" action="ⓘ">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {careActions.map((item) => (
          <button key={item.title} onClick={() => onAction(`Foxy vừa ${item.title.toLowerCase()} và nhận ${item.reward} năng lượng vui vẻ.`)} className="overflow-hidden rounded-2xl border border-[#e8e9f5] bg-white text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${item.bg}`}><LegacyIcon icon={item.icon} label={item.title} tone="orange" className="h-16 w-16" size={32} /></div>
            <div className="p-3"><h3 className="font-black">{item.title}</h3><p className="mt-1 text-sm font-black text-[#6d35ff]">{item.reward} {item.mood}</p></div>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm font-bold text-[#6d35ff]">✣ Chăm sóc Foxy mỗi ngày để nhận thêm XP và phần thưởng nhé!</p>
    </Panel>
  );
}

function AchievementPanel() {
  const badges = ["🔮", "⭐", "🛡️", "📖", "🏅"];
  return <Panel title="Thành tích nổi bật" action="Xem tất cả"><div className="grid grid-cols-3 gap-4 sm:grid-cols-5">{badges.map((badge, index) => <div key={badge} className="text-center"><div className="text-6xl">{badge}</div><p className="mt-2 text-xs font-black">{["1Ngày Liên Tục", "Bậc Thầy Ngữ Pháp", "Chiến Binh Arena", "Biblio Master", "IELTS 7.0"][index]}</p></div>)}</div></Panel>;
}

function LearningStats({ learnedWords, completedLessons }: { learnedWords: number; completedLessons: number }) {
  return (
    <Panel title="Thống kê học tập" action="Xem chi tiết">
      <StatRow icon="📘" label="Tổng từ đã học" value={`${learnedWords.toLocaleString("vi-VN")} từ`} />
      <StatRow icon="✅" label="Bài học đã hoàn thành" value={`${completedLessons} bài`} />
      <StatRow icon="⏱" label="Thời gian học" value="128 giờ" />
      <StatRow icon="🧾" label="Bài kiểm tra đã làm" value="45 bài" />
    </Panel>
  );
}

function EvolutionRoad({ level }: { level: number }) {
  const stages = ["Trứng", "Bé Foxy\nLv.1", "Foxy Tập Sự\nLv.10", "Foxy Hiếu Học\nLv.25", "Foxy Thông Thái\nLv.50", "Foxy Huyền Thoại\nLv.100"];
  return (
    <Panel title="Hành trình của Foxy">
      <div className="grid gap-3 md:grid-cols-6">
        {stages.map((stage, index) => {
          const unlocked = level >= [0, 1, 10, 25, 50, 100][index];
          return <div key={stage} className={`rounded-2xl p-3 text-center ${unlocked ? "bg-[#f4f0ff] text-[#652cff]" : "bg-[#f3f4f8] text-[#9aa1b8]"}`}><div className="text-4xl">{index === 0 ? "🥚" : unlocked ? "🦊" : "🔒"}</div><p className="mt-2 whitespace-pre-line text-xs font-black">{stage}</p></div>;
        })}
      </div>
    </Panel>
  );
}

function PetStatus({ petName, level, xp }: { petName: string; level: number; xp: number }) {
  const xpMax = 1000;
  return (
    <Panel title="Linh thú của tôi" action={`Cấp ${level}`}>
      <h2 className="text-3xl font-black">{petName}</h2>
      <div className="mt-4 h-2 rounded-full bg-[#e5e0ff]"><div className="h-2 rounded-full bg-[#6d35ff]" style={{ width: `${Math.min((xp / xpMax) * 100, 100)}%` }} /></div>
      <p className="mt-2 text-right text-sm font-bold text-[#69708b]">{xp} / {xpMax} XP</p>
      <div className="mt-5 rounded-2xl bg-[#f7f6ff] p-4">
        <p className="text-sm font-black">Tâm trạng hiện tại</p>
        <div className="mt-3 flex items-center gap-3"><span className="text-5xl">😄</span><div><h3 className="text-xl font-black">Rất vui!</h3><p className="text-sm font-bold text-[#69708b]">Foxy đang tràn đầy năng lượng! 🎉</p></div></div>
      </div>
    </Panel>
  );
}

function InventoryPanel({ onAction }: { onAction: (message: string) => void }) {
  return (
    <Panel title="Túi đồ của Foxy" action="Xem tất cả">
      <div className="flex gap-3 border-b border-[#e8e9f5] pb-3 text-sm font-black text-[#69708b]"><span className="text-[#6d35ff]">Thức ăn</span><span>Đồ chơi</span><span>Vật phẩm</span><span>Phụ kiện</span></div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {inventory.map((item) => <div key={item.name} className="rounded-xl border border-[#e8e9f5] bg-[#fafbff] p-3 text-center"><LegacyIcon icon={item.icon} label={item.name} tone="orange" className="mx-auto h-12 w-12" size={24} /><p className="mt-2 text-xs font-black">{item.name}</p><p className="text-xs font-black text-[#ff6b00]">x{item.count}</p></div>)}
      </div>
      <button onClick={() => onAction("Foxy đã ăn một phần đồ ăn trong túi.")} className="mt-4 w-full rounded-xl bg-[#6d35ff] px-4 py-3 font-black text-white">Cho ăn</button>
    </Panel>
  );
}

function MiniGames({ onAction }: { onAction: (message: string) => void }) {
  return <Panel title="Trò chơi cùng Foxy" action="Xem tất cả →"><div className="grid grid-cols-4 gap-3">{["Ném bóng", "Bắt sao", "Đoán từ", "Nhảy dây"].map((game, index) => <button key={game} onClick={() => onAction(`Đang chuẩn bị trò chơi ${game}.`)} className="rounded-xl bg-gradient-to-br from-[#dbeafe] to-[#fce7f3] p-2 text-center"><div className="text-3xl">{["⚽", "⭐", "🔤", "🦊"][index]}</div><p className="mt-2 text-[11px] font-black">{game}</p><p className="text-[10px] font-bold text-[#6d35ff]">Chơi ngay</p></button>)}</div></Panel>;
}

function FriendsPanel({ onAction }: { onAction: (message: string) => void }) {
  return <Panel title="Bạn bè (128)" action="Xem tất cả →"><div className="grid grid-cols-5 gap-3">{["Quang Huy", "Thảo Vy", "Đức Mạnh", "Mai Trang", "Hoàng Nam"].map((name, index) => <button key={name} onClick={() => onAction(`Đã mở hồ sơ bạn bè ${name}.`)} className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#dbeafe] to-[#fde68a] text-2xl">{["👨", "👩", "👨", "👩", "👨"][index]}</div><p className="mt-2 truncate text-[11px] font-black">{name}</p><p className="text-[10px] font-bold text-[#69708b]">Level {17 + index}</p></button>)}</div><button onClick={() => onAction("Đã gửi quà thân thiện cho bạn bè.")} className="mt-4 w-full rounded-xl bg-[#6d35ff] px-4 py-3 font-black text-white">🎁 Tặng quà cho bạn bè</button></Panel>;
}

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-black">{title}</h2>
        {action && <span className="rounded-lg bg-[#f4f0ff] px-2 py-1 text-xs font-black text-[#6d35ff]">{action}</span>}
      </div>
      {children}
    </section>
  );
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="flex items-center justify-between py-2 text-sm font-bold"><span className="flex items-center gap-3 text-[#69708b]"><LegacyIcon icon={icon} label={label} tone="purple" className="h-8 w-8" size={16} />{label}</span><span className="font-black text-[#121735]">{value}</span></div>;
}

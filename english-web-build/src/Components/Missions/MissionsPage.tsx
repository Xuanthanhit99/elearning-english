"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SpiritPetAvatar from "@/src/Components/Pets/SpiritPetAvatar";
import { useAuthStore } from "@/src/store/authStore";
import { AppIcon, LegacyIcon } from "@/src/Components/UI/AppIcon";
import AppLogo from "@/src/Components/UI/AppLogo";
import { api } from "@/src/lib/axios";

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

type MissionType = "DAILY" | "WEEKLY" | "ACHIEVEMENT";
type MissionAction =
  | "STUDY_LESSON"
  | "LEARN_WORD"
  | "COMPLETE_QUIZ"
  | "CHECK_WRITING"
  | "PRACTIVE_PRONUNCIATION"
  | "LOGIN";

type MissionItem = {
  id: string;
  title: string;
  description?: string | null;
  type: MissionType;
  action: MissionAction;
  target: number;
  rewardXp: number;
  rewardCoins: number;
  userProgress: {
    progress: number;
    target: number;
    completed: boolean;
    claimed: boolean;
    periodKey: string;
  };
};

type MissionsDashboard = {
  missions: MissionItem[];
  summary: {
    missionPoints: number;
    nextChestPoints: number;
    dailyCompleted: number;
    dailyTotal: number;
    weeklyCompleted: number;
    weeklyTotal: number;
    claimableCount: number;
    claimedCount: number;
    streakDays: number;
    nextReward: { xp: number; title: string };
  };
  specialEvent: {
    title: string;
    description: string;
    progress: number;
    target: number;
    daysLeft: number;
    joined: boolean;
  };
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const tabMap = [
  { key: "all", label: "Tất cả nhiệm vụ" },
  { key: "DAILY", label: "Hằng ngày" },
  { key: "WEEKLY", label: "Hằng tuần" },
  { key: "ACHIEVEMENT", label: "Thành tựu" },
  { key: "EVENT", label: "Sự kiện" },
] as const;

const missionIcons: Record<MissionAction, string> = {
  STUDY_LESSON: "ðŸ“˜",
  LEARN_WORD: "ðŸŸ©",
  COMPLETE_QUIZ: "â˜‘",
  CHECK_WRITING: "ðŸ“",
  PRACTIVE_PRONUNCIATION: "ðŸŽ™",
  LOGIN: "ðŸ†",
};

export default function MissionsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof tabMap)[number]["key"]>("all");
  const [dashboard, setDashboard] = useState<MissionsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState("");
  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/avatar-default.png";

  async function loadMissions() {
    try {
      setLoading(true);
      const res = await api.get<MissionsDashboard | MissionItem[]>("/missions/me");
      const value = Array.isArray(res.data)
        ? normalizeLegacyMissions(res.data)
        : res.data;
      setDashboard(value);
    } catch {
      setMessage("Chưa tải được nhiệm vụ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMissions();
  }, []);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  };

  const missions = useMemo(() => dashboard?.missions || [], [dashboard?.missions]);
  const dailyMissions = useMemo(
    () => missions.filter((mission) => mission.type === "DAILY"),
    [missions],
  );
  const weeklyMissions = useMemo(
    () => missions.filter((mission) => mission.type === "WEEKLY"),
    [missions],
  );
  const filteredMissions = useMemo(() => {
    if (activeTab === "all") return missions;
    if (activeTab === "EVENT") return [];
    return missions.filter((mission) => mission.type === activeTab);
  }, [activeTab, missions]);

  async function handleMissionAction(mission: MissionItem) {
    if (mission.userProgress.completed && !mission.userProgress.claimed) {
      try {
        setClaimingId(mission.id);
        const res = await api.patch(`/missions/${mission.id}/claim`);
        const reward = res.data?.reward;
        notify(`Đã nhận thưởng: +${reward?.xp || mission.rewardXp} XP, +${reward?.coins || mission.rewardCoins} xu`);
        await loadMissions();
      } catch (error: unknown) {
        const apiError = error as ApiError;
        notify(apiError.response?.data?.message || "Chưa nhận được thưởng.");
      } finally {
        setClaimingId("");
      }
      return;
    }

    router.push(routeForMission(mission.action));
  }

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
              <MissionTabs activeTab={activeTab} onChange={setActiveTab} />
              <MissionScoreBanner summary={dashboard?.summary} />
              {loading ? (
                <MissionLoading />
              ) : activeTab === "EVENT" ? (
                <EventDetail event={dashboard?.specialEvent} onAction={() => notify("Bạn đã tham gia sự kiện.")} />
              ) : activeTab === "all" ? (
                <>
                  <DailyTaskGrid
                    missions={dailyMissions}
                    claimingId={claimingId}
                    onAction={handleMissionAction}
                    onViewAll={() => setActiveTab("DAILY")}
                  />
                  <WeeklyTasks
                    missions={weeklyMissions}
                    claimingId={claimingId}
                    onAction={handleMissionAction}
                    onViewAll={() => setActiveTab("all")}
                  />
                </>
              ) : (
                <MissionList missions={filteredMissions} claimingId={claimingId} onAction={handleMissionAction} />
              )}
            </div>
            <aside className="space-y-5">
              <PetCard />
              <TodayProgress summary={dashboard?.summary} onAction={() => setActiveTab("DAILY")} />
              <MissionStreak streakDays={dashboard?.summary?.streakDays || 0} />
              <SpecialEvent event={dashboard?.specialEvent} onAction={() => setActiveTab("EVENT")} />
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

function MissionTabs({
  activeTab,
  onChange,
}: {
  activeTab: (typeof tabMap)[number]["key"];
  onChange: (tab: (typeof tabMap)[number]["key"]) => void;
}) {
  return <div className="grid grid-cols-2 gap-2 border-b border-[#e8e9f5] text-sm font-black text-[#69708b] md:grid-cols-5">{tabMap.map((tab) => <button key={tab.key} onClick={() => onChange(tab.key)} className={`px-4 py-4 text-left ${activeTab === tab.key ? "border-b-2 border-[#6d35ff] text-[#6d35ff]" : ""}`}>{tab.label}</button>)}</div>;
}

function MissionScoreBanner({ summary }: { summary?: MissionsDashboard["summary"] }) {
  const points = summary?.missionPoints || 0;
  return <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4f20dc] via-[#6d35ff] to-[#9b5cff] p-6 text-white shadow-sm"><div className="relative z-10 grid items-center gap-5 lg:grid-cols-[190px_minmax(0,1fr)_220px]"><div><p className="font-black">Điểm nhiệm vụ</p><div className="mt-3 text-4xl font-black">{points} ⭐</div><p className="mt-4 text-sm font-bold text-white/85">Còn {summary?.nextChestPoints ?? 200} điểm để nhận rương bạc</p></div><div className="flex items-center justify-between gap-3 text-center text-sm font-black"><Reward done={points >= 20} label="20" /><Reward icon="🧰" done={points >= 200} label="200" /><Reward icon="🧰" done={points >= 400} label="400" /><Reward icon="🎁" done={points >= 800} label="800" /></div><div className="hidden justify-end lg:flex"><SpiritPetAvatar petType="fox" level={18} size="lg" showLevelBadge={false} /></div></div></section>;
}

function Reward({ icon = "✓", label, done = false }: { icon?: string; label: string; done?: boolean }) {
  return <div className="min-w-0 flex-1"><div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${done ? "bg-emerald-400" : "bg-white/20"}`}><LegacyIcon icon={icon} label={label} tone={done ? "emerald" : "yellow"} size={18} /></div><p className="mt-2 inline-flex items-center justify-center gap-1"><AppIcon name="star" tone="yellow" size={14} bare /> {label}</p></div>;
}

function DailyTaskGrid({ missions, claimingId, onAction, onViewAll }: { missions: MissionItem[]; claimingId: string; onAction: (mission: MissionItem) => void; onViewAll: () => void }) {
  return <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Nhiệm vụ hằng ngày <span className="text-xs text-[#69708b]">⏱ Cập nhật theo ngày</span></h2><button type="button" onClick={onViewAll} className="text-sm font-black text-[#6d35ff]">Xem tất cả →</button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{missions.map((mission) => <MissionCard key={mission.id} mission={mission} claiming={claimingId === mission.id} onAction={onAction} />)}</div>{!missions.length && <EmptyMissions />}</section>;
}

function WeeklyTasks({ missions, claimingId, onAction, onViewAll }: { missions: MissionItem[]; claimingId: string; onAction: (mission: MissionItem) => void; onViewAll: () => void }) {
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><h2 className="text-xl font-black">Nhiệm vụ hằng tuần</h2><span className="text-xs font-bold text-[#69708b]">⏱ Cập nhật theo tuần</span></div>{missions.map((mission) => <MissionRow key={mission.id} mission={mission} claiming={claimingId === mission.id} onAction={onAction} />)}{!missions.length && <EmptyMissions />}<button type="button" onClick={onViewAll} className="mt-4 w-full text-center font-black text-[#6d35ff]">Xem tất cả nhiệm vụ →</button></section>;
}

function MissionCard({ mission, claiming, onAction }: { mission: MissionItem; claiming: boolean; onAction: (mission: MissionItem) => void }) {
  const progress = progressPercent(mission);
  const done = mission.userProgress.completed;
  return <article className="rounded-2xl border border-[#e8e9f5] bg-white p-5 text-center shadow-sm"><LegacyIcon icon={missionIcons[mission.action] || "✣"} label={mission.title} tone={done ? "emerald" : "purple"} className="mx-auto h-16 w-16" size={30} /><h3 className="mt-4 min-h-10 text-sm font-black">{mission.title}</h3><p className="text-sm font-bold">{mission.userProgress.progress} / {mission.target}</p><div className="mt-2 h-1.5 rounded-full bg-[#e6e8f2]"><div className={`h-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-[#6d35ff]"}`} style={{ width: `${progress}%` }} /></div><div className="mt-4 flex justify-between text-sm font-black"><span className="text-emerald-600">+{mission.rewardXp} XP</span><span className="inline-flex items-center gap-1 text-amber-500"><AppIcon name="coin" tone="yellow" size={14} bare /> {mission.rewardCoins}</span></div><button disabled={claiming || mission.userProgress.claimed} onClick={() => onAction(mission)} className={`mt-4 w-full rounded-xl px-3 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-70 ${done && !mission.userProgress.claimed ? "bg-emerald-600" : "bg-[#6d35ff]"}`}>{claiming ? "Đang nhận..." : mission.userProgress.claimed ? "Đã nhận" : done ? "Nhận thưởng" : actionLabel(mission.action)}</button></article>;
}

function MissionRow({ mission, claiming, onAction }: { mission: MissionItem; claiming: boolean; onAction: (mission: MissionItem) => void }) {
  const progress = progressPercent(mission);
  const done = mission.userProgress.completed;
  return <div className="grid gap-4 border-b border-[#eef0f6] py-4 last:border-b-0 md:grid-cols-[70px_minmax(0,1fr)_180px_90px_90px_120px] md:items-center"><LegacyIcon icon={missionIcons[mission.action] || "✣"} label={mission.title} tone={done ? "emerald" : "yellow"} className="h-14 w-14" size={28} /><div><h3 className="font-black">{mission.title}</h3><p className="mt-1 text-xs font-bold text-[#69708b]">{mission.description || "Hoàn thành nhiệm vụ để nhận thưởng."}</p></div><div><div className="h-1.5 rounded-full bg-[#e6e8f2]"><div className={`h-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-[#6d35ff]"}`} style={{ width: `${progress}%` }} /></div></div><p className="text-sm font-black">{mission.userProgress.progress} / {mission.target}</p><p className="inline-flex items-center gap-3 text-sm font-black text-emerald-600">+{mission.rewardXp} XP <span className="inline-flex items-center gap-1 text-amber-500"><AppIcon name="coin" tone="yellow" size={14} bare /> {mission.rewardCoins}</span></p><button disabled={claiming || mission.userProgress.claimed} onClick={() => onAction(mission)} className={`rounded-xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-70 ${done && !mission.userProgress.claimed ? "bg-emerald-100 text-emerald-700" : "bg-[#6d35ff] text-white"}`}>{claiming ? "Đang nhận..." : mission.userProgress.claimed ? "Đã nhận" : done ? "Nhận thưởng" : actionLabel(mission.action)}</button></div>;
}

function MissionList({ missions, claimingId, onAction }: { missions: MissionItem[]; claimingId: string; onAction: (mission: MissionItem) => void }) {
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm">{missions.map((mission) => <MissionRow key={mission.id} mission={mission} claiming={claimingId === mission.id} onAction={onAction} />)}{!missions.length && <EmptyMissions />}</section>;
}

function MissionLoading() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-white" />)}</div>;
}

function EmptyMissions() {
  return <div className="rounded-2xl border border-dashed border-[#dfe2f3] bg-white p-8 text-center font-bold text-[#69708b]">Chưa có nhiệm vụ trong mục này.</div>;
}

function PetCard() {
  return <section className="relative overflow-hidden rounded-2xl border border-[#e8e9f5] bg-gradient-to-br from-[#f6f0ff] to-[#ffe9d5] p-5 shadow-sm"><h2 className="font-black">Linh thú của bạn</h2><div className="mt-4 flex justify-center"><SpiritPetAvatar petType="fox" level={18} size="lg" showLevelBadge={false} /></div><div className="mt-4 rounded-2xl bg-white/90 p-4 text-sm font-bold text-[#303956] shadow-sm">Cùng hoàn thành nhiệm vụ để mình mau lớn nhé! 🏆</div></section>;
}

function TodayProgress({ summary, onAction }: { summary?: MissionsDashboard["summary"]; onAction: () => void }) {
  const done = summary?.dailyCompleted || 0;
  const total = summary?.dailyTotal || 0;
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm"><h2 className="font-black">Nhiệm vụ ngày hôm nay</h2><div className="mt-5 grid grid-cols-2 items-center gap-5"><div className="flex h-32 w-32 items-center justify-center rounded-full border-[12px] border-[#6d35ff] border-b-emerald-500"><div className="text-center"><div className="text-2xl font-black">{done}/{total || 0}</div><p className="text-xs font-bold text-[#69708b]">Đã hoàn thành</p></div></div><div className="text-center"><div className="text-6xl">🧰</div><p className="mt-2 text-sm font-bold text-[#69708b]">{summary?.nextReward.title || "Rương đồng"}</p><p className="font-black text-emerald-600">+{summary?.nextReward.xp || 50} XP</p></div></div><button onClick={onAction} className="mt-5 w-full rounded-xl bg-[#6d35ff] px-4 py-3 font-black text-white">Xem chi tiết</button></section>;
}

function MissionStreak({ streakDays }: { streakDays: number }) {
  const days = Array.from({ length: 7 }, (_, index) => Math.max(1, streakDays - 3 + index));
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm"><h2 className="font-black">Chuỗi nhiệm vụ</h2><p className="mt-2 text-sm font-bold text-[#69708b]">{streakDays} ngày liên tiếp 🔥</p><div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-black">{days.map((day) => <div key={day} className={`rounded-2xl p-2 ${day === streakDays ? "bg-[#fff0ed] text-red-500" : day < streakDays ? "bg-[#f0fdf4] text-emerald-600" : "bg-[#f4f4f7] text-[#9aa1b8]"}`}><div className="text-2xl">{day <= streakDays ? "🏅" : "🔒"}</div><p>{day}</p></div>)}</div></section>;
}

function SpecialEvent({ event, onAction }: { event?: MissionsDashboard["specialEvent"]; onAction: () => void }) {
  const progress = event ? Math.min(100, Math.round((event.progress / event.target) * 100)) : 0;
  return <section className="rounded-2xl border border-[#ffe2bf] bg-gradient-to-br from-[#fff8ed] to-[#edf7ff] p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black">Sự kiện đặc biệt</h2><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-600">⏱ Còn {event?.daysLeft || 3} ngày</span></div><h3 className="mt-5 text-lg font-black">{event?.title || "Thử thách học tập mùa hè"}</h3><p className="mt-2 text-sm font-bold text-[#69708b]">{event?.description || "Hoàn thành nhiệm vụ để nhận trang bị hiếm cho Foxy!"}</p><div className="mt-4 flex items-end justify-between"><div className="flex-1"><div className="h-2 rounded-full bg-[#e6e8f2]"><div className="h-2 rounded-full bg-[#6d35ff]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-sm font-black">{event?.progress || 0} / {event?.target || 1000}</p><button onClick={onAction} className="mt-4 rounded-xl bg-[#6d35ff] px-6 py-3 font-black text-white">{event?.joined ? "Xem sự kiện" : "Tham gia ngay"}</button></div><SpiritPetAvatar petType="fox" level={30} size="md" showLevelBadge={false} /></div></section>;
}

function EventDetail({ event, onAction }: { event?: MissionsDashboard["specialEvent"]; onAction: () => void }) {
  const progress = event ? Math.min(100, Math.round((event.progress / event.target) * 100)) : 0;
  return <section className="rounded-2xl border border-[#ffe2bf] bg-white p-6 shadow-sm"><div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center"><div><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-600">Còn {event?.daysLeft || 3} ngày</span><h2 className="mt-4 text-2xl font-black">{event?.title || "Thử thách học tập mùa hè"}</h2><p className="mt-2 font-bold text-[#69708b]">{event?.description || "Hoàn thành nhiệm vụ để nhận trang bị hiếm cho Foxy!"}</p><div className="mt-6 h-3 rounded-full bg-[#e6e8f2]"><div className="h-3 rounded-full bg-[#6d35ff]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-sm font-black">{event?.progress || 0} / {event?.target || 1000} điểm sự kiện</p><button onClick={onAction} className="mt-6 rounded-xl bg-[#6d35ff] px-6 py-3 font-black text-white">{event?.joined ? "Đã tham gia" : "Tham gia ngay"}</button></div><div className="flex justify-center"><SpiritPetAvatar petType="fox" level={30} size="lg" showLevelBadge={false} /></div></div></section>;
}

function progressPercent(mission: MissionItem) {
  const target = mission.target || mission.userProgress.target || 1;
  return Math.min(100, Math.round(((mission.userProgress.progress || 0) / target) * 100));
}

function actionLabel(action: MissionAction) {
  const labels: Record<MissionAction, string> = {
    STUDY_LESSON: "Đến học",
    LEARN_WORD: "Học ngay",
    COMPLETE_QUIZ: "Làm ngay",
    CHECK_WRITING: "Viết ngay",
    PRACTIVE_PRONUNCIATION: "Đến luyện",
    LOGIN: "Tiếp tục",
  };
  return labels[action] || "Làm ngay";
}

function routeForMission(action: MissionAction) {
  const routes: Record<MissionAction, string> = {
    STUDY_LESSON: "/courses",
    LEARN_WORD: "/vocabulary",
    COMPLETE_QUIZ: "/vocabulary/test",
    CHECK_WRITING: "/check-writing",
    PRACTIVE_PRONUNCIATION: "/speaking",
    LOGIN: "/",
  };
  return routes[action] || "/";
}

function normalizeLegacyMissions(missions: MissionItem[]): MissionsDashboard {
  const daily = missions.filter((mission) => mission.type === "DAILY");
  const weekly = missions.filter((mission) => mission.type === "WEEKLY");
  const missionPoints = missions.reduce((sum, mission) => sum + Math.min(mission.userProgress.progress || 0, mission.target || 1), 0);
  return {
    missions,
    summary: {
      missionPoints,
      nextChestPoints: Math.max(0, 200 - missionPoints),
      dailyCompleted: daily.filter((mission) => mission.userProgress.completed).length,
      dailyTotal: daily.length,
      weeklyCompleted: weekly.filter((mission) => mission.userProgress.completed).length,
      weeklyTotal: weekly.length,
      claimableCount: missions.filter((mission) => mission.userProgress.completed && !mission.userProgress.claimed).length,
      claimedCount: missions.filter((mission) => mission.userProgress.claimed).length,
      streakDays: 0,
      nextReward: { xp: 50, title: "Rương đồng" },
    },
    specialEvent: {
      title: "Thử thách học tập mùa hè",
      description: "Hoàn thành nhiệm vụ để nhận trang bị hiếm cho Foxy!",
      progress: missionPoints,
      target: 1000,
      daysLeft: 3,
      joined: true,
    },
  };
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import SpiritPetAvatar from "@/src/Components/Pets/SpiritPetAvatar";
import { AppIcon, LegacyIcon } from "@/src/Components/UI/AppIcon";
import AppLogo from "@/src/Components/UI/AppLogo";
import { useTranslation } from "@/src/hooks/useTranslation";
import { Dictionary } from "@/src/i18n/types";

type Course = {
  id?: string;
  title: string;
  slug?: string;
  description?: string;
  thumbnail?: string;
  level?: string;
  price?: number;
};

type ArenaProfile = {
  mmr?: number;
  arenaPoint?: number;
  gold?: number;
  winRate?: number;
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
};

const fallbackCourses: Course[] = [
  { title: "English for Beginners", description: "Cho người mới bắt đầu", level: "Cơ bản", price: 299000 },
  { title: "Giao tiếp tự tin", description: "Nói tiếng Anh tự nhiên", level: "Giao tiếp", price: 299000 },
  { title: "IELTS 6.5+", description: "Lộ trình từ 0 đến 6.5+", level: "IELTS", price: 799000 },
  { title: "Phát âm chuẩn", description: "Nói chuẩn như người bản xứ", level: "Phát âm", price: 199000 },
  { title: "TOEIC 700+", description: "Chiến lược đạt 700+", level: "TOEIC", price: 599000 },
];

function buildSidebarItems(home: Dictionary["home"]) {
  return [
    { icon: "⌂", label: home.navHome, href: "/" },
    { icon: "▰", label: home.navLearn, href: "/courses" },
    { icon: "⚔", label: home.navArena, href: "/arena" },
    { icon: "🤖", label: home.navAiTutor, href: "/check-writing", badge: "AI" },
    { icon: "▣", label: home.sidebarFreeCheck, href: "/check-word", badge: "FREE" },
    { icon: "◇", label: home.navLibrary, href: "/courses" },
    { icon: "●", label: home.navCommunity, href: "/community" },
    { icon: "▣", label: home.sidebarCourses, href: "/courses" },
    { icon: "◈", label: home.navShop, href: "/pet" },
  ];
}

function buildPersonalSidebarItems(home: Dictionary["home"]) {
  return [
    { icon: "●", label: home.sidebarProfile, href: "/profile" },
    { icon: "🏆", label: home.sidebarAchievements, href: "/profile" },
    { icon: "🐾", label: home.sidebarFriends, href: "/community" },
    { icon: "⚙", label: home.sidebarSettings, href: "/profile" },
    { icon: "◐", label: home.sidebarChangeTheme, href: "/profile" },
  ];
}

function buildFeatures(home: Dictionary["home"]) {
  const hrefs = ["/vocabulary", "/courses", "/pronunciation", "/check-writing", "/arena", "/check-writing"];
  const icons = ["📖", "🎧", "🎙", "📝", "⚔", "🤖"];
  return home.features.map((item, index) => ({
    icon: icons[index],
    title: item.title,
    desc: item.desc,
    href: hrefs[index],
  }));
}

function buildTools(home: Dictionary["home"]) {
  const hrefs = ["/check-word", "/check-writing", "/check-word", "/check-word"];
  const icons = ["🔤", "📄", "🔁", "🧾"];
  return home.tools.map((item, index) => ({
    icon: icons[index],
    title: item.title,
    desc: item.desc,
    href: hrefs[index],
  }));
}

export default function HomePage() {
  const { t, dict } = useTranslation();
  const home = dict.home;
  const user = useAuthStore((state) => state.user);
  const [courses, setCourses] = useState<Course[]>(fallbackCourses);
  const [arenaProfile, setArenaProfile] = useState<ArenaProfile | null>(null);
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [novaOpen, setNovaOpen] = useState(false);
  const sidebarItems = useMemo(() => buildSidebarItems(home), [home]);
  const personalSidebarItems = useMemo(() => buildPersonalSidebarItems(home), [home]);
  const [activeSidebar, setActiveSidebar] = useState(sidebarItems[0].label);
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    const loadDashboard = async () => {
      const [courseRes, arenaRes, petRes] = await Promise.allSettled([
        api.get("/courses/public/list"),
        api.get("/arena/lobby"),
        api.get("/pets/me"),
      ]);

      if (courseRes.status === "fulfilled" && Array.isArray(courseRes.value.data) && courseRes.value.data.length) {
        setCourses(courseRes.value.data.slice(0, 5));
      }

      if (arenaRes.status === "fulfilled") {
        setArenaProfile(arenaRes.value.data?.profile || null);
      }

      if (petRes.status === "fulfilled") {
        setPet(petRes.value.data?.pet || petRes.value.data || null);
      }
    };

    loadDashboard();
  }, []);


  const displayName = user?.fullname || t("header.defaultUser");
  const level = pet?.level || arenaProfile?.level || 18;
  const xpToday = arenaProfile?.arenaPoint || pet?.xp || 2450;
  const streak = arenaProfile?.winStreak || 18;
  const gems = arenaProfile?.gold || 5230;
  const coins = pet?.coins || arenaProfile?.arenaPoint || 2450;
  const rank = arenaProfile?.mmr ? Math.max(1, Math.round(3000 - arenaProfile.mmr)) : 48;
  const petType = pet?.petType || "fox";
  const courseCards = useMemo(() => courses.slice(0, 5), [courses]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f7ff] text-[#101733]">
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <aside className="sticky top-0 hidden h-screen w-[238px] shrink-0 overflow-y-auto border-r border-[#e7e8f3] bg-white px-3.5 py-5 2xl:block">
          <Brand />
          <nav className="mt-7 space-y-1">
            {sidebarItems.map((item) => (
              <SidebarLink
                key={item.label}
                item={item}
                active={activeSidebar === item.label}
                onSelect={() => setActiveSidebar(item.label)}
              />
            ))}
          </nav>

          {isLoggedIn && (
            <nav className="mt-6 space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wide text-[#8b91aa]">{home.personalLabel}</p>
              {personalSidebarItems.map((item) => (
                <SidebarLink
                  key={item.label}
                  item={item}
                  active={activeSidebar === item.label}
                  onSelect={() => setActiveSidebar(item.label)}
                />
              ))}
            </nav>
          )}

          <section className="mt-5 rounded-2xl bg-[#f4f0ff] p-3.5">
            <div className="text-xl">👑</div>
            <h3 className="mt-1.5 text-sm font-black text-[#652cff]">{home.premiumTitle}</h3>
            {home.premiumFeatures.map((item) => (
              <p key={item} className="mt-2 text-[11px] font-bold text-[#555d78]">✓ {item}</p>
            ))}
            <button className="mt-3 w-full rounded-xl bg-[#6d35ff] px-3 py-2.5 text-xs font-black text-white shadow-[0_12px_24px_rgba(109,53,255,0.24)]">{home.premiumCta}</button>
          </section>

          <section className="mt-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#ececf7]">
            <div className="flex items-center gap-2.5">
              <SpiritPetAvatar petType={petType} level={level} size="sm" showLevelBadge={false} />
              <div className="min-w-0">
                <h3 className="text-xs font-black">{home.foxyTitle}</h3>
                <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#69708b]">{home.foxySubtitle}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-[#e4e6f2]">
                    <div className="h-1.5 w-2/3 rounded-full bg-[#6d35ff]" />
                  </div>
                  <span className="text-[10px] font-black text-[#69708b]">450 / 500 XP</span>
                </div>
              </div>
            </div>
          </section>
        </aside>

        <section className="min-w-0 flex-1">
          {/* <header className="sticky top-0 z-40 border-b border-[#e7e8f3] bg-white/90 px-4 py-2.5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="2xl:hidden">
                <Brand compact />
              </div>
              <nav className="hidden flex-1 items-center justify-center gap-1.5 xl:flex">
                {topNav.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#303956] hover:bg-[#f5f2ff]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-2">
                <TopPill icon="🔥" value={streak} label="Streak" />
                <TopPill icon="💎" value={gems.toLocaleString("vi-VN")} label="Xu" />
                <TopPill icon="🪙" value={coins.toLocaleString("vi-VN")} label="Coins" />
                <button className="hidden rounded-xl border border-[#e5e7f2] bg-white px-3 py-2 text-xs font-black sm:block">🌐 VI</button>
                {isLoggedIn && (
                  <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7f2] bg-white text-sm">
                    🔔
                    <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">3</span>
                  </button>
                )}
                {isLoggedIn ? (
                  <Link href="/profile" className="hidden items-center gap-2 rounded-2xl px-2 py-1.5 transition hover:bg-[#f5f2ff] sm:flex">
                    <img src={user?.avatar || "/cat-home.jpg"} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
                    <div className="hidden leading-tight sm:block">
                      <p className="text-[13px] font-black">{displayName}</p>
                      <p className="text-[11px] font-bold text-[#69708b]">Level {level}</p>
                    </div>
                  </Link>
                ) : (
                  <Link href="/auth" className="rounded-xl bg-[#6d35ff] px-4 py-2.5 text-sm font-black text-white shadow-[0_10px_22px_rgba(109,53,255,0.22)]">
                    Đăng nhập
                  </Link>
                )}
              </div>
            </div>
          </header> */}

          <div className="grid gap-4 p-4 lg:p-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5">
              <HeroBanner level={level} streak={streak} xpToday={xpToday} rank={rank} />
              <FeatureGrid />
              <ToolsGrid />
              <CoursesGrid courses={courseCards} />
            </div>

            <aside className="grid gap-4 md:grid-cols-2 2xl:block 2xl:space-y-4">
              <DailyTasks />
              <RecentArena displayName={displayName} avatar={user?.avatar} level={level} />
              <CommunityPosts />
            </aside>
          </div>

          <WhyStudyArena />
        </section>
      </div>

      <NovaToggle
        open={novaOpen}
        setOpen={setNovaOpen}
        displayName={displayName}
        petType={petType}
        level={level}
      />
    </main>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <AppLogo compact={compact} className={compact ? "h-10" : "h-39"} />;
}

function TopPill({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="hidden items-center gap-2 rounded-xl border border-[#e8e9f5] bg-white px-3 py-2 shadow-sm lg:flex">
      <LegacyIcon icon={icon} label={label} tone={label === "Streak" ? "orange" : label === "Xu" ? "cyan" : "yellow"} size={16} />
      <span className="leading-tight">
        <span className="block text-xs font-black">{value}</span>
        <span className="block text-[10px] font-bold text-[#69708b]">{label}</span>
      </span>
    </div>
  );
}

function HeroBanner({ level, streak, xpToday, rank }: { level: number; streak: number; xpToday: number; rank: number }) {
  const { dict } = useTranslation();
  const home = dict.home;
  const createRoom = async () => {
    try {
      await api.post("/auth/jobs/generate-weekly-pool");
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#dbe6ff] bg-white shadow-[0_18px_42px_rgba(82,91,220,0.16)]">
      <div className="relative aspect-[16/11] bg-[#78c8ff] sm:aspect-[16/7] xl:aspect-[21/8]">
        <img
          src="/home-english-adventure-banner.png"
          alt="Learn English Adventure"
          className="absolute inset-0 h-full w-full object-cover object-[43%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#101733]/45" />

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-3 p-3 sm:p-5">
          <div className="contents">
            <div className="max-w-[260px] rounded-2xl bg-white/90 px-4 py-3 text-[#101733] shadow-[0_16px_34px_rgba(16,23,51,0.18)] backdrop-blur sm:max-w-md sm:px-5 sm:py-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#6d35ff]">PoppyLingo</p>
              <h1 className="mt-1 text-lg font-black leading-tight sm:text-2xl">{home.heroBrandLine}</h1>
              <p className="mt-1 hidden text-sm font-bold leading-5 text-[#69708b] sm:block">
                {home.heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link href="/courses" className="rounded-xl bg-[#6d35ff] px-4 py-3 text-xs font-black text-white shadow-lg sm:px-5 sm:text-sm">
                {home.heroCtaStart}
              </Link>
              <Link href="/arena" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-[#652cff] shadow-lg sm:px-5 sm:text-sm">
                <AppIcon name="arena" tone="purple" size={18} bare /> {home.heroCtaArena}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <button type="button" onClick={createRoom} className="sr-only">
        {home.heroCreateRoom}
      </button>

      <div className="relative z-10 grid gap-2 bg-white p-3 text-[#101733] sm:grid-cols-2 sm:p-4 xl:grid-cols-4">
        <HeroStat icon="check" label={`Level ${level}`} value={`${Math.min(3000, xpToday).toLocaleString("vi-VN")} / 3,000 XP`} />
        <HeroStat icon="fire" label={String(streak)} value={home.heroStreakLabel} />
        <HeroStat icon="star" label={xpToday.toLocaleString("vi-VN")} value={home.heroXpTodayLabel} />
        <HeroStat icon="trophy" label={`Top ${rank}`} value={home.heroRankLabel} />
      </div>
    </section>
  );
}

function SidebarLink({
  item,
  active,
  onSelect,
}: {
  item: {
    icon: string;
    label: string;
    href: string;
    badge?: string;
  };
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black transition ${
        active ? "bg-[#efe9ff] text-[#652cff]" : "text-[#69708b] hover:bg-[#f5f2ff] hover:text-[#652cff]"
      }`}
    >
      <LegacyIcon icon={item.icon} label={item.label} tone={active ? "purple" : "slate"} className="h-8 w-8" size={16} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${item.badge === "FREE" ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#efe9ff] text-[#652cff]"}`}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// NOTE: not currently rendered anywhere (HomePage uses HeroBanner instead) — kept in sync anyway.
function Hero({ level, streak, xpToday, rank }: { level: number; streak: number; xpToday: number; rank: number }) {
    const { dict } = useTranslation();
    const home = dict.home;
    const createRoom = async () => {
    try {
      await api.post("/auth/jobs/generate-weekly-pool");
    } catch (error: any) {
      console.error(error);
    } finally {
    }
  };
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4d62df] via-[#7378ef] to-[#aad8ff] p-5 text-white shadow-[0_20px_50px_rgba(82,91,220,0.22)] sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_20%,rgba(255,255,255,0.35),transparent_26%),radial-gradient(circle_at_78%_48%,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative z-10 grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_330px]">
        <div>
          <h1 className="max-w-xl text-4xl font-black leading-tight sm:text-5xl">{home.heroTitle}</h1>
          <p className="mt-5 max-w-lg text-base font-bold leading-7 text-white/90 sm:text-lg">{home.heroSubtitle}</p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Link href="/courses" className="rounded-xl bg-[#6d35ff] px-6 py-4 font-black text-white shadow-lg">{home.heroCtaStart}</Link>
            <Link href="/arena" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-4 font-black text-[#652cff] shadow-lg"><AppIcon name="arena" tone="purple" size={18} bare /> {home.heroCtaArena}</Link>
          </div>
        </div>
        <div className="hidden items-center justify-center md:flex">
          <div className="relative">
            <div className="absolute inset-4 rounded-full bg-white/30 blur-3xl" />
            <div className="relative text-[170px] drop-shadow-2xl xl:text-[210px]" onClick={createRoom}>
              🦊
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-5 grid gap-3 rounded-2xl bg-white/95 p-4 text-[#101733] shadow-xl sm:grid-cols-2 xl:grid-cols-4">
        <HeroStat icon="check" label={`Level ${level}`} value={`${Math.min(3000, xpToday).toLocaleString("vi-VN")} / 3,000 XP`} />
        <HeroStat icon="fire" label={String(streak)} value={home.heroStreakLabel} />
        <HeroStat icon="star" label={xpToday.toLocaleString("vi-VN")} value={home.heroXpTodayLabel} />
        <HeroStat icon="trophy" label={`Top ${rank}`} value={home.heroRankLabel} />
      </div>
    </section>
  );
}

function HeroStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-2">
      <LegacyIcon icon={icon} label={value} tone={icon === "fire" ? "orange" : icon === "star" || icon === "trophy" ? "yellow" : "purple"} size={18} />
      <div>
        <p className="text-lg font-black">{label}</p>
        <p className="text-xs font-bold text-[#69708b]">{value}</p>
      </div>
    </div>
  );
}

function FeatureGrid() {
  const { dict } = useTranslation();
  const home = dict.home;
  const features = useMemo(() => buildFeatures(home), [home]);
  return (
    <section className="space-y-3">
      <SectionTitle title={home.featuresTitle} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {features.map((item) => (
          <Link key={item.title} href={item.href} className="rounded-2xl border border-[#e8e9f5] bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <LegacyIcon icon={item.icon} label={item.title} tone="purple" className="mx-auto mb-3 h-12 w-12" size={22} />
            <h3 className="font-black">{item.title}</h3>
            <p className="mt-1 text-xs font-bold text-[#69708b]">{item.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ToolsGrid() {
  const { dict } = useTranslation();
  const home = dict.home;
  const tools = useMemo(() => buildTools(home), [home]);
  return (
    <section className="space-y-3">
      <SectionTitle title={home.toolsTitle} link="/check-word" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tools.map((item) => (
          <Link key={item.title} href={item.href} className="flex items-center gap-4 rounded-2xl border border-[#e8e9f5] bg-white p-4 shadow-sm">
            <LegacyIcon icon={item.icon} label={item.title} tone="blue" className="h-12 w-12" size={22} />
            <span className="min-w-0 flex-1">
              <span className="block font-black">{item.title}</span>
              <span className="block text-xs font-bold text-[#69708b]">{item.desc}</span>
            </span>
            <span className="rounded-lg bg-[#dcfce7] px-2 py-1 text-[10px] font-black text-[#16a34a]">{home.freeBadge}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CoursesGrid({ courses }: { courses: Course[] }) {
  const { dict } = useTranslation();
  const home = dict.home;
  return (
    <section className="space-y-3">
      <SectionTitle title={home.coursesTitle} link="/courses" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {courses.map((course, index) => (
          <Link key={course.id || course.title} href={course.slug ? `/courses/${course.slug}` : "/courses"} className="overflow-hidden rounded-2xl border border-[#e8e9f5] bg-white shadow-sm">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} className="h-24 w-full object-cover" />
            ) : (
              <div className={`h-24 bg-gradient-to-br ${["from-emerald-200 to-sky-200", "from-orange-200 to-amber-100", "from-blue-200 to-violet-200", "from-pink-200 to-purple-200", "from-red-200 to-orange-200"][index % 5]} p-3`}>
                <span className="rounded-lg bg-white/80 px-2 py-1 text-xs font-black text-[#652cff]">{course.level || home.courseFallbackLevel}</span>
              </div>
            )}
            <div className="p-4">
              <h3 className="line-clamp-1 font-black">{course.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs font-bold text-[#69708b]">{course.description || home.courseFallbackDesc}</p>
              <div className="mt-3 flex items-center justify-between text-sm font-black">
                <span className="text-amber-500">★ 4.9</span>
                <span className="text-[#652cff]">{course.price ? `${course.price.toLocaleString("vi-VN")}đ` : home.freeBadge}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DailyTasks() {
  const { dict } = useTranslation();
  const home = dict.home;
  return (
    <Panel title={home.dailyTasksTitle} action={home.viewAll}>
      <Task icon="🔥" title={home.dailyTasks[0]} progress="7 / 10" reward="50" width="70%" />
      <Task icon="🎧" title={home.dailyTasks[1]} progress="2 / 3" reward="40" width="66%" />
      <Task icon="⚔" title={home.dailyTasks[2]} progress="0 / 1" reward="60" width="8%" />
    </Panel>
  );
}

function RecentArena({ displayName, avatar, level }: { displayName: string; avatar?: string; level: number }) {
  const { dict } = useTranslation();
  const home = dict.home;
  return (
    <Panel title={home.recentArenaTitle} action={home.viewAll}>
      <div className="flex items-center justify-between rounded-2xl bg-[#fafbff] p-3">
        <Player name={displayName} level={level} avatar={avatar} />
        <div className="px-2 text-center">
          <div className="text-2xl font-black"><span className="text-emerald-600">15</span> : <span className="text-red-500">8</span></div>
          <p className="text-xs font-black text-emerald-600">{home.winLabel}</p>
        </div>
        <Player name="Quang Huy" level={17} />
      </div>
    </Panel>
  );
}

function CommunityPosts() {
  const { dict } = useTranslation();
  const home = dict.home;
  return (
    <Panel title={home.communityPostsTitle}>
      {home.communityPosts.map((title, index) => (
        <div key={title} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-[#fafbff]">
          <div className="h-10 w-14 rounded-xl bg-gradient-to-br from-[#dbeafe] to-[#fce7f3]" />
          <div className="min-w-0">
            <h4 className="line-clamp-1 text-xs font-black">{title}</h4>
            <p className="text-[11px] font-bold text-[#69708b]">{["Mai Trang", "Huy Hoàng", "Thanh Vân"][index]} · {["1.2K", "2.3K", "981"][index]}</p>
          </div>
        </div>
      ))}
    </Panel>
  );
}

function WhyStudyArena() {
  const { dict } = useTranslation();
  const home = dict.home;
  const icons = ["book", "spark", "ai", "team", "gift"];
  const tones = [
    "bg-[#efe9ff] text-[#6d35ff]",
    "bg-[#efe9ff] text-[#6d35ff]",
    "bg-[#eaf2ff] text-[#2f80ff]",
    "bg-[#efe9ff] text-[#6d35ff]",
    "bg-[#fff0f4] text-[#ff477d]",
  ];
  const items = home.whyItems.map((item, index) => ({
    icon: icons[index],
    tone: tones[index],
    title: item.title,
    desc: item.desc,
  }));
  const avatars = ["👩🏻", "👨🏻", "👩🏽", "👨🏽", "👩🏼"];

  return (
    <section className="mx-4 mb-5 grid gap-4 lg:mx-5 xl:grid-cols-[minmax(0,1fr)_500px]">
      <div className="rounded-2xl border border-[#e8e9f5] bg-white px-5 py-4 shadow-sm">
        <h2 className="mb-3 text-[15px] font-black leading-5 text-[#171b3f]">{home.whyTitle}</h2>
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {items.map((item) => (
            <div key={item.title} className="flex min-w-0 items-start gap-2.5">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ${item.tone}`}>
                <WhyIcon name={item.icon} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[12px] font-black leading-4 text-[#171b3f]">{item.title}</h3>
                <p className="mt-0.5 text-[10px] font-bold leading-[15px] text-[#69708b]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#e8e9f5] bg-gradient-to-r from-[#f4f0ff] via-white to-[#f7f4ff] px-5 py-4 shadow-sm">
        <span className="absolute right-20 top-3 h-5 w-10 rounded-full bg-[#e8ddff]" />
        <span className="absolute right-9 top-7 h-3 w-6 rounded-full bg-[#efe8ff]" />
        <div className="relative z-10 flex min-h-[104px] items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="max-w-[230px] text-[15px] font-black leading-5 text-[#171b3f]">{home.whyCommunityTitle}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex -space-x-2">
                {avatars.map((avatar, index) => (
                  <span key={`${avatar}-${index}`} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#eef2ff] to-[#ffe4e6] text-[15px] shadow-sm">
                    {avatar}
                    <span className="sr-only">{home.learnerSr.replace("{n}", String(index + 1))}</span>
                  </span>
                ))}
              </div>
              <Link href="/community" className="shrink-0 rounded-xl bg-[#6d35ff] px-5 py-2.5 text-xs font-black text-white shadow-[0_12px_24px_rgba(109,53,255,0.25)]">
                {home.whyJoinNow}
              </Link>
            </div>
          </div>
          <div className="hidden shrink-0 items-end sm:flex">
            <span className="text-[70px] leading-none drop-shadow-xl">🦊</span>
            <span className="-ml-5 text-[76px] leading-none drop-shadow-xl">🤖</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyIcon({ name }: { name: string }) {
  const common = "h-5 w-5";

  if (name === "book") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 5.5c2.7-.8 4.8-.4 7 1.2v12c-2.2-1.6-4.3-2-7-1.2z" />
        <path d="M19 5.5c-2.7-.8-4.8-.4-7 1.2v12c2.2-1.6 4.3-2 7-1.2z" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="17" r="2.5" />
        <circle cx="17" cy="7" r="2.5" />
        <circle cx="17" cy="17" r="2.5" />
        <path d="M8 15.5 15 8.5M8.5 17H14.5" />
      </svg>
    );
  }

  if (name === "ai") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4a6 6 0 0 0-4 10.5V17h8v-2.5A6 6 0 0 0 12 4Z" />
        <path d="M9 20h6M10 10h.01M14 10h.01" />
      </svg>
    );
  }

  if (name === "team") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="3" />
        <circle cx="17" cy="10" r="2.4" />
        <path d="M3.5 19c.8-3.2 2.7-5 5.5-5s4.7 1.8 5.5 5" />
        <path d="M14.5 18.5c.7-2.1 2-3.2 4-3.2 1.2 0 2.1.4 2.8 1.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11h16v9H4zM3 7h18v4H3z" />
      <path d="M12 7v13M12 7c-2.7 0-4.5-1-4.5-2.5C7.5 3.7 8.2 3 9 3c1.5 0 2.4 1.7 3 4Z" />
      <path d="M12 7c2.7 0 4.5-1 4.5-2.5C16.5 3.7 15.8 3 15 3c-1.5 0-2.4 1.7-3 4Z" />
    </svg>
  );
}

function NovaToggle({
  open,
  setOpen,
  displayName,
  petType,
  level,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  displayName: string;
  petType: string;
  level: number;
}) {
  const { dict } = useTranslation();
  const home = dict.home;
  return (
    <>
      {open && (
        <section className="fixed bottom-24 right-4 z-50 w-[calc(100vw-32px)] max-w-[390px] overflow-hidden rounded-2xl border border-[#ddd7ff] bg-white shadow-[0_24px_80px_rgba(55,35,120,0.24)] sm:right-6">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#6d35ff] to-[#8b4dff] p-4 text-white">
            <div className="flex items-center gap-3">
              <SpiritPetAvatar petType={petType} level={level} size="sm" showLevelBadge={false} />
              <div>
                <h3 className="font-black">{home.novaChatTitle}</h3>
                <p className="text-xs font-bold text-white/75">{home.novaOnline}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full bg-white/15 px-3 py-2 font-black">×</button>
          </div>
          <div className="space-y-4 bg-[#faf8ff] p-4">
            <div className="max-w-[82%] rounded-2xl bg-white p-4 text-sm font-bold text-[#4b5575] shadow-sm">
              {home.novaGreeting.replace("{name}", displayName)}
            </div>
            <div className="flex flex-wrap gap-2">
              {home.novaQuickReplies.map((item) => (
                <button key={item} className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#6d35ff] shadow-sm">{item}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input placeholder={home.novaInputPlaceholder} className="min-h-12 flex-1 rounded-xl border border-[#e8e9f5] bg-white px-4 text-sm font-bold outline-none" />
              <button className="rounded-xl bg-[#6d35ff] px-4 py-3 font-black text-white">➤</button>
            </div>
          </div>
        </section>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#6d35ff] to-[#9b6bff] text-3xl text-white shadow-[0_18px_50px_rgba(109,53,255,0.35)] sm:right-6"
        aria-label={home.novaOpenAria}
      >
        🤖
      </button>
    </>
  );
}

function SectionTitle({ title, link }: { title: string; link?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-black sm:text-xl">{title}</h2>
      {link && <Link href={link} className="text-sm font-black text-[#6d35ff]">{t("home.viewAll")}</Link>}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-black">{title}</h2>
        {action && <button className="text-[11px] font-black text-[#6d35ff]">{action}</button>}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Task({ icon, title, progress, reward, width }: { icon: string; title: string; progress: string; reward: string; width: string }) {
  return (
    <div className="flex items-center gap-3">
      <LegacyIcon icon={icon} label={title} tone="orange" className="h-10 w-10 rounded-full" size={18} />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2 text-xs font-black"><span className="line-clamp-1">{title}</span><span className="shrink-0 text-[#69708b]">{progress}</span></div>
        <div className="mt-1.5 h-1.5 rounded-full bg-[#e6e8f2]"><div className="h-1.5 rounded-full bg-[#7c3cff]" style={{ width }} /></div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[#f59e0b]"><AppIcon name="coin" tone="yellow" size={14} bare /> {reward}</span>
    </div>
  );
}

function Player({ name, level, avatar }: { name: string; level: number; avatar?: string }) {
  return (
    <div className="min-w-0 text-center sm:text-left">
      <img src={avatar || "/cat-home.jpg"} alt={name} className="mx-auto h-10 w-10 rounded-full object-cover sm:mx-0" />
      <p className="mt-1.5 max-w-20 truncate text-xs font-black">{name}</p>
      <p className="text-[11px] font-bold text-[#69708b]">Level {level}</p>
    </div>
  );
}

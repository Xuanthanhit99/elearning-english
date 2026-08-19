"use client";

import AppLogo from "@/src/Components/UI/AppLogo";
import LanguageSwitcher from "@/src/Components/Layout/LanguageSwitcher";
import ThemeToggle from "@/src/Components/Layout/ThemeToggle";
import { features } from "@/src/config/features";
import {
  BeaconVieBadge,
  BeaconVieCard,
  BeaconVieProgress,
  BeaconVieSectionHeader,
} from "@/src/Components/UI/BeaconVie";
import { buildLoginUrl } from "@/src/lib/auth-redirect";
import { trackEvent } from "@/src/lib/ga";
import { useAuthStore } from "@/src/store/authStore";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Compass,
  Headphones,
  MessageCircle,
  Mic2,
  NotebookPen,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type UserSummary = {
  fullname?: string | null;
  avatar?: string | null;
};

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  accent: string;
  iconBackground: string;
};

const navItems = [
  { label: "Lộ trình học", href: "#learning-path" },
  { label: "Kỹ năng", href: "#skills" },
  { label: "Học cùng AI", href: "#ai-learning" },
  { label: "Tiến độ", href: "#progress" },
  { label: "Cộng đồng", href: "#community" },
];

const skills: Feature[] = [
  {
    icon: BookOpen,
    title: "Từ vựng",
    description:
      "Ghi nhớ lâu hơn với từ mới mỗi ngày, chu kỳ ôn tập và tiến bộ theo tuần.",
    href: "/vocabulary",
    accent: "from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5",
    iconBackground: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    icon: CheckCircle2,
    title: "Ngữ pháp",
    description:
      "Nắm chắc ngữ pháp qua chủ đề có hướng dẫn, bài học tập trung và bài tập thực hành.",
    href: "/grammar",
    accent: "from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/5",
    iconBackground: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    icon: Headphones,
    title: "Nghe",
    description:
      "Luyện nghe theo trình độ với phản hồi rõ ràng sau mỗi bài.",
    href: "/listening",
    accent: "from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/5",
    iconBackground: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    icon: Mic2,
    title: "Nói",
    description:
      "Luyện nói qua phiên thực hành thật, phản hồi phát âm và đánh giá AI.",
    href: "/speaking",
    accent: "from-fuchsia-50 to-pink-50 dark:from-fuchsia-500/10 dark:to-pink-500/5",
    iconBackground: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  },
  {
    icon: BookOpen,
    title: "Đọc",
    description:
      "Đọc bài phù hợp trình độ và cải thiện khả năng hiểu từng phiên học.",
    href: "/reading",
    accent: "from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5",
    iconBackground: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    icon: NotebookPen,
    title: "Viết",
    description:
      "Viết theo đề rõ ràng, luyện tập có cấu trúc và nhận góp ý AI dễ áp dụng.",
    href: "/writing",
    accent: "from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/5",
    iconBackground: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
];

const placementOutputs = [
  "Mức trình độ ước tính theo khung CEFR (A1-C1)",
  "Phân tích riêng cho từng kỹ năng: từ vựng, ngữ pháp, nghe, nói, đọc, viết",
  "Điểm mạnh và điểm cần cải thiện",
  "Lộ trình học đề xuất theo mục tiêu tiếp theo",
];

const cefrLevels = ["A1", "A2", "B1", "B2", "C1"];

const productPillars: Feature[] = [
  {
    icon: Target,
    title: "Giữ nhịp học mỗi ngày",
    description:
      "Duy trì thói quen bằng nhiệm vụ, XP, chuỗi ngày học và các mốc tiến bộ rõ ràng.",
    href: "/missions",
    accent: "from-violet-50 via-white to-fuchsia-50 dark:from-violet-500/10 dark:via-white/5 dark:to-fuchsia-500/10",
    iconBackground: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    icon: Sparkles,
    title: "Có Beacon đồng hành",
    description:
      "Beacon theo dõi tiến độ thực tế của bạn và gợi ý nên tập trung vào đâu tiếp theo, dựa trên dữ liệu học tập của chính bạn.",
    href: "#companion",
    accent: "from-orange-50 via-white to-pink-50 dark:from-orange-500/10 dark:via-white/5 dark:to-pink-500/10",
    iconBackground: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
];

const stats = [
  { value: "6", label: "kỹ năng tiếng Anh cốt lõi" },
  { value: "1", label: "lộ trình học liền mạch" },
  { value: "24/7", label: "truy cập học tập" },
];

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--BeaconVie-bg)] text-[var(--BeaconVie-ink)]">
      <PublicHeader
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <Hero user={user} />
      <TrustStrip />
      <ProductPillars user={user} />
      <SkillsSection />
      <AiLearningSection />
      <ProgressSection />
      <CommunitySection />
      <FinalCta user={user} />
      <Footer />
    </main>
  );
}

function PublicHeader({
  user,
  mobileOpen,
  setMobileOpen,
}: {
  user: UserSummary | null;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-shell-surface)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <AppLogo />

        <nav
          aria-label="Điều hướng chính"
          className="hidden items-center gap-8 lg:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-sm font-extrabold text-[var(--BeaconVie-muted)] transition hover:text-[var(--BeaconVie-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {features.languageSwitcher ? <LanguageSwitcher /> : null}
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard" className="BeaconVie-button-primary text-sm">
              Mở tổng quan
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="BeaconVie-button-soft text-sm">
                Đăng nhập
              </Link>
              <Link
                href={buildLoginUrl("/placement")}
                onClick={() => trackEvent("placement_test_click", { source: "header" })}
                className="BeaconVie-button-primary text-sm"
              >
                Kiểm tra trình độ
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-home-nav"
          aria-label={mobileOpen ? "Đóng điều hướng" : "Mở điều hướng"}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="BeaconVie-button-soft h-11 w-11 p-0 lg:hidden"
        >
          <ChevronDown
            aria-hidden
            className={`h-5 w-5 transition-transform duration-200 ${
              mobileOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {mobileOpen ? (
        <nav
          id="mobile-home-nav"
          aria-label="Điều hướng di động"
          className="border-t border-[var(--BeaconVie-border)] px-4 py-4 lg:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-4 py-3 font-extrabold text-[var(--BeaconVie-muted)] transition hover:bg-[var(--BeaconVie-hover-tint)] hover:text-[var(--BeaconVie-primary)]"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href={user ? "/dashboard" : buildLoginUrl("/placement")}
              onClick={() => {
                if (!user) trackEvent("placement_test_click", { source: "header_mobile" });
                setMobileOpen(false);
              }}
              className="BeaconVie-button-primary mt-2"
            >
              {user ? "Mở tổng quan" : "Kiểm tra trình độ"}
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function Hero({ user }: { user: UserSummary | null }) {
  const primaryHref = user ? "/dashboard" : "/placement";
  const protectedPrimaryHref = user ? primaryHref : buildLoginUrl(primaryHref);
  const learningPathHref = user ? "/learning-path" : buildLoginUrl("/learning-path");

  return (
    <section className="relative isolate overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_20%_20%,rgba(42,126,255,0.14),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(167,67,255,0.16),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(255,98,145,0.12),transparent_32%)]"
      />

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <div className="min-w-0">
          <BeaconVieBadge>Dẫn đường. Kết nối. Phát triển.</BeaconVieBadge>

          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.03] tracking-[-0.04em] sm:text-5xl lg:text-7xl">
            Học tiếng Anh mỗi ngày.
            <span className="mt-1 block bg-gradient-to-r from-blue-600 via-violet-600 to-pink-500 bg-clip-text text-transparent">
              Và thực sự nhìn thấy mình tiến bộ.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[var(--BeaconVie-muted)] sm:text-lg">
            Kiểm tra trình độ, biết chính xác hôm nay nên học gì và theo dõi
            tiến bộ của bạn qua từng tuần trên một nền tảng duy nhất.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={protectedPrimaryHref}
              onClick={() => {
                if (!user) trackEvent("placement_test_click", { source: "hero" });
              }}
              className="BeaconVie-button-primary min-h-14 px-7 py-4 text-base"
            >
              {user ? "Tiếp tục học" : "Kiểm tra trình độ miễn phí"}
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>

            <Link
              href={learningPathHref}
              className="BeaconVie-button-soft min-h-14 px-7 py-4 text-base"
            >
              Khám phá lộ trình
            </Link>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/70 bg-white/60 px-4 py-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-xl font-black text-[var(--BeaconVie-ink)] sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-[var(--BeaconVie-muted)] sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div id="companion" className="relative scroll-mt-24">
          <div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-blue-400/20 via-violet-400/20 to-pink-400/20 blur-3xl"
          />

          <BeaconVieCard className="relative overflow-hidden p-0">
            <div className="relative min-h-[480px] overflow-hidden rounded-[inherit] bg-[linear-gradient(145deg,#eef6ff_0%,#f6f0ff_52%,#fff1f7_100%)] p-6 dark:bg-[linear-gradient(145deg,rgba(21,41,87,0.96),rgba(55,28,93,0.96),rgba(76,30,70,0.96))] sm:p-8">
              <div
                aria-hidden
                className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-300/35 blur-3xl"
              />
              <div
                aria-hidden
                className="absolute -bottom-20 -left-12 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl"
              />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--BeaconVie-primary)]">
                    Bạn đồng hành học tập
                  </p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    Gặp Beacon
                  </h2>
                  <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                    Người hướng dẫn thân thiện đồng hành từ kiểm tra trình độ
                    đến tiến bộ hằng ngày.
                  </p>
                </div>

                <span className="inline-flex rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-violet-700 shadow-sm backdrop-blur dark:bg-white/10 dark:text-violet-200">
                  Bạn đồng hành AI
                </span>
              </div>

              <div className="relative z-10 mt-5 flex justify-center">
                <Image
                  src="/brand/beaconvie-ai-mascot.webp"
                  alt="Linh vật học tập BeaconVie"
                  width={420}
                  height={420}
                  priority
                  sizes="(max-width: 768px) 320px, 420px"
                  className="h-[280px] w-[280px] rounded-[2rem] object-cover shadow-[0_24px_70px_rgba(75,55,180,0.22)] ring-8 ring-white/60 sm:h-[330px] sm:w-[330px]"
                />
              </div>

              <div className="relative z-10 -mt-3 grid grid-cols-3 gap-3">
                <MiniMetric label="Kiểm tra trình độ" value="Cá nhân hóa" />
                <MiniMetric label="Mục tiêu" value="Mỗi ngày" />
                <MiniMetric label="Lộ trình" value="A1-C1" />
              </div>
            </div>
          </BeaconVieCard>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-[var(--BeaconVie-border)] bg-white/75 p-4 shadow-sm backdrop-blur dark:bg-white/5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TrustItem icon={Compass} text="Bắt đầu theo trình độ" />
          <TrustItem icon={WandSparkles} text="Phản hồi có AI hỗ trợ" />
          <TrustItem icon={Target} text="Nhiệm vụ và XP mỗi ngày" />
          <TrustItem icon={UsersRound} text="Động lực từ cộng đồng" />
        </div>
      </div>
    </section>
  );
}

function ProductPillars({ user }: { user: UserSummary | null }) {
  const placementHref = user ? "/placement" : buildLoginUrl("/placement");

  return (
    <Section
      id="learning-path"
      eyebrow="Hành trình của bạn"
      title="Lộ trình học được cá nhân hóa theo trình độ và mục tiêu của bạn."
      description="BeaconVie đóng vai trò như ngọn hải đăng: xác định điểm xuất phát, gợi ý bài học tiếp theo và giúp bạn nhìn rõ tiến bộ từng ngày."
    >
      <BeaconVieCard className="relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(42,126,255,0.1),transparent_35%),radial-gradient(circle_at_90%_90%,rgba(167,67,255,0.1),transparent_35%)]"
        />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <BeaconVieBadge>Điểm khởi đầu</BeaconVieBadge>
            <h3 className="mt-4 max-w-xl text-2xl font-black text-[var(--BeaconVie-ink)] sm:text-3xl">
              Bạn đang thực sự ở trình độ nào?
            </h3>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)] sm:text-base">
              Làm bài kiểm tra trình độ để nhận:
            </p>

            <ul className="mt-4 space-y-2.5">
              {placementOutputs.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-[var(--BeaconVie-ink)]">
                  <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href={placementHref}
              onClick={() => {
                if (!user) trackEvent("placement_test_click", { source: "placement_hook" });
              }}
              className="BeaconVie-button-primary mt-7"
            >
              Kiểm tra ngay
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex flex-col justify-center rounded-3xl border border-[var(--BeaconVie-border)] bg-white/70 p-6 dark:bg-white/5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
              Khung trình độ CEFR
            </p>
            <div className="mt-5 flex items-center justify-between">
              {cefrLevels.map((level) => (
                <span
                  key={level}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--BeaconVie-border)] bg-white text-sm font-black text-[var(--BeaconVie-ink)] dark:bg-white/10"
                >
                  {level}
                </span>
              ))}
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--BeaconVie-border)]">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500" />
            </div>
            <p className="mt-4 text-xs font-semibold leading-5 text-[var(--BeaconVie-muted)]">
              Bài kiểm tra xác định vị trí thật của bạn trên thang này, không
              giả định bạn bắt đầu từ A1.
            </p>
          </div>
        </div>
      </BeaconVieCard>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {productPillars.map((feature, index) => (
        <FeatureCard
            key={feature.href}
            feature={feature}
            number={`0${index + 1}`}
          />
        ))}
      </div>
    </Section>
  );
}

function SkillsSection() {
  return (
    <Section
      id="skills"
      eyebrow="Sáu kỹ năng cốt lõi"
      title="6 kỹ năng. Một lộ trình."
      description="Từ vựng, ngữ pháp, nghe, nói, đọc, viết — tất cả cùng đóng góp vào một hành trình tiến bộ duy nhất, không phải sáu sản phẩm rời rạc."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((feature) => (
        <FeatureCard key={feature.href} feature={feature} />
        ))}
      </div>
    </Section>
  );
}

function AiLearningSection() {
  return (
    <Section
      id="ai-learning"
      eyebrow="Học cùng AI"
      title="Nói chuyện cùng AI như một gia sư thực thụ."
      description="Gia sư AI của BeaconVie giúp bạn luyện nói, cải thiện bài viết, hiểu lỗi sai và biến mỗi phiên học thành một bước tiến rõ ràng."
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <BeaconVieCard className="relative overflow-hidden p-7 sm:p-8">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(62,107,255,0.12),transparent_34%),radial-gradient(circle_at_88%_80%,rgba(214,73,255,0.12),transparent_36%)]"
          />
          <div className="relative z-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-500/20">
              <Sparkles aria-hidden className="h-6 w-6" />
            </div>

            <h3 className="mt-6 max-w-2xl text-2xl font-black sm:text-3xl">
              Một lộ trình được điều chỉnh theo trình độ, hoạt động và tiến bộ của bạn.
            </h3>

            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[var(--BeaconVie-muted)] sm:text-base">
              Dùng kết quả kiểm tra trình độ, hiệu suất kỹ năng và các phiên
              đã hoàn thành để gợi ý bước học tiếp theo.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <AiChip icon={Compass} text="Bước học cá nhân hóa" />
              <AiChip icon={Mic2} text="Đánh giá nói" />
              <AiChip icon={NotebookPen} text="Góp ý bài viết" />
            </div>
          </div>
        </BeaconVieCard>

        <div className="grid gap-5">
          <WritingDemoCard />
          <InfoBlock
            icon={Mic2}
            title="Luyện nói"
            text="Mở chủ đề nói thật, ghi âm phiên luyện tập và nhận phản hồi từ luồng hiện có."
          />
        </div>
      </div>
    </Section>
  );
}

const demoSkillProgress = [
  { label: "Từ vựng", value: 72 },
  { label: "Nghe", value: 58 },
  { label: "Ngữ pháp", value: 65 },
];

function ProgressSection() {
  return (
    <Section
      id="progress"
      eyebrow="Nhìn thấy sự tiến bộ"
      title="Tiến bộ phải nhìn thấy được."
      description="BeaconVie giúp bạn nhìn thấy mình đang tiến bộ hay không, không chỉ đưa ra thêm bài học."
    >
      <BeaconVieCard className="relative overflow-hidden p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
            Ví dụ minh hoạ trang tổng quan
          </span>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-[var(--BeaconVie-border)] bg-white/70 p-5 dark:bg-white/5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
              Chuỗi ngày học
            </p>
            <p className="mt-3 text-3xl font-black text-[var(--BeaconVie-ink)]">
              🔥 12 ngày
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Mục tiêu hôm nay
            </p>
            <BeaconVieProgress value={80} className="mt-2" />
          </div>

          <div className="rounded-3xl border border-[var(--BeaconVie-border)] bg-white/70 p-5 dark:bg-white/5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
              Tiến độ kỹ năng tuần này
            </p>
            <div className="mt-4 space-y-3">
              {demoSkillProgress.map((skill) => (
                <div key={skill.label}>
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--BeaconVie-muted)]">
                    <span>{skill.label}</span>
                    <span>{skill.value}%</span>
                  </div>
                  <BeaconVieProgress value={skill.value} className="mt-1.5" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--BeaconVie-border)] bg-white/70 p-5 dark:bg-white/5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
              Lộ trình CEFR
            </p>
            <p className="mt-3 text-2xl font-black text-[var(--BeaconVie-ink)]">
              A2 <ArrowRight aria-hidden className="inline h-5 w-5 text-[var(--BeaconVie-muted)]" /> B1
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
              Dựa trên kết quả kiểm tra trình độ và các phiên học đã hoàn thành.
            </p>
          </div>
        </div>

        <p className="relative z-10 mt-6 text-xs font-semibold text-[var(--BeaconVie-muted)]">
          Đây là ví dụ minh hoạ cho trang tổng quan thật. Số liệu của bạn sẽ
          xuất hiện sau khi bạn hoàn thành bài kiểm tra trình độ và bắt đầu học.
        </p>
      </BeaconVieCard>
    </Section>
  );
}

function CommunitySection() {
  return (
    <Section
      id="community"
      eyebrow="Cùng nhau tiến bộ"
      title="Kết nối những người cùng mục tiêu để học tập hiệu quả hơn."
      description="Cộng đồng, thử thách và bảng xếp hạng giúp việc học có động lực, có nhịp độ và có người đồng hành."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <InfoBlock
          icon={MessageCircle}
          title="Cộng đồng"
          text="Tham gia thảo luận, câu lạc bộ và không gian học nhóm qua module cộng đồng hiện có."
          href={buildLoginUrl("/community")}
        />
        <InfoBlock
          icon={Trophy}
          title="Bảng xếp hạng"
          text="Theo dõi tiến bộ tuần, XP và thi đua qua bảng xếp hạng hiện có."
          href={buildLoginUrl("/leaderboard")}
        />
        <InfoBlock
          icon={Target}
          title="Nhiệm vụ"
          text="Biến mục tiêu hằng ngày thành các mốc nhỏ gắn với hoạt động học thật."
          href={buildLoginUrl("/missions")}
        />
      </div>
    </Section>
  );
}

function FinalCta({ user }: { user: UserSummary | null }) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,var(--BeaconVie-primary-strong)_0%,var(--BeaconVie-primary)_46%,var(--BeaconVie-violet)_72%,var(--BeaconVie-rose)_100%)] p-8 text-white shadow-[0_32px_100px_rgba(20,103,232,0.28)] sm:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <BeaconVieBadge className="border-white/20 bg-white/10 text-white">
              Bước tiếp theo
            </BeaconVieBadge>

            <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              Bạn không cần học nhiều hơn.
              <span className="block">Bạn cần biết mình nên học gì tiếp theo.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/80">
              {user
                ? "Quay lại trang tổng quan để tiếp tục đúng chỗ bạn đã dừng lại."
                : "Bắt đầu từ trình độ hiện tại của bạn — bài kiểm tra chỉ mất vài phút."}
            </p>
          </div>

          <Link
            href={user ? "/dashboard" : buildLoginUrl("/placement")}
            onClick={() => {
              if (!user) trackEvent("placement_test_click", { source: "final_cta" });
            }}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-black text-[#2230a8] shadow-xl transition hover:-translate-y-0.5"
          >
            {user ? "Tiếp tục học" : "Kiểm tra trình độ miễn phí"}
            <ArrowRight aria-hidden className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-shell-surface)] px-4 py-10 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <AppLogo />
        </div>

        <nav
          aria-label="Liên kết chân trang"
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-[var(--BeaconVie-muted)]"
        >
          <Link href={buildLoginUrl("/placement")}>Kiểm tra trình độ</Link>
          <Link href={buildLoginUrl("/learning-path")}>Lộ trình học</Link>
          <Link href={buildLoginUrl("/community")}>Cộng đồng</Link>
          <Link href="/login">Đăng nhập</Link>
        </nav>

        <p className="text-sm font-semibold text-[var(--BeaconVie-muted)]">
          © 2026 BeaconVie
        </p>
      </div>
    </footer>
  );
}

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--BeaconVie-primary)]">
          {eyebrow}
        </p>
        <BeaconVieSectionHeader title={title} description={description} />
        {children}
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  number,
}: {
  feature: Feature;
  number?: string;
}) {
  const Icon = feature.icon;

  return (
    <Link
      href={feature.href.startsWith("#") ? feature.href : buildLoginUrl(feature.href)}
      className={`group relative block overflow-hidden rounded-[1.75rem] border border-[var(--BeaconVie-border)] bg-gradient-to-br ${feature.accent} p-6 shadow-[0_12px_40px_rgba(35,45,120,0.06)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_60px_rgba(35,45,120,0.12)]`}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${feature.iconBackground}`}
        >
          <Icon aria-hidden className="h-6 w-6" />
        </span>

        {number ? (
          <span className="text-sm font-black tracking-[0.14em] text-[var(--BeaconVie-muted)]/60">
            {number}
          </span>
        ) : null}
      </div>

      <h3 className="mt-6 text-xl font-black text-[var(--BeaconVie-ink)]">
        {feature.title}
      </h3>

      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
        {feature.description}
      </p>

      <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[var(--BeaconVie-primary)]">
        Khám phá
        <ArrowRight
          aria-hidden
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}

function WritingDemoCard() {
  return (
    <BeaconVieCard className="h-full p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--BeaconVie-primary)]/10 text-[var(--BeaconVie-primary)]">
          <NotebookPen aria-hidden className="h-6 w-6" />
        </span>
        <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
          Ví dụ minh hoạ
        </span>
      </div>

      <h3 className="mt-5 text-xl font-black text-[var(--BeaconVie-ink)]">
        Cải thiện viết
      </h3>

      <div className="mt-4 space-y-2 text-sm font-semibold leading-6">
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          I very like this movie.
        </p>
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          I really like this movie.
        </p>
        <p className="text-[var(--BeaconVie-muted)]">
          &quot;Very&quot; không đứng trực tiếp trước &quot;like&quot;.
        </p>
      </div>
    </BeaconVieCard>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
}) {
  const content = (
    <BeaconVieCard className="h-full p-6 transition duration-300 hover:-translate-y-1">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--BeaconVie-primary)]/10 text-[var(--BeaconVie-primary)]">
        <Icon aria-hidden className="h-6 w-6" />
      </span>

      <h3 className="mt-5 text-xl font-black text-[var(--BeaconVie-ink)]">
        {title}
      </h3>

      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
        {text}
      </p>

      {href ? (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--BeaconVie-primary)]">
          Mở nội dung
          <ArrowRight aria-hidden className="h-4 w-4" />
        </span>
      ) : null}
    </BeaconVieCard>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--BeaconVie-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[var(--BeaconVie-ink)]">
        {value}
      </p>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--BeaconVie-primary)]/10 text-[var(--BeaconVie-primary)]">
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="text-sm font-extrabold text-[var(--BeaconVie-ink)]">
        {text}
      </span>
    </div>
  );
}

function AiChip({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--BeaconVie-border)] bg-white/70 px-4 py-3 dark:bg-white/5">
      <Icon
        aria-hidden
        className="h-5 w-5 shrink-0 text-[var(--BeaconVie-primary)]"
      />
      <span className="text-sm font-extrabold text-[var(--BeaconVie-ink)]">
        {text}
      </span>
    </div>
  );
}

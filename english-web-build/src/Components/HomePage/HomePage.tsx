"use client";

import AppLogo from "@/src/Components/UI/AppLogo";
import LanguageSwitcher from "@/src/Components/Layout/LanguageSwitcher";
import ThemeToggle from "@/src/Components/Layout/ThemeToggle";
import { features } from "@/src/config/features";
import {
  LumiverseBadge,
  LumiverseCard,
  LumiverseSectionHeader,
} from "@/src/Components/UI/Lumiverse";
import { buildLoginUrl } from "@/src/lib/auth-redirect";
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
  PawPrint,
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
  { label: "Learning path", href: "#learning-path" },
  { label: "Skills", href: "#skills" },
  { label: "AI learning", href: "#ai-learning" },
  { label: "Community", href: "#community" },
];

const skills: Feature[] = [
  {
    icon: BookOpen,
    title: "Vocabulary",
    description:
      "Build long-term memory with daily words, review cycles and weekly progress.",
    href: "/vocabulary",
    accent: "from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5",
    iconBackground: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    icon: CheckCircle2,
    title: "Grammar",
    description:
      "Master grammar through guided topics, focused lessons and practical exercises.",
    href: "/grammar",
    accent: "from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/5",
    iconBackground: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    icon: Headphones,
    title: "Listening",
    description:
      "Train your ears with level-based listening practice and instant feedback.",
    href: "/listening",
    accent: "from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/5",
    iconBackground: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    icon: Mic2,
    title: "Speaking",
    description:
      "Practice speaking with real sessions, pronunciation feedback and AI evaluation.",
    href: "/speaking",
    accent: "from-fuchsia-50 to-pink-50 dark:from-fuchsia-500/10 dark:to-pink-500/5",
    iconBackground: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  },
  {
    icon: BookOpen,
    title: "Reading",
    description:
      "Read level-appropriate articles and improve comprehension one session at a time.",
    href: "/reading",
    accent: "from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5",
    iconBackground: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    icon: NotebookPen,
    title: "Writing",
    description:
      "Write with clear prompts, structured practice and actionable AI feedback.",
    href: "/writing",
    accent: "from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/5",
    iconBackground: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
];

const productPillars: Feature[] = [
  {
    icon: Compass,
    title: "Discover your level",
    description:
      "Begin with the placement test and receive a path that matches your real ability.",
    href: "/placement",
    accent: "from-blue-50 via-white to-violet-50 dark:from-blue-500/10 dark:via-white/5 dark:to-violet-500/10",
    iconBackground: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    icon: Target,
    title: "Build a daily rhythm",
    description:
      "Stay consistent with missions, XP, streaks and meaningful progress milestones.",
    href: "/missions",
    accent: "from-violet-50 via-white to-fuchsia-50 dark:from-violet-500/10 dark:via-white/5 dark:to-fuchsia-500/10",
    iconBackground: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    icon: PawPrint,
    title: "Learn with a companion",
    description:
      "A learning companion experience is being prepared and will arrive when it is ready.",
    href: "#companion",
    accent: "from-orange-50 via-white to-pink-50 dark:from-orange-500/10 dark:via-white/5 dark:to-pink-500/10",
    iconBackground: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
];

const stats = [
  { value: "6", label: "core English skills" },
  { value: "1", label: "connected learning path" },
  { value: "24/7", label: "learning access" },
];

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--lumiverse-bg)] text-[var(--lumiverse-ink)]">
      <PublicHeader
        user={null}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <Hero user={null} />
      <TrustStrip />
      <ProductPillars />
      <SkillsSection />
      <AiLearningSection />
      <CommunitySection />
      <FinalCta user={null} />
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
    <header className="sticky top-0 z-50 border-b border-[var(--lumiverse-border)] bg-[var(--lumiverse-shell-surface)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <AppLogo />

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 lg:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-sm font-extrabold text-[var(--lumiverse-muted)] transition hover:text-[var(--lumiverse-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {features.languageSwitcher ? <LanguageSwitcher /> : null}
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard" className="lumiverse-button-primary text-sm">
              Open dashboard
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="lumiverse-button-soft text-sm">
                Sign in
              </Link>
              <Link
                href={buildLoginUrl("/placement")}
                className="lumiverse-button-primary text-sm"
              >
                Start placement
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-home-nav"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lumiverse-button-soft h-11 w-11 p-0 lg:hidden"
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
          aria-label="Mobile navigation"
          className="border-t border-[var(--lumiverse-border)] px-4 py-4 lg:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-4 py-3 font-extrabold text-[var(--lumiverse-muted)] transition hover:bg-[var(--lumiverse-hover-tint)] hover:text-[var(--lumiverse-primary)]"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href={user ? "/dashboard" : buildLoginUrl("/placement")}
              onClick={() => setMobileOpen(false)}
              className="lumiverse-button-primary mt-2"
            >
              {user ? "Open dashboard" : "Start placement"}
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
          <LumiverseBadge>Learn. Explore. Grow. Together.</LumiverseBadge>

          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.03] tracking-[-0.04em] sm:text-5xl lg:text-7xl">
            Your English journey,
            <span className="mt-1 block bg-gradient-to-r from-blue-600 via-violet-600 to-pink-500 bg-clip-text text-transparent">
              connected in one universe.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[var(--lumiverse-muted)] sm:text-lg">
            Lumiverse brings placement, personalized learning paths, six core
            skills, missions, community and AI feedback into one clear
            experience.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={protectedPrimaryHref}
              className="lumiverse-button-primary min-h-14 px-7 py-4 text-base"
            >
              {user ? "Continue your journey" : "Discover your English level"}
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>

            <Link
              href={learningPathHref}
              className="lumiverse-button-soft min-h-14 px-7 py-4 text-base"
            >
              Explore learning path
            </Link>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/70 bg-white/60 px-4 py-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-xl font-black text-[var(--lumiverse-ink)] sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-[var(--lumiverse-muted)] sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-blue-400/20 via-violet-400/20 to-pink-400/20 blur-3xl"
          />

          <LumiverseCard className="relative overflow-hidden p-0">
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
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lumiverse-primary)]">
                    Your learning companion
                  </p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    Meet Lumi
                  </h2>
                  <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
                    A friendly guide that stays with you from placement to daily
                    progress.
                  </p>
                </div>

                <span className="inline-flex rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-violet-700 shadow-sm backdrop-blur dark:bg-white/10 dark:text-violet-200">
                  AI companion
                </span>
              </div>

              <div className="relative z-10 mt-5 flex justify-center">
                <Image
                  src="/cat-home.png"
                  alt="Lumiverse learning mascot"
                  width={420}
                  height={420}
                  priority
                  sizes="(max-width: 768px) 320px, 420px"
                  className="h-[280px] w-[280px] rounded-[2rem] object-cover shadow-[0_24px_70px_rgba(75,55,180,0.22)] ring-8 ring-white/60 sm:h-[330px] sm:w-[330px]"
                />
              </div>

              <div className="relative z-10 -mt-3 grid grid-cols-3 gap-3">
                <MiniMetric label="Placement" value="Personalized" />
                <MiniMetric label="Daily goal" value="20 min" />
                <MiniMetric label="Path" value="A1–C1" />
              </div>
            </div>
          </LumiverseCard>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-[var(--lumiverse-border)] bg-white/75 p-4 shadow-sm backdrop-blur dark:bg-white/5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TrustItem icon={Compass} text="Placement-based start" />
          <TrustItem icon={WandSparkles} text="AI-assisted feedback" />
          <TrustItem icon={Target} text="Daily missions and XP" />
          <TrustItem icon={UsersRound} text="Community motivation" />
        </div>
      </div>
    </section>
  );
}

function ProductPillars() {
  return (
    <Section
      id="learning-path"
      eyebrow="Your journey"
      title="Start from where you are. Grow with a clear path."
      description="Every major entry point connects to a real route and an existing learning flow in your project."
    >
      <div className="grid gap-5 md:grid-cols-3">
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
      eyebrow="Six core skills"
      title="Practice every part of English in one connected system."
      description="Move between vocabulary, grammar, listening, speaking, reading and writing without losing your progress."
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
      eyebrow="AI learning"
      title="Helpful AI, placed where it adds real value."
      description="Lumiverse supports the learner without turning the product into a collection of disconnected AI features."
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <LumiverseCard className="relative overflow-hidden p-7 sm:p-8">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(62,107,255,0.12),transparent_34%),radial-gradient(circle_at_88%_80%,rgba(214,73,255,0.12),transparent_36%)]"
          />
          <div className="relative z-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-500/20">
              <Sparkles aria-hidden className="h-6 w-6" />
            </div>

            <h3 className="mt-6 max-w-2xl text-2xl font-black sm:text-3xl">
              One path shaped by your level, activity and progress.
            </h3>

            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[var(--lumiverse-muted)] sm:text-base">
              Use placement results, skill performance and completed sessions to
              guide the next learning step. Speaking and writing remain connected
              to their existing processing flows.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <AiChip icon={Compass} text="Personalized next steps" />
              <AiChip icon={Mic2} text="Speaking evaluation" />
              <AiChip icon={NotebookPen} text="Writing feedback" />
            </div>
          </div>
        </LumiverseCard>

        <div className="grid gap-5">
          <InfoBlock
            icon={Mic2}
            title="Practice speaking"
            text="Open real speaking topics, record sessions and receive feedback from the current workflow."
          />
          <InfoBlock
            icon={NotebookPen}
            title="Improve writing"
            text="Write from real prompts, submit sessions and review structured result feedback."
          />
        </div>
      </div>
    </Section>
  );
}

function CommunitySection() {
  return (
    <Section
      id="community"
      eyebrow="Grow together"
      title="Learning feels lighter when progress is shared."
      description="Missions, rankings, clubs and community activity help learners stay consistent without distracting from the lessons."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <InfoBlock
          icon={MessageCircle}
          title="Community"
          text="Join discussions, clubs and social learning spaces through the existing community module."
          href={buildLoginUrl("/community")}
        />
        <InfoBlock
          icon={Trophy}
          title="Leaderboard"
          text="Track weekly progress, XP and competition through the current leaderboard routes."
          href={buildLoginUrl("/leaderboard")}
        />
        <InfoBlock
          icon={Target}
          title="Missions"
          text="Turn daily goals into achievable milestones connected to real learning activity."
          href={buildLoginUrl("/missions")}
        />
      </div>
    </Section>
  );
}

function FinalCta({ user }: { user: UserSummary | null }) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,var(--lumiverse-primary-strong)_0%,var(--lumiverse-primary)_46%,var(--lumiverse-violet)_72%,var(--lumiverse-rose)_100%)] p-8 text-white shadow-[0_32px_100px_rgba(20,103,232,0.28)] sm:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <LumiverseBadge className="border-white/20 bg-white/10 text-white">
              Your next step
            </LumiverseBadge>

            <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              Find your level and begin your Lumiverse journey.
            </h2>

            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/80">
              Start with placement, or continue from your dashboard when your
              account already has learning progress.
            </p>
          </div>

          <Link
            href={user ? "/dashboard" : buildLoginUrl("/placement")}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-black text-[#2230a8] shadow-xl transition hover:-translate-y-0.5"
          >
            {user ? "Open dashboard" : "Start placement test"}
            <ArrowRight aria-hidden className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--lumiverse-border)] bg-[var(--lumiverse-shell-surface)] px-4 py-10 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <AppLogo />
        </div>

        <nav
          aria-label="Footer links"
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-[var(--lumiverse-muted)]"
        >
          <Link href={buildLoginUrl("/placement")}>Placement</Link>
          <Link href={buildLoginUrl("/learning-path")}>Learning path</Link>
          <Link href={buildLoginUrl("/community")}>Community</Link>
          <Link href="/login">Sign in</Link>
        </nav>

        <p className="text-sm font-semibold text-[var(--lumiverse-muted)]">
          © 2026 Lumiverse
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
        <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--lumiverse-primary)]">
          {eyebrow}
        </p>
        <LumiverseSectionHeader title={title} description={description} />
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
      className={`group relative block overflow-hidden rounded-[1.75rem] border border-[var(--lumiverse-border)] bg-gradient-to-br ${feature.accent} p-6 shadow-[0_12px_40px_rgba(35,45,120,0.06)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_60px_rgba(35,45,120,0.12)]`}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${feature.iconBackground}`}
        >
          <Icon aria-hidden className="h-6 w-6" />
        </span>

        {number ? (
          <span className="text-sm font-black tracking-[0.14em] text-[var(--lumiverse-muted)]/60">
            {number}
          </span>
        ) : null}
      </div>

      <h3 className="mt-6 text-xl font-black text-[var(--lumiverse-ink)]">
        {feature.title}
      </h3>

      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
        {feature.description}
      </p>

      <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[var(--lumiverse-primary)]">
        Explore
        <ArrowRight
          aria-hidden
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
        />
      </span>
    </Link>
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
    <LumiverseCard className="h-full p-6 transition duration-300 hover:-translate-y-1">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lumiverse-primary)]/10 text-[var(--lumiverse-primary)]">
        <Icon aria-hidden className="h-6 w-6" />
      </span>

      <h3 className="mt-5 text-xl font-black text-[var(--lumiverse-ink)]">
        {title}
      </h3>

      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
        {text}
      </p>

      {href ? (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--lumiverse-primary)]">
          Open module
          <ArrowRight aria-hidden className="h-4 w-4" />
        </span>
      ) : null}
    </LumiverseCard>
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
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--lumiverse-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[var(--lumiverse-ink)]">
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
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lumiverse-primary)]/10 text-[var(--lumiverse-primary)]">
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="text-sm font-extrabold text-[var(--lumiverse-ink)]">
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
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--lumiverse-border)] bg-white/70 px-4 py-3 dark:bg-white/5">
      <Icon
        aria-hidden
        className="h-5 w-5 shrink-0 text-[var(--lumiverse-primary)]"
      />
      <span className="text-sm font-extrabold text-[var(--lumiverse-ink)]">
        {text}
      </span>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  Headphones,
  MessageCircle,
  Mic2,
  PenLine,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import AppLogo from "@/src/Components/UI/AppLogo";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";

type UserSummary = {
  fullname?: string | null;
  avatar?: string | null;
};

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
};

const navItems = [
  { label: "Lộ trình", href: "#learning-path" },
  { label: "AI Tutor", href: "#ai-features" },
  { label: "Cộng đồng", href: "#community" },
  { label: "FAQ", href: "#faq" },
];

const features: Feature[] = [
  {
    icon: Target,
    title: "Placement test cá nhân hóa",
    description: "Xác định trình độ CEFR và tạo lộ trình phù hợp ngay từ buổi đầu.",
    href: "/placement",
  },
  {
    icon: BookOpen,
    title: "Vocabulary theo SRS",
    description: "Học từ mới, ôn lại đúng thời điểm và tránh lặp nội dung đã hoàn thành.",
    href: "/vocabulary",
  },
  {
    icon: Headphones,
    title: "Listening mỗi ngày",
    description: "10 câu nghe theo chủ đề, có câu sai được ghép vào lượt luyện kế tiếp.",
    href: "/listening",
  },
  {
    icon: Mic2,
    title: "Speaking có AI phản hồi",
    description: "Luyện phát âm, phản xạ hội thoại và nhận góp ý rõ ràng theo từng câu.",
    href: "/speaking",
  },
  {
    icon: PenLine,
    title: "Writing được chấm chi tiết",
    description: "Gemini đánh giá grammar, vocabulary, coherence và sửa bài theo mục tiêu.",
    href: "/writing",
  },
  {
    icon: Trophy,
    title: "Mission, XP, streak",
    description: "Giữ động lực bằng nhiệm vụ hằng ngày, thành tích và bảng xếp hạng.",
    href: "/missions",
  },
];

const pathSteps = [
  "Kiểm tra trình độ",
  "Nhận lộ trình AI",
  "Học bài ngắn mỗi ngày",
  "Ôn tập thông minh",
  "Theo dõi tiến bộ",
];

const testimonials = [
  {
    name: "Minh Anh",
    role: "Sinh viên năm 2",
    quote:
      "Mình biết hôm nay cần học gì, ôn gì và vì sao. Cảm giác nhẹ hơn rất nhiều so với tự học lan man.",
  },
  {
    name: "Hoàng Nam",
    role: "Nhân viên văn phòng",
    quote:
      "Phần nghe và nói theo tình huống giúp mình luyện đều 15 phút mỗi ngày mà không bị quá tải.",
  },
  {
    name: "Linh Chi",
    role: "Tự học IELTS nền tảng",
    quote:
      "Writing feedback rất rõ: sai ở đâu, sửa thế nào, và bài kế tiếp nên luyện gì.",
  },
];

const faqs = [
  {
    question: "PoppyLingo khác gì Duolingo?",
    answer:
      "PoppyLingo tập trung vào lộ trình cá nhân hóa, phản hồi AI cho Speaking/Writing, ôn tập SRS và dashboard tiến bộ theo từng kỹ năng.",
  },
  {
    question: "Có học miễn phí được không?",
    answer:
      "Có. Người dùng có thể bắt đầu với placement test, một số bài học, nhiệm vụ hằng ngày và công cụ AI cơ bản.",
  },
  {
    question: "Người mất gốc có dùng được không?",
    answer:
      "Có. Placement test sẽ xác định điểm xuất phát và mở lộ trình từ A1 đến các mục tiêu cao hơn.",
  },
  {
    question: "AI có thay giáo viên không?",
    answer:
      "Không. AI đóng vai trò huấn luyện viên cá nhân: gợi ý, sửa lỗi, nhắc ôn và cá nhân hóa bài luyện.",
  },
];

export default function HomePage() {
  const user = useAuthStore((state) => state.user) as UserSummary | null;
  const setUser = useAuthStore((state) => state.setUser);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    api
      .get("/auth/me")
      .then((res) => {
        if (!mounted) return;
        setUser(res.data?.data?.getUser ?? res.data?.data?.user ?? res.data);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      });

    return () => {
      mounted = false;
    };
  }, [setUser]);

  return (
    <main className="min-h-screen overflow-x-clip bg-[#fbfcff] text-slate-950">
      <Header user={user} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <Hero user={user} />
      <TrustBar />
      <FeatureSection />
      <LearningPathSection />
      <AiSection />
      <CommunitySection />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Header({
  user,
  mobileOpen,
  setMobileOpen,
}: {
  user: UserSummary | null;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <AppLogo className="h-11" />

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold text-slate-600 transition hover:text-[#6d35ff]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-[#6d35ff]"
            >
              Vào dashboard <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="rounded-full px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                Đăng nhập
              </Link>
              <Link
                href="/placement"
                className="inline-flex items-center gap-2 rounded-full bg-[#6d35ff] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(109,53,255,0.24)] transition hover:bg-[#5825df]"
              >
                Bắt đầu miễn phí <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-home-nav"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 lg:hidden"
        >
          <span className="sr-only">Mở menu</span>
          <ChevronDown aria-hidden className={`h-5 w-5 transition ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-home-nav" aria-label="Điều hướng di động" className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-4 py-3 font-bold text-slate-700 hover:bg-[#f3efff]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={user ? "/dashboard" : "/placement"}
              className="mt-2 rounded-2xl bg-[#6d35ff] px-4 py-3 text-center font-black text-white"
            >
              {user ? "Vào dashboard" : "Bắt đầu miễn phí"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function Hero({ user }: { user: UserSummary | null }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(circle_at_20%_20%,#efe7ff_0,transparent_34%),radial-gradient(circle_at_80%_10%,#dff7ff_0,transparent_30%),linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d8ccff] bg-white px-4 py-2 text-sm font-black text-[#6d35ff] shadow-sm">
            <Sparkles aria-hidden className="h-4 w-4" />
            AI English learning platform
          </p>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Học tiếng Anh theo lộ trình AI, mỗi ngày rõ mình cần làm gì.
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600 sm:text-xl">
            PoppyLingo kết hợp placement test, SRS, luyện nghe nói đọc viết và phản hồi AI để giúp bạn tiến bộ đều mà không bị quá tải.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={user ? "/dashboard" : "/placement"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#6d35ff] px-6 py-4 text-base font-black text-white shadow-[0_20px_44px_rgba(109,53,255,0.28)] transition hover:-translate-y-0.5 hover:bg-[#5825df]"
            >
              {user ? "Tiếp tục học" : "Kiểm tra trình độ miễn phí"}
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
            <Link
              href="#ai-features"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-[#cfc2ff]"
            >
              <Play aria-hidden className="h-5 w-5 text-[#6d35ff]" />
              Xem AI hỗ trợ gì
            </Link>
          </div>

          <ul className="mt-8 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-3">
            {["Miễn phí để bắt đầu", "Theo CEFR A1-C2", "Học 10-20 phút/ngày"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_30px_90px_rgba(48,37,115,0.16)]">
            <div className="grid gap-4 rounded-[1.5rem] bg-[#f7f5ff] p-4 sm:grid-cols-[1fr_180px]">
              <div className="rounded-[1.25rem] bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-[#6d35ff]">Today's plan</p>
                <h2 className="mt-2 text-2xl font-black">Environment B1</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  8 từ cần ôn, 10 câu nghe, 1 bài speaking ngắn.
                </p>
                <div className="mt-5 space-y-3">
                  <ProgressRow label="Vocabulary" value="80%" />
                  <ProgressRow label="Listening" value="65%" />
                  <ProgressRow label="Speaking" value="42%" />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-[1.25rem] bg-white p-4 text-center shadow-sm">
                <Image
                  src="/cat-home.jpg"
                  alt="Poppy mascot hướng dẫn học tiếng Anh"
                  width={180}
                  height={180}
                  priority
                  sizes="(max-width: 640px) 140px, 180px"
                  className="h-32 w-32 rounded-full object-cover sm:h-40 sm:w-40"
                />
                <p className="mt-3 text-sm font-black text-slate-900">AI coach</p>
                <p className="text-xs font-semibold text-slate-500">Gợi ý bài tiếp theo</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric icon={Zap} label="Streak" value="18 ngày" />
              <Metric icon={Star} label="XP hôm nay" value="2,450" />
              <Metric icon={BarChart3} label="Tiến độ" value="+12%" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section aria-label="Điểm nổi bật" className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">
        {["Vocabulary SRS", "AI Speaking", "AI Writing", "Community", "Leaderboard"].map((item) => (
          <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <Section id="features" eyebrow="Nền tảng học toàn diện" title="Không chỉ học từ mới. Bạn luyện đủ kỹ năng và được AI điều chỉnh lộ trình.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(48,37,115,0.12)]"
          >
            <feature.icon aria-hidden className="h-9 w-9 text-[#6d35ff]" />
            <h3 className="mt-5 text-xl font-black text-slate-950">{feature.title}</h3>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{feature.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#6d35ff]">
              Khám phá <ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function LearningPathSection() {
  return (
    <Section id="learning-path" eyebrow="Learning Path" title="Một lộ trình rõ ràng từ kiểm tra đầu vào đến bài học hằng ngày.">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-black">Hôm nay nên học gì?</h3>
          <p className="mt-3 leading-7 text-slate-600">
            PoppyLingo ưu tiên ôn tập trước, mở từ mới theo năng lực ghi nhớ và tự điều chỉnh nếu bạn sai nhiều.
          </p>
          <Link href="/placement" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">
            Làm placement test <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <ol className="grid gap-3">
          {pathSteps.map((step, index) => (
            <li key={step} className="flex items-center gap-4 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efe9ff] text-lg font-black text-[#6d35ff]">
                {index + 1}
              </span>
              <span className="font-black text-slate-900">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

function AiSection() {
  return (
    <Section id="ai-features" eyebrow="AI features" title="AI không chỉ tạo bài. AI giúp bạn học đúng thứ cần học.">
      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard icon={Bot} title="AI phân tích mục tiêu" text="Từ trình độ, thời gian rảnh và mục tiêu, hệ thống tạo lộ trình học phù hợp." />
        <InfoCard icon={MessageCircle} title="AI sửa lỗi theo ngữ cảnh" text="Speaking và Writing nhận phản hồi cụ thể thay vì chỉ báo đúng sai." />
        <InfoCard icon={ShieldCheck} title="Không nhồi bài quá mức" text="SRS ưu tiên ghi nhớ dài hạn, giảm lượng từ mới khi bạn quên nhiều." />
      </div>
    </Section>
  );
}

function CommunitySection() {
  return (
    <Section id="community" eyebrow="Community & leaderboard" title="Học một mình nhưng vẫn có động lực như đang ở lớp.">
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={Users} title="Cộng đồng học chung" text="Chia sẻ câu hỏi, bài viết, tài nguyên và tiến bộ học tập." />
        <InfoCard icon={Trophy} title="Bảng xếp hạng" text="Thi đua XP theo tuần, mùa giải và nhóm bạn." />
        <InfoCard icon={Star} title="Thành tích" text="Mở khóa badge theo vocabulary, listening, streak, mission và level." />
      </div>
    </Section>
  );
}

function PricingSection() {
  return (
    <Section id="pricing" eyebrow="Pricing" title="Bắt đầu miễn phí. Nâng cấp khi bạn cần học sâu hơn.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Plan title="Free" price="0đ" description="Dành cho người mới bắt đầu thử lộ trình AI." items={["Placement test", "Bài học cơ bản", "Daily goal", "Một phần công cụ AI"]} href="/placement" cta="Bắt đầu miễn phí" />
        <Plan title="Premium" price="Linh hoạt" description="Dành cho người học nghiêm túc cần phản hồi và nội dung nâng cao." items={["AI feedback đầy đủ", "Không giới hạn ôn tập", "Explore topics", "Báo cáo tiến bộ nâng cao"]} href="/auth" cta="Tìm hiểu nâng cấp" featured />
      </div>
    </Section>
  );
}

function TestimonialsSection() {
  return (
    <Section id="testimonials" eyebrow="Học viên nói gì" title="Thiết kế để người học quay lại mỗi ngày, không phải học bùng lên rồi bỏ.">
      <div className="grid gap-4 md:grid-cols-3">
        {testimonials.map((item) => (
          <figure key={item.name} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex gap-1 text-amber-400" aria-label="5 sao">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} aria-hidden className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-5 text-sm font-medium leading-7 text-slate-700">"{item.quote}"</blockquote>
            <figcaption className="mt-5">
              <p className="font-black text-slate-950">{item.name}</p>
              <p className="text-sm font-semibold text-slate-500">{item.role}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

function FaqSection() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Những câu hỏi thường gặp trước khi bắt đầu.">
      <div className="mx-auto grid max-w-4xl gap-3">
        {faqs.map((item) => (
          <details key={item.question} className="group rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-slate-950">
              {item.question}
              <ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-[#6d35ff] transition group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm font-medium leading-7 text-slate-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.24)] sm:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Sẵn sàng biết mình nên học gì hôm nay?</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Làm placement test miễn phí, nhận lộ trình AI và bắt đầu với mục tiêu nhỏ trong ngày.
            </p>
          </div>
          <Link href="/placement" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-slate-950">
            Bắt đầu ngay <ArrowRight aria-hidden className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <AppLogo compact />
        <nav aria-label="Liên kết chân trang" className="flex flex-wrap gap-4 text-sm font-bold text-slate-600">
          <Link href="/courses">Courses</Link>
          <Link href="/community">Community</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <p className="text-sm font-semibold text-slate-500">© 2026 PoppyLingo</p>
      </div>
    </footer>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6d35ff]">{eyebrow}</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <Icon aria-hidden className="h-9 w-9 text-[#6d35ff]" />
      <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
    </article>
  );
}

function Plan({
  title,
  price,
  description,
  items,
  href,
  cta,
  featured = false,
}: {
  title: string;
  price: string;
  description: string;
  items: string[];
  href: string;
  cta: string;
  featured?: boolean;
}) {
  return (
    <article className={`rounded-[1.5rem] border p-6 shadow-sm ${featured ? "border-[#6d35ff] bg-[#f6f2ff]" : "border-slate-200 bg-white"}`}>
      <h3 className="text-2xl font-black">{title}</h3>
      <p className="mt-2 text-4xl font-black text-[#6d35ff]">{price}</p>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{description}</p>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <CheckCircle2 aria-hidden className="h-5 w-5 text-emerald-500" />
            {item}
          </li>
        ))}
      </ul>
      <Link href={href} className={`mt-6 inline-flex w-full justify-center rounded-2xl px-5 py-3 font-black ${featured ? "bg-[#6d35ff] text-white" : "bg-slate-950 text-white"}`}>
        {cta}
      </Link>
    </article>
  );
}

function ProgressRow({ label, value }: { label: string; value: string }) {
  const percent = Number(value.replace("%", ""));
  return (
    <div>
      <div className="flex justify-between text-xs font-black text-slate-600">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-[#6d35ff]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Icon aria-hidden className="h-5 w-5 text-[#6d35ff]" />
      <p className="mt-3 text-lg font-black">{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

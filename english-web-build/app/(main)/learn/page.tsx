import Link from "next/link";
import {
  BookOpen,
  Headphones,
  Mic2,
  NotebookPen,
  Sparkles,
} from "lucide-react";

const todayItems = [
  {
    title: "Há»c tá»« vá»±ng hÃ´m nay",
    desc: "HoÃ n thÃ nh Daily Goal vÃ  Ã´n táº­p SRS.",
    href: "/vocabulary",
    icon: BookOpen,
    tone: "bg-violet-50 text-violet-700",
  },
  {
    title: "Luyá»‡n nghe",
    desc: "LÃ m 10 cÃ¢u nghe theo chá»§ Ä‘á» hÃ´m nay.",
    href: "/listening",
    icon: Headphones,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    title: "Luyá»‡n nÃ³i",
    desc: "Táº­p phÃ¡t Ã¢m vÃ  pháº£n xáº¡ nÃ³i ngáº¯n.",
    href: "/speaking",
    icon: Mic2,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "AI táº¡o bÃ i há»c",
    desc: "Táº¡o lá»™ trÃ¬nh cÃ¡ nhÃ¢n hÃ³a theo má»¥c tiÃªu riÃªng.",
    href: "/lesson-builder",
    icon: Sparkles,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    title: "Luyá»‡n viáº¿t",
    desc: "Viáº¿t Ä‘oáº¡n ngáº¯n vÃ  nháº­n nháº­n xÃ©t tá»« AI.",
    href: "/writing",
    icon: NotebookPen,
    tone: "bg-pink-50 text-pink-700",
  },
];

export default function LearnTodayPage() {
  return (
    <main className="min-h-[calc(100vh-7rem)]">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-wider text-violet-600">
            Há»c hÃ´m nay
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">
            Chá»n hoáº¡t Ä‘á»™ng há»c phÃ¹ há»£p
          </h1>
          <p className="mt-3 font-semibold leading-7 text-slate-600">
            ÄÃ¢y lÃ  trung tÃ¢m nhanh Ä‘á»ƒ báº¡n tiáº¿p tá»¥c cÃ¡c hoáº¡t Ä‘á»™ng quan trá»ng
            trong ngÃ y mÃ  khÃ´ng pháº£i tÃ¬m tá»«ng module.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {todayItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}
              >
                <Icon size={22} />
              </span>
              <h2 className="mt-4 text-xl font-black text-slate-950">
                {item.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {item.desc}
              </p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}

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
    title: "Học từ vựng hôm nay",
    desc: "Hoàn thành Daily Goal và ôn tập SRS.",
    href: "/vocabulary",
    icon: BookOpen,
    tone: "bg-violet-50 text-violet-700",
  },
  {
    title: "Luyện nghe",
    desc: "Làm 10 câu nghe theo chủ đề hôm nay.",
    href: "/listening",
    icon: Headphones,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    title: "Luyện nói",
    desc: "Tập phát âm và phản xạ nói ngắn.",
    href: "/speaking",
    icon: Mic2,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "AI tạo bài học",
    desc: "Tạo lộ trình cá nhân hóa theo mục tiêu riêng.",
    href: "/lesson-builder",
    icon: Sparkles,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    title: "Luyện viết",
    desc: "Viết đoạn ngắn và nhận nhận xét từ AI.",
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
            Học hôm nay
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">
            Chọn hoạt động học phù hợp
          </h1>
          <p className="mt-3 font-semibold leading-7 text-slate-600">
            Đây là trung tâm nhanh để bạn tiếp tục các hoạt động quan trọng
            trong ngày mà không phải tìm từng module.
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

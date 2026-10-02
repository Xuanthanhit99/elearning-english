import Link from "next/link";
import { BookOpen, CheckCircle2, FileText, Headphones, Mic2, NotebookPen } from "lucide-react";

const practiceItems = [
  { title: "Từ vựng", desc: "Ôn từ theo chủ đề và lịch lặp lại ngắt quãng.", href: "/vocabulary", icon: BookOpen, tone: "bg-emerald-50 text-emerald-700" },
  { title: "Ngữ pháp", desc: "Củng cố cấu trúc và quy tắc qua bài luyện tập.", href: "/grammar", icon: CheckCircle2, tone: "bg-blue-50 text-blue-700" },
  { title: "Luyện nghe", desc: "Rèn nghe hiểu với nội dung theo trình độ.", href: "/listening", icon: Headphones, tone: "bg-violet-50 text-violet-700" },
  { title: "Luyện nói", desc: "Tập phát âm và phản xạ nói theo tình huống.", href: "/speaking", icon: Mic2, tone: "bg-fuchsia-50 text-fuchsia-700" },
  { title: "Luyện đọc", desc: "Đọc bài và nâng khả năng hiểu văn bản.", href: "/reading", icon: FileText, tone: "bg-amber-50 text-amber-700" },
  { title: "Luyện viết", desc: "Viết bài và nhận góp ý để cải thiện từng bước.", href: "/writing", icon: NotebookPen, tone: "bg-rose-50 text-rose-700" },
];

export default function PracticeHubPage() {
  return (
    <main className="min-h-[calc(100vh-7rem)] space-y-5 pb-8 sm:space-y-6 sm:pb-10">
      <section className="overflow-hidden rounded-[1.75rem] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--BeaconVie-primary)]">Practice</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--BeaconVie-ink)] sm:text-4xl">Luyện tập theo nhu cầu</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)] sm:text-base">
          Chọn một trong sáu kỹ năng cốt lõi. Đây là luyện tập tự chọn, tách biệt với bài tiếp theo trong lộ trình.
        </p>
      </section>

      <section aria-label="Sáu kỹ năng luyện tập" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {practiceItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group rounded-[1.5rem] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${item.tone}`}>
                <Icon aria-hidden size={22} />
              </span>
              <h2 className="mt-3 text-base font-black text-[var(--BeaconVie-ink)] sm:mt-4 sm:text-xl">{item.title}</h2>
              <p className="mt-2 hidden text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)] sm:block">{item.desc}</p>
            </Link>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-3 text-sm font-bold">
        <Link href="/learning-path" className="text-[var(--BeaconVie-primary)]">Quay lại lộ trình</Link>
        <span className="text-[var(--BeaconVie-muted)]">·</span>
        <Link href="/arena" className="text-[var(--BeaconVie-primary)]">Chơi game tiếng Anh</Link>
      </div>
    </main>
  );
}

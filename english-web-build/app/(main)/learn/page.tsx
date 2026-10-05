import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, FileText, Headphones, Mic2, NotebookPen, Sparkles } from "lucide-react";

const practiceItems = [
  { title: "Từ vựng", desc: "Ôn từ theo chủ đề và lịch lặp lại ngắt quãng.", href: "/vocabulary", icon: BookOpen, tone: "bg-emerald-50 text-emerald-700", label: "Ghi nhớ" },
  { title: "Ngữ pháp", desc: "Củng cố cấu trúc và quy tắc qua bài luyện tập.", href: "/grammar", icon: CheckCircle2, tone: "bg-blue-50 text-blue-700", label: "Cấu trúc" },
  { title: "Luyện nghe", desc: "Rèn nghe hiểu với nội dung theo trình độ.", href: "/listening", icon: Headphones, tone: "bg-violet-50 text-violet-700", label: "Nghe hiểu" },
  { title: "Luyện nói", desc: "Tập phát âm và phản xạ nói theo tình huống.", href: "/speaking", icon: Mic2, tone: "bg-fuchsia-50 text-fuchsia-700", label: "Phản xạ" },
  { title: "Luyện đọc", desc: "Đọc bài và nâng khả năng hiểu văn bản.", href: "/reading", icon: FileText, tone: "bg-amber-50 text-amber-700", label: "Đọc hiểu" },
  { title: "Luyện viết", desc: "Viết bài và nhận góp ý để cải thiện từng bước.", href: "/writing", icon: NotebookPen, tone: "bg-rose-50 text-rose-700", label: "Diễn đạt" },
];

export default function PracticeHubPage() {
  return (
    <main className="min-h-[calc(100vh-7rem)] pb-8 sm:pb-10">
      <div className="mx-auto max-w-[1280px] space-y-4 sm:space-y-5">
        <section className="relative overflow-hidden rounded-[24px] border border-[#dfe8f5] bg-[linear-gradient(135deg,#f8fbff_0%,#eef5ff_58%,#f8fbff_100%)] p-5 shadow-[0_8px_28px_rgba(25,63,122,.08)] sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#0867ff]/[.07]" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[.12em] text-[#0867ff] shadow-sm">
              <Sparkles size={14} aria-hidden /> Practice Studio
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-[-.04em] text-[#08245c] sm:text-4xl lg:text-[44px]">
              Hôm nay bạn muốn luyện kỹ năng nào?
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#60789d] sm:text-base">
              Chọn đúng kỹ năng bạn muốn cải thiện và bắt đầu ngay. Mỗi khu vực sử dụng bài luyện và tiến độ thật đang có trong BeaconVie.
            </p>
            <Link href="/learning-path" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0867ff] px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_20px_rgba(8,103,255,.2)] transition hover:bg-[#075be0]">
              Tiếp tục Beacon Trail <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </section>

        <section aria-labelledby="practice-skills-title">
          <div className="mb-3 flex items-end justify-between gap-4 sm:mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.14em] text-[#0867ff]">6 kỹ năng cốt lõi</p>
              <h2 id="practice-skills-title" className="mt-1 text-xl font-black tracking-[-.02em] text-[#08245c] sm:text-2xl">Chọn một phiên luyện tập</h2>
            </div>
            <span className="hidden text-sm font-bold text-[#7890b1] sm:block">Tự chọn · học theo nhịp của bạn</span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {practiceItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group relative min-h-[118px] overflow-hidden rounded-[20px] border border-[#e4ebf5] bg-white p-4 shadow-[0_5px_18px_rgba(25,63,122,.05)] transition hover:-translate-y-0.5 hover:border-[#b9d2ff] hover:shadow-[0_10px_28px_rgba(25,63,122,.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0867ff] focus-visible:ring-offset-2 sm:min-h-[180px] sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${item.tone}`}>
                      <Icon aria-hidden size={22} />
                    </span>
                    <span className="rounded-full bg-[#f5f8fc] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] text-[#7890b1]">{item.label}</span>
                  </div>
                  <h3 className="mt-2.5 text-base font-black sm:mt-4 sm:text-xl tracking-[-.02em] text-[#08245c] sm:text-xl">{item.title}</h3>
                  <p className="mt-2 hidden text-sm font-semibold leading-6 text-[#60789d] sm:block">{item.desc}</p>
                  <span className="absolute bottom-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f5ff] text-[#0867ff] transition group-hover:bg-[#0867ff] group-hover:text-white">
                    <ArrowRight size={16} aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between rounded-[18px] border border-[#e4ebf5] bg-[#f8fbff] px-4 py-3 text-sm font-bold">
          <span className="text-[#60789d]">Muốn học theo lộ trình thay vì tự chọn?</span>
          <Link href="/learning-path" className="shrink-0 text-[#0867ff]">Mở lộ trình</Link>
        </div>
      </div>
    </main>
  );
}

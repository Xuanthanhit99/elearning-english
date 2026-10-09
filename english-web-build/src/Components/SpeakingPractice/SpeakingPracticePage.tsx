"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Flame, Mic2, Target, Trophy } from "lucide-react";
import { BeaconVieLoadingState } from "@/src/Components/UI/BeaconVie";
import { getSpeakingHome, type SpeakingHomeData } from "@/src/lib/speaking-api";

const speakingLabels: Record<string, string> = {
  "Read Aloud": "Đọc thành tiếng",
  "Repeat After Me": "Nghe và nhắc lại",
  "Answer Questions": "Trả lời câu hỏi",
  "Free Talk": "Nói tự do",
};

export default function SpeakingPracticePage() {
  const router = useRouter();
  const [data, setData] = useState<SpeakingHomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSpeakingHome()
      .then((value) => active && setData(value))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) return <BeaconVieLoadingState className="m-6" label="Đang tải trang luyện nói..." />;
  if (!data) return <div className="p-6 font-semibold text-red-600">Không tải được dữ liệu luyện nói.</div>;

  const featured = data.recommendedTopics[0];
  const stats = [
    { label: "Chuỗi ngày", value: `${data.streak.days} ngày`, icon: Flame },
    { label: "Tiến độ", value: `${data.progress.percent}%`, icon: Target },
    { label: "Đã hoàn thành", value: data.progress.completed, icon: Trophy },
  ];

  return (
    <main className="min-h-screen bg-[#f7faff] px-4 py-4 text-slate-900 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-sky-600 p-4 text-white shadow-lg shadow-blue-100 sm:p-7">
          <div className="grid gap-3 sm:gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
                <Mic2 size={15} /> LUYỆN NÓI HÔM NAY
              </div>
              <h1 className="mt-2 text-2xl font-black sm:mt-3 sm:text-4xl">Sẵn sàng cất tiếng nói?</h1>
              <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-5 text-white/80 sm:mt-2 sm:line-clamp-none sm:leading-6 sm:text-base">Luyện phản xạ từng bước, nói rõ hơn và tự tin hơn qua các tình huống gần gũi.</p>
              <button onClick={() => router.push(featured ? `/speaking/topics/${featured.slug}` : "/speaking/topics")} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-700 sm:mt-5 sm:px-5 sm:py-3 sm:text-base">
                {featured ? "Luyện chủ đề được đề xuất" : "Bắt đầu luyện nói"} <ArrowRight size={18} />
              </button>
            </div>
            {featured && (
              <button onClick={() => router.push(`/speaking/topics/${featured.slug}`)} className="hidden overflow-hidden rounded-2xl bg-white/10 p-3 text-left backdrop-blur md:block">
                {featured.imageUrl ? <img src={featured.imageUrl} alt={featured.title} className="h-28 w-full rounded-xl object-cover sm:h-36" /> : <div className="grid h-28 place-items-center rounded-xl bg-white/10 text-5xl sm:h-36">🎙️</div>}
                <p className="mt-3 text-xs font-bold text-white/70">{featured.difficulty} · {featured.estimatedMinutes} phút</p>
                <h2 className="mt-1 font-black">{featured.title}</h2>
              </button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2 sm:gap-4">
          {stats.map((item) => { const Icon = item.icon; return (
            <article key={item.label} className="rounded-xl border border-blue-100 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-5">
              <Icon className="hidden text-blue-600 sm:block" size={20} />
              <p className="text-base font-black sm:mt-2 sm:text-2xl">{item.value}</p>
              <p className="mt-0.5 text-[10px] font-semibold leading-3 text-slate-500 sm:text-sm">{item.label}</p>
            </article>
          ); })}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="space-y-5">
            <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-end justify-between gap-3">
                <div><h2 className="text-xl font-black">Chọn cách luyện nói</h2><p className="mt-1 text-sm text-slate-500">Luyện đúng kỹ năng bạn cần hôm nay.</p></div>
                <button onClick={() => router.push("/speaking/topics")} className="shrink-0 text-sm font-bold text-blue-600">Xem chủ đề</button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 lg:grid-cols-3">
                {data.practiceTypes.map((item) => (
                  <button key={item.key} onClick={() => router.push("/speaking/topics")} className="rounded-xl bg-slate-50 p-3 text-left transition hover:bg-blue-50 sm:rounded-2xl sm:p-4">
                    <span className="text-2xl">{item.icon || "🎤"}</span>
                    <h3 className="mt-1 text-sm font-black sm:mt-2 sm:text-base">{speakingLabels[item.title] || item.title}</h3>
                    <p className="mt-1 hidden line-clamp-2 text-sm leading-5 text-slate-500 sm:block">{item.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black">Chủ đề dành cho bạn</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.recommendedTopics.slice(0, 6).map((topic) => (
                  <button key={topic.id} onClick={() => router.push(`/speaking/topics/${topic.slug}`)} className="overflow-hidden rounded-2xl border border-slate-100 text-left">
                    {topic.imageUrl ? <img src={topic.imageUrl} alt={topic.title} className="h-28 w-full object-cover" /> : <div className="grid h-28 place-items-center bg-blue-50 text-4xl">💬</div>}
                    <div className="p-3"><h3 className="font-black">{topic.title}</h3><p className="mt-1 text-xs text-slate-500">{topic.difficulty} · {topic.estimatedMinutes} phút</p></div>
                  </button>
                ))}
              </div>
            </section>
          </section>

          <aside className="hidden space-y-4 xl:block">
            <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <h2 className="font-black">Tiến độ Speaking</h2>
              <div className="mt-4 h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${Math.min(data.progress.percent, 100)}%` }} /></div>
              <p className="mt-3 text-sm font-semibold text-slate-600">Cấp {data.progress.currentLevel} → {data.progress.nextLevel}</p>
              <button onClick={() => router.push("/speaking/progress")} className="mt-4 w-full rounded-xl border border-blue-200 py-2.5 text-sm font-bold text-blue-600">Xem tiến độ</button>
            </section>
            <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <h2 className="font-black">Hoạt động gần đây</h2>
              <div className="mt-3 space-y-2">
                {data.recentHistory.slice(0, 3).map((item) => (
                  <button key={item.id} onClick={() => router.push(`/speaking/history/${item.id}`)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left">
                    <div className="min-w-0"><p className="truncate text-sm font-bold">{item.title}</p><p className="text-xs text-slate-500">{item.level} · {item.date}</p></div>
                    <span className="ml-2 font-black text-blue-600">{item.score}%</span>
                  </button>
                ))}
                {!data.recentHistory.length && <p className="text-sm text-slate-500">Chưa có lượt luyện nói gần đây.</p>}
              </div>
              <button onClick={() => router.push("/speaking/history")} className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white">Xem lịch sử</button>
            </section>
            <div className="flex items-center gap-2 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800"><Clock3 size={18} /> Mỗi ngày 10–15 phút để duy trì nhịp luyện.</div>
          </aside>
        </div>
      </div>
    </main>
  );
}

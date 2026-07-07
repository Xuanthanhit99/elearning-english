"use client";

import { api } from "@/src/lib/axios";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lightbulb,
  Lock,
  Search,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CategoryTopic = {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  level?: string | null;
  totalLessons: number;
  completedLessons: number;
  estimatedMinutes: number;
  rewardXp: number;
  progress: number;
  locked: boolean;
};

type CategoryRoadmap = {
  id: string;
  slug?: string | null;
  title: string;
  current: boolean;
  completed: boolean;
  locked: boolean;
  progress: number;
};

type RelatedCategory = {
  id: string;
  slug?: string | null;
  title: string;
  totalLessons: number;
};

type CategoryTip = {
  title: string;
  description: string;
};

type CategoryDetail = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  level?: string | null;
  totalTopics: number;
  completedTopics: number;
  totalLessons: number;
  completedLessons: number;
  estimatedMinutes: number;
  rewardXp: number;
  earnedXp: number;
  progress: number;
  topics: CategoryTopic[];
  roadmap: CategoryRoadmap[];
  relatedCategories: RelatedCategory[];
  tips: CategoryTip[];
};

const topicTones = [
  "bg-emerald-100 text-emerald-600",
  "bg-sky-100 text-sky-600",
  "bg-orange-100 text-orange-500",
  "bg-violet-100 text-violet-600",
];

function formatMinutes(minutes: number) {
  if (!minutes) return "0 phút";
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.round(minutes / 60)} giờ`;
}

export default function GrammarCategoryPage({ categorySlug }: { categorySlug: string }) {
  const [data, setData] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!categorySlug) return;
    let active = true;

    async function loadCategory() {
      try {
        setLoading(true);
        setMessage("");
        const res = await api.get<CategoryDetail>(`/grammar/categories/${categorySlug}/detail`);
        if (active) setData(res.data);
      } catch {
        if (active) setMessage("Chưa tải được nhóm ngữ pháp này.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCategory();
    return () => {
      active = false;
    };
  }, [categorySlug]);

  const currentTopic = useMemo(
    () => data?.topics.find((topic) => !topic.locked && topic.progress < 100) || data?.topics[0],
    [data?.topics],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbff] p-8 text-[#10164f]">
        <div className="mb-8 h-14 max-w-2xl animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-[1fr_420px] gap-7">
          <div className="h-[620px] animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-[620px] animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff] p-8 text-center text-[#10164f]">
        <div className="rounded-3xl border bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-black">Không tìm thấy nhóm ngữ pháp</h1>
          <p className="mt-2 text-slate-500">{message}</p>
          <Link href="/grammar" className="mt-6 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-black text-white">
            Quay lại Ngữ pháp
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbff] text-[#10164f]">
      <header className="sticky top-0 z-10 border-b bg-white/85 px-8 py-4 backdrop-blur">
        <div className="flex h-12 max-w-2xl items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4">
          <Search size={19} className="text-slate-400" />
          <input className="w-full bg-transparent text-sm font-medium outline-none" placeholder="Tìm bài học, từ vựng, ngữ pháp..." />
        </div>
      </header>

      <div className="grid grid-cols-[1fr_420px] gap-7 p-8">
        <main>
          <div className="mb-6 text-sm font-medium text-slate-500">
            <Link href="/" className="hover:text-violet-600">Trang chủ</Link>
            <span className="mx-3">›</span>
            <Link href="/grammar" className="hover:text-violet-600">Ngữ pháp</Link>
            <span className="mx-3">›</span>
            <b className="text-[#10164f]">{data.title}</b>
          </div>

          <section className="mb-6 flex items-center justify-between rounded-3xl border border-violet-100 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="grid h-24 w-24 place-items-center rounded-3xl bg-violet-100 text-violet-600">
                <Clock size={54} />
              </div>
              <div>
                <h1 className="text-4xl font-black">{data.title}</h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                  {data.description || "Nắm vững nhóm ngữ pháp này để diễn đạt tự nhiên và chính xác hơn."}
                </p>
              </div>
            </div>
            <div className="hidden h-36 w-64 place-items-center rounded-3xl bg-gradient-to-br from-violet-50 to-sky-50 text-violet-500 lg:grid">
              <BookOpen size={86} />
            </div>
          </section>

          <section className="mb-6 flex flex-wrap gap-4">
            <MetaPill icon={<Lightbulb size={17} />} text={data.level ? `Trình độ ${data.level}` : "Theo lộ trình"} />
            <MetaPill icon={<Calendar size={17} />} text={`${data.totalLessons} bài học`} />
            <MetaPill icon={<Timer size={17} />} text={`~ ${formatMinutes(data.estimatedMinutes)}`} />
            <MetaPill icon={<Star size={17} />} text={`+${data.rewardXp} XP khi hoàn thành`} />
          </section>

          <nav className="mb-5 flex gap-9 border-b border-violet-100">
            {["Tổng quan", `Chủ đề (${data.topics.length})`, "Tiến độ của bạn", "Mẹo ghi nhớ"].map((item, index) => (
              <button key={item} className={`pb-4 text-sm font-black ${index === 0 ? "border-b-2 border-violet-600 text-violet-600" : "text-slate-500"}`}>
                {item}
              </button>
            ))}
          </nav>

          <section className="mb-6 rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-black">Chủ đề trong nhóm {data.title}</h2>
            <div className="space-y-4">
              {data.topics.map((topic, index) => (
                <TopicCard key={topic.id} topic={topic} index={index} />
              ))}
              {!data.topics.length && (
                <p className="py-8 text-center font-bold text-slate-500">Nhóm này chưa có chủ đề.</p>
              )}
            </div>
          </section>

          <section className="mb-6 flex items-center justify-between rounded-2xl border border-orange-100 bg-orange-50 p-5">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-orange-500">
                <Lightbulb size={24} />
              </div>
              <div>
                <h3 className="font-black">Gợi ý học tập</h3>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {currentTopic ? `Hãy hoàn thành chủ đề ${currentTopic.title} để mở khóa nội dung tiếp theo.` : "Học đều mỗi ngày để giữ tiến độ tốt hơn."}
                </p>
              </div>
            </div>
            <Link href="/grammar" className="rounded-xl border border-violet-300 bg-white px-6 py-3 font-black text-violet-600">
              Xem lộ trình
            </Link>
          </section>

          <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-black">Mẹo ghi nhớ nhóm {data.title}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {data.tips.map((tip, index) => (
                <div key={tip.title} className="rounded-2xl border border-violet-100 p-5">
                  <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${topicTones[index % topicTones.length]}`}>
                    <Sparkles size={21} />
                  </div>
                  <h3 className="font-black">{tip.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{tip.description}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <ProgressPanel data={data} />
          <RoadmapPanel items={data.roadmap} />
          <RelatedPanel items={data.relatedCategories} />
        </aside>
      </div>
    </div>
  );
}

function MetaPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-black text-slate-600">
      <span className="text-violet-600">{icon}</span>
      {text}
    </div>
  );
}

function TopicCard({ topic, index }: { topic: CategoryTopic; index: number }) {
  const tone = topicTones[index % topicTones.length];
  const content = (
    <div className={`grid grid-cols-[76px_1fr_170px_30px] items-center gap-5 rounded-2xl border p-5 transition ${topic.locked ? "border-slate-100 opacity-70" : "border-violet-100 hover:border-violet-400 hover:shadow-md"}`}>
      <div className={`grid h-16 w-16 place-items-center rounded-2xl ${tone}`}>
        {topic.locked ? <Lock size={28} /> : <Calendar size={28} />}
      </div>
      <div>
        <h3 className="font-black">{topic.title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">{topic.description || "Nội dung đang được cập nhật."}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-black">
          <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-600">{topic.totalLessons} bài học</span>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-500">{formatMinutes(topic.estimatedMinutes)}</span>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-500">+{topic.rewardXp} XP</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: `conic-gradient(#7c3aed ${Math.max(0, Math.min(100, topic.progress)) * 3.6}deg, #ede9fe 0deg)` }}>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-black">{topic.locked ? <Lock size={18} /> : `${topic.progress}%`}</div>
        </div>
        <span className="text-sm font-black text-slate-500">{topic.locked ? "Chưa mở khóa" : "Tiến độ"}</span>
      </div>
      <ChevronRight className="text-slate-400" />
    </div>
  );

  if (topic.locked) return content;
  return (
    <Link href={`/grammar/topic/${topic.slug || topic.id}`} className="block">
      {content}
    </Link>
  );
}

function ProgressPanel({ data }: { data: CategoryDetail }) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-black">Tiến độ nhóm {data.title}</h2>
      <div className="flex items-center gap-7">
        <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(#7c3aed ${data.progress * 3.6}deg, #ede9fe 0deg)` }}>
          <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
            <div>
              <p className="text-3xl font-black">{data.progress}%</p>
              <p className="text-xs text-slate-500">Hoàn thành</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <ProgressLine icon={<CheckCircle2 size={18} />} value={`${data.completedTopics}/${data.totalTopics} chủ đề`} label="Đã hoàn thành" color="text-emerald-500" />
          <ProgressLine icon={<BookOpen size={18} />} value={`${data.completedLessons}/${data.totalLessons} bài học`} label="Bài học đã làm" color="text-sky-500" />
          <ProgressLine icon={<Timer size={18} />} value={formatMinutes(data.estimatedMinutes)} label="Thời gian học" color="text-pink-500" />
          <ProgressLine icon={<Star size={18} />} value={`+${data.earnedXp} XP`} label="XP đã nhận" color="text-orange-500" />
        </div>
      </div>
    </section>
  );
}

function ProgressLine({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-9 w-9 place-items-center rounded-xl bg-slate-50 ${color}`}>{icon}</div>
      <div>
        <p className="font-black">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function RoadmapPanel({ items }: { items: CategoryRoadmap[] }) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black">Lộ trình các nhóm</h2>
        <Link href="/grammar" className="text-sm font-black text-violet-600">Xem tất cả</Link>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.locked ? "#" : `/grammar/${item.slug || item.id}`}
            className={`flex items-center gap-4 rounded-2xl p-4 ${item.current ? "bg-violet-50 text-violet-700" : "text-slate-600"}`}
          >
            <div className={`grid h-10 w-10 place-items-center rounded-full ${item.completed ? "bg-emerald-100 text-emerald-600" : item.current ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-400"}`}>
              {item.locked ? <Lock size={17} /> : item.completed ? <CheckCircle2 size={18} /> : <Clock size={18} />}
            </div>
            <div className="flex-1">
              <p className="font-black">{item.title}</p>
              <p className="text-sm font-medium text-slate-500">{item.completed ? "Hoàn thành" : item.current ? "Đang học" : item.locked ? "Chưa mở khóa" : `${item.progress}% hoàn thành`}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelatedPanel({ items }: { items: RelatedCategory[] }) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black">Nhóm khác bạn có thể thích</h2>
        <Link href="/grammar" className="text-sm font-black text-violet-600">Xem tất cả</Link>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className={`grid h-14 w-14 place-items-center rounded-2xl ${topicTones[index % topicTones.length]}`}>
              <BookOpen size={25} />
            </div>
            <div className="flex-1">
              <h3 className="font-black">{item.title}</h3>
              <p className="text-sm font-medium text-slate-500">{item.totalLessons} bài học</p>
            </div>
            <Link href={`/grammar/${item.slug || item.id}`} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white">
              Học ngay
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

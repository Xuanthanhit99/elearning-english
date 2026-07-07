"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Flame,
  FlaskConical,
  Gem,
  Gift,
  Globe2,
  GraduationCap,
  Leaf,
  Monitor,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { api } from "@/src/lib/axios";

type ReadingHomeResponse = {
  stats: {
    completedArticles: number;
    averageAccuracy: number;
    totalReadingTimeText: string;
    totalXp: number;
    completedChangeText: string;
    accuracyChangeText: string;
    timeChangeText: string;
    xpChangeText: string;
  };
  categories: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
    articleCount: number;
    difficultyText: string;
  }[];
  featuredArticles: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    categoryName: string;
    categorySlug: string;
    level: string;
    difficultyText: string;
    readTimeText: string;
    questionCount: number;
    xpReward: number;
    isStarted: boolean;
    isCompleted: boolean;
  }[];
  progress: {
    percent: number;
    totalArticles: number;
    completedArticles: number;
    learningArticles: number;
    notStartedArticles: number;
  };
  currentLevel: {
    level: string;
    title: string;
    currentXp: number;
    nextLevelXp: number;
    percent: number;
  };
  streak: {
    currentStreak: number;
    week: {
      label: string;
      completed: boolean;
    }[];
  };
  suggestions: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    readTimeText: string;
    difficultyText: string;
    xpReward: number;
  }[];
};

const categoryIconMap = {
  "daily-life": BookOpen,
  education: GraduationCap,
  science: FlaskConical,
  technology: Monitor,
  environment: Leaf,
  culture: Globe2,
};

const categoryStyleMap = [
  {
    bg: "bg-purple-50",
    iconBg: "bg-purple-100",
    color: "text-purple-600",
  },
  {
    bg: "bg-sky-50",
    iconBg: "bg-sky-100",
    color: "text-sky-600",
  },
  {
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    color: "text-emerald-600",
  },
  {
    bg: "bg-orange-50",
    iconBg: "bg-orange-100",
    color: "text-orange-600",
  },
  {
    bg: "bg-green-50",
    iconBg: "bg-green-100",
    color: "text-green-600",
  },
  {
    bg: "bg-violet-50",
    iconBg: "bg-violet-100",
    color: "text-violet-600",
  },
];

const fallbackThumbnail =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&auto=format&fit=crop";

export default function ReadingPage() {
  const router = useRouter();

  const [data, setData] = useState<ReadingHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReadingHome = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get<ReadingHomeResponse | { data: ReadingHomeResponse }>(
        "/reading/home",
      );

      const payload =
        "data" in res.data && res.data.data ? res.data.data : res.data;

      setData(payload);
    } catch (err) {
      console.error(err);
      setData(null);
      setError("Không tải được dữ liệu Reading Home.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReadingHome();
  }, [fetchReadingHome]);

  const stats = useMemo(() => {
    return [
      {
        title: data?.stats.completedArticles ?? 0,
        label: "Bài đã hoàn thành",
        note: data?.stats.completedChangeText ?? "",
      },
      {
        title: `${data?.stats.averageAccuracy ?? 0}%`,
        label: "Tỷ lệ đúng trung bình",
        note: data?.stats.accuracyChangeText ?? "",
      },
      {
        title: data?.stats.totalReadingTimeText ?? "0m",
        label: "Tổng thời gian học",
        note: data?.stats.timeChangeText ?? "",
      },
      {
        title: data?.stats.totalXp ?? 0,
        label: "XP đã nhận",
        note: data?.stats.xpChangeText ?? "",
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="font-bold text-slate-700">Đang tải Reading Home...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <p className="mb-4 font-bold text-red-500">
            {error || "Không có dữ liệu Reading Home."}
          </p>
          <button
            onClick={fetchReadingHome}
            className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbff] text-slate-900">
      <main className="min-h-screen">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-slate-100 bg-white/80 px-8 backdrop-blur">
          <div className="relative w-[660px]">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              placeholder="Tìm bài đọc, chủ đề..."
              className="h-12 w-full rounded-xl border border-slate-100 bg-slate-50 pl-14 pr-4 text-sm outline-none focus:border-violet-300"
            />
          </div>

          <div className="flex items-center gap-6">
            <TopStat
              icon={<Flame className="text-red-500" />}
              value={String(data.streak.currentStreak)}
              label="Streak"
            />
            <TopStat
              icon={<Star className="text-yellow-500" />}
              value={String(data.stats.totalXp)}
              label="XP đọc hiểu"
            />
            <TopStat icon={<Gem className="text-cyan-500" />} value="0" label="Xu" />

            <div className="flex gap-3">
              <IconCircle>
                <Gift size={18} />
              </IconCircle>
              <IconCircle badge>
                <Bell size={18} />
              </IconCircle>
            </div>

            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-100 text-xl">
                👨🏻‍💻
              </div>
              <div>
                <p className="text-sm font-bold">Người học</p>
                <p className="text-xs text-slate-400">
                  {data.currentLevel.title}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-[1fr_450px] gap-7 p-8">
          <section className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-violet-100">
                  <BookOpen size={52} className="text-violet-600" />
                </div>

                <div>
                  <h1 className="text-4xl font-extrabold">Đọc hiểu</h1>
                  <p className="mt-3 max-w-2xl text-slate-500">
                    Đọc đa dạng các chủ đề và trả lời câu hỏi để nâng cao kỹ năng
                    đọc hiểu của bạn.
                  </p>
                </div>

                <div className="ml-auto pr-10 text-8xl">🦊</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {stats.map((item) => (
                <StatCard
                  key={item.label}
                  title={String(item.title)}
                  label={item.label}
                  note={item.note}
                />
              ))}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Danh mục chủ đề</h2>
                <button
                  onClick={() => router.push("/reading/categories")}
                  className="flex items-center gap-1 text-sm font-bold text-violet-600"
                >
                  Xem tất cả <ChevronRight size={16} />
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  className="absolute -left-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-white shadow"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="grid grid-cols-6 gap-4">
                  {data.categories.map((item, index) => {
                    const style =
                      categoryStyleMap[index % categoryStyleMap.length];
                    const Icon =
                      categoryIconMap[
                        item.slug as keyof typeof categoryIconMap
                      ] || BookOpen;

                    return (
                      <button
                        key={item.id}
                        onClick={() =>
                          router.push(`/reading/categories/${item.slug}`)
                        }
                        className={`${style.bg} rounded-2xl p-5 text-center transition hover:-translate-y-1 hover:shadow-md`}
                      >
                        <div
                          className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl ${style.iconBg}`}
                        >
                          <Icon className={style.color} size={28} />
                        </div>
                        <h3 className="font-extrabold">{item.name}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {item.articleCount} bài đọc
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          {item.difficultyText}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="absolute -right-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-white shadow"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-extrabold">Bài đọc nổi bật</h2>

              <div className="mb-4 flex gap-6 border-b border-slate-100">
                {["Mới nhất", "Phổ biến", "Đề xuất cho bạn"].map(
                  (tab, index) => (
                    <button
                      key={tab}
                      className={`pb-3 text-sm font-bold ${
                        index === 0
                          ? "border-b-2 border-violet-600 text-violet-600"
                          : "text-slate-500"
                      }`}
                    >
                      {tab}
                    </button>
                  ),
                )}
              </div>

              <div className="space-y-4">
                {data.featuredArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center gap-5 rounded-2xl border border-slate-100 p-4"
                  >
                    <img
                      src={article.thumbnail || fallbackThumbnail}
                      alt={article.title}
                      className="h-24 w-44 rounded-xl object-cover"
                    />

                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="font-extrabold">{article.title}</h3>
                        <span className="rounded-lg bg-violet-100 px-3 py-1 text-xs font-bold text-violet-600">
                          {article.categoryName}
                        </span>
                      </div>

                      <p className="mb-4 line-clamp-2 text-sm text-slate-500">
                        {article.description || "Chưa có mô tả cho bài đọc này."}
                      </p>

                      <div className="flex flex-wrap gap-5 text-sm text-slate-500">
                        <span>Cấp độ: {article.level}</span>
                        <span>Độ khó: {article.difficultyText}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={15} /> {article.readTimeText}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardList size={15} /> {article.questionCount} câu hỏi
                        </span>
                        <span className="font-bold text-orange-500">
                          +{article.xpReward} XP
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        router.push(`/reading/articles/${article.slug}`)
                      }
                      className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white"
                    >
                      {article.isCompleted
                        ? "Xem lại"
                        : article.isStarted
                          ? "Tiếp tục"
                          : "Bắt đầu"}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push("/reading/articles")}
                className="mt-5 w-full rounded-xl bg-slate-50 py-3 text-sm font-bold text-slate-700"
              >
                Xem tất cả bài đọc ↓
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <RightCard title="Tiến độ đọc hiểu">
              <div className="flex items-center gap-7">
                <div className="grid h-44 w-44 place-items-center rounded-full border-[12px] border-violet-600">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold">
                      {data.progress.percent}%
                    </p>
                    <p className="text-sm text-slate-500">Hoàn thành</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <ProgressItem
                    value={String(data.progress.completedArticles)}
                    label="Bài đã hoàn thành"
                  />
                  <ProgressItem
                    value={String(data.progress.learningArticles)}
                    label="Bài đang học"
                  />
                  <ProgressItem
                    value={String(data.progress.notStartedArticles)}
                    label="Bài chưa học"
                  />
                </div>
              </div>

              <p className="mt-4 text-center text-sm font-semibold text-slate-500">
                Tổng: {data.progress.totalArticles} bài đọc
              </p>
            </RightCard>

            <RightCard title="Trình độ hiện tại">
              <div className="rounded-2xl bg-violet-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-violet-100">
                    <ShieldCheck className="text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold">
                      {data.currentLevel.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Bạn đang ở trình độ tốt! Hãy tiếp tục luyện tập để lên cấp
                      độ cao hơn nhé.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-violet-600"
                  style={{ width: `${data.currentLevel.percent}%` }}
                />
              </div>

              <p className="mt-3 text-center text-sm text-slate-500">
                {data.currentLevel.currentXp} / {data.currentLevel.nextLevelXp} XP
              </p>
            </RightCard>

            <RightCard title="Chuỗi học tập">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-red-50">
                  <Flame className="text-red-500" />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-orange-500">
                    {data.streak.currentStreak} ngày
                  </p>
                  <p className="text-sm text-slate-500">Chuỗi hiện tại</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-7 gap-3 text-center">
                {data.streak.week.map((day) => (
                  <div key={day.label}>
                    <p className="mb-2 text-sm font-bold text-slate-500">
                      {day.label}
                    </p>
                    {day.completed ? (
                      <CheckCircle2 className="mx-auto text-emerald-500" />
                    ) : (
                      <div className="mx-auto h-6 w-6 rounded-full border-2 border-slate-300" />
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-5 text-center text-sm text-slate-500">
                Học liên tục để duy trì chuỗi của bạn!
              </p>
            </RightCard>

            <RightCard
              title="Gợi ý cho bạn"
              action={
                <button
                  onClick={() => router.push("/reading/articles")}
                  className="text-sm font-bold text-violet-600"
                >
                  Xem thêm
                </button>
              }
            >
              <div className="space-y-4">
                {data.suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/reading/articles/${item.slug}`)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <img
                      src={item.thumbnail || fallbackThumbnail}
                      alt={item.title}
                      className="h-14 w-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-extrabold">{item.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.readTimeText} · {item.difficultyText}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-violet-600">
                      +{item.xpReward} XP
                    </span>
                  </button>
                ))}
              </div>
            </RightCard>
          </aside>
        </div>
      </main>
    </div>
  );
}

function IconCircle({
  children,
  badge,
}: {
  children: ReactNode;
  badge?: boolean;
}) {
  return (
    <div className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-violet-600">
      {children}
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-bold text-white">
          2
        </span>
      )}
    </div>
  );
}

function TopStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-sm font-extrabold">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  label,
  note,
}: {
  title: string;
  label: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-violet-50 text-violet-600">
          <ClipboardList />
        </div>
        <div>
          <p className="text-2xl font-extrabold">{title}</p>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-2 text-xs font-semibold text-emerald-500">{note}</p>
        </div>
      </div>
    </div>
  );
}

function RightCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ProgressItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50">
        <CheckCircle2 size={18} className="text-emerald-500" />
      </div>
      <div>
        <p className="font-extrabold">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

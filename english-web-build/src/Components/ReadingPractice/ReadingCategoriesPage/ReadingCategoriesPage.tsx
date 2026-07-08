"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  Home,
  BarChart3,
  BookText,
  Headphones,
  Mic,
  PenTool,
  Layers,
  Users,
  HelpCircle,
  Trophy,
  ShoppingBag,
  Settings,
  Crown,
  Gift,
  Bell,
  Flame,
  Star,
  Gem,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  GraduationCap,
  Leaf,
  Monitor,
  FlaskConical,
  HeartPulse,
  TrophyIcon,
  Plane,
  Landmark,
  Palette,
  BriefcaseBusiness,
  Building2,
} from "lucide-react";
import { api } from "@/src/lib/axios";

type DifficultyFilter = "ALL" | "EASY" | "MEDIUM" | "HARD";
type SortType = "recommended" | "newest" | "progress" | "name";

type ReadingCategoriesResponse = {
  summary: {
    totalCategories: number;
    totalArticles: number;
  };
  categories: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    icon: string | null;
    color: string | null;
    articleCount: number;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    difficultyText: string;
    completedArticleCount: number;
    progressPercent: number;
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
  suggestedCategories: {
    id: string;
    name: string;
    slug: string;
    thumbnail: string | null;
    reason: string;
  }[];
};

const menuGroups = [
  {
    title: "",
    items: [{ label: "Trang chủ", icon: Home, href: "/" }],
  },
  {
    title: "Học tập",
    items: [
      { label: "Tổng quan", icon: BarChart3, href: "/dashboard" },
      { label: "Từ vựng", icon: BookText, href: "/vocabulary" },
      { label: "Ngữ pháp", icon: Layers, href: "/grammar" },
      { label: "Nghe", icon: Headphones, href: "/listening" },
      { label: "Nói", icon: Mic, href: "/speaking" },
      { label: "Đọc hiểu", icon: BookOpen, href: "/reading", active: true },
      { label: "Viết", icon: PenTool, href: "/writing" },
      { label: "Flashcards", icon: Layers, href: "/flashcards" },
    ],
  },
  {
    title: "Cộng đồng",
    items: [
      { label: "Cộng đồng", icon: Users, href: "/community" },
      { label: "Hỏi đáp", icon: HelpCircle, href: "/questions" },
      { label: "Thành tích", icon: Trophy, href: "/achievements" },
    ],
  },
  {
    title: "Khác",
    items: [
      { label: "Khoá học", icon: BookText, href: "/courses" },
      { label: "Shop", icon: ShoppingBag, href: "/shop" },
      { label: "Cài đặt", icon: Settings, href: "/settings" },
    ],
  },
];

const iconMap = {
  "daily-life": BookOpen,
  education: GraduationCap,
  environment: Leaf,
  technology: Monitor,
  culture: Building2,
  health: HeartPulse,
  science: FlaskConical,
  sports: TrophyIcon,
  business: BriefcaseBusiness,
  travel: Plane,
  history: Landmark,
  "art-literature": Palette,
  "art-&-literature": Palette,
};

const fallbackImages = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop",
];

export default function ReadingCategoriesPage() {
  const router = useRouter();

  const [data, setData] = useState<ReadingCategoriesResponse | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [sort, setSort] = useState<SortType>("recommended");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");


      const params = new URLSearchParams();

      if (difficulty !== "ALL") {
        params.set("difficulty", difficulty);
      }

      if (sort) {
        params.set("sort", sort);
      }


      const res = await api.get(
        `/reading/categories?${params.toString()}`,
      );

    const payload = res.data?.data ?? res.data;

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [difficulty, sort]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const keyword = searchKeyword.trim();

    if (!keyword) {
      router.push("/reading/articles");
      return;
    }

    router.push(`/reading/articles?keyword=${encodeURIComponent(keyword)}`);
  }

  function resetFilters() {
    setDifficulty("ALL");
    setSort("recommended");
  }

  function handleDifficultyChange(nextDifficulty: DifficultyFilter) {
    setDifficulty(nextDifficulty);
  }

  function handleSortChange(nextSort: SortType) {
    setSort(nextSort);
  }

  function handleCategoryClick(slug: string) {
    router.push(`/reading/categories/${slug}`);
  }

  const totalCategoryText = useMemo(() => {
    return data?.summary.totalCategories ?? 0;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="font-bold text-slate-700">Đang tải danh sách chủ đề...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbff]">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
          <p className="mb-4 font-bold text-red-500">{error}</p>
          <button
            onClick={fetchCategories}
            className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#fbfbff] text-slate-900">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-[260px] border-r border-slate-100 bg-white px-5 py-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-10 flex items-center gap-3 text-left"
          >
            <div className="text-3xl">🦊</div>
            <div className="text-2xl font-extrabold">
              Study<span className="text-violet-600">Arena</span>
            </div>
          </button>

          <nav className="space-y-7">
            {menuGroups.map((group, index) => (
              <div key={index}>
                {group.title && (
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </p>
                )}

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                        item.active
                          ? "bg-violet-100 text-violet-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-violet-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold text-violet-700">
              <Crown size={18} className="text-yellow-500" />
              Nâng cấp Premium
            </div>
            <p className="mb-4 text-sm leading-5 text-slate-500">
              Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
            </p>
            <button
              type="button"
              onClick={() => router.push("/premium")}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
            >
              Nâng cấp ngay
            </button>
            <div className="absolute bottom-2 right-3 text-5xl">🦊</div>
          </div>
        </aside>

        <main className="ml-[260px] flex-1">
          <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-slate-100 bg-white/80 px-8 backdrop-blur">
            <form onSubmit={handleSearchSubmit} className="relative w-[660px]">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="Tìm bài học, từ vựng, ngữ pháp..."
                className="h-12 w-full rounded-xl border border-slate-100 bg-slate-50 pl-14 pr-12 text-sm outline-none focus:border-violet-300"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 hover:text-violet-600"
                >
                  ×
                </button>
              )}
            </form>

            <div className="flex items-center gap-6">
              <TopStat
                icon={<Flame className="text-red-500" />}
                value={String(data.streak.currentStreak)}
                label="Streak"
                onClick={() => router.push("/dashboard")}
              />
              <TopStat
                icon={<Star className="text-yellow-500" />}
                value={String(data.currentLevel.currentXp)}
                label="XP đọc hiểu"
                onClick={() => router.push("/reading/articles")}
              />
              <TopStat
                icon={<Gem className="text-cyan-500" />}
                value="0"
                label="Xu"
                onClick={() => router.push("/shop")}
              />

              <div className="flex gap-3">
                <IconCircle onClick={() => router.push("/rewards")}>
                  <Gift size={18} />
                </IconCircle>
                <IconCircle badge onClick={() => router.push("/notifications")}>
                  <Bell size={18} />
                </IconCircle>
              </div>

              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="flex items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-slate-50"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-100 text-xl">
                  👨🏻‍💻
                </div>
                <div>
                  <p className="text-sm font-bold">Minh Anh</p>
                  <p className="text-xs text-slate-400">{data.currentLevel.title}</p>
                </div>
              </button>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_430px] gap-7 p-8">
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <button onClick={() => router.push("/reading")}>Đọc hiểu</button>
                <ChevronRight size={16} />
                <span className="text-slate-900">Danh sách chủ đề</span>
              </div>

              <button
                type="button"
                onClick={() => router.push("/reading/articles")}
                className="flex w-full items-center justify-between rounded-3xl bg-white px-6 py-5 text-left transition hover:shadow-sm"
              >
                <div className="flex items-center gap-5">
                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-violet-100">
                    <BookOpen size={42} className="text-violet-600" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-extrabold">Danh sách chủ đề</h1>
                    <p className="mt-3 text-slate-500">
                      Khám phá các chủ đề đa dạng để luyện kỹ năng đọc hiểu của bạn.
                    </p>
                  </div>
                </div>

                <div className="pr-12 text-7xl">📚☕</div>
              </button>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <FilterButton
                      active={difficulty === "ALL"}
                      label={`Tất cả chủ đề (${totalCategoryText})`}
                      onClick={() => handleDifficultyChange("ALL")}
                    />
                    <FilterButton
                      active={difficulty === "EASY"}
                      label="Dễ"
                      onClick={() => handleDifficultyChange("EASY")}
                    />
                    <FilterButton
                      active={difficulty === "MEDIUM"}
                      label="Trung bình"
                      onClick={() => handleDifficultyChange("MEDIUM")}
                    />
                    <FilterButton
                      active={difficulty === "HARD"}
                      label="Khó"
                      onClick={() => handleDifficultyChange("HARD")}
                    />
                  </div>

                  <select
                    value={sort}
                    onChange={(e) => handleSortChange(e.target.value as SortType)}
                    className="rounded-xl bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 outline-none"
                  >
                    <option value="recommended">Sắp xếp: Đề xuất</option>
                    <option value="progress">Sắp xếp: Tiến độ</option>
                    <option value="newest">Sắp xếp: Mới nhất</option>
                    <option value="name">Sắp xếp: Tên A-Z</option>
                  </select>
                </div>
              </div>

              {loading && (
                <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                  Đang cập nhật dữ liệu...
                </div>
              )}

              {data.categories.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <p className="font-bold text-slate-700">
                    Chưa có chủ đề phù hợp.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-6">
                  {data.categories.map((item, index) => {
                    const Icon =
                      iconMap[item.slug as keyof typeof iconMap] || BookOpen;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleCategoryClick(item.slug)}
                        className="overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                      >
                        <img
                          src={item.thumbnail || fallbackImages[index % fallbackImages.length]}
                          alt={item.name}
                          className="h-36 w-full object-cover"
                        />

                        <div className="p-4">
                          <h3 className="text-lg font-extrabold">{item.name}</h3>
                          <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-500">
                            {item.description || "Chủ đề luyện đọc hiểu tiếng Anh."}
                          </p>

                          <div className="mt-4 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 font-semibold text-slate-500">
                              <Icon size={16} />
                              {item.articleCount} bài đọc
                            </div>
                            <span
                              className={`rounded-lg px-2 py-1 text-xs font-bold ${getDifficultyBadge(
                                item.difficulty,
                              )}`}
                            >
                              {item.difficultyText}
                            </span>
                          </div>

                          <div className="mt-4 flex items-center gap-3">
                            <div className="h-2 flex-1 rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-violet-600"
                                style={{ width: `${item.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-sm font-extrabold">
                              {item.progressPercent}%
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
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
                      <h3 className="font-extrabold">{data.currentLevel.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Bạn đang ở trình độ tốt! Hãy tiếp tục luyện tập để lên cấp độ cao hơn nhé.
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
                title="Gợi ý chủ đề cho bạn"
                action={
                  <button
                    type="button"
                    onClick={() => router.push("/reading/articles")}
                    className="text-sm font-bold text-violet-600"
                  >
                    Xem thêm
                  </button>
                }
              >
                <div className="space-y-5">
                  {data.suggestedCategories.map((item, index) => (
                    <SuggestCard
                      key={item.id}
                      image={item.thumbnail || fallbackImages[index % fallbackImages.length]}
                      title={item.name}
                      desc={item.reason}
                      onClick={() => router.push(`/reading/categories/${item.slug}`)}
                    />
                  ))}
                </div>
              </RightCard>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function getDifficultyBadge(difficulty: "EASY" | "MEDIUM" | "HARD") {
  if (difficulty === "EASY") return "bg-emerald-100 text-emerald-600";
  if (difficulty === "MEDIUM") return "bg-blue-100 text-blue-600";
  return "bg-orange-100 text-orange-600";
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-5 py-3 text-sm font-bold ${
        active
          ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
          : "bg-slate-50 text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function SuggestCard({
  image,
  title,
  desc,
  onClick,
}: {
  image: string;
  title: string;
  desc: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl p-2 text-left transition hover:bg-slate-50"
    >
      <img src={image} alt={title} className="h-14 w-16 rounded-lg object-cover" />
      <div className="flex-1">
        <h4 className="font-extrabold">{title}</h4>
        <p className="mt-1 text-sm text-slate-500">{desc}</p>
      </div>
      <span className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-bold text-violet-600">
        Khám phá
      </span>
    </button>
  );
}

function IconCircle({
  children,
  badge,
  onClick,
}: {
  children: ReactNode;
  badge?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-violet-600 transition hover:bg-violet-50"
    >
      {children}
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-bold text-white">
          2
        </span>
      )}
    </button>
  );
}

function TopStat({
  icon,
  value,
  label,
  onClick,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-2 py-1 text-left transition hover:bg-slate-50"
    >
      {icon}
      <div>
        <p className="text-sm font-extrabold">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </button>
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
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Flame,
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
      setError(err instanceof Error ? err.message : "CÃ³ lá»—i xáº£y ra");
    } finally {
      setLoading(false);
    }
  }, [difficulty, sort]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
          <p className="font-bold text-slate-700">Äang táº£i danh sÃ¡ch chá»§ Ä‘á»...</p>
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
            Táº£i láº¡i
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#fbfbff] text-slate-900">
      <div className="flex">

        <main className="flex-1">

          <div className="grid grid-cols-[1fr_430px] gap-7 p-8">
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <button onClick={() => router.push("/reading")}>Äá»c hiá»ƒu</button>
                <ChevronRight size={16} />
                <span className="text-slate-900">Danh sÃ¡ch chá»§ Ä‘á»</span>
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
                    <h1 className="text-4xl font-extrabold">Danh sÃ¡ch chá»§ Ä‘á»</h1>
                    <p className="mt-3 text-slate-500">
                      KhÃ¡m phÃ¡ cÃ¡c chá»§ Ä‘á» Ä‘a dáº¡ng Ä‘á»ƒ luyá»‡n ká»¹ nÄƒng Ä‘á»c hiá»ƒu cá»§a báº¡n.
                    </p>
                  </div>
                </div>

                <div className="pr-12 text-7xl">ðŸ“šâ˜•</div>
              </button>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <FilterButton
                      active={difficulty === "ALL"}
                      label={`Táº¥t cáº£ chá»§ Ä‘á» (${totalCategoryText})`}
                      onClick={() => handleDifficultyChange("ALL")}
                    />
                    <FilterButton
                      active={difficulty === "EASY"}
                      label="Dá»…"
                      onClick={() => handleDifficultyChange("EASY")}
                    />
                    <FilterButton
                      active={difficulty === "MEDIUM"}
                      label="Trung bÃ¬nh"
                      onClick={() => handleDifficultyChange("MEDIUM")}
                    />
                    <FilterButton
                      active={difficulty === "HARD"}
                      label="KhÃ³"
                      onClick={() => handleDifficultyChange("HARD")}
                    />
                  </div>

                  <select
                    value={sort}
                    onChange={(e) => handleSortChange(e.target.value as SortType)}
                    className="rounded-xl bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 outline-none"
                  >
                    <option value="recommended">Sáº¯p xáº¿p: Äá» xuáº¥t</option>
                    <option value="progress">Sáº¯p xáº¿p: Tiáº¿n Ä‘á»™</option>
                    <option value="newest">Sáº¯p xáº¿p: Má»›i nháº¥t</option>
                    <option value="name">Sáº¯p xáº¿p: TÃªn A-Z</option>
                  </select>
                </div>
              </div>

              {loading && (
                <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                  Äang cáº­p nháº­t dá»¯ liá»‡u...
                </div>
              )}

              {data.categories.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <p className="font-bold text-slate-700">
                    ChÆ°a cÃ³ chá»§ Ä‘á» phÃ¹ há»£p.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    XÃ³a bá»™ lá»c
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
                            {item.description || "Chá»§ Ä‘á» luyá»‡n Ä‘á»c hiá»ƒu tiáº¿ng Anh."}
                          </p>

                          <div className="mt-4 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 font-semibold text-slate-500">
                              <Icon size={16} />
                              {item.articleCount} bÃ i Ä‘á»c
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
              <RightCard title="Tiáº¿n Ä‘á»™ Ä‘á»c hiá»ƒu">
                <div className="flex items-center gap-7">
                  <div className="grid h-44 w-44 place-items-center rounded-full border-[12px] border-violet-600">
                    <div className="text-center">
                      <p className="text-4xl font-extrabold">
                        {data.progress.percent}%
                      </p>
                      <p className="text-sm text-slate-500">HoÃ n thÃ nh</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <ProgressItem
                      value={String(data.progress.completedArticles)}
                      label="BÃ i Ä‘Ã£ hoÃ n thÃ nh"
                    />
                    <ProgressItem
                      value={String(data.progress.learningArticles)}
                      label="BÃ i Ä‘ang há»c"
                    />
                    <ProgressItem
                      value={String(data.progress.notStartedArticles)}
                      label="BÃ i chÆ°a há»c"
                    />
                  </div>
                </div>

                <p className="mt-4 text-center text-sm font-semibold text-slate-500">
                  Tá»•ng: {data.progress.totalArticles} bÃ i Ä‘á»c
                </p>
              </RightCard>

              <RightCard title="TrÃ¬nh Ä‘á»™ hiá»‡n táº¡i">
                <div className="rounded-2xl bg-violet-50 p-5">
                  <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-violet-100">
                      <ShieldCheck className="text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold">{data.currentLevel.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Báº¡n Ä‘ang á»Ÿ trÃ¬nh Ä‘á»™ tá»‘t! HÃ£y tiáº¿p tá»¥c luyá»‡n táº­p Ä‘á»ƒ lÃªn cáº¥p Ä‘á»™ cao hÆ¡n nhÃ©.
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

              <RightCard title="Chuá»—i há»c táº­p">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-red-50">
                    <Flame className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-orange-500">
                      {data.streak.currentStreak} ngÃ y
                    </p>
                    <p className="text-sm text-slate-500">Chuá»—i hiá»‡n táº¡i</p>
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
                  Há»c liÃªn tá»¥c Ä‘á»ƒ duy trÃ¬ chuá»—i cá»§a báº¡n!
                </p>
              </RightCard>

              <RightCard
                title="Gá»£i Ã½ chá»§ Ä‘á» cho báº¡n"
                action={
                  <button
                    type="button"
                    onClick={() => router.push("/reading/articles")}
                    className="text-sm font-bold text-violet-600"
                  >
                    Xem thÃªm
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
        KhÃ¡m phÃ¡
      </span>
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
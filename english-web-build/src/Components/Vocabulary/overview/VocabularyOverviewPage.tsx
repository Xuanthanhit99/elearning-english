"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";

type OverviewData = {
  user?: { name?: string };
  profile?: {
    level?: string;
    levelName?: string;
    levelNumber?: number;
    xp?: number;
    nextXp?: number;
    xpProgress?: number;
  };
  stats?: {
    lessonsLearned?: number;
    testsTaken?: number;
    averageScore?: number;
    streakDays?: number;
    learnedToday?: number;
    learnedWords?: number;
    masteredWords?: number;
    reviewDue?: number;
  };
  todayPlan?: {
    topic?: string;
    items?: Array<{
      key: string;
      title: string;
      subtitle: string;
      completed: number;
      total: number;
      done: boolean;
    }>;
  };
  review?: {
    total?: number;
    urgent?: number;
    grammar?: number;
    exercises?: number;
    words?: Array<{
      id: string;
      word: string;
      phonetic?: string | null;
      meaningVi?: string | null;
      topic?: string;
      level?: string;
      priority?: string;
      lastReviewed?: string;
    }>;
  };
  skills?: Array<{
    key: string;
    label: string;
    percent: number;
    status: string;
  }>;
  achievements?: Array<{
    key: string;
    title: string;
    subtitle: string;
    icon: AppIconName;
  }>;
};

const statCards: Array<{
  key: keyof NonNullable<OverviewData["stats"]>;
  title: string;
  suffix?: string;
  icon: AppIconName;
  tone: "blue" | "emerald" | "pink" | "yellow";
  hint: string;
}> = [
  {
    key: "lessonsLearned",
    title: "Bài học đã học",
    icon: "book",
    tone: "blue",
    hint: "Tăng hôm nay",
  },
  {
    key: "testsTaken",
    title: "Bài kiểm tra",
    icon: "check",
    tone: "emerald",
    hint: "Đã hoàn thành",
  },
  {
    key: "averageScore",
    title: "Điểm trung bình",
    suffix: "%",
    icon: "target",
    tone: "pink",
    hint: "Tuần này",
  },
  {
    key: "streakDays",
    title: "Ngày học liên tục",
    icon: "calendar",
    tone: "yellow",
    hint: "Tuyệt vời",
  },
];

const skillIcons: Record<string, AppIconName> = {
  vocabulary: "pen",
  grammar: "exercise",
  listening: "headphones",
  speaking: "mic",
  reading: "book",
  writing: "pen",
};

const skillTones: Array<"purple" | "emerald" | "blue" | "orange" | "pink" | "cyan"> = [
  "purple",
  "emerald",
  "blue",
  "orange",
  "pink",
  "cyan",
];

const skillBorderColors = {
  purple: "#8b5cf6",
  emerald: "#22c55e",
  blue: "#3b82f6",
  orange: "#f59e0b",
  pink: "#ec4899",
  cyan: "#06b6d4",
};

function numberText(value?: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_520px]">
      <div className="h-[210px] animate-pulse rounded-3xl bg-[#f0ecff]" />
      <div className="h-[210px] animate-pulse rounded-3xl bg-white" />
      <div className="h-[360px] animate-pulse rounded-3xl bg-white xl:col-span-2" />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  suffix = "",
  tone,
  hint,
}: {
  icon: AppIconName;
  label: string;
  value?: number;
  suffix?: string;
  tone: "blue" | "emerald" | "pink" | "yellow";
  hint: string;
}) {
  return (
    <section className="rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
      <AppIcon name={icon} tone={tone} />
      <p className="mt-5 text-sm font-bold text-[#69708b]">{label}</p>
      <strong className="mt-1 block text-3xl font-black text-[#111842]">
        {numberText(value)}
        {suffix}
      </strong>
      <p className="mt-2 text-xs font-black text-emerald-500">{hint}</p>
    </section>
  );
}

function CircleScore({
  percent,
  label,
  status,
  icon,
  tone,
}: {
  percent: number;
  label: string;
  status: string;
  icon: AppIconName;
  tone: "purple" | "emerald" | "blue" | "orange" | "pink" | "cyan";
}) {
  return (
    <div className="text-center">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[5px] bg-white"
        style={{ borderColor: skillBorderColors[tone] }}
      >
        <AppIcon name={icon} bare size={24} className="text-[#6d35ff]" />
      </div>
      <p className="mt-3 text-sm font-black text-[#111842]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#6d35ff]">{percent}%</p>
      <p className="text-xs font-bold text-[#69708b]">{status}</p>
    </div>
  );
}

export default function VocabularyOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        setLoading(true);
        const res = await api.get<OverviewData>("/vocabulary/overview");
        if (active) setData(res.data);
      } catch {
        if (active) setMessage("Chưa tải được tổng quan học tập. Hãy thử lại sau.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOverview();
    return () => {
      active = false;
    };
  }, []);

  const planItems = data?.todayPlan?.items || [];
  const skills = data?.skills || [];
  const achievements = data?.achievements || [];
  const reviewWords = data?.review?.words || [];
  const xpProgress = data?.profile?.xpProgress || 0;

  const greeting = useMemo(() => {
    const raw = data?.user?.name || "bạn";
    return raw.split(" ")[0] || raw;
  }, [data?.user?.name]);

  return (
    <div className="px-4 py-7 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#101733]">Tổng quan học tập</h1>
          <p className="mt-2 text-sm font-bold text-[#6a708d]">
            Chào lại {greeting}! Cùng tiếp tục hành trình chinh phục tiếng Anh nhé!
          </p>
        </div>
      </div>

      {loading ? (
        <OverviewSkeleton />
      ) : message ? (
        <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600">
          {message}
        </section>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_1.45fr]">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7b4cff] to-[#9b78ff] p-7 text-white shadow-[0_18px_42px_rgba(101,44,255,0.22)]">
              <div className="relative z-10 max-w-[260px]">
                <p className="text-sm font-black text-white/80">Cấp độ hiện tại</p>
                <div className="mt-5 flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/18 text-2xl font-black ring-1 ring-white/20">
                    {data?.profile?.levelNumber || 1}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">
                      {data?.profile?.levelName || "Explorer"}
                    </h2>
                    <p className="text-sm font-bold text-white/80">
                      Level {data?.profile?.level || "A1"}
                    </p>
                  </div>
                </div>
                <div className="mt-8">
                  <div className="mb-2 flex justify-between text-xs font-black text-white/85">
                    <span>XP hiện tại</span>
                    <span>
                      {numberText(data?.profile?.xp)} / {numberText(data?.profile?.nextXp)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-white/25">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>
              </div>
              <Image
                src="/poppylingo-logo.png"
                alt="Lumiverse"
                width={180}
                height={180}
                className="absolute bottom-3 right-4 w-40 drop-shadow-2xl"
                priority
              />
            </section>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <MetricCard
                  key={card.key}
                  icon={card.icon}
                  label={card.title}
                  value={data?.stats?.[card.key] as number}
                  suffix={card.suffix}
                  tone={card.tone}
                  hint={card.hint}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_520px]">
            <section className="relative overflow-hidden rounded-3xl border border-[#ebeaf6] bg-white p-7 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-black text-[#101733]">Kế hoạch học hôm nay</h2>
                <span className="text-sm font-black text-[#6d35ff]">
                  {new Date().toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div className="mt-7 max-w-[520px] space-y-5">
                {planItems.map((item, index) => (
                  <div key={item.key} className="flex gap-4">
                    <span
                      className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                        item.done
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-[#f2efff] text-[#8a80a9]"
                      }`}
                    >
                      {item.done ? "✓" : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-black text-[#111842]">{item.title}</h3>
                        <span className="text-xs font-black text-[#6d35ff]">
                          {item.completed}/{item.total}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-[#69708b]">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/vocabulary"
                className="mt-7 inline-flex h-12 min-w-[220px] items-center justify-center rounded-xl bg-[#6d35ff] px-6 text-sm font-black text-white shadow-[0_12px_24px_rgba(101,44,255,0.18)]"
              >
                <AppIcon name="zap" bare size={17} className="mr-2" />
                Tiếp tục học
              </Link>
              <Image
                src="/poppylingo-logo.png"
                alt="Mascot"
                width={210}
                height={210}
                className="absolute bottom-4 right-8 hidden w-48 opacity-95 md:block"
              />
            </section>

            <section className="rounded-3xl border border-[#ebeaf6] bg-white p-7 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-[#101733]">Cần ôn lại</h2>
                <Link href="/vocabulary/review" className="text-sm font-black text-[#6d35ff]">
                  Xem tất cả
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: "Từ vựng", value: data?.review?.total || 0, sub: "từ cần ôn", icon: "book" as AppIconName },
                  { label: "Ngữ pháp", value: data?.review?.grammar || 0, sub: "chủ điểm", icon: "library" as AppIconName },
                  { label: "Bài tập", value: data?.review?.exercises || 0, sub: "bài tập", icon: "notebook" as AppIconName },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-[#faf9ff] p-4">
                    <AppIcon name={item.icon} tone="purple" />
                    <p className="mt-3 text-xs font-bold text-[#8b91aa]">{item.label}</p>
                    <strong className="text-2xl font-black text-[#111842]">{item.value}</strong>
                    <p className="text-xs font-bold text-[#69708b]">{item.sub}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 divide-y divide-[#ebeaf6] rounded-2xl border border-[#ebeaf6]">
                {reviewWords.length ? (
                  reviewWords.map((word) => (
                    <div key={word.id} className="grid grid-cols-[1fr_auto] gap-3 p-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-[#f2efff] px-2 py-1 text-xs font-black text-[#6d35ff]">
                            {word.topic || "Từ vựng"}
                          </span>
                          <strong className="text-sm font-black text-[#111842]">
                            {word.word}
                          </strong>
                        </div>
                        <p className="mt-1 text-xs font-bold text-[#69708b]">
                          {word.phonetic || word.meaningVi || "Ôn lại từ này"}
                        </p>
                      </div>
                      <span
                        className={`self-center text-xs font-black ${
                          word.priority === "Khó"
                            ? "text-red-500"
                            : word.priority === "Trung bình"
                              ? "text-amber-500"
                              : "text-[#8b91aa]"
                        }`}
                      >
                        {word.priority}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-5 text-sm font-bold text-[#69708b]">
                    Chưa có từ cần ôn. Hãy học thêm từ mới để hệ thống gợi ý nhé.
                  </p>
                )}
              </div>
              <Link
                href="/vocabulary/review"
                className="mt-5 flex h-12 items-center justify-center rounded-xl border border-[#bfaeff] text-sm font-black text-[#6d35ff] hover:bg-[#f7f3ff]"
              >
                Ôn tập ngay
              </Link>
            </section>

            <section className="rounded-3xl border border-[#ebeaf6] bg-white p-7 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-[#101733]">Tiến độ kỹ năng</h2>
                <Link href="/vocabulary/skills" className="text-sm font-black text-[#6d35ff]">
                  Chi tiết
                </Link>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
                {skills.map((skill, index) => (
                  <CircleScore
                    key={skill.key}
                    percent={skill.percent}
                    label={skill.label}
                    status={skill.status}
                    icon={skillIcons[skill.key] || "star"}
                    tone={skillTones[index % skillTones.length]}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#ebeaf6] bg-white p-7 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-[#101733]">Thành tích gần đây</h2>
                <Link href="/vocabulary/achievements" className="text-sm font-black text-[#6d35ff]">
                  Xem tất cả
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.key}
                    className="rounded-2xl border border-[#ebeaf6] bg-[#fbfaff] p-4 text-center"
                  >
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-[0_10px_24px_rgba(35,35,80,0.06)]">
                      <AppIcon name={achievement.icon} tone="yellow" />
                    </div>
                    <h3 className="mt-4 text-sm font-black text-[#111842]">{achievement.title}</h3>
                    <p className="mt-1 text-xs font-bold text-[#69708b]">
                      {achievement.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/src/lib/axios";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";

type SkillItem = {
  key: string;
  label: string;
  percent: number;
  status: string;
  icon: AppIconName;
  trend: Array<{ label: string; value: number }>;
};

type SkillData = {
  summary: {
    averageProgress: number;
    improvedSkills: number;
    totalStudyTime: string;
    xpEarned: number;
    rangeLabel: string;
  };
  skills: SkillItem[];
  strongest: { key: string; label: string; percent: number; message: string };
  weakest: { key: string; label: string; percent: number; message: string };
  activities: Array<{
    skill: string;
    title: string;
    subtitle: string;
    time: string;
    xp: number;
    icon: AppIconName;
  }>;
  recommendations: Array<{
    title: string;
    subtitle: string;
    href: string;
    icon: AppIconName;
  }>;
};

const skillTones: Record<string, { text: string; bg: string; stroke: string }> = {
  vocabulary: { text: "text-[#7c3aed]", bg: "bg-[#f3edff]", stroke: "#7c3aed" },
  grammar: { text: "text-[#22c55e]", bg: "bg-emerald-50", stroke: "#22c55e" },
  listening: { text: "text-[#1683ff]", bg: "bg-blue-50", stroke: "#1683ff" },
  speaking: { text: "text-[#f59e0b]", bg: "bg-amber-50", stroke: "#f59e0b" },
  reading: { text: "text-[#ec4899]", bg: "bg-pink-50", stroke: "#ec4899" },
  writing: { text: "text-[#06b6d4]", bg: "bg-cyan-50", stroke: "#06b6d4" },
};

function numberText(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

export default function SkillProgressPage() {
  const [data, setData] = useState<SkillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const res = await api.get<SkillData>("/vocabulary/overview/skills");
        if (active) setData(res.data);
      } catch {
        if (active) setMessage("Chưa tải được tiến độ kỹ năng.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const labels = data?.skills?.[0]?.trend?.map((item) => item.label) || [];
  const strongest = useMemo(
    () => data?.skills.find((item) => item.key === data.strongest.key),
    [data],
  );
  const weakest = useMemo(
    () => data?.skills.find((item) => item.key === data.weakest.key),
    [data],
  );

  if (loading) {
    return (
      <div className="px-4 py-7 lg:px-8">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-[#efeaff]" />
        <div className="mt-6 grid gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || message) {
    return (
      <div className="px-4 py-7 lg:px-8">
        <section className="rounded-3xl border border-red-100 bg-red-50 p-6 font-bold text-red-600">
          {message || "Không có dữ liệu kỹ năng."}
        </section>
      </div>
    );
  }

  return (
    <div className="px-4 py-7 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#73799b]">
            <Link href="/">Trang chủ</Link>
            <ChevronRight size={16} />
            <Link href="/vocabulary/overview">Tổng quan</Link>
            <ChevronRight size={16} />
            <span className="text-[#101733]">Tiến độ kỹ năng</span>
          </div>
          <h1 className="text-3xl font-black text-[#101733]">Tiến độ kỹ năng</h1>
          <p className="mt-3 text-base font-bold text-[#69708b]">
            Theo dõi sự tiến bộ của bạn ở 6 kỹ năng cốt lõi
          </p>
        </div>
        <button className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#dfe2f3] bg-white px-5 text-sm font-black text-[#27245f]">
          <AppIcon name="calendar" bare size={17} /> {data.summary.rangeLabel}
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {data.skills.map((skill) => (
          <SkillCard key={skill.key} skill={skill} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_470px]">
        <section className="rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#101733]">Biểu đồ tiến độ</h2>
              <p className="mt-2 text-sm font-bold text-[#69708b]">
                Sự tiến bộ của 6 kỹ năng trong 7 ngày qua
              </p>
            </div>
            <button className="rounded-xl border border-[#dfe2f3] bg-white px-4 py-3 text-sm font-black text-[#27245f]">
              Tất cả kỹ năng
            </button>
          </div>

          <SkillChart skills={data.skills} labels={labels} />

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <SummaryStat icon="sparkles" value="+12%" label="Tiến bộ trung bình" sub="so với 7 ngày trước" />
            <SummaryStat icon="target" value={`${data.summary.improvedSkills}/6`} label="Kỹ năng cải thiện" sub="so với tuần trước" />
            <SummaryStat icon="calendar" value={data.summary.totalStudyTime} label="Tổng thời gian học" sub="trong 7 ngày qua" />
            <SummaryStat icon="star" value={numberText(data.summary.xpEarned)} label="XP nhận được" sub="trong 7 ngày qua" />
          </div>
        </section>

        <aside className="space-y-5">
          {strongest && (
            <InsightCard
              title="Kỹ năng mạnh nhất"
              skill={strongest}
              message={data.strongest.message}
              positive
            />
          )}
          {weakest && (
            <InsightCard
              title="Kỹ năng cần cải thiện"
              skill={weakest}
              message={data.weakest.message}
            />
          )}
          <section className="rounded-3xl border border-[#ebeaf6] bg-white p-5 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
            <h3 className="font-black text-[#101733]">Gợi ý cho bạn</h3>
            <div className="mt-4 space-y-3">
              {data.recommendations.map((item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="flex items-center gap-4 rounded-2xl bg-[#fbfaff] p-4 hover:bg-[#f5f0ff]"
                >
                  <AppIcon name={item.icon} tone="purple" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-[#101733]">{item.title}</span>
                    <span className="block text-sm font-bold text-[#69708b]">{item.subtitle}</span>
                  </span>
                  <ChevronRight className="text-[#6d35ff]" size={18} />
                </Link>
              ))}
            </div>
            <Link
              href="/vocabulary/overview"
              className="mt-5 flex h-12 items-center justify-center gap-2 rounded-xl border border-[#bfaeff] text-sm font-black text-[#6d35ff]"
            >
              <AppIcon name="calendar" bare size={17} /> Xem kế hoạch học tập
              <ChevronRight size={17} />
            </Link>
          </section>
        </aside>
      </div>

      <section className="mt-6 rounded-3xl border border-[#ebeaf6] bg-white p-6 shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#101733]">Hoạt động gần đây theo kỹ năng</h2>
          <span className="text-sm font-black text-[#6d35ff]">Xem tất cả →</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.activities.map((item) => (
            <div key={item.title} className="rounded-2xl border border-[#ebeaf6] bg-[#fbfaff] p-4">
              <div className="flex gap-3">
                <AppIcon name={item.icon} tone="purple" />
                <div className="min-w-0">
                  <h3 className="truncate font-black text-[#101733]">{item.title}</h3>
                  <p className="mt-1 text-xs font-bold text-[#69708b]">{item.subtitle}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-bold text-[#69708b]">
                <span>{item.time}</span>
                <span className="rounded-lg bg-blue-50 px-2 py-1 font-black text-blue-600">
                  +{item.xp} XP
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SkillCard({ skill }: { skill: SkillItem }) {
  const tone = skillTones[skill.key] || skillTones.vocabulary;
  return (
    <section className="rounded-3xl border border-[#ebeaf6] bg-white p-5 text-center shadow-[0_12px_34px_rgba(35,35,80,0.06)]">
      <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full border-[5px] ${tone.text}`} style={{ borderColor: tone.stroke }}>
        <AppIcon name={skill.icon} bare size={30} />
      </div>
      <h3 className="mt-5 font-black text-[#101733]">{skill.label}</h3>
      <p className={`mt-3 text-3xl font-black ${tone.text}`}>{skill.percent}%</p>
      <p className="mt-1 text-sm font-bold text-[#69708b]">{skill.status}</p>
      <div className="mt-5 h-2 rounded-full bg-[#eeeef8]">
        <div className="h-2 rounded-full" style={{ width: `${skill.percent}%`, backgroundColor: tone.stroke }} />
      </div>
    </section>
  );
}

function SkillChart({ skills, labels }: { skills: SkillItem[]; labels: string[] }) {
  return (
    <div className="mt-7 overflow-x-auto">
      <div className="relative h-[300px] min-w-[720px] rounded-2xl bg-white">
        {[0, 25, 50, 75, 100].map((value) => (
          <div key={value} className="absolute left-0 right-0 border-t border-[#eceef7]" style={{ bottom: `${value * 2.4}px` }}>
            <span className="absolute -left-1 -top-3 text-xs font-bold text-[#8b91aa]">{value}%</span>
          </div>
        ))}
        <svg viewBox="0 0 720 260" className="absolute left-8 top-4 h-[260px] w-[680px] overflow-visible">
          {skills.map((skill) => {
            const tone = skillTones[skill.key] || skillTones.vocabulary;
            const points = skill.trend
              .map((point, index) => `${index * 110},${240 - point.value * 2.1}`)
              .join(" ");
            return (
              <g key={skill.key}>
                <polyline points={points} fill="none" stroke={tone.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {skill.trend.map((point, index) => (
                  <circle key={`${skill.key}-${point.label}`} cx={index * 110} cy={240 - point.value * 2.1} r="4" fill="white" stroke={tone.stroke} strokeWidth="3" />
                ))}
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-8 right-4 grid grid-cols-7 text-xs font-bold text-[#69708b]">
          {labels.map((label) => <span key={label}>{label}</span>)}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-5">
        {skills.map((skill) => {
          const tone = skillTones[skill.key] || skillTones.vocabulary;
          return (
            <span key={skill.key} className="inline-flex items-center gap-2 text-sm font-bold text-[#4f5575]">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tone.stroke }} />
              {skill.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SummaryStat({ icon, value, label, sub }: { icon: AppIconName; value: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-[#fbfaff] p-4">
      <AppIcon name={icon} tone="purple" />
      <p className="mt-3 text-2xl font-black text-[#6d35ff]">{value}</p>
      <p className="mt-1 text-sm font-black text-[#101733]">{label}</p>
      <p className="mt-1 text-xs font-bold text-[#69708b]">{sub}</p>
    </div>
  );
}

function InsightCard({ title, skill, message, positive = false }: { title: string; skill: SkillItem; message: string; positive?: boolean }) {
  return (
    <section className={`rounded-3xl p-5 ${positive ? "bg-emerald-50" : "bg-rose-50"}`}>
      <h3 className={`font-black ${positive ? "text-emerald-700" : "text-rose-600"}`}>{title}</h3>
      <div className="mt-5 flex items-center gap-4">
        <AppIcon name={skill.icon} tone={positive ? "emerald" : "pink"} className="h-16 w-16" size={28} />
        <div className="min-w-0 flex-1">
          <h4 className="text-xl font-black text-[#101733]">{skill.label}</h4>
          <p className="mt-1 text-sm font-bold leading-6 text-[#69708b]">{message}</p>
        </div>
        <div className={`grid h-16 w-16 place-items-center rounded-full text-xl font-black ${positive ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"}`}>
          {skill.percent}%
        </div>
      </div>
    </section>
  );
}

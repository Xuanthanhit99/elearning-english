"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import AppLogo from "@/src/Components/UI/AppLogo";
import { AppIcon, type AppIconName } from "@/src/Components/UI/AppIcon";

const studyItems = ["Tổng quan", "Từ vựng", "Nghe", "Nói", "Ngữ pháp", "Đọc hiểu", "Viết", "Flashcards"];
const calendarDays = [
  ["T2", "20"],
  ["T3", "21"],
  ["T4", "22"],
  ["T5", "23"],
  ["T6", "24", true],
  ["T7", "25"],
  ["CN", "26"],
] as const;

type WeeklyQuestion = {
  id: string;
  type: string;
  question: string;
  options?: string[];
  order: number;
  word?: { word: string; meaningVi?: string | null; meaningEn?: string | null };
};

type WeeklyTest = {
  id?: string;
  status: string;
  message?: string;
  completedDays?: number;
  requiredDays?: number;
  totalQuestions?: number;
  score?: number;
  passScore?: number;
  questions?: WeeklyQuestion[];
};

type WeeklyPlan = {
  days?: Array<{
    id: string;
    date: string;
    status: string;
    words?: Array<unknown>;
  }>;
};

export default function VocabularyTestPage() {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/avatar-default.png";
  const [weeklyTest, setWeeklyTest] = useState<WeeklyTest | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [testOpen, setTestOpen] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const learnedWords = useMemo(
    () => weeklyPlan?.days?.reduce((sum, day) => sum + (day.words?.length || 0), 0) || weeklyTest?.completedDays || 42,
    [weeklyPlan, weeklyTest],
  );
  const completedDays = weeklyPlan?.days?.filter((day) => day.status === "COMPLETED").length || weeklyTest?.completedDays || 0;
  const progressPercent = Math.min(100, Math.round((completedDays / 7) * 100));

  const loadData = async () => {
    setLoading(true);
    const [testRes, planRes, reviewRes] = await Promise.allSettled([
      api.get("/vocabulary/weekly-test"),
      api.get("/vocabulary/weekly-plan"),
      api.get("/vocabulary/review"),
    ]);

    if (testRes.status === "fulfilled") setWeeklyTest(testRes.value.data);
    if (planRes.status === "fulfilled" && !planRes.value.data?.locked) setWeeklyPlan(planRes.value.data);
    if (reviewRes.status === "fulfilled") setReviewTotal(reviewRes.value.data?.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const startTest = async () => {
    const res = await api.post("/vocabulary/weekly-test/start");
    setWeeklyTest(res.data);
    if (res.data?.questions?.length) {
      setTestOpen(true);
      setResult(null);
    }
  };

  return (
    <>
      <div className="grid gap-7 px-4 py-8 lg:px-10 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="min-w-0 space-y-6">
              <div>
                <h1 className="text-3xl font-black">Ôn tập & Kiểm tra</h1>
                <p className="mt-3 text-base font-bold text-[#59627f]">
                  Kiểm tra kiến thức từ vựng theo chu kỳ để ghi nhớ lâu hơn
                </p>
              </div>

              <WeeklyTestBanner />
              <ReadyCard
                learnedWords={learnedWords}
                locked={weeklyTest?.status === "LOCKED"}
                loading={loading}
                message={weeklyTest?.message}
              />
              <WeekSelect />
              <WeekOverview learnedWords={learnedWords} completedDays={completedDays} />
              <WeeklyExamCard test={weeklyTest} onStart={startTest} />
            </section>

            <aside className="space-y-6">
              <ProgressPanel learnedWords={learnedWords} progress={progressPercent} reviewTotal={reviewTotal} />
              <WeekSchedule plan={weeklyPlan} />
              <MemoryTips />
            </aside>
      </div>

      <WeeklyTestModal
        open={testOpen}
        test={weeklyTest}
        result={result}
        onClose={() => setTestOpen(false)}
        onSubmitted={(nextResult) => {
          setResult(nextResult);
          loadData();
        }}
      />
    </>
  );
}

function TestSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[286px] shrink-0 overflow-y-auto border-r border-[#e8e9f5] bg-white px-4 py-6 xl:block">
      <AppLogo />
      <nav className="mt-9 space-y-1">
        <SidebarLink icon="home" label="Trang chủ" href="/" />
        <div>
          <SidebarLink icon="book" label="Từ vựng" href="/vocabulary" active />
          <div className="ml-[27px] mt-1 border-l-2 border-[#e2ddff] py-1 pl-6">
            {studyItems.map((item) => (
              <Link
                key={item}
                href={item === "Từ vựng" ? "/vocabulary" : "/courses"}
                className={`block rounded-xl px-4 py-2.5 text-sm font-black ${
                  item === "Từ vựng" ? "bg-[#f1ecff] text-[#652cff]" : "text-[#101733] hover:bg-[#f7f5ff]"
                }`}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
        <section className="pt-4">
          <p className="px-4 py-2 text-xs font-black uppercase text-[#8b91aa]">Ôn tập & Kiểm tra</p>
          <SidebarLink icon="sparkles" label="Ôn tập" href="/vocabulary" />
          <SidebarLink icon="shield" label="Kiểm tra" href="/vocabulary/test" active badge="Mới" />
        </section>
        <section className="pt-4">
          <p className="px-4 py-2 text-xs font-black uppercase text-[#8b91aa]">Khác</p>
          <SidebarLink icon="bot" label="AI Tutor" href="/check-writing" />
          <SidebarLink icon="trophy" label="Thành tích" href="/profile" />
          <SidebarLink icon="settings" label="Cài đặt" href="/profile" />
        </section>
      </nav>
      <section className="mt-8 rounded-2xl bg-[#f4f0ff] p-5">
        <AppIcon name="crown" tone="yellow" />
        <h3 className="mt-2 font-black text-[#652cff]">Nâng cấp Premium</h3>
        <p className="mt-3 text-sm font-bold leading-6 text-[#69708b]">
          Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
        </p>
        <button className="mt-5 w-full rounded-xl bg-[#6d35ff] px-4 py-3 text-sm font-black text-white">
          Nâng cấp ngay
        </button>
      </section>
    </aside>
  );
}

function SidebarLink({
  active,
  badge,
  href,
  icon,
  label,
}: {
  active?: boolean;
  badge?: string;
  href: string;
  icon: AppIconName;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-black transition ${
        active ? "bg-[#efe9ff] text-[#652cff]" : "text-[#5d6587] hover:bg-[#f5f2ff] hover:text-[#652cff]"
      }`}
    >
      <AppIcon name={icon} bare size={18} className="shrink-0" />
      <span className="min-w-0 flex-1">{label}</span>
      {badge && <span className="rounded-lg bg-[#efe9ff] px-2 py-1 text-xs text-[#6d35ff]">{badge}</span>}
    </Link>
  );
}

function TopBar({ displayName, avatar }: { displayName: string; avatar: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e8e9f5] bg-white/95 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-4">
        <AppLogo compact className="xl:hidden" />
        <label className="relative hidden w-full max-w-[480px] md:block">
          <AppIcon name="search" bare size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b91aa]" />
          <input
            className="h-14 w-full rounded-xl border border-[#dfe2f3] bg-white pl-12 pr-4 text-sm font-bold outline-none placeholder:text-[#8b91aa] focus:border-[#6d35ff]"
            placeholder="Tìm bài học, từ vựng, ngữ pháp..."
          />
        </label>
        <div className="ml-auto flex items-center gap-3">
          <TopMetric icon="fire" value="18" label="Streak" tone="orange" />
          <TopMetric icon="star" value="2,450" label="XP hôm nay" tone="yellow" />
          <TopMetric icon="diamond" value="5,230" label="Xu" tone="cyan" />
          <button className="hidden h-11 w-11 items-center justify-center rounded-full border border-[#e8e9f5] bg-white text-[#6d35ff] md:flex">
            <AppIcon name="gift" bare size={20} />
          </button>
          <button className="relative hidden h-11 w-11 items-center justify-center rounded-full border border-[#e8e9f5] bg-white text-[#101733] md:flex">
            <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">3</span>
            <AppIcon name="bell" bare size={20} />
          </button>
          <Link href="/profile" className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-[#f5f2ff]">
            <img src={avatar} alt={displayName} className="h-11 w-11 rounded-full object-cover" />
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-black">{displayName}</span>
              <span className="block text-xs font-bold text-[#69708b]">Level 18</span>
            </span>
            <AppIcon name="chevronRight" bare size={16} className="hidden rotate-90 text-[#69708b] sm:block" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function TopMetric({
  icon,
  label,
  tone,
  value,
}: {
  icon: AppIconName;
  label: string;
  tone: "orange" | "yellow" | "cyan";
  value: string;
}) {
  return (
    <div className="hidden items-center gap-2 rounded-xl border border-[#e8e9f5] bg-white px-3 py-2 shadow-sm lg:flex">
      <AppIcon name={icon} tone={tone} size={18} className="h-8 w-8" />
      <span className="leading-tight">
        <span className="block text-sm font-black">{value}</span>
        <span className="block text-[11px] font-bold text-[#69708b]">{label}</span>
      </span>
    </div>
  );
}

function WeeklyTestBanner() {
  return (
    <section className="rounded-2xl border-2 border-[#6d35ff] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <AppIcon name="notebook" tone="purple" className="h-14 w-14 rounded-2xl" size={24} />
        <div>
          <h2 className="text-lg font-black text-[#6d35ff]">Kiểm tra theo tuần</h2>
          <p className="mt-1 text-sm font-bold text-[#59627f]">Kiểm tra tổng hợp từ đã học trong tuần</p>
        </div>
      </div>
    </section>
  );
}

function ReadyCard({
  learnedWords,
  loading,
  locked,
  message,
}: {
  learnedWords: number;
  loading: boolean;
  locked: boolean;
  message?: string;
}) {
  return (
    <section className="grid items-center gap-5 overflow-hidden rounded-2xl bg-[#f1edff] p-7 md:grid-cols-[120px_minmax(0,1fr)_180px]">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/80 text-[#6d35ff]">
        <AppIcon name={locked ? "lock" : "paw"} bare size={54} />
      </div>
      <div>
        <h2 className="text-2xl font-black">{locked ? "Tuần học mới đang bị khóa" : "Đã đến lúc kiểm tra!"}</h2>
        <p className="mt-4 max-w-xl text-base font-bold leading-7 text-[#303956]">
          {loading
            ? "Đang tải dữ liệu kiểm tra..."
            : locked
              ? message || "Bạn cần hoàn thành đủ 7 ngày học để mở bài kiểm tra."
              : (
                  <>
                    Bạn đã học <b>{learnedWords} từ vựng</b> trong tuần này. Hãy làm bài kiểm tra để củng cố kiến thức
                    và nhận thưởng nhé!
                  </>
                )}
        </p>
      </div>
      <div className="hidden justify-end text-[#6d35ff] md:flex">
        <AppIcon name="calendar" bare size={96} />
      </div>
    </section>
  );
}

function WeekSelect() {
  return (
    <button className="inline-flex items-center gap-3 rounded-xl border border-[#dfe2f3] bg-white px-5 py-3 text-sm font-black text-[#303956]">
      <AppIcon name="calendar" bare size={18} className="text-[#6d35ff]" />
      Tuần này: 20/05 - 26/05/2024
      <AppIcon name="chevronRight" bare size={16} className="rotate-90 text-[#69708b]" />
    </button>
  );
}

function WeekOverview({ completedDays, learnedWords }: { completedDays: number; learnedWords: number }) {
  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Tổng quan tuần</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewStat icon="book" value={String(learnedWords)} label="Từ đã học" />
        <OverviewStat icon="check" value="38" label="Đã ôn tập" tone="emerald" />
        <OverviewStat icon="star" value="90%" label="Ghi nhớ trung bình" tone="yellow" />
        <OverviewStat icon="trophy" value={`${completedDays}/7`} label="Ngày đã hoàn thành" tone="purple" />
      </div>
    </section>
  );
}

function OverviewStat({
  icon,
  label,
  tone = "purple",
  value,
}: {
  icon: AppIconName;
  label: string;
  tone?: "purple" | "emerald" | "yellow";
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 border-[#e8e9f5] xl:border-r xl:last:border-r-0">
      <AppIcon name={icon} tone={tone} className="h-14 w-14 rounded-full" size={24} />
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="mt-1 text-sm font-bold text-[#69708b]">{label}</p>
      </div>
    </div>
  );
}

function WeeklyExamCard({ onStart, test }: { onStart: () => void; test: WeeklyTest | null }) {
  const locked = test?.status === "LOCKED";
  const questionCount = test?.questions?.length || test?.totalQuestions || 20;

  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Bài kiểm tra tuần này</h2>
      <div className="mt-6 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <ExamRow icon="users" label="Số lượng câu hỏi" value={`${questionCount} câu`} />
          <ExamRow icon="notebook" label="Hình thức" value="Trắc nghiệm và tự luận" />
          <ExamRow icon="calendar" label="Thời gian" value="20 phút" />
          <ExamRow icon="book" label="Nội dung" value="Từ vựng đã học trong tuần" />
        </div>
        <div className="hidden justify-center text-[#6d35ff] lg:flex">
          <AppIcon name="pen" bare size={140} />
        </div>
      </div>
      <button
        onClick={onStart}
        disabled={locked}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6d35ff] px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:bg-[#5528dc] disabled:cursor-not-allowed disabled:bg-[#bcb3da] disabled:shadow-none"
      >
        <AppIcon name={locked ? "lock" : "play"} bare size={18} />
        {locked ? "Chưa đủ điều kiện kiểm tra" : "Bắt đầu kiểm tra"}
      </button>
      <Link href="/vocabulary" className="mt-4 block text-center text-sm font-black text-[#6d35ff]">
        Xem lại từ vựng đã học
      </Link>
    </section>
  );
}

function ExamRow({ icon, label, value }: { icon: AppIconName; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-[#eef0f7] pb-4 text-sm font-bold last:border-b-0">
      <AppIcon name={icon} bare size={18} className="text-[#7d84a6]" />
      <span className="font-black">{label}</span>
      <span className="text-right text-[#4f5790]">{value}</span>
    </div>
  );
}

function ProgressPanel({ learnedWords, progress, reviewTotal }: { learnedWords: number; progress: number; reviewTotal: number }) {
  return (
    <Panel title="Tiến độ học tập">
      <div className="grid items-center gap-5 md:grid-cols-[150px_1fr] xl:grid-cols-[150px_1fr]">
        <div
          className="relative flex h-36 w-36 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(#6d35ff 0 ${progress}%, #dedaf0 ${progress}% 100%)` }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
            <span className="text-3xl font-black">{progress}%</span>
            <span className="text-xs font-bold text-[#69708b]">Tuần này</span>
          </div>
        </div>
        <div className="space-y-4">
          <Legend color="bg-[#6d35ff]" label="Đã học" value={`${learnedWords} từ`} />
          <Legend color="bg-[#4caf50]" label="Đã ôn tập" value="38 từ" />
          <Legend color="bg-[#c6c8dc]" label="Cần ôn hôm nay" value={`${reviewTotal} từ`} />
        </div>
      </div>
    </Panel>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="min-w-0 flex-1">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function WeekSchedule({ plan }: { plan: WeeklyPlan | null }) {
  const rows = plan?.days?.length
    ? plan.days.map((day) => {
        const date = new Date(day.date);
        const learned = day.status === "COMPLETED";
        const label = `${date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - ${
          learned ? `${day.words?.length || 0} từ mới` : "Chưa học"
        }`;
        return [label, learned ? "done" : "empty"] as const;
      })
    : [
        ["20/05 - 15 từ mới", "done"],
        ["21/05 - 10 từ mới", "done"],
        ["22/05 - 8 từ mới", "done"],
        ["23/05 - 9 từ mới", "done"],
        ["24/05 - 12 từ mới", "active"],
        ["25/05 - Chưa học", "empty"],
        ["26/05 - Chưa học", "empty"],
      ] as const;

  return (
    <Panel title="Lịch học tuần này" action="Xem lịch sử">
      <div className="grid grid-cols-7 gap-2 text-center">
        {calendarDays.map(([day, date, active]) => (
          <div key={String(day)} className="space-y-3">
            <div className="text-sm font-black text-[#59627f]">{day}</div>
            <div
              className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${
                active ? "bg-[#d9ceff] text-[#6d35ff]" : "text-[#4f5790]"
              }`}
            >
              {date}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {rows.map(([label, status]) => (
          <div key={label} className="flex items-center gap-4 text-sm font-black">
            <span
              className={`h-4 w-4 rounded-full ${
                status === "done" ? "bg-[#4caf50]" : status === "active" ? "bg-[#6d35ff]" : "border-2 border-[#c6c8dc]"
              }`}
            />
            <span className={status === "active" ? "text-[#101733]" : "text-[#4f5790]"}>{label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function WeeklyTestModal({
  onClose,
  onSubmitted,
  open,
  result,
  test,
}: {
  onClose: () => void;
  onSubmitted: (result: any) => void;
  open: boolean;
  result: any;
  test: WeeklyTest | null;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!open || !test?.questions?.length) return null;

  const submit = async () => {
    const res = await api.post("/vocabulary/weekly-test/submit", {
      answers: test.questions?.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] || "",
      })),
    });
    onSubmitted(res.data);
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#101733]/45 px-4 py-8 backdrop-blur-sm">
      <section className="mx-auto max-w-4xl rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Bài kiểm tra từ vựng tuần</h2>
            <p className="mt-2 font-bold text-[#69708b]">
              Điền câu trả lời rồi nộp bài để mở khóa tuần học tiếp theo.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-[#efe9ff] p-3 text-[#6d35ff]">
            <AppIcon name="x" bare size={22} />
          </button>
        </div>

        {result ? (
          <div className={`mt-6 rounded-2xl p-6 ${result.status === "PASSED" ? "bg-[#ecfdf5] text-[#15803d]" : "bg-[#fff7ed] text-[#c2410c]"}`}>
            <h3 className="text-2xl font-black">{result.status === "PASSED" ? "Đã vượt qua!" : "Chưa đạt"}</h3>
            <p className="mt-2 font-bold">
              Điểm của bạn: {result.score}% / cần {result.passScore}%
            </p>
            <p className="mt-2 font-bold">{result.message}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {test.questions.map((question, index) => (
              <div key={question.id} className="rounded-2xl border border-[#e8e9f5] p-5">
                <h3 className="font-black">
                  Câu {index + 1}: {question.question}
                </h3>
                {question.options?.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {question.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                        className={`rounded-xl border px-4 py-3 text-left font-bold ${
                          answers[question.id] === option
                            ? "border-[#6d35ff] bg-[#efe9ff] text-[#6d35ff]"
                            : "border-[#e8e9f5]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    value={answers[question.id] || ""}
                    onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                    placeholder="Nhập câu trả lời..."
                    className="mt-4 w-full rounded-xl border border-[#e8e9f5] px-4 py-3 font-bold outline-none focus:border-[#6d35ff]"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-[#d9ceff] px-6 py-3 font-black text-[#6d35ff]">
            Đóng
          </button>
          {!result && (
            <button onClick={submit} className="rounded-xl bg-[#6d35ff] px-7 py-3 font-black text-white">
              Nộp bài
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function MemoryTips() {
  return (
    <section className="rounded-2xl border border-[#bee8ca] bg-[#f2fff6] p-6 shadow-sm">
      <h2 className="text-xl font-black">Mẹo ghi nhớ hiệu quả</h2>
      <div className="mt-5 space-y-5">
        <Tip title="Ôn tập đều đặn mỗi ngày" desc="Dành 10-15 phút ôn lại từ vựng mỗi ngày" />
        <Tip title="Sử dụng từ trong ngữ cảnh" desc="Đặt câu với từ mới để nhớ lâu hơn" />
        <Tip title="Kiểm tra thường xuyên" desc="Làm bài kiểm tra giúp củng cố kiến thức" />
      </div>
    </section>
  );
}

function Tip({ desc, title }: { desc: string; title: string }) {
  return (
    <div className="flex gap-4">
      <AppIcon name="shield" tone="emerald" className="h-10 w-10 rounded-full" size={18} />
      <div>
        <h3 className="font-black">{title}</h3>
        <p className="mt-1 text-sm font-bold leading-6 text-[#59627f]">{desc}</p>
      </div>
    </div>
  );
}

function Panel({ action, children, title }: { action?: string; children: ReactNode; title: string }) {
  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black">{title}</h2>
        {action && <button className="text-sm font-black text-[#6d35ff]">{action}</button>}
      </div>
      {children}
    </section>
  );
}

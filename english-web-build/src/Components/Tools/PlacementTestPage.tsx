// src/Components/PlacementTest/PlacementTestPage.tsx
"use client";

import { useState } from "react";
import { api } from "@/src/lib/axios";

type Option = {
  key: string;
  text: string;
};

type Question = {
  id: string;
  skill: string;
  question: string;
  sentence?: string;
  options: Option[];
  answer: string;
  explain?: string;
};

type TestData = {
  durationMinutes: number;
  totalQuestions: number;
  level: string;
  goal: string;
  questions: Question[];
};

export default function PlacementTestPage() {
  const [test, setTest] = useState<TestData | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const startTest = async () => {
    try {
      setLoading(true);
      const res = await api.post("/placement-tests/generate", {
        level: "Beginner",
        goal: "General English",
      });

      setTest(res.data);
      setCurrent(0);
      setAnswers({});
      setResult(null);
    } catch (error) {
      console.error(error);
      alert("Không thể tạo bài kiểm tra.");
    } finally {
      setLoading(false);
    }
  };

  const submitTest = async () => {
    if (!test) return;

    try {
      setLoading(true);

      const res = await api.post("/placement-tests/submit", {
        questions: test.questions,
        answers,
      });

      setResult(res.data.result || res.data);
    } catch (error) {
      console.error(error);
      alert("Nộp bài thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const question = test?.questions?.[current];
  const progress = test ? Math.round(((current + 1) / test.questions.length) * 100) : 0;

  if (loading) {
    return <PlacementLoading />;
  }

  if (result) {
    return <PlacementResult result={result} onRestart={startTest} />;
  }

  return (
    <main className="min-h-screen bg-[#fff4e8] px-4 py-10">
      <section className="mx-auto max-w-6xl">
        <Hero onStart={startTest} started={!!test} />

        {!test ? (
          <StartPanel onStart={startTest} />
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[300px_1fr]">
            <aside className="space-y-5">
              <ProgressBox
                current={current + 1}
                total={test.questions.length}
                progress={progress}
              />

              <SkillMenu questions={test.questions} current={current} />
            </aside>

            {question && (
              <section className="space-y-6">
                <QuestionCard
                  question={question}
                  current={current}
                  total={test.questions.length}
                  selected={answers[question.id]}
                  onSelect={(value) =>
                    setAnswers({
                      ...answers,
                      [question.id]: value,
                    })
                  }
                  onPrev={() => setCurrent((v) => Math.max(0, v - 1))}
                  onNext={() =>
                    setCurrent((v) =>
                      Math.min(test.questions.length - 1, v + 1),
                    )
                  }
                  onSubmit={submitTest}
                />

                <SkillScorePreview />

                <ExpectedResult />
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function Hero({
  onStart,
  started,
}: {
  onStart: () => void;
  started: boolean;
}) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-5 inline-flex rounded-full border border-[#ffd4ad] bg-white px-4 py-2 text-sm font-extrabold text-[#ff6b00] shadow-sm">
          🧠 Kiểm tra trình độ miễn phí
        </div>

        <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-[#1f2a44] lg:text-6xl">
          Biết trình độ của bạn trong{" "}
          <span className="text-[#ff6b00]">10 phút</span>
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5b6b85]">
          Bài kiểm tra giúp Miu đánh giá ngữ pháp, từ vựng, đọc hiểu và giao
          tiếp. Sau khi hoàn thành, bạn sẽ nhận level và lộ trình học phù hợp.
        </p>

        {!started && (
          <button
            type="button"
            onClick={onStart}
            className="mt-7 rounded-2xl bg-[#ff6b00] px-8 py-4 font-extrabold text-white shadow-lg shadow-orange-200 transition hover:scale-105"
          >
            Bắt đầu kiểm tra
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1f2a44] to-[#6b5796] p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />

        <div className="relative z-10">
          <h2 className="text-2xl font-extrabold">Bài test gồm gì?</h2>
          <p className="mt-3 text-sm leading-6 text-white/80">
            20 câu hỏi ngắn, không áp lực, tập trung vào khả năng sử dụng tiếng
            Anh thực tế.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-4">
              <div className="text-3xl font-extrabold">20</div>
              <p className="text-sm font-bold text-white/80">câu hỏi</p>
            </div>

            <div className="rounded-2xl bg-white/15 p-4">
              <div className="text-3xl font-extrabold">10</div>
              <p className="text-sm font-bold text-white/80">phút</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StartPanel({ onStart }: { onStart: () => void }) {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-4">
      {[
        ["📚", "Vocabulary", "Từ vựng thông dụng"],
        ["✍️", "Grammar", "Ngữ pháp nền tảng"],
        ["📖", "Reading", "Đọc hiểu ngắn"],
        ["🗣️", "Communication", "Tình huống giao tiếp"],
      ].map(([icon, title, desc]) => (
        <div
          key={title}
          className="rounded-[24px] border border-[#ead8c2] bg-white p-6 shadow-[0_20px_60px_rgba(31,42,68,0.06)]"
        >
          <div className="text-3xl">{icon}</div>
          <h3 className="mt-4 text-xl font-extrabold text-[#1f2a44]">
            {title}
          </h3>
          <p className="mt-2 text-sm font-bold leading-6 text-[#5b6b85]">
            {desc}
          </p>
        </div>
      ))}

      <button
        type="button"
        onClick={onStart}
        className="rounded-[24px] bg-[#ff6b00] p-6 text-left text-white shadow-lg shadow-orange-200 transition hover:scale-[1.02] lg:col-span-4"
      >
        <div className="text-2xl font-extrabold">Bắt đầu ngay 🚀</div>
        <p className="mt-2 font-bold text-white/90">
          Miu sẽ tạo bài test phù hợp bằng AI.
        </p>
      </button>
    </div>
  );
}

function ProgressBox({
  current,
  total,
  progress,
}: {
  current: number;
  total: number;
  progress: number;
}) {
  return (
    <div className="rounded-[24px] border border-[#ead8c2] bg-white p-5 shadow-[0_20px_60px_rgba(31,42,68,0.06)]">
      <h2 className="font-extrabold text-[#1f2a44]">Tiến độ bài test</h2>

      <div className="mt-4 flex items-center justify-between text-sm font-extrabold text-[#5b6b85]">
        <span>
          Câu {current}/{total}
        </span>
        <span>{progress}%</span>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#ff6b00] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function SkillMenu({
  questions,
  current,
}: {
  questions: Question[];
  current: number;
}) {
  const skills = ["Vocabulary", "Grammar", "Reading", "Communication"];

  return (
    <div className="rounded-[24px] border border-[#ead8c2] bg-white p-5 shadow-[0_20px_60px_rgba(31,42,68,0.06)]">
      <h2 className="font-extrabold text-[#1f2a44]">Các phần kiểm tra</h2>

      <div className="mt-4 space-y-3">
        {skills.map((skill, index) => {
          const count = questions.filter((q) => q.skill === skill).length;

          return (
            <div
              key={skill}
              className="flex items-center gap-3 rounded-2xl bg-[#fffaf5] px-4 py-3"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${
                  index === 1
                    ? "bg-[#1f2a44] text-white"
                    : "bg-white text-[#1f2a44]"
                }`}
              >
                {index + 1}
              </span>

              <div>
                <p className="font-extrabold text-[#1f2a44]">{skill}</p>
                <p className="text-xs font-bold text-[#5b6b85]">
                  {count || "-"} câu hỏi
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  current,
  total,
  selected,
  onSelect,
  onPrev,
  onNext,
  onSubmit,
}: {
  question: Question;
  current: number;
  total: number;
  selected?: string;
  onSelect: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const isLast = current === total - 1;

  return (
    <div className="rounded-[28px] border border-[#ead8c2] bg-white p-6 shadow-[0_20px_60px_rgba(31,42,68,0.06)]">
      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-full bg-[#fff0dc] px-4 py-2 text-sm font-extrabold text-[#ff6b00]">
          {question.skill} · Question {current + 1}
        </span>

        <span className="rounded-full bg-[#f7f1fb] px-4 py-2 text-sm font-extrabold text-[#6b5796]">
          ⏱ 10 phút
        </span>
      </div>

      <h2 className="text-2xl font-extrabold text-[#1f2a44]">
        {question.question}
      </h2>

      {question.sentence && (
        <p className="mt-4 rounded-2xl bg-[#fffaf5] p-4 font-bold leading-7 text-[#5b6b85]">
          {question.sentence}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {question.options.map((option) => {
          const active = selected === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-left font-extrabold transition ${
                active
                  ? "border-[#ff6b00] bg-[#fff0dc] text-[#ff6b00]"
                  : "border-slate-200 bg-slate-50 text-[#1f2a44] hover:border-[#ffb347] hover:bg-[#fffaf5]"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm ${
                  active
                    ? "bg-[#ff6b00] text-white"
                    : "bg-white text-[#1f2a44]"
                }`}
              >
                {option.key}
              </span>
              {option.text}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={current === 0}
          className="rounded-2xl bg-[#fff0dc] px-6 py-3 font-extrabold text-[#ff6b00] disabled:opacity-40"
        >
          Câu trước
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-2xl bg-[#1f2a44] px-6 py-3 font-extrabold text-white"
          >
            Nộp bài
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="rounded-2xl bg-[#ff6b00] px-6 py-3 font-extrabold text-white shadow-lg shadow-orange-200"
          >
            Câu tiếp theo
          </button>
        )}
      </div>
    </div>
  );
}

function SkillScorePreview() {
  return (
    <div className="rounded-[24px] border border-[#ead8c2] bg-white p-5 shadow-[0_20px_60px_rgba(31,42,68,0.06)]">
      <h2 className="mb-4 font-extrabold text-[#1f2a44]">
        Kỹ năng đang đánh giá
      </h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["📚", "Vocabulary"],
          ["✍️", "Grammar"],
          ["📖", "Reading"],
          ["🗣️", "Communication"],
        ].map(([icon, label]) => (
          <div
            key={label}
            className="rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-4 text-center"
          >
            <div className="text-2xl">{icon}</div>
            <p className="mt-2 text-sm font-extrabold text-[#1f2a44]">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpectedResult() {
  return (
    <div className="rounded-[24px] border border-[#ead8c2] bg-white p-5 shadow-[0_20px_60px_rgba(31,42,68,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-[#1f2a44]">Kết quả dự kiến</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#5b6b85]">
            Sau khi nộp bài, Miu sẽ đánh giá level và gợi ý khóa học phù hợp.
          </p>
        </div>

        <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-400 text-center font-extrabold text-emerald-500">
          A2
        </div>
      </div>
    </div>
  );
}

function PlacementResult({
  result,
  onRestart,
}: {
  result: any;
  onRestart: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#fff4e8] px-4 py-10">
      <section className="mx-auto max-w-4xl rounded-[30px] border border-[#ead8c2] bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-8 border-[#ff6b00] text-3xl font-extrabold text-[#ff6b00]">
            {result.level}
          </div>

          <h1 className="mt-5 text-4xl font-extrabold text-[#1f2a44]">
            Kết quả của bạn
          </h1>

          <p className="mt-3 text-lg font-bold text-[#5b6b85]">
            Bạn đạt {result.score}/100 · đúng {result.correct}/{result.total} câu
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {result.skillScores?.map((item: any) => (
            <div
              key={item.skill}
              className="rounded-2xl bg-[#fffaf5] p-4 text-center"
            >
              <div className="text-2xl font-extrabold text-[#ff6b00]">
                {item.score}%
              </div>
              <p className="mt-1 text-sm font-bold text-[#5b6b85]">
                {item.skill}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-[#f7f1fb] p-5 font-bold leading-7 text-[#6b5796]">
          💡 {result.summary}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-extrabold text-[#1f2a44]">
            Khóa học gợi ý
          </h2>

          <div className="mt-4 space-y-3">
            {result.recommendedCourses?.map((course: string) => (
              <div
                key={course}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
              >
                <span className="font-extrabold text-[#1f2a44]">{course}</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-600">
                  Phù hợp
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="mt-8 w-full rounded-2xl bg-[#ff6b00] py-4 font-extrabold text-white shadow-lg shadow-orange-200"
        >
          Làm lại bài test
        </button>
      </section>
    </main>
  );
}

function PlacementLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff4e8] px-4">
      <div className="rounded-[30px] bg-white p-8 text-center shadow-xl">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ff6b00]/20 border-t-[#ff6b00]" />
        <h2 className="mt-5 text-2xl font-extrabold text-[#1f2a44]">
          Miu đang tạo bài kiểm tra...
        </h2>
        <p className="mt-2 text-[#5b6b85]">
          AI đang chuẩn bị câu hỏi phù hợp với bạn.
        </p>
      </div>
    </main>
  );
}
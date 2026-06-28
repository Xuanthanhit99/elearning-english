// src/Components/PlacementTest/PlacementTestPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";

type TestMode = "LEVEL_BASED" | "ADAPTIVE";
type Level = "Beginner" | "A1" | "A2" | "B1";

type Option = {
  key: string;
  text: string;
};

type Question = {
  id: string;
  level?: string;
  skill: string;
  type?: "multiple_choice" | "reading" | "listening" | "speaking" | "writing";
  question: string;
  sentence?: string;
  audioText?: string;
  options: Option[];
  answer: string;
  explain?: string;
};

type TestData = {
  mode: TestMode;
  durationMinutes: number;
  totalQuestions: number;
  level: string;
  goal: string;
  questions: Question[];
};

export default function PlacementTestPage() {
  const [mode, setMode] = useState<TestMode>("ADAPTIVE");
  const [level, setLevel] = useState<Level>("Beginner");
  const [goal, setGoal] = useState("General English");

  const [test, setTest] = useState<TestData | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10 * 60);

  const question = test?.questions?.[current];

  const answeredCount = Object.keys(answers).length;
  const progress = test
    ? Math.round((answeredCount / test.questions.length) * 100)
    : 0;

  useEffect(() => {
    if (!test || result) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitTest();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [test, result]);

  const startTest = async () => {
    try {
      setLoading(true);

      const res = await api.post("/placement-tests/generate", {
        mode,
        level,
        goal,
      });

      setTest(res.data);
      setCurrent(0);
      setAnswers({});
      setResult(null);
      setTimeLeft((res.data.durationMinutes || 10) * 60);
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
        mode: test.mode,
        selectedLevel: mode === "LEVEL_BASED" ? level : null,
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

  if (loading) return <PlacementLoading />;

  if (result) {
    return (
      <PlacementResult
        result={result}
        onRestart={() => {
          setResult(null);
          setTest(null);
          setAnswers({});
          setCurrent(0);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#fff4e8] px-4 py-10">
      <section className="mx-auto max-w-7xl">
        {!test ? (
          <StartScreen
            mode={mode}
            setMode={setMode}
            level={level}
            setLevel={setLevel}
            goal={goal}
            setGoal={setGoal}
            onStart={startTest}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-5">
              <TestStatus
                current={current + 1}
                total={test.questions.length}
                answered={answeredCount}
                progress={progress}
                timeLeft={timeLeft}
                mode={test.mode}
                level={test.level}
              />

              <SkillProgress questions={test.questions} answers={answers} />

              <QuestionNavigator
                questions={test.questions}
                current={current}
                answers={answers}
                onJump={setCurrent}
              />
            </aside>

            {question && (
              <section className="space-y-5">
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
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function StartScreen({
  mode,
  setMode,
  level,
  setLevel,
  goal,
  setGoal,
  onStart,
}: {
  mode: TestMode;
  setMode: (value: TestMode) => void;
  level: Level;
  setLevel: (value: Level) => void;
  goal: string;
  setGoal: (value: string) => void;
  onStart: () => void;
}) {
  return (
    <div>
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-[#ffd4ad] bg-white px-4 py-2 text-sm font-extrabold text-[#ff6b00] shadow-sm">
            🧠 AI Placement Test
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-tight text-[#1f2a44] lg:text-7xl">
            Kiểm tra trình độ tiếng Anh cùng{" "}
            <span className="text-[#ff6b00]">Miu AI</span>
          </h1>

          <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-[#5b6b85]">
            Chọn luyện theo trình độ hoặc để AI tạo bài test từ dễ đến khó.
            Bài test gồm Reading, Listening, Speaking, Writing, Grammar và
            Vocabulary.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#1f2a44] via-[#4d4378] to-[#6b5796] p-7 text-white shadow-2xl">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute bottom-6 right-8 text-7xl opacity-20">
            🐱
          </div>

          <h2 className="relative z-10 text-3xl font-black">
            Bài test gồm
          </h2>

          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
            <MiniInfo value="20" label="câu hỏi" />
            <MiniInfo value="10" label="phút" />
            <MiniInfo value="6" label="kỹ năng" />
            <MiniInfo value="AI" label="generate" />
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <ModeCard
          active={mode === "LEVEL_BASED"}
          icon="🎯"
          title="Luyện theo trình độ"
          desc="Bạn chọn Beginner, A1, A2 hoặc B1. AI sẽ tạo bài test đúng cấp độ đó."
          onClick={() => setMode("LEVEL_BASED")}
        />

        <ModeCard
          active={mode === "ADAPTIVE"}
          icon="🤖"
          title="AI đánh giá trình độ"
          desc="AI tạo câu hỏi từ dễ đến khó: Beginner → A1 → A2 → B1 để đo level thật."
          onClick={() => setMode("ADAPTIVE")}
        />
      </div>

      <div className="mt-6 rounded-[30px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
        {mode === "LEVEL_BASED" && (
          <>
            <h3 className="text-xl font-black text-[#1f2a44]">
              Chọn trình độ muốn kiểm tra
            </h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {(["Beginner", "A1", "A2", "B1"] as Level[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLevel(item)}
                  className={`rounded-2xl px-5 py-4 font-black transition ${
                    level === item
                      ? "bg-[#ff6b00] text-white shadow-lg shadow-orange-200"
                      : "bg-[#fffaf5] text-[#1f2a44] hover:bg-[#fff0dc]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </>
        )}

        <h3 className="mt-6 text-xl font-black text-[#1f2a44]">
          Mục tiêu học
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            "General English",
            "Speaking for work",
            "Travel English",
            "IELTS Basic",
          ].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGoal(item)}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                goal === item
                  ? "bg-[#1f2a44] text-white"
                  : "bg-slate-50 text-[#5b6b85] hover:bg-[#fff4e8]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-7 w-full rounded-2xl bg-[#ff6b00] py-5 text-lg font-black text-white shadow-xl shadow-orange-200 transition hover:scale-[1.01]"
        >
          Bắt đầu bài kiểm tra 🚀
        </button>
      </div>
    </div>
  );
}

function MiniInfo({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4">
      <div className="text-3xl font-black">{value}</div>
      <p className="mt-1 text-sm font-bold text-white/80">{label}</p>
    </div>
  );
}

function ModeCard({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[28px] p-6 text-left transition hover:-translate-y-1 ${
        active
          ? "bg-[#1f2a44] text-white shadow-2xl"
          : "border border-[#ead8c2] bg-white text-[#1f2a44] shadow-[0_20px_60px_rgba(31,42,68,0.06)]"
      }`}
    >
      <div className="text-5xl">{icon}</div>
      <h3 className="mt-5 text-2xl font-black">{title}</h3>
      <p
        className={`mt-3 font-bold leading-7 ${
          active ? "text-white/80" : "text-[#5b6b85]"
        }`}
      >
        {desc}
      </p>
    </button>
  );
}

function TestStatus({
  current,
  total,
  answered,
  progress,
  timeLeft,
  mode,
  level,
}: {
  current: number;
  total: number;
  answered: number;
  progress: number;
  timeLeft: number;
  mode: string;
  level: string;
}) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="rounded-[28px] border border-[#ead8c2] bg-white p-5 shadow-[0_20px_60px_rgba(31,42,68,0.06)]">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#fff0dc] px-3 py-2 text-xs font-black text-[#ff6b00]">
          {mode === "ADAPTIVE" ? "AI đánh giá" : level}
        </span>

        <span className="rounded-full bg-[#f7f1fb] px-3 py-2 text-xs font-black text-[#6b5796]">
          ⏱ {minutes}:{seconds}
        </span>
      </div>

      <h2 className="mt-5 text-2xl font-black text-[#1f2a44]">
        Câu {current}/{total}
      </h2>

      <p className="mt-1 text-sm font-bold text-[#5b6b85]">
        Đã trả lời {answered}/{total}
      </p>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#ff6b00] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function SkillProgress({
  questions,
  answers,
}: {
  questions: Question[];
  answers: Record<string, string>;
}) {
  const skills = ["Grammar", "Vocabulary", "Reading", "Listening", "Speaking", "Writing"];

  return (
    <div className="rounded-[28px] border border-[#ead8c2] bg-white p-5 shadow-[0_20px_60px_rgba(31,42,68,0.06)]">
      <h2 className="font-black text-[#1f2a44]">Kỹ năng</h2>

      <div className="mt-4 space-y-3">
        {skills.map((skill) => {
          const list = questions.filter((q) => q.skill === skill);
          const done = list.filter((q) => answers[q.id]).length;

          return (
            <div key={skill} className="rounded-2xl bg-[#fffaf5] p-3">
              <div className="flex items-center justify-between text-sm font-black text-[#1f2a44]">
                <span>{skill}</span>
                <span className="text-[#ff6b00]">
                  {done}/{list.length || 0}
                </span>
              </div>

              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-[#ff6b00]"
                  style={{
                    width: list.length ? `${(done / list.length) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionNavigator({
  questions,
  current,
  answers,
  onJump,
}: {
  questions: Question[];
  current: number;
  answers: Record<string, string>;
  onJump: (index: number) => void;
}) {
  return (
    <div className="rounded-[28px] border border-[#ead8c2] bg-white p-5 shadow-[0_20px_60px_rgba(31,42,68,0.06)]">
      <h2 className="font-black text-[#1f2a44]">Danh sách câu</h2>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {questions.map((q, index) => {
          const answered = !!answers[q.id];
          const active = current === index;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJump(index)}
              className={`h-10 rounded-xl text-sm font-black transition ${
                active
                  ? "bg-[#1f2a44] text-white"
                  : answered
                    ? "bg-[#ff6b00] text-white"
                    : "bg-slate-100 text-[#5b6b85]"
              }`}
            >
              {index + 1}
            </button>
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

  const skillIcon: Record<string, string> = {
    Grammar: "✍️",
    Vocabulary: "📚",
    Reading: "📖",
    Listening: "🎧",
    Speaking: "🗣️",
    Writing: "📝",
  };

  const playAudio = () => {
    if (!question.audioText) return;

    const speech = new SpeechSynthesisUtterance(question.audioText);
    speech.lang = "en-US";
    speech.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  };

  return (
    <div className="rounded-[34px] border border-[#ead8c2] bg-white p-7 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#fff0dc] px-4 py-2 text-sm font-black text-[#ff6b00]">
            {skillIcon[question.skill] || "🧠"} {question.skill}
          </span>

          <span className="rounded-full bg-[#f7f1fb] px-4 py-2 text-sm font-black text-[#6b5796]">
            Level {question.level || "-"}
          </span>
        </div>

        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-[#5b6b85]">
          Question {current + 1}/{total}
        </span>
      </div>

      {question.type === "listening" && (
        <button
          type="button"
          onClick={playAudio}
          className="mt-6 rounded-2xl bg-[#1f2a44] px-5 py-3 font-black text-white transition hover:bg-[#ff6b00]"
        >
          ▶ Nghe đoạn hội thoại
        </button>
      )}

      {question.sentence && (
        <div className="mt-6 rounded-[24px] bg-[#fffaf5] p-5">
          <p className="text-sm font-black text-[#ff6b00]">
            {question.type === "reading"
              ? "Đoạn đọc"
              : question.type === "writing"
                ? "Câu cần sửa"
                : question.type === "speaking"
                  ? "Tình huống"
                  : question.type === "listening"
                    ? "Transcript"
                    : "Ngữ cảnh"}
          </p>

          <p className="mt-3 whitespace-pre-line text-lg font-bold leading-8 text-[#1f2a44]">
            {question.sentence}
          </p>
        </div>
      )}

      <h2 className="mt-6 text-3xl font-black leading-tight text-[#1f2a44]">
        {question.question}
      </h2>

      <div className="mt-7 space-y-3">
        {question.options.map((option) => {
          const active = selected === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key)}
              className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left font-black transition ${
                active
                  ? "border-[#ff6b00] bg-[#fff0dc] text-[#ff6b00] shadow-lg shadow-orange-100"
                  : "border-slate-200 bg-slate-50 text-[#1f2a44] hover:border-[#ffb347] hover:bg-[#fffaf5]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  active
                    ? "bg-[#ff6b00] text-white"
                    : "bg-white text-[#1f2a44]"
                }`}
              >
                {option.key}
              </span>

              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={current === 0}
          className="rounded-2xl bg-[#fff0dc] px-6 py-3 font-black text-[#ff6b00] disabled:opacity-40"
        >
          ← Câu trước
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-2xl bg-[#1f2a44] px-7 py-3 font-black text-white shadow-lg"
          >
            Nộp bài
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="rounded-2xl bg-[#ff6b00] px-7 py-3 font-black text-white shadow-lg shadow-orange-200"
          >
            Câu tiếp theo →
          </button>
        )}
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
      <section className="mx-auto max-w-5xl rounded-[34px] border border-[#ead8c2] bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-[#fff0dc] text-5xl font-black text-[#ff6b00]">
            {result.level}
          </div>

          <h1 className="mt-6 text-5xl font-black text-[#1f2a44]">
            Kết quả của bạn
          </h1>

          <p className="mt-3 text-lg font-bold text-[#5b6b85]">
            Bạn đạt {result.score}/100 · đúng {result.correct}/{result.total} câu
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {result.skillScores?.map((item: any) => (
            <div key={item.skill} className="rounded-2xl bg-[#fffaf5] p-5">
              <div className="flex items-center justify-between">
                <p className="font-black text-[#1f2a44]">{item.skill}</p>
                <p className="font-black text-[#ff6b00]">{item.score}%</p>
              </div>

              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-[#ff6b00]"
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-[#f7f1fb] p-5 font-bold leading-7 text-[#6b5796]">
          🤖 {result.summary}
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="mt-8 w-full rounded-2xl bg-[#ff6b00] py-4 font-black text-white shadow-lg shadow-orange-200"
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
      <div className="rounded-[34px] bg-white p-9 text-center shadow-xl">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#ff6b00]/20 border-t-[#ff6b00]" />

        <h2 className="mt-6 text-3xl font-black text-[#1f2a44]">
          Miu đang tạo bài kiểm tra...
        </h2>

        <p className="mt-2 font-bold text-[#5b6b85]">
          AI đang chuẩn bị câu hỏi phù hợp với bạn.
        </p>
      </div>
    </main>
  );
}
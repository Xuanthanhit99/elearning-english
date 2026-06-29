"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type ComposerMode = "post" | "speaking" | "writing" | "word" | "question" | "image";

type CommunityComposerBoxProps = {
  mode?: ComposerMode;
  setMode?: (mode: ComposerMode) => void;
  onClose: () => void;
};

const composerModes: Array<{ key: ComposerMode; icon: string; label: string }> = [
  { key: "post", icon: "📝", label: "Viết bài" },
  { key: "speaking", icon: "🎙", label: "Speaking" },
  { key: "writing", icon: "📄", label: "Check bài" },
  { key: "word", icon: "📖", label: "Từ mới" },
  { key: "image", icon: "📷", label: "Ảnh" },
  { key: "question", icon: "❓", label: "Hỏi đáp" },
];

const theme: Record<ComposerMode, { bg: string; text: string; ring: string; mascot: string; title: string; desc: string }> = {
  post: {
    bg: "from-orange-50 via-white to-amber-50",
    text: "text-orange-600",
    ring: "ring-orange-100",
    mascot: "🦊",
    title: "Tạo bài chia sẻ",
    desc: "Chia sẻ điều bạn học được hôm nay.",
  },
  speaking: {
    bg: "from-rose-50 via-white to-orange-50",
    text: "text-orange-600",
    ring: "ring-orange-100",
    mascot: "🦜",
    title: "Chia sẻ Speaking",
    desc: "Ghi âm, nghe mẫu và nhận điểm AI.",
  },
  writing: {
    bg: "from-sky-50 via-white to-blue-50",
    text: "text-sky-600",
    ring: "ring-sky-100",
    mascot: "🦉",
    title: "Check bài Writing",
    desc: "Dán bài viết để AI chấm nhanh.",
  },
  word: {
    bg: "from-emerald-50 via-white to-green-50",
    text: "text-emerald-600",
    ring: "ring-emerald-100",
    mascot: "🐢",
    title: "Chia sẻ từ mới",
    desc: "Lưu từ hay và mẹo ghi nhớ.",
  },
  question: {
    bg: "from-violet-50 via-white to-purple-50",
    text: "text-violet-600",
    ring: "ring-violet-100",
    mascot: "🐱",
    title: "Đặt câu hỏi",
    desc: "Hỏi cộng đồng về grammar, speaking, vocabulary.",
  },
  image: {
    bg: "from-yellow-50 via-white to-orange-50",
    text: "text-amber-600",
    ring: "ring-amber-100",
    mascot: "🐰",
    title: "Đăng ảnh học tập",
    desc: "Kéo thả ảnh, note hoặc screenshot bài học.",
  },
};

export default function CommunityComposerBox({ mode, setMode, onClose }: CommunityComposerBoxProps) {
  const [internalMode, setInternalMode] = useState<ComposerMode>(mode ?? "post");
  const [privacy, setPrivacy] = useState("🌎 Public");
  const currentMode = mode ?? internalMode;
  const currentTheme = theme[currentMode];

  const changeMode = (next: ComposerMode) => {
    setInternalMode(next);
    setMode?.(next);
  };

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className={`relative border-b border-slate-100 bg-gradient-to-r ${currentTheme.bg} px-5 py-4`}>
        <FloatingMascots activeMode={currentMode} />

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-full bg-white/90 px-3.5 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:text-orange-600"
          >
            ← Quay lại
          </button>

          <div className="flex h-11 w-11 animate-[mascotBounce_2.8s_ease-in-out_infinite] items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-orange-100">
            {currentTheme.mascot}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-950">Thành</h3>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-600">Lv12</span>
              <span className="hidden rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-slate-500 sm:inline">🔥 5 ngày streak</span>
            </div>
            <p className="truncate text-xs font-medium text-slate-500">Bạn đang học gì hôm nay? Chia sẻ với cộng đồng...</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <ModeToolbar mode={currentMode} setMode={changeMode} />

        <section className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br ${currentTheme.bg} p-5 ring-1 ${currentTheme.ring}`}>
          <MascotHelper mode={currentMode} />

          <div className="relative z-10 mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 animate-[mascotFloat_3.2s_ease-in-out_infinite] items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
              {currentTheme.mascot}
            </div>
            <div>
              <h2 className={`text-xl font-black ${currentTheme.text}`}>{currentTheme.title}</h2>
              <p className="text-xs font-semibold text-slate-500">{currentTheme.desc}</p>
            </div>
          </div>

          {currentMode === "post" && <PostComposer />}
          {currentMode === "speaking" && <SpeakingComposer />}
          {currentMode === "writing" && <WritingComposer />}
          {currentMode === "word" && <WordComposer />}
          {currentMode === "question" && <QuestionComposer />}
          {currentMode === "image" && <ImageComposer />}
        </section>
      </div>

      <ComposerFooter privacy={privacy} setPrivacy={setPrivacy} />
    </div>
  );
}

function ModeToolbar({ mode, setMode }: { mode: ComposerMode; setMode: (mode: ComposerMode) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
      {composerModes.map((item) => {
        const active = mode === item.key;
        return (
          <button
            key={item.key}
            onClick={() => setMode(item.key)}
            title={item.label}
            className={`group flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black transition-all ${
              active
                ? "-translate-y-0.5 bg-orange-500 text-white shadow-lg shadow-orange-200"
                : "bg-slate-50 text-slate-600 hover:-translate-y-0.5 hover:bg-orange-50 hover:text-orange-600"
            }`}
          >
            <span className="text-lg transition group-hover:scale-125">{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PostComposer() {
  return (
    <div className="grid gap-3">
      <Input label="Tiêu đề" placeholder="Hôm nay mình học được một câu mới" />
      <Textarea rows={4} label="Nội dung" placeholder="Chia sẻ suy nghĩ, câu tiếng Anh, kinh nghiệm học..." />
      <Input label="Hashtag" defaultValue="#English #Speaking" />
    </div>
  );
}

function SpeakingComposer() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="space-y-3">
        <Input label="Sentence" placeholder="I want to improve my English speaking." />
        <div className="flex flex-wrap gap-2">
          <ActionButton>🔊 Nghe mẫu</ActionButton>
          <ActionButton primary>🎙 Ghi âm</ActionButton>
        </div>
        <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-orange-100">
          <div className="flex h-12 items-end gap-1 text-3xl text-orange-500">
            <span className="animate-[wave_1s_ease-in-out_infinite]">▂</span>
            <span className="animate-[wave_1s_ease-in-out_infinite_.1s]">▃</span>
            <span className="animate-[wave_1s_ease-in-out_infinite_.2s]">▅</span>
            <span className="animate-[wave_1s_ease-in-out_infinite_.3s]">▇</span>
            <span className="animate-[wave_1s_ease-in-out_infinite_.4s]">▅</span>
            <span className="animate-[wave_1s_ease-in-out_infinite_.5s]">▃</span>
            <span className="animate-[wave_1s_ease-in-out_infinite_.6s]">▂</span>
          </div>
          <p className="text-xs font-bold text-slate-400">Audio preview · 0:18</p>
        </div>
      </div>
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-orange-100">
        <p className="text-xs font-black text-slate-500">AI Score</p>
        <div className="text-5xl font-black text-orange-500">92</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniScore title="Accuracy" value="95%" />
          <MiniScore title="Fluency" value="89" />
        </div>
        <label className="mt-3 flex gap-2 text-xs font-bold text-slate-600"><input type="checkbox" className="accent-orange-500" /> Cho mọi người nghe</label>
        <label className="mt-2 flex gap-2 text-xs font-bold text-slate-600"><input type="checkbox" className="accent-orange-500" /> Muốn góp ý</label>
      </div>
    </div>
  );
}

function WritingComposer() {
  return (
    <div className="space-y-3">
      <Textarea rows={5} label="Paste bài viết" placeholder="Dán đoạn writing của bạn..." />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniScore title="AI Score" value="88" />
        <MiniScore title="Grammar" value="88" />
        <MiniScore title="Vocabulary" value="82" />
        <MiniScore title="Natural" value="91" />
      </div>
      <Input label="Bạn muốn hỏi gì?" placeholder="Mình muốn được góp ý phần grammar..." />
    </div>
  );
}

function WordComposer() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label="Word" defaultValue="Resilient" />
      <Input label="IPA" defaultValue="/rɪˈzɪliənt/" />
      <Input label="Meaning" defaultValue="Kiên cường" />
      <Input label="Ví dụ" defaultValue="She is resilient." />
      <div className="sm:col-span-2">
        <Textarea rows={3} label="Mẹo ghi nhớ" placeholder="Ví dụ: Người luôn bật dậy sau khó khăn..." />
      </div>
    </div>
  );
}

function QuestionComposer() {
  return (
    <div className="grid gap-3">
      <Input label="Tiêu đề" defaultValue="Khi nào dùng Have been V-ing?" />
      <Textarea rows={4} label="Chi tiết" placeholder="Mình chưa hiểu sự khác nhau giữa..." />
      <Input label="Tag" defaultValue="Grammar, Speaking, Vocabulary" />
    </div>
  );
}

function ImageComposer() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-amber-200 bg-white/70 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 animate-[mascotFloat_3s_ease-in-out_infinite] items-center justify-center rounded-3xl bg-amber-100 text-4xl">📷</div>
      <h3 className="mt-3 font-black text-slate-900">Drag image here</h3>
      <p className="text-xs font-semibold text-slate-400">or</p>
      <button className="mt-3 rounded-full bg-orange-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-200">Choose image</button>
    </div>
  );
}

function ComposerFooter({ privacy, setPrivacy }: { privacy: string; setPrivacy: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <IconButton title="Emoji">😊</IconButton>
        <IconButton title="Đính kèm">📎</IconButton>
        <IconButton title="Ảnh">📷</IconButton>
        <IconButton title="Ghi âm">🎤</IconButton>
        <button className="rounded-full bg-purple-50 px-3.5 py-2 text-xs font-black text-purple-600 transition hover:-translate-y-0.5 hover:bg-purple-100">✨ AI hỗ trợ</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-orange-400">
          <option>🌎 Public</option>
          <option>👥 Friends</option>
          <option>📚 Study Group</option>
          <option>🔒 Only Me</option>
        </select>
        <button className="rounded-full bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-100">💾 Lưu nháp</button>
        <button className="rounded-full bg-orange-500 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-200 hover:bg-orange-600">Đăng bài</button>
      </div>
    </div>
  );
}

function FloatingMascots({ activeMode }: { activeMode: ComposerMode }) {
  const mascots = useMemo(() => ["🦊", "🦜", "🦉", "🐢", "🐱", "🐰"], []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {mascots.map((m, index) => (
        <span
          key={m}
          className={`absolute text-lg opacity-20 ${theme[activeMode].mascot === m ? "opacity-40" : ""}`}
          style={{
            left: `${48 + index * 8}%`,
            top: `${12 + (index % 2) * 46}%`,
            animation: `mascotDrift ${5 + index}s ease-in-out infinite`,
            animationDelay: `${index * 0.25}s`,
          }}
        >
          {m}
        </span>
      ))}
    </div>
  );
}

function MascotHelper({ mode }: { mode: ComposerMode }) {
  return (
    <div className="pointer-events-none absolute right-5 top-5 hidden rounded-3xl bg-white/70 px-3 py-2 text-xs font-black text-slate-500 shadow-sm ring-1 ring-white/80 md:block">
      {theme[mode].mascot} Miu gợi ý
    </div>
  );
}

function Input({ label, placeholder, defaultValue }: { label: string; placeholder?: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-700">{label}</span>
      <input defaultValue={defaultValue} placeholder={placeholder} className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
    </label>
  );
}

function Textarea({ label, placeholder, rows = 4 }: { label: string; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-700">{label}</span>
      <textarea rows={rows} placeholder={placeholder} className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
    </label>
  );
}

function MiniScore({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/90 p-3 text-center shadow-sm ring-1 ring-slate-100">
      <div className="text-xl font-black text-orange-500">{value}</div>
      <div className="text-[11px] font-black text-slate-400">{title}</div>
    </div>
  );
}

function ActionButton({ children, primary }: { children: ReactNode; primary?: boolean }) {
  return (
    <button className={`rounded-full px-4 py-2.5 text-xs font-black shadow-sm transition hover:-translate-y-0.5 ${primary ? "bg-orange-500 text-white shadow-orange-200" : "bg-white text-slate-700"}`}>{children}</button>
  );
}

function IconButton({ children, title }: { children: ReactNode; title: string }) {
  return (
    <button title={title} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-base shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-50 hover:scale-105">{children}</button>
  );
}
"use client";

import { useState } from "react";
import CommunityComposerBox from "./CommunityComposerBox";

type ComposerMode =
  | "post"
  | "speaking"
  | "writing"
  | "word"
  | "question"
  | "image";

export default function CommunityPage() {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [mode, setMode] = useState<ComposerMode>("speaking");

  return (
    <main className="min-h-screen bg-[#fff6ec] px-6 py-6 text-[#13213c]">
      {!isComposerOpen ? (
        <CommunityHome onOpen={() => setIsComposerOpen(true)} />
      ) : (
        <CommunityComposerBox
          mode={mode}
          setMode={setMode}
          onClose={() => setIsComposerOpen(false)}
        />
      )}
    </main>
  );
}

function CommunityHome({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-start justify-between gap-6">
        <section>
          <div className="mb-3 inline-flex rounded-full border border-orange-200 bg-white px-4 py-1 text-xs font-bold text-orange-500">
            🔥 Cộng đồng học tiếng Anh
          </div>

          <h1 className="text-5xl font-extrabold leading-tight">
            Học cùng nhau, tiến bộ <br />
            <span className="text-orange-500">mỗi ngày</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm text-slate-500">
            Chia sẻ bài viết, hỏi đáp tiếng Anh, tham gia thử thách speaking và
            kết nối với những người học có cùng mục tiêu.
          </p>
        </section>

        <div className="mt-5 w-80 rounded-3xl bg-[#2f2859] p-6 text-white shadow-xl">
          <h3 className="font-bold">Thử thách tuần này</h3>
          <p className="mt-3 text-sm text-white/80">
            Viết 2 câu giới thiệu bản thân với động từ tobe bằng tiếng Anh.
          </p>
          <p className="mt-3 text-sm font-bold text-orange-200">
            1.280 thành viên · 220 bài chia sẻ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[220px_1fr_260px] gap-6">
        <aside className="space-y-4">
          <Card>
            <h3 className="mb-3 font-extrabold">Khám phá</h3>
            <MenuItem text="Tất cả bài viết" count="230" active />
            <MenuItem text="Hỏi đáp ngữ pháp" count="48" />
            <MenuItem text="Luyện speaking" count="64" />
            <MenuItem text="Check bài cộng đồng" count="31" />
            <MenuItem text="Tài liệu học" count="43" />
          </Card>

          <div className="rounded-3xl bg-orange-500 p-5 text-white shadow-md">
            <h3 className="font-extrabold">🎯 Daily Challenge</h3>
            <p className="mt-2 text-sm text-white/90">
              Hoàn thành 5 dòng tiếng Anh cùng cộng đồng để nhận +60XP.
            </p>
            <div className="mt-4 font-bold">2 / 5 nhiệm vụ</div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
            <button
              onClick={onOpen}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-500 hover:border-orange-300"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                T
              </div>
              Bạn muốn chia sẻ hoặc hỏi gì hôm nay?
            </button>

            <div className="mt-3 flex flex-wrap gap-2">
              {["Speaking", "Question", "Check bài", "Word"].map((item) => (
                <button
                  key={item}
                  onClick={onOpen}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold hover:bg-orange-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <PostCard
            name="Minh Anh"
            role="12 phút trước · Speaking Daily"
            tag="Speaking"
            title="I want to improve my English speaking skills."
            body="Mình đang luyện câu này nhưng vẫn bị sai âm cuối. Mọi người nghe thử giúp mình với 🙏"
          />

          <PostCard
            name="Hoàng Nam"
            role="32 phút trước · Grammar"
            tag="Question"
            title="Ví dụ"
            body="Cho mình hỏi khi nào dùng I have worked và I have been working here for three years."
          />

          <PostCard
            name="Linh Chi"
            role="1 giờ trước · Writing Check"
            tag="Writing"
            title="Hello everyone, my name is Linh..."
            body="Mình viết đoạn giới thiệu bản thân, mong mọi người góp ý cách diễn đạt tự nhiên hơn."
          />
        </section>

        <aside className="space-y-4">
          <Card>
            <h3 className="mb-3 font-extrabold">🏆 Bảng xếp hạng</h3>
            <Rank name="Minh Anh" xp="2.480 XP" index={1} />
            <Rank name="Thanh" xp="2.320 XP" index={2} />
            <Rank name="Linh Chi" xp="2.180 XP" index={3} />
          </Card>

          <Card>
            <h3 className="mb-3 font-extrabold">👥 Nhóm học</h3>
            <Group name="Speaking A2" members="132 thành viên" />
            <Group name="Business English" members="86 thành viên" />
            <Group name="IELTS Beginner" members="74 thành viên" />
          </Card>

          <Card>
            <h3 className="mb-3 font-extrabold">📌 Quy tắc</h3>
            <p className="text-sm font-semibold text-slate-600">
              Tôn trọng người học
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Góp ý rõ ràng
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Không spam
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function CommunityComposer({
  mode,
  setMode,
  onClose,
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  onClose: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <button
        onClick={onClose}
        className="mb-4 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm"
      >
        ← Quay lại cộng đồng
      </button>

      <h1 className="text-4xl font-extrabold">Composer cộng đồng MiuLingo</h1>
      <p className="mt-2 text-sm text-slate-500">
        Nhập chủ đề cần đăng bài, mô tả nội dung; AI có thể hỗ trợ viết,
        speaking, từ mới, câu hỏi và nhận xét bài AI.
      </p>

      <div className="mt-6 grid grid-cols-[1fr_300px] gap-6">
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white">
              T
            </div>
            Bạn muốn chia sẻ hoặc hỏi gì hôm nay?
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ModeButton active={mode === "speaking"} onClick={() => setMode("speaking")}>
              🎙 Speaking
            </ModeButton>
            <ModeButton active={mode === "question"} onClick={() => setMode("question")}>
              ❓ Question
            </ModeButton>
            <ModeButton active={mode === "check"} onClick={() => setMode("check")}>
              ✅ Check bài
            </ModeButton>
            <ModeButton active={mode === "word"} onClick={() => setMode("word")}>
              📘 Từ mới
            </ModeButton>
          </div>

          <div className="mt-5">
            <label className="text-sm font-extrabold">Tiêu đề</label>
            <input
              placeholder="Mình muốn luyện câu giới thiệu bản thân tự nhiên hơn"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
            />
          </div>

          <div className="mt-5">
            <label className="text-sm font-extrabold">Nội dung chia sẻ</label>
            <textarea
              rows={7}
              defaultValue="Hello everyone, my name is Thanh. I am learning English for my job. I want to improve my speaking and communicate with customers more confidently."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
            />
          </div>

          <div className="mt-5">
            <label className="text-sm font-extrabold">Tag</label>
            <input
              defaultValue="#Speaking #IntroduceYourself #Beginner"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
            />
          </div>

          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="flex gap-2">
              {["Emoji", "Ảnh", "Ghi âm", "AI sửa lỗi"].map((item) => (
                <button
                  key={item}
                  className="rounded-full bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white">
                Lưu nháp
              </button>
              <button className="rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white">
                Đăng bài
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <h3 className="font-extrabold">✨ AI hỗ trợ</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-orange-50 p-4 text-center">
                <div className="text-2xl font-extrabold text-orange-500">88</div>
                <p className="text-xs font-bold">Writing</p>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4 text-center">
                <div className="text-2xl font-extrabold text-orange-500">A2</div>
                <p className="text-xs font-bold">Level</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-orange-100 p-4">
              <p className="text-sm font-bold">Speaking preview</p>
              <div className="mt-3 text-center text-3xl text-orange-500">
                ▂▅▇▅▂
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold">Gợi ý AI</p>
              <p className="mt-2 text-xs text-slate-500">
                Bạn có thể viết tự nhiên hơn: “I am learning English for work
                and want to speak with customers more confidently.”
              </p>
            </div>
          </Card>
        </aside>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <Card>
          <h3 className="mb-3 font-extrabold">Các loại bài đăng</h3>
          <Info text="🎙 Speaking - Chia sẻ bài nói" />
          <Info text="✅ Check bài - Chia sẻ bài viết để được AI sửa" />
          <Info text="📘 The Word of the day" />
        </Card>

        <Card>
          <h3 className="mb-3 font-extrabold">Trạng thái khi chọn từng chế độ</h3>
          <Info text="Writing: textarea + AI gợi ý" />
          <Info text="Speaking: tiêu đề + ghi âm + transcript" />
          <Info text="Upload ảnh: mô tả bài viết + file ảnh" />
        </Card>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      {children}
    </div>
  );
}

function MenuItem({
  text,
  count,
  active,
}: {
  text: string;
  count: string;
  active?: boolean;
}) {
  return (
    <div
      className={`mb-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ${
        active ? "bg-orange-50 text-orange-600" : "text-slate-600"
      }`}
    >
      <span>{text}</span>
      <span className="text-xs">{count}</span>
    </div>
  );
}

function PostCard({
  name,
  role,
  tag,
  title,
  body,
}: {
  name: string;
  role: string;
  tag: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-lg font-extrabold text-white">
            {name.charAt(0)}
          </div>
          <div>
            <h3 className="font-extrabold">{name}</h3>
            <p className="text-xs font-semibold text-slate-400">{role}</p>
          </div>
        </div>

        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-500">
          {tag}
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-600">{body}</p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold">
        {title}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-3 text-xs font-bold text-slate-500">
          <span>🔥 24</span>
          <span>💬 8 góp ý</span>
          <span>🎧 Nghe</span>
        </div>

        <button className="rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white">
          Góp ý
        </button>
      </div>
    </article>
  );
}

function Rank({
  name,
  xp,
  index,
}: {
  name: string;
  xp: string;
  index: number;
}) {
  return (
    <div className="mb-3 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 font-bold text-orange-500">
          {index}
        </span>
        <b>{name}</b>
      </div>
      <span className="text-xs font-bold text-slate-400">{xp}</span>
    </div>
  );
}

function Group({ name, members }: { name: string; members: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-extrabold">{name}</p>
        <p className="text-xs text-slate-400">{members}</p>
      </div>
      <button className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
        Tham gia
      </button>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-extrabold ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

function Info({ text }: { text: string }) {
  return (
    <div className="mb-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
      {text}
    </div>
  );
}
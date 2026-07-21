"use client";

import {
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  Diamond,
  Flame,
  Gift,
  Home,
  Lightbulb,
  Lock,
  Mic,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Trophy,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { speakWord } from "@/src/lib/tts-api";

export default function CreateFlashcardPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#120b5f]">
      <div className="flex">
        <div className="hidden">
          <Sidebar />
        </div>

        <main className="flex-1">
          <div className="grid grid-cols-[1fr_430px] gap-9 px-9 py-8">
            <section>
              <p className="mb-5 text-sm font-bold text-purple-500">
                ← Trang chủ › Flashcards › Tạo bộ thẻ
              </p>

              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="mb-3 text-4xl font-black">
                    Tạo bộ thẻ Flashcard <span className="text-purple-600">♟</span>
                  </h1>
                  <p className="text-lg font-medium text-purple-500">
                    Tạo bộ thẻ của riêng bạn để học và ôn tập hiệu quả hơn
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="rounded-2xl border border-purple-200 bg-purple-50 px-6 py-5 text-sm font-bold leading-6">
                    Tạo bộ thẻ theo chủ đề bạn thích <br />
                    để ghi nhớ từ vựng dễ dàng hơn nhé!
                  </div>
                  <div className="text-7xl">🦊</div>
                </div>
              </div>

              <Card>
                <StepTitle number="1" title="Thông tin bộ thẻ" />

                <div className="grid grid-cols-2 gap-5">
                  <Field label="Tên bộ thẻ *">
                    <input
                      className="input"
                      placeholder="Ví dụ: 100 từ vựng IELTS phổ biến"
                    />
                  </Field>

                  <Field label="Chủ đề">
                    <button className="input flex items-center justify-between text-purple-400">
                      Chọn chủ đề <ChevronDown size={18} />
                    </button>
                  </Field>

                  <Field label="Mô tả (không bắt buộc)">
                    <textarea
                      className="input h-28 resize-none pt-4"
                      placeholder="Mô tả ngắn gọn về bộ thẻ của bạn..."
                    />
                  </Field>

                  <div className="space-y-5">
                    <Field label="Cấp độ">
                      <div className="grid grid-cols-6 gap-3">
                        {["A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => (
                          <button
                            key={lv}
                            className={`rounded-lg border py-3 font-black ${
                              lv === "B1"
                                ? "border-purple-600 bg-purple-50 text-purple-700"
                                : "border-purple-200 bg-white"
                            }`}
                          >
                            {lv}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Gắn thẻ">
                      <div className="flex overflow-hidden rounded-xl border border-purple-200 bg-white">
                        <div className="flex flex-1 items-center gap-2 px-3">
                          {["IELTS", "Travel", "Vocabulary"].map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-purple-100 px-3 py-1 font-bold text-purple-600"
                            >
                              {tag} ×
                            </span>
                          ))}
                        </div>
                        <button className="border-l border-purple-200 px-5 font-bold text-purple-500">
                          + Thêm thẻ
                        </button>
                      </div>
                    </Field>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="mb-3 font-black">Chế độ riêng tư</p>
                  <div className="grid grid-cols-2 gap-5">
                    <Privacy active icon="🌐" title="Công khai" desc="Mọi người có thể xem và học bộ thẻ này" />
                    <Privacy icon={<Lock size={22} />} title="Riêng tư" desc="Chỉ bạn có thể xem và học" />
                  </div>
                </div>
              </Card>

              <Card className="mt-7">
                <StepTitle number="2" title="Thêm thẻ vào bộ" />

                <div className="mb-5 flex gap-2">
                  {["Nhập thủ công", "Nhập từ file", "Từ danh sách có sẵn", "Tạo bằng AI ✨"].map(
                    (tab, i) => (
                      <button
                        key={tab}
                        className={`rounded-t-xl border px-6 py-3 font-black ${
                          i === 0
                            ? "border-purple-300 border-b-purple-600 text-purple-700"
                            : "border-purple-100 bg-purple-50/50 text-purple-500"
                        }`}
                      >
                        {tab}
                      </button>
                    )
                  )}
                </div>

                <div className="grid grid-cols-[1fr_1fr_1fr_180px] gap-4">
                  <Field label="Từ / Cụm từ (Tiếng Anh)">
                    <input className="input" placeholder="Nhập từ hoặc cụm từ..." />
                  </Field>

                  <Field label="Phiên âm">
                    <div className="relative">
                      <input className="input pr-10" placeholder="/prəˈnʌnsiːeɪʃn/" />
                      <Mic
                        size={18}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500"
                      />
                    </div>
                  </Field>

                  <Field label="Nghĩa (Tiếng Việt)">
                    <input className="input" placeholder="Nhập nghĩa..." />
                  </Field>

                  <div className="pt-7">
                    <button className="h-12 w-full rounded-xl border border-purple-300 bg-purple-50 font-black text-purple-700">
                      <Plus className="mr-2 inline" size={18} />
                      Thêm thẻ
                    </button>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <h3 className="font-black">Danh sách thẻ (0)</h3>
                  <button className="rounded-lg bg-red-50 px-4 py-2 font-bold text-red-500">
                    Xóa tất cả
                  </button>
                </div>

                <div className="mt-3 grid h-32 place-items-center rounded-xl bg-purple-50/50 text-center">
                  <div>
                    <div className="mb-3 text-4xl">▣</div>
                    <p className="font-black">Chưa có thẻ nào trong bộ</p>
                    <p className="text-purple-400">
                      Hãy thêm thẻ đầu tiên để bắt đầu nhé!
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button className="rounded-xl border border-purple-200 px-8 py-4 font-black">
                    Hủy
                  </button>

                  <div className="flex gap-4">
                    <button className="rounded-xl border border-purple-200 px-10 py-4 font-black text-purple-600">
                      <Bookmark className="mr-2 inline" />
                      Lưu nháp
                    </button>

                    <button className="rounded-xl bg-purple-600 px-12 py-4 font-black text-white shadow-lg shadow-purple-200">
                      <Check className="mr-2 inline" />
                      Tạo bộ thẻ
                    </button>
                  </div>
                </div>
              </Card>
            </section>

            <aside className="space-y-7">
              <Card className="bg-purple-50/70">
                <h3 className="mb-5 flex items-center gap-3 text-xl font-black">
                  <Lightbulb className="text-purple-600" />
                  Mẹo tạo bộ thẻ hiệu quả
                </h3>

                <ul className="space-y-4 pl-5 font-medium leading-7 text-purple-500">
                  <li>• Mỗi thẻ chỉ nên có 1 ý nghĩa chính</li>
                  <li>• Sử dụng hình ảnh để ghi nhớ tốt hơn</li>
                  <li>• Ôn tập đều đặn mỗi ngày</li>
                  <li>• Chia nhỏ bộ thẻ theo chủ đề cụ thể</li>
                </ul>

                <button className="mt-6 font-black text-purple-700">
                  Xem hướng dẫn chi tiết →
                </button>
              </Card>

              <Card>
                <h3 className="mb-8 text-xl font-black">Xem trước bộ thẻ</h3>

                <div className="mx-auto mb-7 grid h-[290px] w-[280px] place-items-center rounded-2xl bg-white p-8 text-center shadow-xl shadow-purple-100">
                  <div>
                    <h4 className="mb-5 text-4xl font-black">
                      example{" "}
                      <button
                        type="button"
                        onClick={() => speakWord("example")}
                        className="inline-flex align-middle text-purple-600"
                      >
                        <Volume2 />
                      </button>
                    </h4>
                    <p className="mb-8 text-xl font-black text-purple-600">
                      /ɪɡˈzæmpəl/
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      (n) ví dụ, thí dụ
                    </p>
                  </div>
                </div>

                <p className="mb-4 text-center font-black">1 / 10</p>
                <div className="mx-auto mb-7 h-2 w-[280px] rounded-full bg-purple-100">
                  <div className="h-2 w-8 rounded-full bg-purple-600" />
                </div>

                <button className="mx-auto flex w-[200px] items-center justify-center rounded-xl border border-purple-200 py-4 font-black text-purple-600">
                  ⟳ Lật thẻ
                </button>
              </Card>

              <Card className="flex items-center justify-between bg-purple-50/60">
                <p className="max-w-[250px] font-medium leading-7 text-purple-500">
                  Sau khi tạo xong, bạn có thể bắt đầu ôn tập ngay hoặc chia sẻ
                  cho bạn bè cùng học nhé! 💜
                </p>
                <div className="text-6xl">🦊</div>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const menu = [
    ["Trang chủ", Home],
    ["Tổng quan", BookOpen],
    ["Từ vựng", BookOpen],
    ["Ngữ pháp", BookOpen],
    ["Nghe", Volume2],
    ["Nói", Mic],
    ["Đọc hiểu", BookOpen],
    ["Viết", X],
    ["Flashcards", Star],
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-purple-100 bg-white px-5 py-6">
      <div className="mb-10 flex items-center gap-3">
        <div className="text-3xl">🦊</div>
        <h1 className="text-3xl font-black">
          Study<span className="text-purple-600">Arena</span>
        </h1>
      </div>

      <nav className="space-y-2">
        <p className="px-3 text-xs font-bold uppercase tracking-widest text-purple-400">
          Học tập
        </p>

        {menu.map(([label, Icon]: any) => (
          <button
            key={label}
            className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-black ${
              label === "Flashcards"
                ? "bg-purple-50 text-purple-700"
                : "hover:bg-purple-50"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}

        <div className="ml-7 border-l border-purple-200 pl-4">
          <button className="w-full px-4 py-2 text-left text-sm font-bold">
            Ôn tập hôm nay
          </button>
          <button className="w-full px-4 py-2 text-left text-sm font-bold">
            Tất cả thẻ
          </button>
          <button className="mb-2 w-full rounded-xl bg-purple-100 px-4 py-3 text-left text-sm font-black text-purple-700">
            Tạo bộ thẻ
          </button>
        </div>

        <p className="px-3 pt-6 text-xs font-bold uppercase tracking-widest text-purple-400">
          Cộng đồng
        </p>

        {["Cộng đồng", "Hỏi đáp", "Thành tích"].map((item) => (
          <button
            key={item}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-black hover:bg-purple-50"
          >
            <Trophy size={18} />
            {item}
          </button>
        ))}

        <p className="px-3 pt-6 text-xs font-bold uppercase tracking-widest text-purple-400">
          Khác
        </p>

        {[
          ["Khoá học", BookOpen],
          ["Shop", ShoppingBag],
          ["Cài đặt", Settings],
        ].map(([label, Icon]: any) => (
          <button
            key={label}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-black hover:bg-purple-50"
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-purple-50 p-5">
        <p className="mb-3 font-black text-purple-700">👑 Nâng cấp Premium</p>
        <p className="mb-4 text-sm leading-6 text-purple-500">
          Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
        </p>
        <button className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white">
          Nâng cấp ngay
        </button>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="flex h-[92px] items-center justify-between border-b border-purple-100 bg-white px-9">
      <div className="relative w-[520px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
        <input
          className="h-14 w-full rounded-xl border border-purple-200 pl-12 outline-none"
          placeholder="Tìm bài học, từ vựng, ngữ pháp..."
        />
      </div>

      <div className="flex items-center gap-8">
        <Top icon={<Flame className="text-red-500" />} value="18" label="Streak" />
        <Top icon={<Star className="text-yellow-400" />} value="2,450" label="XP hôm nay" />
        <Top icon={<Diamond className="text-sky-400" />} value="5,230" label="Xu" />
        <Gift className="text-purple-600" />
        <span>🔔</span>

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-cyan-100 text-xl">
            👦
          </div>
          <div>
            <p className="text-sm font-black">Minh Anh</p>
            <p className="text-xs text-purple-400">Level 18</p>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}

function Card({ children, className = "" }: any) {
  return (
    <div className={`rounded-2xl border border-purple-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function StepTitle({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="mb-6 flex items-center gap-4 text-xl font-black">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-600 text-white">
        {number}
      </span>
      {title}
    </h2>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="block">
      <p className="mb-2 font-black">{label}</p>
      {children}
    </label>
  );
}

function Privacy({ active, icon, title, desc }: any) {
  return (
    <button
      className={`flex items-center gap-4 rounded-xl border p-5 text-left ${
        active
          ? "border-purple-500 bg-purple-50"
          : "border-purple-200 bg-white"
      }`}
    >
      <span className="text-2xl text-purple-600">{icon}</span>
      <span>
        <p className="font-black text-purple-700">{title}</p>
        <p className="text-sm font-medium text-purple-400">{desc}</p>
      </span>
    </button>
  );
}

function Top({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="font-black">{value}</p>
        <p className="text-xs font-bold text-purple-400">{label}</p>
      </div>
    </div>
  );
}

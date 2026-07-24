"use client";

import {
  BookOpen,
  ChevronDown,
  Clock,
  Diamond,
  Flame,
  Gift,
  GraduationCap,
  Home,
  Mic,
  RotateCcw,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import { speakWord } from "@/src/lib/tts-api";

const navs = [
  ["Trang chủ", Home],
  ["Tổng quan", BookOpen],
  ["Từ vựng", BookOpen],
  ["Ngữ pháp", GraduationCap],
  ["Nghe", Volume2],
  ["Nói", Mic],
  ["Đọc hiểu", BookOpen],
  ["Viết", X],
  ["Flashcards", Star],
];

const reviewWords = [
  ["adventure", "/ədˈventʃər/", "Khó", "red"],
  ["memorable", "/ˈmemərəbl/", "Trung bình", "orange"],
  ["explore", "/ɪkˈsplɔːr/", "Dễ", "green"],
  ["experience", "/ɪkˈspɪəriəns/", "Trung bình", "orange"],
  ["destination", "/ˌdestɪˈneɪʃn/", "Dễ", "green"],
];

export default function FlashcardsPage() {
  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#130b5f]">
      <div className="flex">
        <aside className="hidden fixed left-0 top-0 h-screen w-[280px] border-r border-purple-100 bg-white px-5 py-6">
          <div className="mb-10 flex items-center gap-3">
            {/* <div className="text-3xl">🦊</div> */}
            <h1 className="text-3xl font-black">
              Study<span className="text-purple-600">Arena</span>
            </h1>
          </div>

          <nav className="space-y-2">
            <p className="px-3 text-xs font-bold uppercase tracking-widest text-purple-400">
              Học tập
            </p>

            {navs.map(([label, Icon]: any) => (
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
              <button className="mb-2 w-full rounded-xl bg-purple-100 px-4 py-3 text-left text-sm font-black text-purple-700">
                Ôn tập hôm nay
              </button>
              <button className="mb-2 w-full px-4 py-2 text-left text-sm font-bold">
                Tất cả thẻ
              </button>
              <button className="w-full px-4 py-2 text-left text-sm font-bold">
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

        <main className="flex-1">
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

          <div className="grid grid-cols-[1fr_420px] gap-9 px-9 py-8">
            <section>
              <p className="mb-5 text-sm font-bold text-purple-500">
                ← Trang chủ › Flashcards › Ôn tập hôm nay
              </p>

              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="mb-3 text-4xl font-black">
                    Flashcards <span className="text-purple-600">♟</span>
                  </h2>
                  <p className="text-lg font-medium text-purple-500">
                    Ôn tập từ vựng hiệu quả với phương pháp lặp lại ngắt quãng (SRS)
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="rounded-2xl border border-purple-200 bg-purple-50 px-6 py-5 text-sm font-bold leading-6">
                    Cùng ôn tập mỗi ngày <br /> để ghi nhớ từ vựng lâu hơn nhé!
                  </div>
                  {/* <div className="text-7xl">🦊</div> */}
                </div>
              </div>

              <div className="mb-6 flex gap-4">
                {["Ôn tập hôm nay 28", "Mới học 15", "Dễ 32", "Trung bình 48", "Khó 16"].map(
                  (item, i) => (
                    <button
                      key={item}
                      className={`rounded-xl border px-6 py-3 font-black ${
                        i === 0
                          ? "border-purple-600 bg-purple-600 text-white"
                          : "border-purple-200 bg-white text-purple-600"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>

              <div className="rounded-3xl bg-purple-100/60 p-8">
                <div className="mx-auto mb-8 max-w-[760px] rounded-2xl bg-white p-8 text-center shadow-xl shadow-purple-200">
                  <div className="mb-16 flex justify-between">
                    <span className="rounded-lg bg-green-100 px-4 py-2 font-black text-green-600">
                      A2
                    </span>
                    <Star className="text-purple-400" />
                  </div>

                  <h3 className="mb-5 text-5xl font-black">
                    adventure{" "}
                    <button
                      type="button"
                      onClick={() => speakWord("adventure")}
                      className="rounded-full bg-purple-100 p-3 text-purple-600 transition hover:bg-purple-200"
                    >
                      <Volume2 />
                    </button>
                  </h3>

                  <p className="mb-8 text-2xl font-black text-purple-600">
                    /ədˈventʃər/
                  </p>

                  <div className="mx-auto mb-8 h-px w-[560px] bg-purple-100" />

                  <p className="mb-12 text-2xl font-bold">
                    (n) cuộc phiêu lưu, cuộc mạo hiểm
                  </p>

                  <p className="font-semibold text-purple-400">
                    ⟳ Nhấn vào thẻ hoặc nút bên dưới để lật thẻ
                  </p>
                </div>

                <div className="mb-8 flex items-center justify-between">
                  <button className="rounded-xl border border-purple-200 bg-white px-6 py-4 font-black text-purple-500">
                    <RotateCcw className="mr-2 inline" />
                    Bỏ qua
                  </button>

                  <div className="w-[520px] text-center">
                    <p className="mb-3 text-xl font-black">7 / 28</p>
                    <div className="h-2 rounded-full bg-purple-200">
                      <div className="h-2 w-[35%] rounded-full bg-purple-600" />
                    </div>
                  </div>

                  <button className="rounded-xl border border-purple-200 bg-white px-6 py-4 font-black text-purple-500">
                    ⌨ Bàn phím
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  <Rate title="Again" desc="Chưa nhớ" icon="🔁" color="red" />
                  <Rate title="Hard" desc="Khó nhớ" icon="☹️" color="orange" />
                  <Rate title="Good" desc="Ghi nhớ tốt" icon="🙂" color="green" />
                  <Rate title="Easy" desc="Rất dễ nhớ" icon="⭐" color="purple" />
                </div>

                <div className="mt-8 flex items-center justify-between rounded-2xl border border-purple-200 bg-white/70 p-6">
                  <div className="flex items-center gap-5">
                    <div className="text-5xl">💡</div>
                    <div>
                      <p className="mb-1 text-lg font-black text-purple-700">
                        Mẹo học Flashcards
                      </p>
                      <p className="font-medium text-purple-500">
                        Đánh giá chính xác mức độ nhớ của bạn. Hệ thống sẽ sắp xếp
                        lịch ôn tập phù hợp.
                      </p>
                    </div>
                  </div>
                  {/* <div className="text-6xl">🦊</div> */}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <Card>
                <div className="mb-8 flex justify-between">
                  <h3 className="text-xl font-black">Tiến độ buổi học</h3>
                  <button className="font-bold text-purple-600">Sửa mục tiêu ✎</button>
                </div>

                <div className="mx-auto mb-8 grid h-40 w-40 place-items-center rounded-full bg-[conic-gradient(#7c16ff_60%,#eee8ff_0)]">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                    <div>
                      <p className="text-4xl font-black">60%</p>
                      <p className="font-bold">Hoàn thành</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 text-center">
                  <Mini value="28" label="Thẻ cần ôn" icon="♟" />
                  <Mini value="17" label="Đã ôn xong" icon="✅" />
                  <Mini value="12:45" label="Thời gian" icon={<Clock size={18} />} />
                </div>
              </Card>

              <Card className="flex items-center justify-between">
                <div>
                  <p className="mb-2 text-xl font-black">🔥 Duy trì chuỗi ngày!</p>
                  <p className="font-medium text-purple-500">
                    Bạn đã ôn tập 18 ngày liên tục 🔥
                  </p>
                </div>
                <div className="text-6xl">🦊</div>
              </Card>

              <Card>
                <h3 className="mb-6 text-xl font-black">Danh sách từ cần ôn</h3>

                <div className="space-y-5">
                  {reviewWords.map(([word, ipa, level, color]) => (
                    <div key={word} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-3 w-3 rounded-full ${
                            color === "red"
                              ? "bg-red-500"
                              : color === "orange"
                              ? "bg-orange-400"
                              : "bg-green-500"
                          }`}
                        />
                        <div>
                          <p className="font-black">{word}</p>
                          <p className="text-sm font-medium text-purple-400">{ipa}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-black text-purple-600">
                          {level}
                        </span>
                        <button
                          type="button"
                          onClick={() => speakWord(word)}
                          className="rounded-lg bg-purple-50 p-2 text-purple-600 transition hover:bg-purple-100"
                        >
                          <Volume2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="mt-8 w-full rounded-xl border border-purple-300 py-4 font-black text-purple-600">
                  Xem tất cả thẻ →
                </button>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-purple-100 bg-white p-7 shadow-sm ${className}`}>
      {children}
    </div>
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

function Mini({ icon, value, label }: any) {
  return (
    <div>
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
        {icon}
      </div>
      <p className="text-xl font-black">{value}</p>
      <p className="text-sm font-bold text-purple-400">{label}</p>
    </div>
  );
}

function Rate({
  title,
  desc,
  icon,
  color,
}: {
  title: string;
  desc: string;
  icon: string;
  color: string;
}) {
  const styles: Record<string, string> = {
    red: "border-red-200 bg-red-50 text-red-500",
    orange: "border-orange-200 bg-orange-50 text-orange-500",
    green: "border-green-200 bg-green-50 text-green-600",
    purple: "border-purple-200 bg-purple-50 text-purple-600",
  };

  return (
    <button className={`rounded-2xl border p-8 text-center ${styles[color]}`}>
      <div className="mb-4 text-4xl">{icon}</div>
      <p className="mb-2 text-xl font-black">{title}</p>
      <p className="font-bold">{desc}</p>
    </button>
  );
}

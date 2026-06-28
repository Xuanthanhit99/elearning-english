"use client";

import { api } from "@/src/lib/axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SpiritPetAvatar from "./SpiritPetAvatar";

type Pet = {
  petType: string;
  petName: string;
  isChosen: boolean;
  randomAssigned: boolean;
  mustChoosePet: boolean;
  daysLeftToChoose?: number;
  hp: number;
  energy: number;
  happiness: number;
  hunger: number;
  streak: number;
  level?: number;
};

type ChatMessage = {
  id: number;
  from: "user" | "pet";
  text: string;
};

const PETS: Record<string, { color: string; label: string }> = {
  cat: { color: "#ff8a00", label: "mèo" },
  dog: { color: "#d97706", label: "chó" },
  panda: { color: "#475569", label: "gấu trúc" },
  fox: { color: "#ea580c", label: "cáo" },
  penguin: { color: "#0284c7", label: "chim cánh cụt" },
  rabbit: { color: "#db2777", label: "thỏ" },
};

const ENCOURAGEMENTS = [
  "Bạn không cần học thật nhiều một lúc. Chỉ cần quay lại mỗi ngày là mình vui rồi.",
  "Hôm nay mình ở đây canh streak cho bạn. Làm một nhiệm vụ nhỏ nhé?",
  "Sai một câu không sao đâu. Sai là dấu vết của việc bạn đang thật sự học.",
  "Nếu thấy mệt, mình đề xuất 5 phút nhẹ nhàng: một từ mới, một câu nói, một nụ cười.",
];

const PLAYFUL_LINES = [
  "Mình vừa lăn một vòng cổ vũ bạn đó. Không ai thấy đâu, nhưng rất chuyên nghiệp.",
  "Piu piu! Mình bắn tia tập trung vào não học tiếng Anh của bạn rồi nè.",
  "Nếu bạn học thêm 5 phút, mình sẽ tự phong mình là trợ lý siêu cấp.",
  "Mình đang giữ coin và food rất cẩn thận. Cực kỳ nghiêm túc. Gần như vậy.",
];

function makeReply(input: string, petName: string) {
  const text = input.toLowerCase();

  if (text.includes("mệt") || text.includes("buồn") || text.includes("khó")) {
    return `${petName} nghe thấy rồi. Mình không ép bạn đâu, mình chỉ rủ bạn làm một bước nhỏ: 3 phút thôi, rồi nghỉ cũng được.`;
  }

  if (text.includes("học") || text.includes("bài") || text.includes("english")) {
    return `Tuyệt! ${petName} đề xuất: chọn một mục dễ nhất trước. Hoàn thành xong mình ăn mừng bằng một cú nhún linh thú.`;
  }

  if (text.includes("thưởng") || text.includes("coin") || text.includes("xp")) {
    return `Có chứ! Hoàn thành bài học là có XP, coin và food. Mình đang đợi phần thưởng với vẻ mặt rất ngoan.`;
  }

  return `${petName} ở đây nè. Mình chưa phải AI siêu thông minh đâu, nhưng mình giỏi động viên và làm bạn cười khi học.`;
}

export default function FloatingPetCompanion() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const fetchPet = async () => {
    try {
      const res = await api.get("/pets/me");
      setPet(res.data);
    } catch (error) {
      console.error(error);
      setPet(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPet();

    const handlePetUpdated = () => fetchPet();
    window.addEventListener("pet-updated", handlePetUpdated);

    return () => window.removeEventListener("pet-updated", handlePetUpdated);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % ENCOURAGEMENTS.length);
    }, 9000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pet || chatMessages.length > 0) return;

    const name = pet.isChosen ? pet.petName : "Linh thú";
    setChatMessages([
      {
        id: Date.now(),
        from: "pet",
        text: pet.mustChoosePet || !pet.isChosen
          ? "Mình vẫn chưa thức tỉnh hoàn toàn. Chọn một linh thú để mình đồng hành với bạn nhé!"
          : `Xin chào, mình là ${name}. Hôm nay mình sẽ đi theo cổ vũ bạn học tiếng Anh.`,
      },
    ]);
  }, [pet, chatMessages.length]);

  const petInfo = useMemo(() => {
    if (!pet?.petType || pet.petType === "pending") return PETS.cat;
    return PETS[pet.petType] || PETS.cat;
  }, [pet?.petType]);

  if (loading || !pet) return null;

  const needsChoice = pet.mustChoosePet || !pet.isChosen;
  const petName = needsChoice ? "Linh thú" : pet.petName;
  const bubbleTitle = needsChoice ? "Chọn linh thú" : `${petName} đang đi cùng bạn`;
  const bubbleText = needsChoice
    ? `Bạn còn ${pet.daysLeftToChoose ?? 7} ngày để chọn. Quá hạn hệ thống sẽ chọn ngẫu nhiên.`
    : ENCOURAGEMENTS[messageIndex];

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;

    setChatMessages((current) => [
      ...current,
      { id: Date.now(), from: "user", text },
      { id: Date.now() + 1, from: "pet", text: makeReply(text, petName) },
    ]);
    setChatInput("");
  };

  const addPetLine = (text: string) => {
    setChatMessages((current) => [
      ...current,
      { id: Date.now(), from: "pet", text },
    ]);
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[9000] sm:bottom-5 sm:right-5">
        {bubbleOpen && (
          <div className="mb-3 max-w-[260px] rounded-[24px] border border-[#ead8c2] bg-white p-4 shadow-[0_24px_70px_rgba(31,42,68,0.16)] sm:max-w-[280px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#ff6b00]">
                  {bubbleTitle}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-[#1f2a44]">
                  {bubbleText}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBubbleOpen(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-[#5b6b85]"
                aria-label="Ẩn lời nhắc linh thú"
              >
                ×
              </button>
            </div>

            {!needsChoice && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-extrabold text-[#5b6b85]">
                <MiniStat label="Lv" value={pet.level || 1} />
                <MiniStat label="🔥" value={pet.streak} />
                <MiniStat label="HP" value={pet.hp} />
              </div>
            )}
          </div>
        )}

        <div className="relative flex items-end justify-end">
          {!bubbleOpen && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="absolute -left-32 bottom-6 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#ff6b00] shadow-lg ring-1 ring-[#ead8c2]"
            >
              Gọi {petName}
            </button>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group relative flex h-20 w-20 items-center justify-center rounded-[26px] bg-white text-5xl shadow-[0_24px_60px_rgba(31,42,68,0.22)] ring-4 ring-white transition hover:scale-105 sm:h-24 sm:w-24 sm:rounded-[30px] sm:text-6xl"
            style={{ background: `linear-gradient(145deg, white, ${petInfo.color}22)` }}
            aria-label="Gọi linh thú đồng hành"
          >
            <SpiritPetAvatar
              petType={needsChoice ? "pending" : pet.petType}
              level={pet.level || 1}
              size="md"
              showLevelBadge={false}
            />
            <span className="absolute -right-1 -top-1 flex h-8 min-w-8 items-center justify-center rounded-full bg-[#ff6b00] px-2 text-xs font-black text-white shadow-lg">
              {needsChoice ? "!" : `${pet.streak}🔥`}
            </span>
            <span className="absolute -bottom-2 rounded-full bg-[#1f2a44] px-3 py-1 text-xs font-extrabold text-white opacity-0 transition group-hover:opacity-100">
              Gọi linh thú
            </span>
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-[34px] bg-white shadow-2xl">
            <div className="grid bg-gradient-to-br from-[#fff7ed] via-white to-[#eef6ff] md:grid-cols-[320px_1fr]">
              <div className="relative flex flex-col items-center justify-center overflow-hidden bg-[#1f2a44] p-8 text-white">
                <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
                <div className="absolute -right-12 bottom-10 h-32 w-32 rounded-full bg-[#ff6b00]/20 blur-2xl" />

                <SpiritPetAvatar
                  petType={needsChoice ? "pending" : pet.petType}
                  level={pet.level || 1}
                  size="xl"
                />

                <h2 className="mt-5 text-center text-3xl font-black">{petName}</h2>
                <p className="mt-2 text-center text-sm font-bold leading-6 text-white/75">
                  {needsChoice
                    ? "Mình đang chờ bạn chọn hình dạng để thức tỉnh."
                    : `Lv ${pet.level || 1} · Streak ${pet.streak} ngày · HP ${pet.hp}/100`}
                </p>

                <Link
                  href="/pet"
                  onClick={() => setModalOpen(false)}
                  className="mt-6 rounded-2xl bg-[#ff6b00] px-6 py-3 font-extrabold text-white shadow-lg shadow-orange-900/20"
                >
                  {needsChoice ? "Chọn linh thú" : "Chăm sóc linh thú"}
                </Link>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">
                      Góc trò chuyện
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-[#1f2a44]">
                      Gọi linh thú động viên bạn
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-[#1f2a44]"
                    aria-label="Đóng modal linh thú"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <ActionButton
                    label="Động viên mình"
                    onClick={() => addPetLine(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])}
                  />
                  <ActionButton
                    label="Nghịch một chút"
                    onClick={() => addPetLine(PLAYFUL_LINES[Math.floor(Math.random() * PLAYFUL_LINES.length)])}
                  />
                  <ActionButton
                    label="Gợi ý học nhanh"
                    onClick={() => addPetLine("Mình gợi ý: học 1 từ mới, đặt 1 câu với từ đó, rồi tự thưởng một ngụm nước. Nhiệm vụ mini hoàn tất!")}
                  />
                </div>

                <div className="mt-5 h-72 space-y-3 overflow-y-auto rounded-[24px] border border-[#ead8c2] bg-[#fffaf5] p-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-bold leading-6 ${
                          message.from === "user"
                            ? "bg-[#ff6b00] text-white"
                            : "bg-white text-[#1f2a44] shadow-sm"
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") sendMessage();
                    }}
                    placeholder="Nói gì đó với linh thú..."
                    className="min-h-12 flex-1 rounded-2xl border border-[#ead8c2] px-4 font-bold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    className="rounded-2xl bg-[#1f2a44] px-5 py-3 font-extrabold text-white"
                  >
                    Gửi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#fffaf5] px-2 py-2">
      <div className="text-[#ff6b00]">{value}</div>
      <div>{label}</div>
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[#ead8c2] bg-white px-4 py-3 text-sm font-extrabold text-[#1f2a44] transition hover:-translate-y-0.5 hover:border-[#ff6b00] hover:text-[#ff6b00]"
    >
      {label}
    </button>
  );
}

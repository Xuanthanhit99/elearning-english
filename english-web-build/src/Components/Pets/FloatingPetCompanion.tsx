// components/Pets/FloatingPetCompanion.tsx
"use client";

import { api } from "@/src/lib/axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SpiritPetAvatar from "./SpiritPetAvatar";
import { sendChatMessage } from "@/src/lib/chat.api";
import { useRouter } from "next/navigation";

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
  action?: { path: string; label: string } | null;
};

type QuickActionKey = "CHEER_UP" | "BANTER" | "QUICK_TIP";

const PETS: Record<string, { color: string; label: string }> = {
  cat: { color: "#ff8a00", label: "mèo" },
  dog: { color: "#d97706", label: "chó" },
  panda: { color: "#475569", label: "g?u trúc" },
  fox: { color: "#ea580c", label: "cáo" },
  penguin: { color: "#0284c7", label: "chim cánh c?t" },
  rabbit: { color: "#db2777", label: "th?" },
};

const ENCOURAGEMENTS = [
  "B?n không c?n h?c th?t nhi?u m?t lúc. Ch? c?n quay l?i m?i ngày là mình vui r?i.",
  "Hôm nay mình ? dây canh streak cho b?n. Làm m?t nhi?m v? nh? nhé?",
  "Sai m?t câu không sao dâu. Sai là d?u v?t c?a vi?c b?n dang th?t s? h?c.",
  "N?u th?y m?t, mình d? xu?t 5 phút nh? nhàng: m?t t? m?i, m?t câu nói, m?t n? cu?i.",
];

export default function FloatingPetCompanion() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();

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
    const timer = window.setTimeout(() => setBubbleOpen(false), 6000);
    return () => window.clearTimeout(timer);
  }, [pet?.isChosen]);

  useEffect(() => {
    if (!pet || chatMessages.length > 0) return;

    const name = pet.isChosen ? pet.petName : "Linh thú";
    setChatMessages([
      {
        id: Date.now(),
        from: "pet",
        text:
          pet.mustChoosePet || !pet.isChosen
            ? "Mình v?n chua th?c t?nh hoàn toàn. Ch?n m?t linh thú d? mình d?ng hành v?i b?n nhé!"
            : `Xin chào, mình là ${name}. Hôm nay mình s? di theo c? vu b?n h?c ti?ng Anh.`,
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
  const bubbleTitle = needsChoice ? "Ch?n linh thú" : `${petName} dang di cùng b?n`;
  const bubbleText = needsChoice
    ? `B?n còn ${pet.daysLeftToChoose ?? 7} ngày d? ch?n. Quá h?n h? th?ng s? ch?n ng?u nhiên.`
    : ENCOURAGEMENTS[messageIndex];

  // G?i API th?t, dùng chung cho c? input t? do và quick action
const callPetChat = async (payload: { content?: string; quickAction?: QuickActionKey }) => {
  if (sending) return;
  setSending(true);

  if (payload.content) {
    setChatMessages((current) => [
      ...current,
      { id: Date.now(), from: "user", text: payload.content! },
    ]);
  }

  try {
    const data = await sendChatMessage({ sessionId, ...payload });
    setSessionId(data.sessionId);
    setChatMessages((current) => [
      ...current,
      { id: Date.now() + 1, from: "pet", text: data.reply, action: data.action },
    ]);
    if (data.petStatus) {
      setPet((current) => (current ? { ...current, ...data.petStatus } : current));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beacon dang lag xíu, th? l?i sau nhé";
    setChatMessages((current) => [...current, { id: Date.now() + 2, from: "pet", text: message }]);
  } finally {
    setSending(false);
  }
};

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text || sending) return;
    setChatInput("");
    callPetChat({ content: text });
  };

  return (
    <>
      <div className="fixed bottom-20 right-3 z-[9000] max-w-[calc(100vw-1.5rem)] lg:bottom-5 lg:right-5">
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
                aria-label="?n l?i nh?c linh thú"
              >
                ×
              </button>
            </div>

            {!needsChoice && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-extrabold text-[#5b6b85]">
                <MiniStat label="Lv" value={pet.level || 1} />
                <MiniStat label="??" value={pet.streak} />
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
              G?i {petName}
            </button>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group relative flex h-20 w-20 items-center justify-center rounded-[26px] bg-white text-5xl shadow-[0_24px_60px_rgba(31,42,68,0.22)] ring-4 ring-white transition hover:scale-105 sm:h-24 sm:w-24 sm:rounded-[30px] sm:text-6xl"
            style={{ background: `linear-gradient(145deg, white, ${petInfo.color}22)` }}
            aria-label="G?i linh thú d?ng hành"
          >
            <SpiritPetAvatar
              petType={needsChoice ? "pending" : pet.petType}
              level={pet.level || 1}
              size="md"
              showLevelBadge={false}
            />
            <span className="absolute -right-1 -top-1 flex h-8 min-w-8 items-center justify-center rounded-full bg-[#ff6b00] px-2 text-xs font-black text-white shadow-lg">
              {needsChoice ? "!" : `${pet.streak}??`}
            </span>
            <span className="absolute -bottom-2 rounded-full bg-[#1f2a44] px-3 py-1 text-xs font-extrabold text-white opacity-0 transition group-hover:opacity-100">
              G?i linh thú
            </span>
          </button>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-[34px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
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
                    ? "Mình dang ch? b?n ch?n hình d?ng d? th?c t?nh."
                    : `Lv ${pet.level || 1} · Streak ${pet.streak} ngày · HP ${pet.hp}/100`}
                </p>

                <Link
                  href="/pet"
                  onClick={() => setModalOpen(false)}
                  className="mt-6 rounded-2xl bg-[#ff6b00] px-6 py-3 font-extrabold text-white shadow-lg shadow-orange-900/20"
                >
                  {needsChoice ? "Ch?n linh thú" : "Cham sóc linh thú"}
                </Link>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">
                      Góc trò chuy?n
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-[#1f2a44]">
                      G?i linh thú d?ng viên b?n
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-[#1f2a44]"
                    aria-label="Ðóng modal linh thú"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <ActionButton
                    label="Ð?ng viên mình"
                    disabled={sending}
                    onClick={() => callPetChat({ quickAction: "CHEER_UP" })}
                  />
                  <ActionButton
                    label="Ngh?ch m?t chút"
                    disabled={sending}
                    onClick={() => callPetChat({ quickAction: "BANTER" })}
                  />
                  <ActionButton
                    label="G?i ý h?c nhanh"
                    disabled={sending}
                    onClick={() => callPetChat({ quickAction: "QUICK_TIP" })}
                  />
                </div>

                <div className="mt-5 h-72 space-y-3 overflow-y-auto rounded-[24px] border border-[#ead8c2] bg-[#fffaf5] p-4">
                  {chatMessages.map((message) => (
  <div key={message.id} className={`flex flex-col ${message.from === "user" ? "items-end" : "items-start"}`}>
    <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-bold leading-6 ${
      message.from === "user" ? "bg-[#ff6b00] text-white" : "bg-white text-[#1f2a44] shadow-sm"
    }`}>
      {message.text}
    </div>

    {message.action && (
      <button
        type="button"
        onClick={() => {
          setModalOpen(false);
          router.push(message.action!.path);
        }}
        className="mt-2 rounded-xl bg-[#1f2a44] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#2a3855]"
      >
        {message.action.label} ?
      </button>
    )}
  </div>
))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="max-w-[82%] rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#5b6b85] shadow-sm">
                        {petName} dang gõ...
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") sendMessage();
                    }}
                    disabled={sending}
                    placeholder="Nói gì dó v?i linh thú..."
                    className="min-h-12 flex-1 rounded-2xl border border-[#ead8c2] px-4 font-bold text-[#1f2a44] outline-none focus:border-[#ff6b00] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sending || !chatInput.trim()}
                    className="rounded-2xl bg-[#1f2a44] px-5 py-3 font-extrabold text-white disabled:opacity-50"
                  >
                    G?i
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

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-[#ead8c2] bg-white px-4 py-3 text-sm font-extrabold text-[#1f2a44] transition hover:-translate-y-0.5 hover:border-[#ff6b00] hover:text-[#ff6b00] disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {label}
    </button>
  );
}
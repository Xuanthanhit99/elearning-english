"use client";

import { api } from "@/src/lib/axios";
import { useEffect, useMemo, useState } from "react";
import SpiritPetAvatar from "./SpiritPetAvatar";

type Pet = {
  id: string;
  petType: string;
  petName: string;
  isChosen: boolean;
  randomAssigned: boolean;
  mustChoosePet: boolean;
  selectionLocked: boolean;
  daysLeftToChoose: number;
  hp: number;
  energy: number;
  happiness: number;
  hunger: number;
  xp: number;
  coins: number;
  food: number;
  streak: number;
  bestStreak: number;
  completedLessons: number;
  level?: number;
  xpToNextLevel?: number;
};

type PetKind = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

const PETS: PetKind[] = [
  { id: "cat", name: "Miu", icon: "🐱", color: "#ff8a00" },
  { id: "dog", name: "Bun", icon: "🐶", color: "#d97706" },
  { id: "panda", name: "Po", icon: "🐼", color: "#475569" },
  { id: "fox", name: "Foxie", icon: "🦊", color: "#ea580c" },
  { id: "penguin", name: "Pip", icon: "🐧", color: "#0284c7" },
  { id: "rabbit", name: "Bibi", icon: "🐰", color: "#db2777" },
];

const ACTIONS = [
  { key: "feed", label: "Cho ăn", cost: "-1 food", help: "No bụng +25, HP +5" },
  { key: "play", label: "Chơi đùa", cost: "-10 energy", help: "Happy +18, XP +2" },
  { key: "rest", label: "Nghỉ ngơi", cost: "Miễn phí", help: "Energy +25, HP +10" },
  { key: "clean", label: "Vệ sinh", cost: "-2 coin", help: "HP +12, Happy +8" },
] as const;

export default function LearningPetPanel({ compact = false }: { compact?: boolean }) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [selectedPet, setSelectedPet] = useState(PETS[0].id);
  const [petName, setPetName] = useState(PETS[0].name);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const currentPet = useMemo(
    () => PETS.find((item) => item.id === (pet?.isChosen ? pet.petType : selectedPet)) || PETS[0],
    [pet?.isChosen, pet?.petType, selectedPet],
  );

  const achievements = useMemo(
    () => [
      { title: "100 XP", done: (pet?.xp || 0) >= 100, desc: "Tích lũy 100 điểm" },
      { title: "7 ngày", done: (pet?.bestStreak || 0) >= 7, desc: "Giữ streak 7 ngày" },
      { title: "30 ngày", done: (pet?.bestStreak || 0) >= 30, desc: "Giữ streak 30 ngày" },
      { title: "50 bài", done: (pet?.completedLessons || 0) >= 50, desc: "Hoàn thành 50 bài" },
    ],
    [pet],
  );

  const syncPetForm = (data: Pet) => {
    setPet(data);
    const lockedPet = PETS.find((item) => item.id === data.petType);
    setSelectedPet(lockedPet?.id || PETS[0].id);
    setPetName(data.isChosen ? data.petName : lockedPet?.name || PETS[0].name);
  };

  const fetchPet = async () => {
    try {
      setLoading(true);
      const res = await api.get("/pets/me");
      syncPetForm(res.data);
    } catch (error) {
      console.error(error);
      setMessage("Bạn cần đăng nhập để nuôi thú cưng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPet();
  }, []);

  const savePet = async () => {
    try {
      setSaving(true);
      const res = await api.post("/pets/me", {
        petType: pet?.selectionLocked ? pet.petType : selectedPet,
        petName: petName.trim() || currentPet.name,
      });
      syncPetForm(res.data);
      setMessage(res.data.randomAssigned ? "Hệ thống đã chọn ngẫu nhiên thú cưng cho bạn." : "Đã lưu bạn đồng hành học tiếng Anh.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Không lưu được thú cưng. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const care = async (action: string) => {
    try {
      setSaving(true);
      const res = await api.patch("/pets/me/care", { action });
      syncPetForm(res.data);
      setMessage("Chăm sóc thành công. Chỉ số đã được cập nhật.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chưa thể chăm sóc lúc này.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[#ead8c2] bg-white p-6 font-extrabold text-[#5b6b85] shadow-sm">
        Đang tải thú cưng...
      </div>
    );
  }

  if (compact && pet?.mustChoosePet) {
    return (
      <a href="/pet" className="flex items-center gap-3 rounded-full bg-[#fff0dc] px-4 py-3 font-extrabold text-[#ff6b00] ring-2 ring-[#ff6b00]/20">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff6b00] opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#ff6b00]" />
        </span>
        <span>Chọn thú cưng</span>
        <span>{pet.daysLeftToChoose} ngày</span>
      </a>
    );
  }

  if (compact && pet) {
    const lockedPet = PETS.find((item) => item.id === pet.petType) || currentPet;
    return (
      <a href="/pet" className="flex items-center gap-3 rounded-full bg-[#fff0dc] py-2 pl-2 pr-4 font-extrabold text-[#ff6b00]">
        <SpiritPetAvatar
          petType={pet.petType}
          level={pet.level || 1}
          size="sm"
          showLevelBadge={false}
        />
        <span className="max-w-[90px] truncate">{pet.petName}</span>
        <span>🔥 {pet.streak}</span>
      </a>
    );
  }

  const lockedPet = pet?.isChosen ? PETS.find((item) => item.id === pet.petType) || currentPet : currentPet;

  return (
    <section className="overflow-hidden rounded-[32px] border border-[#ead8c2] bg-white shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
      <div className="grid gap-6 bg-gradient-to-br from-[#fff7ed] via-white to-[#eef6ff] p-6 lg:grid-cols-[340px_1fr]">
        <div className="rounded-[28px] bg-[#1f2a44] p-6 text-white shadow-xl">
          <p className="text-sm font-extrabold text-[#ffd7ad]">Bạn đồng hành</p>
          <div className="mt-4 flex items-center gap-4">
            <SpiritPetAvatar
              petType={pet?.isChosen ? pet.petType : "pending"}
              level={pet?.level || 1}
              size="lg"
              showLevelBadge={false}
            />
            <div className="min-w-0">
              <h2 className="truncate text-3xl font-black">{pet?.isChosen ? pet.petName : "Chưa chọn"}</h2>
              <p className="mt-2 font-bold text-white/75">
                {pet?.isChosen ? `Level ${pet?.level || 1} · ${pet?.xpToNextLevel ?? 0}/100 XP` : `Còn ${pet?.daysLeftToChoose || 0} ngày để chọn`}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Wallet label="XP" value={pet?.xp || 0} />
            <Wallet label="Coin" value={pet?.coins || 0} />
            <Wallet label="Food" value={pet?.food || 0} />
            <Wallet label="Streak" value={pet?.streak || 0} />
          </div>
        </div>

        <div className="space-y-5">
          {pet?.mustChoosePet && (
            <div className="rounded-[24px] border border-[#ffb86b] bg-[#fff7ed] p-5">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">Thông báo chọn thú cưng</p>
              <h3 className="mt-2 text-2xl font-black text-[#1f2a44]">Bạn chỉ được chọn một loại thú cưng</h3>
              <p className="mt-2 font-bold leading-7 text-[#5b6b85]">
                Hãy chọn trong {pet.daysLeftToChoose} ngày. Nếu quá 7 ngày chưa chọn, MiuLingo sẽ chọn ngẫu nhiên một thú cưng cho bạn và loại đó sẽ được khóa.
              </p>
            </div>
          )}

          {pet?.randomAssigned && (
            <div className="rounded-[24px] border border-[#ffb86b] bg-[#fff7ed] p-5 font-bold leading-7 text-[#9a4b00]">
              Bạn đã quá hạn 7 ngày nên hệ thống đã chọn ngẫu nhiên {lockedPet.name} cho bạn. Bạn vẫn có thể đổi tên, nhưng không thể đổi loại thú cưng.
            </div>
          )}

          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">
              1. Chọn thú cưng & đặt tên
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {PETS.map((item) => {
                const active = (pet?.isChosen ? pet.petType : selectedPet) === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={pet?.selectionLocked}
                    onClick={() => {
                      setSelectedPet(item.id);
                      if (!petName.trim()) setPetName(item.name);
                    }}
                    className={`rounded-2xl border p-3 text-center font-extrabold transition ${
                      active
                        ? "border-[#ff6b00] bg-[#fff0dc] text-[#ff6b00]"
                        : "border-[#ead8c2] bg-white text-[#1f2a44]"
                    } ${pet?.selectionLocked ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5"}`}
                  >
                    <div className="text-3xl">{item.icon}</div>
                    <div className="mt-1 text-sm">{item.name}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={petName}
                maxLength={20}
                onChange={(event) => setPetName(event.target.value)}
                placeholder="Tên thú cưng"
                className="min-h-12 flex-1 rounded-2xl border border-[#ead8c2] px-4 font-extrabold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
              />
              <button
                type="button"
                disabled={saving}
                onClick={savePet}
                className="rounded-2xl bg-[#ff6b00] px-6 py-3 font-extrabold text-white shadow-lg shadow-orange-200 disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : pet?.isChosen ? "Lưu tên" : "Chọn thú cưng"}
              </button>
            </div>
          </div>

          {message && (
            <div className="rounded-2xl bg-[#fff0dc] px-4 py-3 font-bold text-[#9a4b00]">
              {message}
            </div>
          )}

          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">
              2. Trạng thái hiện tại
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <PetStat label="HP" value={pet?.hp || 0} />
              <PetStat label="Energy" value={pet?.energy || 0} />
              <PetStat label="Happy" value={pet?.happiness || 0} />
              <PetStat label="No bụng" value={pet?.hunger || 0} />
            </div>
          </div>

          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">
              3. Chăm sóc thú cưng
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              {ACTIONS.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  disabled={saving || !pet?.isChosen}
                  onClick={() => care(action.key)}
                  className="rounded-2xl border border-[#ead8c2] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#ff6b00] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="font-extrabold text-[#1f2a44]">{action.label}</div>
                  <div className="mt-1 text-xs font-bold text-[#ff6b00]">{action.cost}</div>
                  <div className="mt-2 text-xs font-bold leading-5 text-[#5b6b85]">{action.help}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-[#ead8c2] bg-[#fffaf5] p-6 md:grid-cols-[240px_1fr]">
        <div>
          <h3 className="text-xl font-black text-[#1f2a44]">Streak & thành tích</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-[#5b6b85]">
            Đã hoàn thành {pet?.completedLessons || 0} bài · tốt nhất {pet?.bestStreak || 0} ngày.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((item) => (
            <div
              key={item.title}
              className={`rounded-2xl border p-4 ${
                item.done
                  ? "border-[#ff6b00] bg-white text-[#1f2a44]"
                  : "border-[#ead8c2] bg-white/60 text-[#8a94a8]"
              }`}
            >
              <div className="font-black">{item.done ? "🏆" : "🔒"} {item.title}</div>
              <p className="mt-2 text-xs font-bold leading-5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Wallet({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-extrabold text-white/70">{label}</div>
    </div>
  );
}

function PetStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-white p-4">
      <div className="flex items-center justify-between text-sm font-extrabold text-[#1f2a44]">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-[#ff6b00] to-emerald-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

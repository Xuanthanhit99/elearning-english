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
  { id: "cat", name: "Beacon", icon: "ðŸ±", color: "#ff8a00" },
  { id: "dog", name: "Bun", icon: "ðŸ¶", color: "#d97706" },
  { id: "panda", name: "Po", icon: "ðŸ¼", color: "#475569" },
  { id: "fox", name: "Foxie", icon: "ðŸ¦Š", color: "#ea580c" },
  { id: "penguin", name: "Pip", icon: "ðŸ§", color: "#0284c7" },
  { id: "rabbit", name: "Bibi", icon: "ðŸ°", color: "#db2777" },
];

const ACTIONS = [
  { key: "feed", label: "Cho Äƒn", cost: "-1 food", help: "No bá»¥ng +25, HP +5" },
  { key: "play", label: "ChÆ¡i Ä‘Ã¹a", cost: "-10 energy", help: "Happy +18, XP +2" },
  { key: "rest", label: "Nghá»‰ ngÆ¡i", cost: "Miá»…n phÃ­", help: "Energy +25, HP +10" },
  { key: "clean", label: "Vá»‡ sinh", cost: "-2 coin", help: "HP +12, Happy +8" },
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
      { title: "100 XP", done: (pet?.xp || 0) >= 100, desc: "TÃ­ch lÅ©y 100 Ä‘iá»ƒm" },
      { title: "7 ngÃ y", done: (pet?.bestStreak || 0) >= 7, desc: "Giá»¯ streak 7 ngÃ y" },
      { title: "30 ngÃ y", done: (pet?.bestStreak || 0) >= 30, desc: "Giá»¯ streak 30 ngÃ y" },
      { title: "50 bÃ i", done: (pet?.completedLessons || 0) >= 50, desc: "HoÃ n thÃ nh 50 bÃ i" },
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
      setMessage("Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ nuÃ´i thÃº cÆ°ng.");
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
      setMessage(res.data.randomAssigned ? "Há»‡ thá»‘ng Ä‘Ã£ chá»n ngáº«u nhiÃªn thÃº cÆ°ng cho báº¡n." : "ÄÃ£ lÆ°u báº¡n Ä‘á»“ng hÃ nh há»c tiáº¿ng Anh.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "KhÃ´ng lÆ°u Ä‘Æ°á»£c thÃº cÆ°ng. Vui lÃ²ng Thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const care = async (action: string) => {
    try {
      setSaving(true);
      const res = await api.patch("/pets/me/care", { action });
      syncPetForm(res.data);
      setMessage("ChÄƒm sÃ³c thÃ nh cÃ´ng. Chá»‰ sá»‘ Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "ChÆ°a thá»ƒ chÄƒm sÃ³c lÃºc nÃ y.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[#ead8c2] bg-white p-6 font-extrabold text-[#5b6b85] shadow-sm">
        Äang táº£i thÃº cÆ°ng...
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
        <span>Chá»n thÃº cÆ°ng</span>
        <span>{pet.daysLeftToChoose} ngÃ y</span>
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
        <span>ðŸ”¥ {pet.streak}</span>
      </a>
    );
  }

  const lockedPet = pet?.isChosen ? PETS.find((item) => item.id === pet.petType) || currentPet : currentPet;

  return (
    <section className="overflow-hidden rounded-[32px] border border-[#ead8c2] bg-white shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
      <div className="grid gap-6 bg-gradient-to-br from-[#fff7ed] via-white to-[#eef6ff] p-6 lg:grid-cols-[340px_1fr]">
        <div className="rounded-[28px] bg-[#1f2a44] p-6 text-white shadow-xl">
          <p className="text-sm font-extrabold text-[#ffd7ad]">Báº¡n Ä‘á»“ng hÃ nh</p>
          <div className="mt-4 flex items-center gap-4">
            <SpiritPetAvatar
              petType={pet?.isChosen ? pet.petType : "pending"}
              level={pet?.level || 1}
              size="lg"
              showLevelBadge={false}
            />
            <div className="min-w-0">
              <h2 className="truncate text-3xl font-black">{pet?.isChosen ? pet.petName : "ChÆ°a chá»n"}</h2>
              <p className="mt-2 font-bold text-white/75">
                {pet?.isChosen ? `Level ${pet?.level || 1} Â· ${pet?.xpToNextLevel ?? 0}/100 XP` : `CÃ²n ${pet?.daysLeftToChoose || 0} ngÃ y Ä‘á»ƒ chá»n`}
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
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">ThÃ´ng bÃ¡o chá»n thÃº cÆ°ng</p>
              <h3 className="mt-2 text-2xl font-black text-[#1f2a44]">Báº¡n chá»‰ Ä‘Æ°á»£c chá»n má»™t loáº¡i thÃº cÆ°ng</h3>
              <p className="mt-2 font-bold leading-7 text-[#5b6b85]">
                HÃ£y chá»n trong {pet.daysLeftToChoose} ngÃ y. Náº¿u quÃ¡ 7 ngÃ y chÆ°a chá»n, BeaconVie sáº½ chá»n ngáº«u nhiÃªn má»™t thÃº cÆ°ng cho báº¡n vÃ  loáº¡i Ä‘Ã³ sáº½ Ä‘Æ°á»£c khÃ³a.
              </p>
            </div>
          )}

          {pet?.randomAssigned && (
            <div className="rounded-[24px] border border-[#ffb86b] bg-[#fff7ed] p-5 font-bold leading-7 text-[#9a4b00]">
              Báº¡n Ä‘Ã£ quÃ¡ háº¡n 7 ngÃ y nÃªn há»‡ thá»‘ng Ä‘Ã£ chá»n ngáº«u nhiÃªn {lockedPet.name} cho báº¡n. Báº¡n váº«n cÃ³ thá»ƒ Ä‘á»•i tÃªn, nhÆ°ng khÃ´ng thá»ƒ Ä‘á»•i loáº¡i thÃº cÆ°ng.
            </div>
          )}

          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">
              1. Chá»n thÃº cÆ°ng & Ä‘áº·t tÃªn
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
                placeholder="TÃªn thÃº cÆ°ng"
                className="min-h-12 flex-1 rounded-2xl border border-[#ead8c2] px-4 font-extrabold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
              />
              <button
                type="button"
                disabled={saving}
                onClick={savePet}
                className="rounded-2xl bg-[#ff6b00] px-6 py-3 font-extrabold text-white shadow-lg shadow-orange-200 disabled:opacity-60"
              >
                {saving ? "Äang lÆ°u..." : pet?.isChosen ? "LÆ°u tÃªn" : "Chá»n thÃº cÆ°ng"}
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
              2. Tráº¡ng thÃ¡i hiá»‡n táº¡i
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <PetStat label="HP" value={pet?.hp || 0} />
              <PetStat label="Energy" value={pet?.energy || 0} />
              <PetStat label="Happy" value={pet?.happiness || 0} />
              <PetStat label="No bá»¥ng" value={pet?.hunger || 0} />
            </div>
          </div>

          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">
              3. ChÄƒm sÃ³c thÃº cÆ°ng
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
          <h3 className="text-xl font-black text-[#1f2a44]">Streak & thÃ nh tÃ­ch</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-[#5b6b85]">
            ÄÃ£ hoÃ n thÃ nh {pet?.completedLessons || 0} bÃ i Â· tá»‘t nháº¥t {pet?.bestStreak || 0} ngÃ y.
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
              <div className="font-black">{item.done ? "ðŸ†" : "ðŸ”’"} {item.title}</div>
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

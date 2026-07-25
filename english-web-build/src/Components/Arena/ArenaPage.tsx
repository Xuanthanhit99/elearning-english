"use client";

import { api } from "@/src/lib/axios";
import { useEffect, useMemo, useState } from "react";

type ArenaProfile = {
  mmr: number;
  arenaPoint: number;
  winCount: number;
  loseCount: number;
  winStreak: number;
  bestWinStreak: number;
  arenaFood: number;
  gold: number;
  trophy: number;
  winRate: number;
  tier?: string;
  peakMmr?: number;
  peakTier?: string;
  ratedMatchCount?: number;
  ratingLifecycleStage?: "PLACEMENT" | "PROVISIONAL" | "ESTABLISHED";
  decayEligible?: boolean;
  decayDaysRemaining?: number;
  // Phase F2.1 â€” additive fields, always present from GET /arena/lobby
  // (profile.*) once the backend migration is applied; optional here only
  // so this type still compiles against any cached/mocked older response.
  placementMatchesRemaining?: number;
  placementMatchesTotal?: number;
  placementMatchesCompleted?: number;
  isInPlacement?: boolean;
};

type ArenaRoom = {
  id: string;
  name: string;
  status?: "WAITING" | "PLAYING" | "FINISHED" | "CANCELLED";
  visibility: "PUBLIC" | "PRIVATE";
  gameMode: string;
  skill: string;
  winCondition: string;
  difficulty: string;
  topic: string;
  teamSize: number;
  maxPlayers: number;
  voiceChat: boolean;
  emojiEnabled: boolean;
  pingEnabled: boolean;
  participants: { id: string; team: "A" | "B"; user?: { fullname?: string } }[];
  host?: { fullname?: string };
};

type ArenaSeasonSummary = {
  season?: { name?: string; endsAt?: string } | null;
  seasonPeakMmr?: number;
};

const MODES = [
  { id: "SOLO_1V1", title: "Đấu đơn 1vs1", desc: "GhÃ©p theo MMR, tháº¯ng/thua tÃ­nh Elo rÃµ rÃ ng.", shape: "Báº¡n VS Äá»‘i thá»§" },
  { id: "TEAM_2V2", title: "Đấu đội 2vs2", desc: "Äiá»ƒm Ä‘á»™i lÃ  tá»•ng Ä‘iá»ƒm, há»— trá»£ voice, emoji, ping.", shape: "A + B VS C + D" },
  { id: "TEAM_3V3", title: "Đấu đội 3vs3", desc: "Cáº£m giÃ¡c MOBA há»c tiáº¿ng Anh, thua máº¥t Ä‘iá»ƒm nháº¹ hÆ¡n Solo.", shape: "3 ngÆ°á»i VS 3 ngÆ°á»i" },
  { id: "TOURNAMENT", title: "Giải đấu", desc: "Nhánh đấu cuối tuần: 64 -> 32 -> 16 -> vô địch.", shape: "Loại trực tiếp" },
];

const SKILLS = ["Từ vựng", "Ngữ pháp", "Luyện nghe", "Phát âm", "Tổng hợp"];
const WIN_CONDITIONS = [
  { id: "TIME", label: "Theo thá»i gian", hint: "3 phÃºt, ai Ä‘Ãºng nhiá»u hÆ¡n tháº¯ng" },
  { id: "MAX_WRONG", label: "Sai tá»‘i Ä‘a", hint: "Sai 5 cÃ¢u lÃ  thua" },
  { id: "RACE", label: "Đua tốc độ", hint: "Ai Ä‘Ãºng trÆ°á»›c 30 cÃ¢u tháº¯ng" },
  { id: "BEST_OF", label: "Đấu theo lượt", hint: "Thắng 2/3, 3/5 hoặc 4/7 lượt" },
];
const DIFFICULTIES = ["A1", "A2", "B1", "B2", "C1", "Tổng hợp"];
const TOPICS = ["Động vật", "Công việc", "Du lịch", "IELTS", "TOEIC", "Hội thoại", "Đời sống hằng ngày"];

const defaultForm = {
  name: "PhÃ²ng Arena vui váº»",
  visibility: "PUBLIC",
  password: "",
  gameMode: "SOLO_1V1",
  skill: "Từ vựng",
  winCondition: "TIME",
  durationSec: 180,
  maxWrong: 5,
  targetCorrect: 30,
  bestOf: 3,
  difficulty: "A2",
  topic: "Daily life",
  voiceChat: false,
  emojiEnabled: true,
  pingEnabled: true,
};

export default function ArenaPage() {
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [seasonSummary, setSeasonSummary] = useState<ArenaSeasonSummary | null>(null);
  const [rooms, setRooms] = useState<ArenaRoom[]>([]);
  const [myActiveRoom, setMyActiveRoom] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [passwordRoom, setPasswordRoom] = useState<ArenaRoom | null>(null);
  const [roomPassword, setRoomPassword] = useState("");
  const [placementIntroDismissed, setPlacementIntroDismissed] = useState(false);

  const selectedMode = useMemo(
    () => MODES.find((mode) => mode.id === form.gameMode) || MODES[0],
    [form.gameMode],
  );

  const fetchLobby = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [lobbyRes, seasonRes] = await Promise.all([
        api.get("/arena/lobby"),
        api.get("/arena/season/current"),
      ]);
      setProfile(lobbyRes.data.profile);
      setRooms(lobbyRes.data.rooms || []);
      setMyActiveRoom(lobbyRes.data.myActiveRoom || null);
      setSeasonSummary(seasonRes.data);
      setLoadFailed(false);
    } catch (error: any) {
      console.error(error);
      // Silent background polls (every 3s) shouldn't blow away an already-loaded
      // lobby on a transient blip â€” only surface the error state on the initial load.
      if (!silent) {
        setLoadFailed(true);
        setMessage(
          error?.response?.status === 401
            ? "Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ vÃ o Arena."
            : "KhÃ´ng táº£i Ä‘Æ°á»£c Arena. Vui lÃ²ng thá»­ láº¡i.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLobby();
    const timer = window.setInterval(() => fetchLobby(true), 3000);
    return () => window.clearInterval(timer);
  }, []);

  const createRoom = async () => {
    try {
      setCreating(true);
      setMessage("");
      const res = await api.post("/arena/rooms", {
        ...form,
        visibility: form.visibility as "PUBLIC" | "PRIVATE",
        durationSec: Number(form.durationSec),
        maxWrong: Number(form.maxWrong),
        targetCorrect: Number(form.targetCorrect),
        bestOf: Number(form.bestOf),
      });
      setMessage("ÄÃ£ táº¡o phÃ²ng Arena. Äang má»Ÿ phÃ²ng chi tiáº¿t...");
      window.location.href = `/arena/rooms?roomId=${res.data.id}`;
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "ChÆ°a táº¡o Ä‘Æ°á»£c phÃ²ng Arena.");
    } finally {
      setCreating(false);
    }
  };


  const enterQueue = async () => {
    try {
      setQueueing(true);
      setMessage("Äang tÃ¬m Ä‘á»‘i thá»§ theo MMR...");
      const res = await api.post("/arena/queue", {
        gameMode: form.gameMode === "TOURNAMENT" ? "SOLO_1V1" : form.gameMode,
        skill: form.skill,
        difficulty: form.difficulty,
        topic: form.topic,
      });

      if (res.data.matched && res.data.room?.id) {
        setMessage("ÄÃ£ tÃ¬m tháº¥y tráº­n. Äang má»Ÿ phÃ²ng...");
        window.location.href = `/arena/rooms?roomId=${res.data.room.id}`;
        return;
      }

      setMessage("ÄÃ£ vÃ o hÃ ng chá». Há»‡ thá»‘ng sáº½ má»Ÿ rá»™ng khoáº£ng MMR sau 10s vÃ  20s.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "ChÆ°a vÃ o Ä‘Æ°á»£c hÃ ng chá».");
    } finally {
      setQueueing(false);
    }
  };

  const leaveQueue = async () => {
    await api.post("/arena/queue/leave");
    setMessage("ÄÃ£ rá»i hÃ ng chá» Arena.");
  };
  const joinRoom = async (room: ArenaRoom, password = "") => {
    if (room.visibility === "PRIVATE" && !password) {
      setPasswordRoom(room);
      setRoomPassword("");
      return;
    }

    try {
      await api.post(`/arena/rooms/${room.id}/join`, { password });
      setMessage("ÄÃ£ tham gia phÃ²ng. Realtime tráº­n Ä‘áº¥u sáº½ Ä‘Æ°á»£c ná»‘i á»Ÿ phase tiáº¿p theo.");
      setPasswordRoom(null);
      setRoomPassword("");
      window.location.href = `/arena/rooms?roomId=${room.id}`;
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "ChÆ°a vÃ o Ä‘Æ°á»£c phÃ²ng.");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="BeaconVie-gradient rounded-[34px] p-7 text-white shadow-xl">
            <p className="text-sm font-extrabold uppercase tracking-wide text-white/80">BeaconVie Arena</p>
            <h1 className="mt-3 text-4xl font-black leading-tight">Äáº¥u trÆ°á»ng há»c tiáº¿ng Anh & nuÃ´i linh thÃº</h1>
            <p className="mt-4 max-w-3xl text-lg font-bold leading-8 text-white/75">
              Há»c bÃ i Ä‘á»ƒ nháº­n nÄƒng lÆ°á»£ng Arena, Ä‘áº¥u PvP Ä‘á»ƒ nháº­n Arena Point, Food, Gold, Trophy, rá»“i dÃ¹ng pháº§n thÆ°á»Ÿng nuÃ´i linh thÃº tiáº¿n hÃ³a.
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-4">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setForm({ ...form, gameMode: mode.id })}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    form.gameMode === mode.id
                      ? "border-[var(--BeaconVie-violet)] bg-white text-[var(--BeaconVie-ink)]"
                      : "border-white/15 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  <div className="font-black">{mode.title}</div>
                  <p className="mt-2 text-xs font-bold leading-5 opacity-80">{mode.shape}</p>
                </button>
              ))}
            </div>
          </div>

          <ProfileCard profile={profile} seasonSummary={seasonSummary} loading={loading} />
        </div>

        {message && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--BeaconVie-card)] px-5 py-4 font-extrabold text-[var(--BeaconVie-primary)] shadow-sm">
            <span>{message}</span>
            {loadFailed && (
              <button
                type="button"
                onClick={() => fetchLobby()}
                className="rounded-xl bg-[var(--BeaconVie-primary)] px-4 py-2 text-sm font-black text-white"
              >
                Thá»­ láº¡i
              </button>
            )}
          </div>
        )}

        {profile?.isInPlacement &&
          (profile.placementMatchesCompleted ?? 0) === 0 &&
          !placementIntroDismissed && (
            <div className="rounded-[26px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 shadow-sm">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">
                Tráº­n xáº¿p háº¡ng Ä‘áº§u tiÃªn
              </p>
              <h2 className="mt-2 text-2xl font-black text-[var(--BeaconVie-ink)]">
                ChÆ¡i {profile.placementMatchesTotal ?? 5} tráº­n xáº¿p háº¡ng Ä‘á»ƒ xÃ¡c Ä‘á»‹nh háº¡ng khá»Ÿi Ä‘iá»ƒm
              </h2>
              <p className="mt-3 font-bold leading-7 text-[var(--BeaconVie-muted)]">
                Káº¿t quáº£ {profile.placementMatchesTotal ?? 5} tráº­n Ä‘áº§u tiÃªn (tháº¯ng láº«n thua) sáº½ quyáº¿t Ä‘á»‹nh háº¡ng Arena
                khá»Ÿi Ä‘iá»ƒm cá»§a báº¡n. Trong lÃºc xáº¿p háº¡ng, viá»‡c máº¥t káº¿t ná»‘i/káº¿t ná»‘i láº¡i váº«n diá»…n ra bÃ¬nh thÆ°á»ng vÃ 
                pháº§n thÆ°á»Ÿng (XP, VÃ ng, Arena Point) váº«n Ä‘Æ°á»£c cá»™ng nhÆ° cÃ¡c tráº­n khÃ¡c. Äá»‘i thá»§ cá»§a báº¡n cÃ³ thá»ƒ lÃ  ngÆ°á»i
                Ä‘ang xáº¿p háº¡ng hoáº·c ngÆ°á»i chÆ¡i Ä‘Ã£ cÃ³ háº¡ng â€” khÃ´ng cÃ³ gÃ¬ Ä‘áº£m báº£o báº¡n chá»‰ gáº·p ngÆ°á»i Ä‘ang xáº¿p háº¡ng.
              </p>
              <button
                type="button"
                onClick={() => setPlacementIntroDismissed(true)}
                className="mt-4 rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] px-6 py-3 font-black text-white"
              >
                ÄÃ£ hiá»ƒu
              </button>
            </div>
          )}

        {myActiveRoom && (
          <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wide text-emerald-700">Báº¡n Ä‘ang á»Ÿ trong phÃ²ng</p>
                <h2 className="mt-1 text-2xl font-black text-[var(--BeaconVie-ink)]">{myActiveRoom?.name}</h2>
                <p className="mt-1 text-sm font-bold text-[var(--BeaconVie-muted)]">
                  {myActiveRoom.participants.length}/{myActiveRoom.maxPlayers} ngÆ°á»i Â· {myActiveRoom.status || "WAITING"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => myActiveRoom && (window.location.href = `/arena/rooms?roomId=${myActiveRoom.id}`)}
                className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white"
              >
                Quay láº¡i phÃ²ng
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
          <section className="rounded-[30px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
            <div className="mb-5">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Táº¡o phÃ²ng</p>
              <h2 className="mt-1 text-2xl font-black text-[var(--BeaconVie-ink)]">{selectedMode.title}</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--BeaconVie-muted)]">{selectedMode.desc}</p>
            </div>

            <div className="space-y-4">
              <Field label="TÃªn phÃ²ng">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="arena-input" />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Public / Private">
                  <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="arena-input">
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </Field>
                <Field label="Password">
                  <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={form.visibility !== "PRIVATE"} className="arena-input disabled:opacity-50" />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ká»¹ nÄƒng">
                  <Select value={form.skill} values={SKILLS} onChange={(value) => setForm({ ...form, skill: value })} />
                </Field>
                <Field label="Äá»™ khÃ³">
                  <Select value={form.difficulty} values={DIFFICULTIES} onChange={(value) => setForm({ ...form, difficulty: value })} />
                </Field>
              </div>

              <Field label="Bá»™ cÃ¢u há»i">
                <Select value={form.topic} values={TOPICS} onChange={(value) => setForm({ ...form, topic: value })} />
              </Field>

              <Field label="Äiá»u kiá»‡n tháº¯ng">
                <div className="grid gap-2">
                  {WIN_CONDITIONS.map((condition) => (
                    <button
                      key={condition.id}
                      type="button"
                      onClick={() => setForm({ ...form, winCondition: condition.id })}
                      className={`rounded-2xl border px-4 py-3 text-left ${
                        form.winCondition === condition.id
                          ? "border-[var(--BeaconVie-primary)] bg-[var(--BeaconVie-primary-soft)]"
                          : "border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)]"
                      }`}
                    >
                      <div className="font-black text-[var(--BeaconVie-ink)]">{condition.label}</div>
                      <div className="text-xs font-bold text-[var(--BeaconVie-muted)]">{condition.hint}</div>
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField label="GiÃ¢y" value={form.durationSec} onChange={(value) => setForm({ ...form, durationSec: value })} />
                <NumberField label="Sai tá»‘i Ä‘a" value={form.maxWrong} onChange={(value) => setForm({ ...form, maxWrong: value })} />
                <NumberField label="Race cÃ¢u" value={form.targetCorrect} onChange={(value) => setForm({ ...form, targetCorrect: value })} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Toggle label="Voice chat" checked={form.voiceChat} onChange={(value) => setForm({ ...form, voiceChat: value })} />
                <Toggle label="Emoji" checked={form.emojiEnabled} onChange={(value) => setForm({ ...form, emojiEnabled: value })} />
                <Toggle label="Ping" checked={form.pingEnabled} onChange={(value) => setForm({ ...form, pingEnabled: value })} />
              </div>

              <button
                onClick={() => {
                  if (myActiveRoom) {
                    window.location.href = `/arena/rooms?roomId=${myActiveRoom.id}`;
                    return;
                  }
                  createRoom();
                }}
                disabled={creating}
                className="w-full rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] px-6 py-4 font-black text-white shadow-lg shadow-blue-200 disabled:opacity-60"
              >
                {myActiveRoom ? "Quay láº¡i phÃ²ng Ä‘ang cÃ³" : creating ? "Äang táº¡o..." : "Táº¡o phÃ²ng Arena"}
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[30px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Lobby</p>
                  <h2 className="text-2xl font-black text-[var(--BeaconVie-ink)]">PhÃ²ng Ä‘ang chá»</h2>
                </div>
                <button type="button" onClick={() => fetchLobby()} className="rounded-full bg-[var(--BeaconVie-primary-soft)] px-4 py-2 text-sm font-black text-[var(--BeaconVie-primary)]">LÃ m má»›i</button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {rooms.length ? rooms.map((room) => (
                  <RoomCard key={room.id} room={room} onJoin={() => joinRoom(room)} />
                )) : (
                  <div className="rounded-2xl border border-dashed border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-8 text-center font-bold text-[var(--BeaconVie-muted)] lg:col-span-2">
                    ChÆ°a cÃ³ phÃ²ng nÃ o. Táº¡o phÃ²ng Ä‘áº§u tiÃªn Ä‘á»ƒ má»Ÿ Ä‘áº¥u trÆ°á»ng nhÃ©.
                  </div>
                )}
              </div>
            </div>

            <RewardLoop />
          </section>
        </div>
      </section>

      <style jsx global>{`
        .arena-input {
          min-height: 48px;
          width: 100%;
          border-radius: 16px;
          border: 1px solid var(--BeaconVie-border);
          background: var(--BeaconVie-card);
          padding: 0 14px;
          font-weight: 800;
          color: var(--BeaconVie-ink);
          outline: none;
        }
        .arena-input:focus { border-color: var(--BeaconVie-primary); }
      `}</style>

      {passwordRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--BeaconVie-overlay)] px-4">
          <div className="w-full max-w-md rounded-[28px] bg-[var(--BeaconVie-card)] p-6 shadow-2xl">
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">PhÃ²ng private</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--BeaconVie-ink)]">{passwordRoom.name}</h2>
            <p className="mt-2 text-sm font-bold text-[var(--BeaconVie-muted)]">Nháº­p máº­t kháº©u Ä‘á»ƒ tham gia phÃ²ng nÃ y.</p>
            <input
              value={roomPassword}
              onChange={(event) => setRoomPassword(event.target.value)}
              type="password"
              autoFocus
              placeholder="Máº­t kháº©u phÃ²ng"
              className="arena-input mt-5"
              onKeyDown={(event) => {
                if (event.key === "Enter" && roomPassword.trim()) {
                  joinRoom(passwordRoom, roomPassword.trim());
                }
              }}
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPasswordRoom(null);
                  setRoomPassword("");
                }}
                className="rounded-2xl bg-[var(--BeaconVie-primary-soft)] px-5 py-3 font-black text-[var(--BeaconVie-primary)]"
              >
                Há»§y
              </button>
              <button
                type="button"
                onClick={() => roomPassword.trim() && joinRoom(passwordRoom, roomPassword.trim())}
                className="rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] px-5 py-3 font-black text-white disabled:opacity-50"
                disabled={!roomPassword.trim()}
              >
                VÃ o phÃ²ng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileCard({
  profile,
  seasonSummary,
  loading,
}: {
  profile: ArenaProfile | null;
  seasonSummary: ArenaSeasonSummary | null;
  loading: boolean;
}) {
  return (
    <div className="rounded-[34px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
      <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Há»“ sÆ¡ Arena</p>
      {loading ? (
        <div className="mt-5 font-bold text-[var(--BeaconVie-muted)]">Äang táº£i...</div>
      ) : profile?.isInPlacement ? (
        <>
          {/* Phase F2.1: while isInPlacement, show placement progress instead
              of a finalized tier/rank badge â€” the current mmr number is
              still shown (never hidden from its own owner), but framed as
              provisional, not a permanent rank. */}
          <div className="mt-4 text-3xl font-black text-[var(--BeaconVie-primary)]">
            Xáº¿p háº¡ng {profile.placementMatchesCompleted ?? 0}/{profile.placementMatchesTotal ?? 5}
          </div>
          <p className="mt-1 font-bold text-[var(--BeaconVie-muted)]">
            MMR táº¡m thá»i {profile?.mmr || 1500} Â· ChÆ°a xÃ¡c Ä‘á»‹nh háº¡ng chÃ­nh thá»©c
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Arena" value={profile?.arenaPoint || 1500} />
            <Stat label="Food" value={profile?.arenaFood || 0} />
            <Stat label="Gold" value={profile?.gold || 0} />
            <Stat label="Streak" value={profile?.winStreak || 0} />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">
            {profile.ratingLifecycleStage || "PLACEMENT"} Â· Peak {profile.peakMmr || profile.mmr || 1500}
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 text-5xl font-black text-[var(--BeaconVie-ink)]">{profile?.mmr || 1500}</div>
          <p className="mt-1 font-bold text-[var(--BeaconVie-muted)]">MMR hiá»‡n táº¡i Â· Win rate {profile?.winRate || 0}%</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Arena" value={profile?.arenaPoint || 1500} />
            <Stat label="Food" value={profile?.arenaFood || 0} />
            <Stat label="Gold" value={profile?.gold || 0} />
            <Stat label="Streak" value={profile?.winStreak || 0} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Peak" value={profile?.peakMmr || profile?.mmr || 1500} />
            <Stat label="Rated" value={profile?.ratedMatchCount || 0} />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">
            {profile?.tier || "BRONZE"} Â· {profile?.ratingLifecycleStage || "PROVISIONAL"}
            {profile?.decayEligible ? " Â· Decay eligible" : profile?.decayDaysRemaining ? ` Â· Decay in ${profile.decayDaysRemaining}d` : ""}
          </p>
          {seasonSummary?.season && (
            <p className="mt-2 text-sm font-bold text-[var(--BeaconVie-muted)]">
              {seasonSummary.season.name || "Arena Season"} Â· Season peak {seasonSummary.seasonPeakMmr || profile?.mmr || 1500}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function RoomCard({ room, onJoin }: { room: ArenaRoom; onJoin: () => void }) {
  return (
    <div className="rounded-[24px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[var(--BeaconVie-ink)]">{room.name}</h3>
          <p className="mt-1 text-sm font-bold text-[var(--BeaconVie-muted)]">Host: {room.host?.fullname || "NgÆ°á»i chÆ¡i"}</p>
        </div>
        <span className="rounded-full bg-[var(--BeaconVie-primary-soft)] px-3 py-1 text-xs font-black text-[var(--BeaconVie-primary)]">{room.visibility}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-[var(--BeaconVie-muted)]">
        <Tag>{room.gameMode}</Tag><Tag>{room.skill}</Tag><Tag>{room.difficulty}</Tag><Tag>{room.topic}</Tag>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="font-extrabold text-[var(--BeaconVie-ink)]">{room.participants.length}/{room.maxPlayers} ngÆ°á»i</p>
        <button type="button" onClick={onJoin} className="rounded-full bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] px-5 py-2 text-sm font-black text-white">VÃ o phÃ²ng</button>
      </div>
      <div className="mt-3 text-xs font-bold text-[var(--BeaconVie-muted)]">
        {room.voiceChat ? "Voice" : "No voice"} Â· {room.emojiEnabled ? "Emoji" : "No emoji"} Â· {room.pingEnabled ? "Ping" : "No ping"}
      </div>
    </div>
  );
}

function RewardLoop() {
  const items = ["Há»c bÃ i", "Nháº­n nÄƒng lÆ°á»£ng Arena", "Äáº¥u PvP", "Nháº­n Point + Food + Gold", "NuÃ´i linh thÃº", "Má»Ÿ skin / hiá»‡u á»©ng"];
  return (
    <div className="rounded-[30px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
      <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">VÃ²ng láº·p giá»¯ chÃ¢n</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map((item, index) => (
          <div key={item} className="rounded-2xl bg-[var(--BeaconVie-card)] p-4 font-black text-[var(--BeaconVie-ink)]">
            <span className="mr-2 text-[var(--BeaconVie-primary)]">{index + 1}.</span>{item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">{label}</span>{children}</label>;
}

function Select({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="arena-input">{values.map((item) => <option key={item}>{item}</option>)}</select>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Field label={label}><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="arena-input" /></Field>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className={`rounded-2xl border px-4 py-3 text-sm font-black ${checked ? "border-[var(--BeaconVie-primary)] bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]" : "border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] text-[var(--BeaconVie-muted)]"}`}>{label}: {checked ? "On" : "Off"}</button>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-[var(--BeaconVie-card)] p-4"><div className="text-2xl font-black text-[var(--BeaconVie-primary)]">{value}</div><div className="text-xs font-black text-[var(--BeaconVie-muted)]">{label}</div></div>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[var(--BeaconVie-primary-soft)] px-3 py-1">{children}</span>;
}

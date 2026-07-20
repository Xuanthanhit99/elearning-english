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

const MODES = [
  { id: "SOLO_1V1", title: "Solo 1vs1", desc: "Ghép theo MMR, thắng/thua tính Elo rõ ràng.", shape: "Bạn VS Đối thủ" },
  { id: "TEAM_2V2", title: "Team 2vs2", desc: "Điểm đội là tổng điểm, hỗ trợ voice, emoji, ping.", shape: "A + B VS C + D" },
  { id: "TEAM_3V3", title: "Team 3vs3", desc: "Cảm giác MOBA học tiếng Anh, thua mất điểm nhẹ hơn Solo.", shape: "3 người VS 3 người" },
  { id: "TOURNAMENT", title: "Tournament", desc: "Bracket cuối tuần: 64 → 32 → 16 → Champion.", shape: "Knockout" },
];

const SKILLS = ["Vocabulary", "Grammar", "Listening", "Pronunciation", "Mixed"];
const WIN_CONDITIONS = [
  { id: "TIME", label: "Theo thời gian", hint: "3 phút, ai đúng nhiều hơn thắng" },
  { id: "MAX_WRONG", label: "Sai tối đa", hint: "Sai 5 câu là thua" },
  { id: "RACE", label: "Race", hint: "Ai đúng trước 30 câu thắng" },
  { id: "BEST_OF", label: "Best of", hint: "Best of 3 / 5 / 7" },
];
const DIFFICULTIES = ["A1", "A2", "B1", "B2", "C1", "Mixed"];
const TOPICS = ["Animals", "Business", "Travel", "IELTS", "TOEIC", "Conversation", "Daily life"];

const defaultForm = {
  name: "Phòng Arena vui vẻ",
  visibility: "PUBLIC",
  password: "",
  gameMode: "SOLO_1V1",
  skill: "Vocabulary",
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
  const [rooms, setRooms] = useState<ArenaRoom[]>([]);
  const [myActiveRoom, setMyActiveRoom] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [queueing, setQueueing] = useState(false);
  const [passwordRoom, setPasswordRoom] = useState<ArenaRoom | null>(null);
  const [roomPassword, setRoomPassword] = useState("");

  const selectedMode = useMemo(
    () => MODES.find((mode) => mode.id === form.gameMode) || MODES[0],
    [form.gameMode],
  );

  const fetchLobby = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get("/arena/lobby");
      setProfile(res.data.profile);
      setRooms(res.data.rooms || []);
      setMyActiveRoom(res.data.myActiveRoom || null);
    } catch (error) {
      console.error(error);
      setMessage("Bạn cần đăng nhập để vào Arena.");
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
      setMessage("Đã tạo phòng Arena. Đang mở phòng chi tiết...");
      window.location.href = `/arena/rooms?roomId=${res.data.id}`;
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chưa tạo được phòng Arena.");
    } finally {
      setCreating(false);
    }
  };


  const enterQueue = async () => {
    try {
      setQueueing(true);
      setMessage("Đang tìm đối thủ theo MMR...");
      const res = await api.post("/arena/queue", {
        gameMode: form.gameMode === "TOURNAMENT" ? "SOLO_1V1" : form.gameMode,
        skill: form.skill,
        difficulty: form.difficulty,
        topic: form.topic,
      });

      if (res.data.matched && res.data.room?.id) {
        setMessage("Đã tìm thấy trận. Đang mở phòng...");
        window.location.href = `/arena/rooms?roomId=${res.data.room.id}`;
        return;
      }

      setMessage("Đã vào hàng chờ. Hệ thống sẽ mở rộng khoảng MMR sau 10s và 20s.");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chưa vào được hàng chờ.");
    } finally {
      setQueueing(false);
    }
  };

  const leaveQueue = async () => {
    await api.post("/arena/queue/leave");
    setMessage("Đã rời hàng chờ Arena.");
  };
  const joinRoom = async (room: ArenaRoom, password = "") => {
    if (room.visibility === "PRIVATE" && !password) {
      setPasswordRoom(room);
      setRoomPassword("");
      return;
    }

    try {
      await api.post(`/arena/rooms/${room.id}/join`, { password });
      setMessage("Đã tham gia phòng. Realtime trận đấu sẽ được nối ở phase tiếp theo.");
      setPasswordRoom(null);
      setRoomPassword("");
      window.location.href = `/arena/rooms?roomId=${room.id}`;
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chưa vào được phòng.");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="lumiverse-gradient rounded-[34px] p-7 text-white shadow-xl">
            <p className="text-sm font-extrabold uppercase tracking-wide text-white/80">Lumiverse Arena</p>
            <h1 className="mt-3 text-4xl font-black leading-tight">Đấu trường học tiếng Anh & nuôi linh thú</h1>
            <p className="mt-4 max-w-3xl text-lg font-bold leading-8 text-white/75">
              Học bài để nhận năng lượng Arena, đấu PvP để nhận Arena Point, Food, Gold, Trophy, rồi dùng phần thưởng nuôi linh thú tiến hóa.
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-4">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setForm({ ...form, gameMode: mode.id })}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    form.gameMode === mode.id
                      ? "border-[var(--lumiverse-violet)] bg-white text-[var(--lumiverse-ink)]"
                      : "border-white/15 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  <div className="font-black">{mode.title}</div>
                  <p className="mt-2 text-xs font-bold leading-5 opacity-80">{mode.shape}</p>
                </button>
              ))}
            </div>
          </div>

          <ProfileCard profile={profile} loading={loading} />
        </div>

        {message && <div className="rounded-2xl bg-white px-5 py-4 font-extrabold text-[var(--lumiverse-primary)] shadow-sm">{message}</div>}

        {myActiveRoom && (
          <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wide text-emerald-700">Bạn đang ở trong phòng</p>
                <h2 className="mt-1 text-2xl font-black text-[var(--lumiverse-ink)]">{myActiveRoom?.name}</h2>
                <p className="mt-1 text-sm font-bold text-[var(--lumiverse-muted)]">
                  {myActiveRoom.participants.length}/{myActiveRoom.maxPlayers} người · {myActiveRoom.status || "WAITING"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => myActiveRoom && (window.location.href = `/arena/rooms?roomId=${myActiveRoom.id}`)}
                className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white"
              >
                Quay lại phòng
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
          <section className="rounded-[30px] border border-[var(--lumiverse-border)] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
            <div className="mb-5">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Tạo phòng</p>
              <h2 className="mt-1 text-2xl font-black text-[var(--lumiverse-ink)]">{selectedMode.title}</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--lumiverse-muted)]">{selectedMode.desc}</p>
            </div>

            <div className="space-y-4">
              <Field label="Tên phòng">
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
                <Field label="Kỹ năng">
                  <Select value={form.skill} values={SKILLS} onChange={(value) => setForm({ ...form, skill: value })} />
                </Field>
                <Field label="Độ khó">
                  <Select value={form.difficulty} values={DIFFICULTIES} onChange={(value) => setForm({ ...form, difficulty: value })} />
                </Field>
              </div>

              <Field label="Bộ câu hỏi">
                <Select value={form.topic} values={TOPICS} onChange={(value) => setForm({ ...form, topic: value })} />
              </Field>

              <Field label="Điều kiện thắng">
                <div className="grid gap-2">
                  {WIN_CONDITIONS.map((condition) => (
                    <button
                      key={condition.id}
                      type="button"
                      onClick={() => setForm({ ...form, winCondition: condition.id })}
                      className={`rounded-2xl border px-4 py-3 text-left ${
                        form.winCondition === condition.id
                          ? "border-[var(--lumiverse-primary)] bg-blue-50"
                          : "border-[var(--lumiverse-border)] bg-white"
                      }`}
                    >
                      <div className="font-black text-[var(--lumiverse-ink)]">{condition.label}</div>
                      <div className="text-xs font-bold text-[var(--lumiverse-muted)]">{condition.hint}</div>
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField label="Giây" value={form.durationSec} onChange={(value) => setForm({ ...form, durationSec: value })} />
                <NumberField label="Sai tối đa" value={form.maxWrong} onChange={(value) => setForm({ ...form, maxWrong: value })} />
                <NumberField label="Race câu" value={form.targetCorrect} onChange={(value) => setForm({ ...form, targetCorrect: value })} />
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
                className="w-full rounded-2xl bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] px-6 py-4 font-black text-white shadow-lg shadow-blue-200 disabled:opacity-60"
              >
                {myActiveRoom ? "Quay lại phòng đang có" : creating ? "Đang tạo..." : "Tạo phòng Arena"}
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[30px] border border-[var(--lumiverse-border)] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Lobby</p>
                  <h2 className="text-2xl font-black text-[var(--lumiverse-ink)]">Phòng đang chờ</h2>
                </div>
                <button type="button" onClick={() => fetchLobby()} className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-[var(--lumiverse-primary)]">Làm mới</button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {rooms.length ? rooms.map((room) => (
                  <RoomCard key={room.id} room={room} onJoin={() => joinRoom(room)} />
                )) : (
                  <div className="rounded-2xl border border-dashed border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-8 text-center font-bold text-[var(--lumiverse-muted)] lg:col-span-2">
                    Chưa có phòng nào. Tạo phòng đầu tiên để mở đấu trường nhé.
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
          border: 1px solid var(--lumiverse-border);
          background: white;
          padding: 0 14px;
          font-weight: 800;
          color: var(--lumiverse-ink);
          outline: none;
        }
        .arena-input:focus { border-color: var(--lumiverse-primary); }
      `}</style>

      {passwordRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Phòng private</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--lumiverse-ink)]">{passwordRoom.name}</h2>
            <p className="mt-2 text-sm font-bold text-[var(--lumiverse-muted)]">Nhập mật khẩu để tham gia phòng này.</p>
            <input
              value={roomPassword}
              onChange={(event) => setRoomPassword(event.target.value)}
              type="password"
              autoFocus
              placeholder="Mật khẩu phòng"
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
                className="rounded-2xl bg-blue-50 px-5 py-3 font-black text-[var(--lumiverse-primary)]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => roomPassword.trim() && joinRoom(passwordRoom, roomPassword.trim())}
                className="rounded-2xl bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] px-5 py-3 font-black text-white disabled:opacity-50"
                disabled={!roomPassword.trim()}
              >
                Vào phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileCard({ profile, loading }: { profile: ArenaProfile | null; loading: boolean }) {
  return (
    <div className="rounded-[34px] border border-[var(--lumiverse-border)] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
      <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Hồ sơ Arena</p>
      {loading ? (
        <div className="mt-5 font-bold text-[var(--lumiverse-muted)]">Đang tải...</div>
      ) : (
        <>
          <div className="mt-4 text-5xl font-black text-[var(--lumiverse-ink)]">{profile?.mmr || 1500}</div>
          <p className="mt-1 font-bold text-[var(--lumiverse-muted)]">MMR hiện tại · Win rate {profile?.winRate || 0}%</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Arena" value={profile?.arenaPoint || 1500} />
            <Stat label="Food" value={profile?.arenaFood || 0} />
            <Stat label="Gold" value={profile?.gold || 0} />
            <Stat label="Streak" value={profile?.winStreak || 0} />
          </div>
        </>
      )}
    </div>
  );
}

function RoomCard({ room, onJoin }: { room: ArenaRoom; onJoin: () => void }) {
  return (
    <div className="rounded-[24px] border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[var(--lumiverse-ink)]">{room.name}</h3>
          <p className="mt-1 text-sm font-bold text-[var(--lumiverse-muted)]">Host: {room.host?.fullname || "Người chơi"}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--lumiverse-primary)]">{room.visibility}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-[var(--lumiverse-muted)]">
        <Tag>{room.gameMode}</Tag><Tag>{room.skill}</Tag><Tag>{room.difficulty}</Tag><Tag>{room.topic}</Tag>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="font-extrabold text-[var(--lumiverse-ink)]">{room.participants.length}/{room.maxPlayers} người</p>
        <button type="button" onClick={onJoin} className="rounded-full bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] px-5 py-2 text-sm font-black text-white">Vào phòng</button>
      </div>
      <div className="mt-3 text-xs font-bold text-[var(--lumiverse-muted)]">
        {room.voiceChat ? "Voice" : "No voice"} · {room.emojiEnabled ? "Emoji" : "No emoji"} · {room.pingEnabled ? "Ping" : "No ping"}
      </div>
    </div>
  );
}

function RewardLoop() {
  const items = ["Học bài", "Nhận năng lượng Arena", "Đấu PvP", "Nhận Point + Food + Gold", "Nuôi linh thú", "Mở skin / hiệu ứng"];
  return (
    <div className="rounded-[30px] border border-[var(--lumiverse-border)] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
      <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Vòng lặp giữ chân</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map((item, index) => (
          <div key={item} className="rounded-2xl bg-[var(--lumiverse-card)] p-4 font-black text-[var(--lumiverse-ink)]">
            <span className="mr-2 text-[var(--lumiverse-primary)]">{index + 1}.</span>{item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--lumiverse-muted)]">{label}</span>{children}</label>;
}

function Select({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="arena-input">{values.map((item) => <option key={item}>{item}</option>)}</select>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Field label={label}><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="arena-input" /></Field>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className={`rounded-2xl border px-4 py-3 text-sm font-black ${checked ? "border-[var(--lumiverse-primary)] bg-blue-50 text-[var(--lumiverse-primary)]" : "border-[var(--lumiverse-border)] bg-white text-[var(--lumiverse-muted)]"}`}>{label}: {checked ? "On" : "Off"}</button>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-[var(--lumiverse-card)] p-4"><div className="text-2xl font-black text-[var(--lumiverse-primary)]">{value}</div><div className="text-xs font-black text-[var(--lumiverse-muted)]">{label}</div></div>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white px-3 py-1">{children}</span>;
}

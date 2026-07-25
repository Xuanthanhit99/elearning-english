"use client";

import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import { useArenaRealtime } from "@/src/hooks/useArenaRealtime";
import { usePowerUpAction, type ArenaPowerUpType } from "@/src/lib/arena-socket";
import { useEffect, useMemo, useState } from "react";

type RoomEvent = {
  id: string;
  type: "EMOJI" | "PING" | "CHAT" | "HOST_CHANGED" | "PLAYER_LEFT";
  payload: any;
  createdAt: string;
  user?: { fullname?: string };
};

type Participant = {
  id: string;
  userId: string;
  team: "A" | "B";
  score: number;
  correct: number;
  wrong: number;
  ready: boolean;
  user?: { fullname?: string; avatar?: string };
};

type ArenaQuestion = {
  id: string;
  order: number;
  type: string;
  skill: string;
  prompt: string;
  options?: string[];
  // Phase A: backend gi? ch? tr? answer/explanation sau khi chính user dã
  // t? tr? l?i câu này (ho?c tr?n dã k?t thúc) — tru?c dó field này s?
  // không có trong response, không ph?i l?i.
  answer?: string;
  explanation?: string;
  points: number;
};

type ArenaAnswer = {
  id: string;
  questionId: string;
  userId: string;
  answer: string;
  isCorrect: boolean;
  points: number;
};

type ArenaBattleState = {
  participantId: string;
  score: number;
  combo: number;
  maxCombo: number;
  multiplierBasisPoints: number;
  shieldCharges: number;
};

type ArenaPowerUpEffect = {
  sourceUserId: string;
  targetUserId: string;
  type: ArenaPowerUpType;
  status: "ACTIVE" | "BLOCKED";
};

type ArenaMatchPowerUp = {
  type: ArenaPowerUpType;
  remainingUses: number;
  cooldownUntil?: string | null;
};

type Room = {
  id: string;
  name: string;
  hostId: string;
  status: "WAITING" | "PREPARING" | "PLAYING" | "FINISHED" | "CANCELLED" | "FAILED";
  countdownEndsAt?: string | null;
  serverTime?: string;
  revision?: number;
  gameMode: string;
  mode?: string | null;
  teamFormat?: string | null;
  preparationError?: string | null;
  skill: string;
  difficulty: string;
  topic: string;
  winCondition: string;
  maxPlayers: number;
  voiceChat: boolean;
  emojiEnabled: boolean;
  pingEnabled: boolean;
  isParticipant: boolean;
  participants: Participant[];
  events: RoomEvent[];
  matches?: {
    id: string;
    winnerTeam?: "A" | "B" | null;
    result?: any;
    expiresAt?: string | null;
    questions: ArenaQuestion[];
    answers: ArenaAnswer[];
    battleStates?: ArenaBattleState[];
    powerUpEffects?: ArenaPowerUpEffect[];
  }[];
  myPowerUps?: ArenaMatchPowerUp[];
  host?: { fullname?: string };
  // Phase F1.1: own-caller progression summary for the most recent match —
  // additive, optional (null until a match has actually been finalized).
  progression?: {
    status: "COMPLETED" | "PENDING" | "PROCESSING" | "FAILED" | "SKIPPED";
    previousMmr?: number;
    nextMmr?: number;
    mmrDelta?: number;
    previousTier?: string;
    nextTier?: string;
    promoted?: boolean;
    demoted?: boolean;
    xpAwarded?: number;
    goldAwarded?: number;
    arenaPointsAwarded?: number;
    rewardBreakdown?: {
      baseXp?: number;
      winLossXp?: number;
      accuracyBonusXp?: number;
      comboBonusXp?: number;
      firstWinBonusXp?: number;
      dailyBonusXp?: number;
      streakBonusXp?: number;
      totalXp?: number;
      reasonBreakdown?: string[];
    };
    // Phase F2.1 — true only on the specific match whose progression
    // transitioned placementMatchesRemaining from >0 to 0.
    placementCompleted?: boolean;
    placementMatchesRemaining?: number;
  } | null;
};

const ARENA_TIER_LABELS_VI: Record<string, string> = {
  BRONZE: "Ð?ng",
  SILVER: "B?c",
  GOLD: "Vàng",
  PLATINUM: "B?ch kim",
  DIAMOND: "Kim cuong",
  MASTER: "Cao th?",
  LEGEND: "Huy?n tho?i",
};

const EMOJIS = ["??", "??", "??", "??", "?", "??"];

const POWER_UP_LABELS: Record<ArenaPowerUpType, { name: string; icon: string; description: string }> = {
  DOUBLE_SCORE: { name: "Nhân dôi di?m", icon: "?", description: "Câu dúng ti?p theo du?c x2 di?m" },
  SHIELD: { name: "Khiên ch?n", icon: "???", description: "Ch?n 1 hi?u ?ng b?t l?i t? d?i th?" },
  TIME_BOOST: { name: "C?ng gi?", icon: "??", description: "Thêm th?i gian tr? l?i câu hi?n t?i" },
  FREEZE: { name: "Ðóng bang", icon: "??", description: "Rút ng?n th?i gian tr? l?i c?a d?i th?" },
};

const POWER_UP_ERROR_MESSAGES: Record<string, string> = {
  ARENA_POWER_UP_OUT_OF_USES: "B?n dã dùng h?t lu?t power-up này trong tr?n.",
  ARENA_POWER_UP_ON_COOLDOWN: "Power-up dang h?i chiêu, ch? chút nhé.",
  ARENA_POWER_UP_INVALID_TARGET: "Không tìm th?y d?i th? h?p l?.",
  ARENA_POWER_UP_INVALID_QUESTION: "Không th? dùng lúc này (d?i th? dã tr? l?i ho?c chua có câu h?i).",
  ARENA_POWER_UP_NOT_SUPPORTED: "Power-up này không kh? d?ng ? ch? d? hi?n t?i.",
  ARENA_MATCH_NOT_PLAYING: "Tr?n chua b?t d?u ho?c dã k?t thúc.",
  ARENA_POWER_UP_REQUEST_CONFLICT: "Yêu c?u b? xung d?t, th? l?i.",
  INVALID_SESSION: "Phiên k?t n?i realtime không h?p l?, th? t?i l?i trang.",
};
const PINGS = ["T?p trung", "C?n tr? giúp", "Ð?y t?c d?", "Good job", "Phòng th?", "Finish now"];

export default function ArenaRoomPage({ roomId }: { roomId: string }) {
  const user = useAuthStore((state) => state.user);
  const [room, setRoom] = useState<Room | null>(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [resultDismissed, setResultDismissed] = useState(false);
  const [dismissedHostEventId, setDismissedHostEventId] = useState<string | null>(null);

  const fetchRoom = async () => {
    try {
      const res = await api.get(`/arena/rooms/${roomId}`);
      setRoom(res.data);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Không t?i du?c phòng Arena.");
    } finally {
      setLoading(false);
    }
  };

  const { connected: realtimeConnected } = useArenaRealtime<Room>(roomId, (snapshot) => {
    setRoom(snapshot);
    setLoading(false);
  });

  useEffect(() => {
    fetchRoom();
  }, [roomId]);

  // Realtime push keeps the room in sync while the arena socket is
  // connected; REST polling is only the fallback for when it isn't.
  useEffect(() => {
    if (realtimeConnected) return;
    const timer = window.setInterval(fetchRoom, 3000);
    return () => window.clearInterval(timer);
  }, [roomId, realtimeConnected]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  const teamA = useMemo(() => room?.participants.filter((item) => item.team === "A") || [], [room]);
  const teamB = useMemo(() => room?.participants.filter((item) => item.team === "B") || [], [room]);
  const activeMatch = room?.matches?.[0];
  const myParticipant = room?.participants.find((participant) => participant.userId === user?.id);
  const readyCount = room?.participants.filter((participant) => participant.ready).length || 0;
  const countdownMs = room?.countdownEndsAt ? Math.max(0, new Date(room.countdownEndsAt).getTime() - now) : 0;
  const countdownLeft = Math.ceil(countdownMs / 1000);
  const matchReady = room?.status === "PLAYING" && countdownMs <= 0;
  const myAnswers = activeMatch?.answers.filter((answer) => answer.userId === user?.id) || [];
  const currentQuestion = matchReady
    ? activeMatch?.questions.find((question) => !myAnswers.some((answer) => answer.questionId === question.id)) || activeMatch?.questions[0]
    : undefined;
  const currentAnswers = currentQuestion ? activeMatch?.answers.filter((answer) => answer.questionId === currentQuestion.id) || [] : [];
  const myCurrentAnswer = currentQuestion ? myAnswers.find((answer) => answer.questionId === currentQuestion.id) : undefined;
  const winnerTeam = activeMatch?.winnerTeam;
  const winnerParticipants = winnerTeam ? room?.participants.filter((participant) => participant.team === winnerTeam) || [] : [];
  const myTeam = myParticipant?.team;
  const isHost = room?.hostId === user?.id;
  const showResultModal = room?.status === "FINISHED" && winnerTeam && !resultDismissed;
  const latestHostChange = room?.events.find((event) => event.type === "HOST_CHANGED");
  const showHostChangedModal = Boolean(latestHostChange && latestHostChange.id !== dismissedHostEventId);

  const myActiveEffects = activeMatch?.powerUpEffects?.filter((effect) => effect.targetUserId === user?.id) || [];
  const isFrozenByOpponent = myActiveEffects.some((effect) => effect.type === "FREEZE" && effect.status === "ACTIVE");

  const sendEvent = async (type: "EMOJI" | "PING" | "CHAT", payload: any) => {
    try {
      await api.post(`/arena/rooms/${roomId}/events`, { type, payload });
      setChat("");
      await fetchRoom();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chua g?i du?c tín hi?u.");
    }
  };

  const setReady = async (ready: boolean) => {
    try {
      await api.post(`/arena/rooms/${roomId}/ready`, { ready });
      setMessage(ready ? "B?n dã s?n sàng. Ch? m?i ngu?i cùng ready nhé." : "B?n dã h?y s?n sàng.");
      await fetchRoom();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chua c?p nh?t du?c tr?ng thái s?n sàng.");
    }
  };

  const retryPreparation = async () => {
    try {
      await api.post(`/arena/rooms/${roomId}/retry`);
      setMessage("Ðang th? chu?n b? l?i tr?n d?u...");
      await fetchRoom();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chua th? l?i du?c, vui lòng th? l?i sau.");
    }
  };

  const leaveToLobby = async () => {
    try {
      if (room?.isParticipant) await api.post(`/arena/rooms/${roomId}/leave`);
    } finally {
      window.location.href = "/arena";
    }
  };

  const submitAnswer = async (answer: string) => {
    if (!currentQuestion) return;
    if (!matchReady) {
      setMessage("Tr?n dang d?m ngu?c, ch? h?t 5 giây r?i tr? l?i nhé.");
      return;
    }
    try {
      const res = await api.post(`/arena/rooms/${roomId}/questions/${currentQuestion.id}/answer`, { answer });
      setMessage(res.data.answer.isCorrect ? "Chính xác! Ði?m c?a b?n dã tang." : "Chua dúng. Backend dã ghi nh?n câu tr? l?i.");
      await fetchRoom();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chua g?i du?c câu tr? l?i.");
    }
  };

  const usePowerUp = async (type: ArenaPowerUpType) => {
    const ack = await usePowerUpAction(roomId, type);
    if ("error" in ack) {
      setMessage(POWER_UP_ERROR_MESSAGES[ack.error] || "Không dùng du?c power-up này.");
      return;
    }
    setMessage(
      ack.status === "BLOCKED"
        ? `${POWER_UP_LABELS[type].name} dã b? d?i th? ch?n b?ng khiên!`
        : `Ðã dùng ${POWER_UP_LABELS[type].name}.`,
    );
  };

  if (loading) {
    return <main className="min-h-screen bg-[var(--background)] p-8 font-black text-[var(--BeaconVie-ink)]">Ðang t?i phòng Arena...</main>;
  }

  if (!room) {
    return <main className="min-h-screen bg-[var(--background)] p-8 font-black text-[var(--BeaconVie-ink)]">{message || "Không tìm th?y phòng."}</main>;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="BeaconVie-gradient flex flex-wrap items-center justify-between gap-4 rounded-[30px] p-6 text-white shadow-xl">
          <div>
            <button type="button" onClick={leaveToLobby} className="text-sm font-extrabold text-white/80">
              ? R?i phòng
            </button>
            <h1 className="mt-2 text-3xl font-black">{room.name}</h1>
            <p className="mt-2 font-bold text-white/70">
              {room.mode || room.gameMode}
              {room.teamFormat ? ` · ${room.teamFormat}` : ""} · {room.skill} · {room.difficulty} · {room.topic} · {room.status}
              {" · "}
              {room.participants.length}/{room.maxPlayers} ngu?i choi
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge active={realtimeConnected}>{realtimeConnected ? "Realtime" : "Ðang k?t n?i l?i..."}</Badge>
            <Badge active={room.voiceChat}>Voice chat</Badge>
            <Badge active={room.emojiEnabled}>Emoji</Badge>
            <Badge active={room.pingEnabled}>Ping</Badge>
          </div>
        </div>

        {message && <div className="rounded-2xl bg-[var(--BeaconVie-card)] px-5 py-4 font-extrabold text-[var(--BeaconVie-primary)] shadow-sm">{message}</div>}

        {room.status === "WAITING" && room.isParticipant && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Phòng ch? Arena</p>
            <h2 className="mt-2 text-3xl font-black text-[var(--BeaconVie-ink)]">
              {myParticipant?.ready ? "B?n dã s?n sàng" : "Chu?n b? vào tr?n"}
            </h2>
            <p className="mt-3 font-bold leading-7 text-[var(--BeaconVie-muted)]">
              {readyCount}/{room.maxPlayers} ngu?i choi dã s?n sàng ({room.participants.length}/{room.maxPlayers} dã vào phòng). Khi d? ngu?i, tr?n s? t? d?m ngu?c 5 giây và m? câu h?i.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReady(!myParticipant?.ready)}
                className={`rounded-2xl px-5 py-4 font-black text-white ${myParticipant?.ready ? "bg-[var(--BeaconVie-muted)]" : "bg-emerald-600"}`}
              >
                {myParticipant?.ready ? "H?y s?n sàng" : "Tôi s?n sàng"}
              </button>
              <button type="button" onClick={leaveToLobby} className="rounded-2xl bg-[var(--BeaconVie-primary-soft)] px-5 py-4 font-black text-[var(--BeaconVie-primary)]">
                Thoát v? lobby
              </button>
            </div>
          </ArenaModal>
        )}

        {room.status === "PREPARING" && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Ðang chu?n b? tr?n d?u</p>
            <h2 className="mt-2 text-3xl font-black text-[var(--BeaconVie-ink)]">Ðang t?o câu h?i...</h2>
            <p className="mt-3 font-bold leading-7 text-[var(--BeaconVie-muted)]">
              H? th?ng dang chu?n b? b? câu h?i cho tr?n d?u. Vi?c này ch? m?t vài giây.
            </p>
          </ArenaModal>
        )}

        {room.status === "FAILED" && room.isParticipant && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-danger)]">Chu?n b? tr?n d?u th?t b?i</p>
            <h2 className="mt-2 text-3xl font-black text-[var(--BeaconVie-ink)]">Có l?i x?y ra</h2>
            <p className="mt-3 font-bold leading-7 text-[var(--BeaconVie-muted)]">
              {room.preparationError || "Không chu?n b? du?c câu h?i cho tr?n d?u."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={retryPreparation}
                className="rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white"
              >
                Th? l?i
              </button>
              <button type="button" onClick={leaveToLobby} className="rounded-2xl bg-[var(--BeaconVie-primary-soft)] px-5 py-4 font-black text-[var(--BeaconVie-primary)]">
                Thoát v? lobby
              </button>
            </div>
          </ArenaModal>
        )}

        {room.status === "PLAYING" && countdownLeft > 0 && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Tr?n s?p b?t d?u</p>
            <div className="mt-3 text-8xl font-black text-[var(--BeaconVie-ink)]">{countdownLeft}</div>
            <p className="mt-2 font-bold text-[var(--BeaconVie-muted)]">Câu h?i s? t? m? sau khi d?m ngu?c k?t thúc.</p>
          </ArenaModal>
        )}

        {showResultModal && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">K?t qu? tr?n d?u</p>
            <h2 className="mt-2 text-4xl font-black text-[var(--BeaconVie-ink)]">
              {winnerTeam === myTeam ? "B?n th?ng!" : "Ð?i b?n thua"}
            </h2>
            <p className="mt-3 font-bold leading-7 text-[var(--BeaconVie-muted)]">
              Ð?i {winnerTeam} chi?n th?ng. Ngu?i th?ng: {winnerParticipants.map((participant) => participant.user?.fullname || "Player").join(", ")}.
            </p>
            {activeMatch?.result && (
              <div className="mt-4 rounded-2xl bg-[var(--BeaconVie-card)] p-4 font-black text-[var(--BeaconVie-ink)]">
                Ð?i A: {activeMatch.result.teamAScore ?? "-"} di?m · Ð?i B: {activeMatch.result.teamBScore ?? "-"} di?m
              </div>
            )}

            {room.progression?.status === "COMPLETED" && (
              <div className="mt-4 rounded-2xl bg-[var(--BeaconVie-card)] p-4 text-[var(--BeaconVie-ink)]">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-black">
                  {typeof room.progression.xpAwarded === "number" && (
                    <span>+{room.progression.xpAwarded} XP</span>
                  )}
                  {typeof room.progression.goldAwarded === "number" && room.progression.goldAwarded > 0 && (
                    <span>+{room.progression.goldAwarded} Vàng</span>
                  )}
                  {typeof room.progression.mmrDelta === "number" && room.progression.mmrDelta !== 0 && (
                    <span>
                      Ði?m x?p h?ng {room.progression.mmrDelta > 0 ? "+" : ""}
                      {room.progression.mmrDelta} ({room.progression.previousMmr} ? {room.progression.nextMmr})
                    </span>
                  )}
                </div>
                {room.progression.previousTier && room.progression.nextTier && room.progression.previousTier !== room.progression.nextTier && (
                  <p className="mt-2 font-bold text-[var(--BeaconVie-primary)]">
                    {room.progression.promoted ? "Thang h?ng" : "R?t h?ng"}: {ARENA_TIER_LABELS_VI[room.progression.previousTier] || room.progression.previousTier} ? {ARENA_TIER_LABELS_VI[room.progression.nextTier] || room.progression.nextTier}
                  </p>
                )}
                {room.progression.placementCompleted && (
                  <div className="mt-4 rounded-2xl border-2 border-[var(--BeaconVie-primary)] bg-[var(--BeaconVie-card)] p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">
                      Hoàn thành x?p h?ng!
                    </p>
                    <p className="mt-1 text-2xl font-black text-[var(--BeaconVie-ink)]">
                      H?ng c?a b?n: {(room.progression.nextTier && ARENA_TIER_LABELS_VI[room.progression.nextTier]) || room.progression.nextTier || "—"}
                    </p>
                    {typeof room.progression.nextMmr === "number" && (
                      <p className="mt-1 font-bold text-[var(--BeaconVie-muted)]">MMR: {room.progression.nextMmr}</p>
                    )}
                  </div>
                )}
                {room.progression.rewardBreakdown?.reasonBreakdown && room.progression.rewardBreakdown.reasonBreakdown.length > 0 && (
                  <p className="mt-2 text-sm font-bold text-[var(--BeaconVie-muted)]">
                    {room.progression.rewardBreakdown.reasonBreakdown.join(" · ")}
                  </p>
                )}
              </div>
            )}
            {room.progression && room.progression.status !== "COMPLETED" && room.progression.status !== "SKIPPED" && (
              <div className="mt-4 rounded-2xl bg-[var(--BeaconVie-card)] p-4 text-sm font-bold text-[var(--BeaconVie-muted)]">
                Ðang x? lý ph?n thu?ng, vui lòng t?i l?i sau ít phút…
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setResultDismissed(true)} className="rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] px-5 py-4 font-black text-white">
                Xem l?i phòng
              </button>
              <button type="button" onClick={() => (window.location.href = "/arena")} className="rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] px-5 py-4 font-black text-white">
                V? lobby
              </button>
            </div>
          </ArenaModal>
        )}

        {showHostChangedModal && latestHostChange && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Ch? phòng dã d?i</p>
            <h2 className="mt-2 text-3xl font-black text-[var(--BeaconVie-ink)]">
              {latestHostChange.payload?.newHostName || "Ngu?i choi khác"} là ch? phòng m?i
            </h2>
            <p className="mt-3 font-bold leading-7 text-[var(--BeaconVie-muted)]">
              {latestHostChange.payload?.previousHostName || "Ch? phòng cu"} dã r?i phòng. Phòng v?n ti?p t?c v?i ch? phòng m?i.
            </p>
            <button
              type="button"
              onClick={() => setDismissedHostEventId(latestHostChange.id)}
              className="mt-5 rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] px-6 py-4 font-black text-white"
            >
              Ðã hi?u
            </button>
          </ArenaModal>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[30px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[var(--BeaconVie-card)] px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--BeaconVie-primary)]">S?n sàng</p>
                <p className="font-black text-[var(--BeaconVie-ink)]">
                  {readyCount}/{room.participants.length} ngu?i choi dã ready
                </p>
              </div>
              {room.status === "WAITING" && room.isParticipant && (
                <button
                  type="button"
                  onClick={() => setReady(!myParticipant?.ready)}
                  className={`rounded-2xl px-5 py-3 font-black text-white ${myParticipant?.ready ? "bg-[var(--BeaconVie-muted)]" : "bg-emerald-600"}`}
                >
                  {myParticipant?.ready ? "H?y s?n sàng" : "Tôi s?n sàng"}
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr]">
              <TeamColumn title="Ð?i A" participants={teamA} tone="orange" battleStates={activeMatch?.battleStates} />
              <div className="flex items-center justify-center text-4xl font-black text-[var(--BeaconVie-primary)]">VS</div>
              <TeamColumn title="Ð?i B" participants={teamB} tone="blue" battleStates={activeMatch?.battleStates} />
            </div>

            {room.gameMode === "SOLO_1V1" && room.status === "PLAYING" && matchReady && (
              <div className="mt-6 rounded-[26px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Power-up</p>
                  {isFrozenByOpponent && (
                    <span className="rounded-full bg-[var(--BeaconVie-primary-soft)] px-3 py-1 text-xs font-black text-[var(--BeaconVie-primary)]">
                      ?? B?n dang b? dóng bang!
                    </span>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {(room.myPowerUps || []).map((powerUp) => {
                    const label = POWER_UP_LABELS[powerUp.type];
                    const onCooldown = Boolean(powerUp.cooldownUntil && new Date(powerUp.cooldownUntil).getTime() > now);
                    const disabled = powerUp.remainingUses <= 0 || onCooldown;
                    return (
                      <button
                        key={powerUp.type}
                        type="button"
                        onClick={() => usePowerUp(powerUp.type)}
                        disabled={disabled}
                        aria-label={`${label.name}: ${label.description}. Còn ${powerUp.remainingUses} lu?t.`}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          disabled
                            ? "cursor-not-allowed border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] opacity-60"
                            : "border-[var(--BeaconVie-primary)] bg-[var(--BeaconVie-card)] hover:shadow-md"
                        }`}
                      >
                        <div className="text-2xl">{label.icon}</div>
                        <div className="mt-1 text-sm font-black text-[var(--BeaconVie-ink)]">{label.name}</div>
                        <div className="text-xs font-bold text-[var(--BeaconVie-muted)]">
                          {onCooldown ? "Ðang h?i chiêu" : `Còn ${powerUp.remainingUses} lu?t`}
                        </div>
                      </button>
                    );
                  })}
                  {!room.myPowerUps?.length && (
                    <div className="text-sm font-bold text-[var(--BeaconVie-muted)]">Không có power-up kh? d?ng.</div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 rounded-[26px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Câu h?i tr?n d?u</p>
                  <h2 className="mt-1 text-xl font-black text-[var(--BeaconVie-ink)]">
                    {currentQuestion ? `Câu ${currentQuestion.order}: ${currentQuestion.skill}` : "Chua có câu h?i"}
                  </h2>
                </div>
                <span className="rounded-full bg-[var(--BeaconVie-primary-soft)] px-3 py-1 text-xs font-black text-[var(--BeaconVie-primary)]">
                  {activeMatch?.questions?.length || 0} câu
                </span>
              </div>

              {currentQuestion ? (
                <div className="mt-4">
                  <p className="rounded-2xl bg-[var(--BeaconVie-card)] p-4 font-bold leading-7 text-[var(--BeaconVie-ink)]">
                    {currentQuestion.prompt}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(currentQuestion.options || []).map((option) => {
                      const chosen = myCurrentAnswer?.answer === option;
                      const correct = chosen && myCurrentAnswer?.isCorrect;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => submitAnswer(option)}
                          disabled={Boolean(myCurrentAnswer)}
                          className={`rounded-2xl border px-4 py-3 text-left font-extrabold transition ${
                            chosen
                              ? correct
                                ? "border-[var(--BeaconVie-success)] bg-[var(--BeaconVie-success-soft)] text-[var(--BeaconVie-success)]"
                                : "border-[var(--BeaconVie-danger)]/50 bg-[var(--BeaconVie-danger-soft)] text-[var(--BeaconVie-danger)]"
                              : "border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] text-[var(--BeaconVie-ink)] hover:border-[var(--BeaconVie-primary)] disabled:opacity-60"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {currentAnswers.length > 0 && currentQuestion.answer && (
                    <div className="mt-4 rounded-2xl bg-[var(--BeaconVie-primary-soft)] p-4 text-sm font-bold leading-6 text-[var(--BeaconVie-ink)]">
                      Có {currentAnswers.length} lu?t tr? l?i câu này. Ðáp án dúng: {currentQuestion.answer}.
                      {currentQuestion.explanation ? ` ${currentQuestion.explanation}` : ""}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 text-center font-bold text-[var(--BeaconVie-muted)]">
                  {room.status === "WAITING"
                    ? "Khi t?t c? ngu?i choi b?m s?n sàng, tr?n d?u s? t? d?ng b?t d?u."
                    : countdownLeft > 0
                      ? "Ðang d?m ngu?c. Câu h?i s? m? ngay sau khi h?t 5 giây."
                      : "B?n dã hoàn thành b? câu h?i hi?n t?i ho?c tr?n chua có câu h?i."}
                </div>
              )}
            </div>

            <div className="mt-8 rounded-[26px] bg-[var(--BeaconVie-card)] p-5">
              <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">Lu?ng tr?n d?u</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--BeaconVie-muted)]">
                C? hai ngu?i choi b?m s?n sàng, h? th?ng t? d?m ngu?c 5 giây, m? câu h?i và t? thông báo d?i th?ng khi m?i ngu?i tr? l?i xong.
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Emoji & Ping</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => sendEvent("EMOJI", { emoji })} className="rounded-2xl bg-[var(--BeaconVie-primary-soft)] px-3 py-3 text-2xl">
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                {PINGS.map((ping) => (
                  <button key={ping} onClick={() => sendEvent("PING", { ping })} className="rounded-2xl border border-[var(--BeaconVie-border)] px-4 py-3 text-left text-sm font-black text-[var(--BeaconVie-ink)]">
                    ?? {ping}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--BeaconVie-primary)]">Room Feed</p>
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-[var(--BeaconVie-card)] p-3">
                {room.events.length ? room.events.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-[var(--BeaconVie-card)] px-4 py-3 text-sm font-bold text-[var(--BeaconVie-ink)] shadow-sm">
                    <span className="text-[var(--BeaconVie-primary)]">{event.user?.fullname || "Player"}</span>{" "}
                    {event.type === "EMOJI" && <>th? {event.payload?.emoji}</>}
                    {event.type === "PING" && <>ping: {event.payload?.ping}</>}
                    {event.type === "CHAT" && <>nói: {event.payload?.text}</>}
                    {event.type === "HOST_CHANGED" && <>thông báo: {event.payload?.newHostName || "ngu?i choi khác"} là ch? phòng m?i</>}
                    {event.type === "PLAYER_LEFT" && <>thông báo: {event.payload?.name || "m?t ngu?i choi"} dã r?i phòng</>}
                  </div>
                )) : <div className="text-sm font-bold text-[var(--BeaconVie-muted)]">Chua có tín hi?u nào.</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Chat nhanh..." className="min-h-11 flex-1 rounded-2xl border border-[var(--BeaconVie-border)] px-3 font-bold outline-none" />
                <button onClick={() => chat.trim() && sendEvent("CHAT", { text: chat.trim() })} className="rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] px-4 font-black text-white">G?i</button>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function TeamColumn({
  title,
  participants,
  tone,
  battleStates,
}: {
  title: string;
  participants: Participant[];
  tone: "orange" | "blue";
  battleStates?: ArenaBattleState[];
}) {
  const bg = tone === "orange" ? "bg-[var(--BeaconVie-warning-soft)]" : "bg-[var(--BeaconVie-primary-soft)]";
  const text = tone === "orange" ? "text-[var(--BeaconVie-warning)]" : "text-[var(--BeaconVie-primary)]";
  return (
    <div className={`rounded-[26px] ${bg} p-5`}>
      <h2 className={`text-xl font-black ${text}`}>{title}</h2>
      <div className="mt-4 space-y-3">
        {participants.length ? participants.map((participant) => {
          const battle = battleStates?.find((state) => state.participantId === participant.id);
          return (
            <div key={participant.id} className="rounded-2xl bg-[var(--BeaconVie-card)] px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-black text-[var(--BeaconVie-ink)]">{participant.user?.fullname || "Player"}</div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${participant.ready ? "bg-[var(--BeaconVie-success-soft)] text-[var(--BeaconVie-success)]" : "bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]"}`}>
                  {participant.ready ? "READY" : "CH?"}
                </span>
              </div>
              <div className="text-xs font-bold text-[var(--BeaconVie-muted)]">Score {participant.score} · Ðúng {participant.correct} · Sai {participant.wrong}</div>
              {battle && battle.combo > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-[var(--BeaconVie-warning-soft)] px-2 py-1 text-[10px] font-black text-[var(--BeaconVie-warning)]">
                    ?? Combo x{battle.combo}
                  </span>
                  <span className="text-[10px] font-black text-[var(--BeaconVie-muted)]">
                    Nhân {(battle.multiplierBasisPoints / 10000).toFixed(2)}x
                  </span>
                </div>
              )}
            </div>
          );
        }) : <div className="rounded-2xl border border-dashed border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] px-4 py-6 text-center font-bold text-[var(--BeaconVie-muted)]">Ðang ch? ngu?i choi</div>}
      </div>
    </div>
  );
}

function ArenaModal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--BeaconVie-overlay)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[30px] bg-[var(--BeaconVie-card)] p-7 text-center shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function Badge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`rounded-full px-4 py-2 text-xs font-black ${active ? "bg-emerald-400 text-[var(--BeaconVie-ink)]" : "bg-white/10 text-white/60"}`}>{children}</span>;
}

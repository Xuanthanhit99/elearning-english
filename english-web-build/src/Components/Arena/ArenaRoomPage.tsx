"use client";

import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
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
  answer: string;
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

type Room = {
  id: string;
  name: string;
  hostId: string;
  status: "WAITING" | "PLAYING" | "FINISHED" | "CANCELLED";
  countdownEndsAt?: string | null;
  serverTime?: string;
  gameMode: string;
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
  matches?: { id: string; winnerTeam?: "A" | "B" | null; result?: any; questions: ArenaQuestion[]; answers: ArenaAnswer[] }[];
  host?: { fullname?: string };
};

const EMOJIS = ["🔥", "👏", "😆", "💪", "⚡", "🎯"];
const PINGS = ["Tập trung", "Cần trợ giúp", "Đẩy tốc độ", "Good job", "Phòng thủ", "Finish now"];

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
      setMessage(error?.response?.data?.message || "Không tải được phòng Arena.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
    const timer = window.setInterval(fetchRoom, 3000);
    return () => window.clearInterval(timer);
  }, [roomId]);

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

  const sendEvent = async (type: "EMOJI" | "PING" | "CHAT", payload: any) => {
    try {
      await api.post(`/arena/rooms/${roomId}/events`, { type, payload });
      setChat("");
      await fetchRoom();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chưa gửi được tín hiệu.");
    }
  };

  const setReady = async (ready: boolean) => {
    try {
      await api.post(`/arena/rooms/${roomId}/ready`, { ready });
      setMessage(ready ? "Bạn đã sẵn sàng. Chờ mọi người cùng ready nhé." : "Bạn đã hủy sẵn sàng.");
      await fetchRoom();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chưa cập nhật được trạng thái sẵn sàng.");
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
      setMessage("Trận đang đếm ngược, chờ hết 5 giây rồi trả lời nhé.");
      return;
    }
    try {
      const res = await api.post(`/arena/rooms/${roomId}/questions/${currentQuestion.id}/answer`, { answer });
      setMessage(res.data.answer.isCorrect ? "Chính xác! Điểm của bạn đã tăng." : "Chưa đúng. Backend đã ghi nhận câu trả lời.");
      await fetchRoom();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Chưa gửi được câu trả lời.");
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-[var(--background)] p-8 font-black text-[var(--lumiverse-ink)]">Đang tải phòng Arena...</main>;
  }

  if (!room) {
    return <main className="min-h-screen bg-[var(--background)] p-8 font-black text-[var(--lumiverse-ink)]">{message || "Không tìm thấy phòng."}</main>;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="lumiverse-gradient flex flex-wrap items-center justify-between gap-4 rounded-[30px] p-6 text-white shadow-xl">
          <div>
            <button type="button" onClick={leaveToLobby} className="text-sm font-extrabold text-white/80">
              ← Rời phòng
            </button>
            <h1 className="mt-2 text-3xl font-black">{room.name}</h1>
            <p className="mt-2 font-bold text-white/70">
              {room.gameMode} · {room.skill} · {room.difficulty} · {room.topic} · {room.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge active={room.voiceChat}>Voice chat</Badge>
            <Badge active={room.emojiEnabled}>Emoji</Badge>
            <Badge active={room.pingEnabled}>Ping</Badge>
          </div>
        </div>

        {message && <div className="rounded-2xl bg-white px-5 py-4 font-extrabold text-[var(--lumiverse-primary)] shadow-sm">{message}</div>}

        {room.status === "WAITING" && room.isParticipant && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Phòng chờ Arena</p>
            <h2 className="mt-2 text-3xl font-black text-[var(--lumiverse-ink)]">
              {myParticipant?.ready ? "Bạn đã sẵn sàng" : "Chuẩn bị vào trận"}
            </h2>
            <p className="mt-3 font-bold leading-7 text-[var(--lumiverse-muted)]">
              {readyCount}/{room.participants.length} người chơi đã sẵn sàng. Khi đủ người, trận sẽ tự đếm ngược 5 giây và mở câu hỏi.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReady(!myParticipant?.ready)}
                className={`rounded-2xl px-5 py-4 font-black text-white ${myParticipant?.ready ? "bg-[var(--lumiverse-muted)]" : "bg-emerald-600"}`}
              >
                {myParticipant?.ready ? "Hủy sẵn sàng" : "Tôi sẵn sàng"}
              </button>
              <button type="button" onClick={leaveToLobby} className="rounded-2xl bg-blue-50 px-5 py-4 font-black text-[var(--lumiverse-primary)]">
                Thoát về lobby
              </button>
            </div>
          </ArenaModal>
        )}

        {room.status === "PLAYING" && countdownLeft > 0 && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Trận sắp bắt đầu</p>
            <div className="mt-3 text-8xl font-black text-[var(--lumiverse-ink)]">{countdownLeft}</div>
            <p className="mt-2 font-bold text-[var(--lumiverse-muted)]">Câu hỏi sẽ tự mở sau khi đếm ngược kết thúc.</p>
          </ArenaModal>
        )}

        {showResultModal && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Kết quả trận đấu</p>
            <h2 className="mt-2 text-4xl font-black text-[var(--lumiverse-ink)]">
              {winnerTeam === myTeam ? "Bạn thắng!" : "Đội bạn thua"}
            </h2>
            <p className="mt-3 font-bold leading-7 text-[var(--lumiverse-muted)]">
              Đội {winnerTeam} chiến thắng. Người thắng: {winnerParticipants.map((participant) => participant.user?.fullname || "Player").join(", ")}.
            </p>
            {activeMatch?.result && (
              <div className="mt-4 rounded-2xl bg-[var(--lumiverse-card)] p-4 font-black text-[var(--lumiverse-ink)]">
                Đội A: {activeMatch.result.teamAScore ?? "-"} điểm · Đội B: {activeMatch.result.teamBScore ?? "-"} điểm
              </div>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setResultDismissed(true)} className="rounded-2xl bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] px-5 py-4 font-black text-white">
                Xem lại phòng
              </button>
              <button type="button" onClick={() => (window.location.href = "/arena")} className="rounded-2xl bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] px-5 py-4 font-black text-white">
                Về lobby
              </button>
            </div>
          </ArenaModal>
        )}

        {showHostChangedModal && latestHostChange && (
          <ArenaModal>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Chủ phòng đã đổi</p>
            <h2 className="mt-2 text-3xl font-black text-[var(--lumiverse-ink)]">
              {latestHostChange.payload?.newHostName || "Người chơi khác"} là chủ phòng mới
            </h2>
            <p className="mt-3 font-bold leading-7 text-[var(--lumiverse-muted)]">
              {latestHostChange.payload?.previousHostName || "Chủ phòng cũ"} đã rời phòng. Phòng vẫn tiếp tục với chủ phòng mới.
            </p>
            <button
              type="button"
              onClick={() => setDismissedHostEventId(latestHostChange.id)}
              className="mt-5 rounded-2xl bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] px-6 py-4 font-black text-white"
            >
              Đã hiểu
            </button>
          </ArenaModal>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[30px] border border-[var(--lumiverse-border)] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[var(--lumiverse-card)] px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--lumiverse-primary)]">Sẵn sàng</p>
                <p className="font-black text-[var(--lumiverse-ink)]">
                  {readyCount}/{room.participants.length} người chơi đã ready
                </p>
              </div>
              {room.status === "WAITING" && room.isParticipant && (
                <button
                  type="button"
                  onClick={() => setReady(!myParticipant?.ready)}
                  className={`rounded-2xl px-5 py-3 font-black text-white ${myParticipant?.ready ? "bg-[var(--lumiverse-muted)]" : "bg-emerald-600"}`}
                >
                  {myParticipant?.ready ? "Hủy sẵn sàng" : "Tôi sẵn sàng"}
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr]">
              <TeamColumn title="Đội A" participants={teamA} tone="orange" />
              <div className="flex items-center justify-center text-4xl font-black text-[var(--lumiverse-primary)]">VS</div>
              <TeamColumn title="Đội B" participants={teamB} tone="blue" />
            </div>

            <div className="mt-8 rounded-[26px] border border-[var(--lumiverse-border)] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Câu hỏi trận đấu</p>
                  <h2 className="mt-1 text-xl font-black text-[var(--lumiverse-ink)]">
                    {currentQuestion ? `Câu ${currentQuestion.order}: ${currentQuestion.skill}` : "Chưa có câu hỏi"}
                  </h2>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-[var(--lumiverse-primary)]">
                  {activeMatch?.questions?.length || 0} câu
                </span>
              </div>

              {currentQuestion ? (
                <div className="mt-4">
                  <p className="rounded-2xl bg-[var(--lumiverse-card)] p-4 font-bold leading-7 text-[var(--lumiverse-ink)]">
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
                                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                : "border-red-300 bg-red-50 text-red-600"
                              : "border-[var(--lumiverse-border)] bg-white text-[var(--lumiverse-ink)] hover:border-[var(--lumiverse-primary)] disabled:opacity-60"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {currentAnswers.length > 0 && (
                    <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-bold leading-6 text-[var(--lumiverse-ink)]">
                      Có {currentAnswers.length} lượt trả lời câu này. Đáp án đúng: {currentQuestion.answer}.
                      {currentQuestion.explanation ? ` ${currentQuestion.explanation}` : ""}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-6 text-center font-bold text-[var(--lumiverse-muted)]">
                  {room.status === "WAITING"
                    ? "Khi tất cả người chơi bấm sẵn sàng, trận đấu sẽ tự động bắt đầu."
                    : countdownLeft > 0
                      ? "Đang đếm ngược. Câu hỏi sẽ mở ngay sau khi hết 5 giây."
                      : "Bạn đã hoàn thành bộ câu hỏi hiện tại hoặc trận chưa có câu hỏi."}
                </div>
              )}
            </div>

            <div className="mt-8 rounded-[26px] bg-[var(--lumiverse-card)] p-5">
              <h2 className="text-xl font-black text-[var(--lumiverse-ink)]">Luồng trận đấu</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--lumiverse-muted)]">
                Cả hai người chơi bấm sẵn sàng, hệ thống tự đếm ngược 5 giây, mở câu hỏi và tự thông báo đội thắng khi mọi người trả lời xong.
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-[var(--lumiverse-border)] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Emoji & Ping</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => sendEvent("EMOJI", { emoji })} className="rounded-2xl bg-blue-50 px-3 py-3 text-2xl">
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                {PINGS.map((ping) => (
                  <button key={ping} onClick={() => sendEvent("PING", { ping })} className="rounded-2xl border border-[var(--lumiverse-border)] px-4 py-3 text-left text-sm font-black text-[var(--lumiverse-ink)]">
                    📍 {ping}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[var(--lumiverse-border)] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lumiverse-primary)]">Room Feed</p>
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-[var(--lumiverse-card)] p-3">
                {room.events.length ? room.events.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[var(--lumiverse-ink)] shadow-sm">
                    <span className="text-[var(--lumiverse-primary)]">{event.user?.fullname || "Player"}</span>{" "}
                    {event.type === "EMOJI" && <>thả {event.payload?.emoji}</>}
                    {event.type === "PING" && <>ping: {event.payload?.ping}</>}
                    {event.type === "CHAT" && <>nói: {event.payload?.text}</>}
                    {event.type === "HOST_CHANGED" && <>thông báo: {event.payload?.newHostName || "người chơi khác"} là chủ phòng mới</>}
                    {event.type === "PLAYER_LEFT" && <>thông báo: {event.payload?.name || "một người chơi"} đã rời phòng</>}
                  </div>
                )) : <div className="text-sm font-bold text-[var(--lumiverse-muted)]">Chưa có tín hiệu nào.</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Chat nhanh..." className="min-h-11 flex-1 rounded-2xl border border-[var(--lumiverse-border)] px-3 font-bold outline-none" />
                <button onClick={() => chat.trim() && sendEvent("CHAT", { text: chat.trim() })} className="rounded-2xl bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] px-4 font-black text-white">Gửi</button>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function TeamColumn({ title, participants, tone }: { title: string; participants: Participant[]; tone: "orange" | "blue" }) {
  const bg = tone === "orange" ? "bg-blue-50" : "bg-sky-50";
  const text = tone === "orange" ? "text-[var(--lumiverse-primary)]" : "text-sky-700";
  return (
    <div className={`rounded-[26px] ${bg} p-5`}>
      <h2 className={`text-xl font-black ${text}`}>{title}</h2>
      <div className="mt-4 space-y-3">
        {participants.length ? participants.map((participant) => (
          <div key={participant.id} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="font-black text-[var(--lumiverse-ink)]">{participant.user?.fullname || "Player"}</div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${participant.ready ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-[var(--lumiverse-primary)]"}`}>
                {participant.ready ? "READY" : "CHỜ"}
              </span>
            </div>
            <div className="text-xs font-bold text-[var(--lumiverse-muted)]">Score {participant.score} · Đúng {participant.correct} · Sai {participant.wrong}</div>
          </div>
        )) : <div className="rounded-2xl border border-dashed border-white bg-white/60 px-4 py-6 text-center font-bold text-[var(--lumiverse-muted)]">Đang chờ người chơi</div>}
      </div>
    </div>
  );
}

function ArenaModal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[30px] bg-white p-7 text-center shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function Badge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`rounded-full px-4 py-2 text-xs font-black ${active ? "bg-emerald-400 text-[var(--lumiverse-ink)]" : "bg-white/10 text-white/60"}`}>{children}</span>;
}

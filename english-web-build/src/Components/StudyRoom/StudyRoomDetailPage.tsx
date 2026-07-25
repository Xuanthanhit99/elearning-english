"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Crown, LogOut, Play, Square, Users, History } from "lucide-react";
import { useAuthStore } from "@/src/store/authStore";
import {
  BeaconVieButton,
  BeaconVieBadge,
  BeaconVieCard,
  BeaconVieLoadingState,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";
import {
  StudyRoomDetail,
  StudyRoomMember,
  StudySessionHistoryItem,
  endStudySession,
  getStudyRoom,
  getStudyRoomHistory,
  kickStudyRoomMember,
  banStudyRoomMember,
  leaveStudyRoom,
  startStudySession,
} from "@/src/lib/study-room-api";
import {
  connectStudyRoomSocket,
  joinStudyRoomSocket,
  leaveStudyRoomSocket,
  resumeStudyRoomSocket,
  setStudyRoomReady,
} from "@/src/lib/study-room-socket";

const STATUS_LABEL: Record<string, string> = {
  WAITING: "Äang chá»",
  IN_SESSION: "Äang há»c",
  ENDED: "ÄÃ£ káº¿t thÃºc",
};

export default function StudyRoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.user?.id) ?? null;

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready" }
  >({ status: "loading" });
  const [room, setRoom] = useState<StudyRoomDetail | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<StudySessionHistoryItem[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const loadRoom = useCallback(() => {
    return getStudyRoom(roomId)
      .then((data) => {
        setRoom(data);
        setState({ status: "ready" });
      })
      .catch(() => setState({ status: "error", message: "KhÃ´ng thá»ƒ táº£i phÃ²ng há»c nÃ y." }));
  }, [roomId]);

  useEffect(() => {
    loadRoom();
    getStudyRoomHistory(roomId)
      .then(setHistory)
      .catch(() => {});
  }, [roomId, loadRoom]);

  useEffect(() => {
    const socket = connectStudyRoomSocket();
    if (!socket) return;

    joinStudyRoomSocket(roomId);

    const onConnect = () => {
      // Reconnect after a drop: re-join the socket room AND refetch REST
      // state, since membership/session status may have changed while
      // disconnected (e.g. the host started a session, or kicked someone).
      resumeStudyRoomSocket(roomId).then(() => loadRoom());
    };
    const onRoomUpdated = () => loadRoom();
    const onMemberChange = () => loadRoom();
    const onSessionEnded = () => {
      loadRoom();
      getStudyRoomHistory(roomId).then(setHistory).catch(() => {});
    };
    const onPresenceUpdated = (payload: { userId: string; online: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    };
    const onRemoved = (payload: { userId: string }) => {
      if (payload.userId === currentUserId) {
        router.push("/study-rooms");
      }
    };

    socket.on("connect", onConnect);
    socket.on("study-room:room-updated", onRoomUpdated);
    socket.on("study-room:member-joined", onMemberChange);
    socket.on("study-room:member-left", onMemberChange);
    socket.on("study-room:member-updated", onMemberChange);
    socket.on("study-room:member-ready", onMemberChange);
    socket.on("study-room:session-started", onRoomUpdated);
    socket.on("study-room:session-ended", onSessionEnded);
    socket.on("study-room:presence-updated", onPresenceUpdated);
    socket.on("study-room:removed", onRemoved);

    return () => {
      leaveStudyRoomSocket(roomId);
      socket.off("connect", onConnect);
      socket.off("study-room:room-updated", onRoomUpdated);
      socket.off("study-room:member-joined", onMemberChange);
      socket.off("study-room:member-left", onMemberChange);
      socket.off("study-room:member-updated", onMemberChange);
      socket.off("study-room:member-ready", onMemberChange);
      socket.off("study-room:session-started", onRoomUpdated);
      socket.off("study-room:session-ended", onSessionEnded);
      socket.off("study-room:presence-updated", onPresenceUpdated);
      socket.off("study-room:removed", onRemoved);
    };
    // Deliberately not disconnecting the shared socket singleton on
    // unmount (mirrors arena-socket.ts's lifecycle) â€” only this room's
    // listeners and socket-room membership are torn down.
  }, [roomId, loadRoom, router, currentUserId]);

  // 1s tick just for the countdown display â€” no network calls.
  useEffect(() => {
    if (!room?.activeSession) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [room?.activeSession]);

  if (state.status === "loading") {
    return (
      <div className="px-4 py-10">
        <BeaconVieLoadingState label="Äang táº£i phÃ²ng há»c..." />
      </div>
    );
  }
  if (state.status === "error" || !room) {
    return (
      <div className="px-4 py-10">
        <BeaconVieState
          title="KhÃ´ng tÃ¬m tháº¥y phÃ²ng há»c"
          description={state.status === "error" ? state.message : undefined}
          actionLabel="Vá» danh sÃ¡ch phÃ²ng"
          onAction={() => router.push("/study-rooms")}
          tone="error"
        />
      </div>
    );
  }

  return (
    <RoomBody
      room={room}
      currentUserId={currentUserId}
      onlineUserIds={onlineUserIds}
      history={history}
      actionError={actionError}
      setActionError={setActionError}
      nowTick={nowTick}
      reload={loadRoom}
      router={router}
    />
  );
}

function RoomBody({
  room,
  currentUserId,
  onlineUserIds,
  history,
  actionError,
  setActionError,
  nowTick,
  reload,
  router,
}: {
  room: StudyRoomDetail;
  currentUserId: string | null;
  onlineUserIds: Set<string>;
  history: StudySessionHistoryItem[];
  actionError: string | null;
  setActionError: (v: string | null) => void;
  nowTick: number;
  reload: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [busy, setBusy] = useState(false);

  const viewerIsHost = currentUserId !== null && currentUserId === room.hostId;
  const myMembership = room.members.find((m) => m.userId === currentUserId) ?? null;

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      reload();
    } catch {
      setActionError("Thao tÃ¡c tháº¥t báº¡i. Vui lÃ²ng thá»­ láº¡i.");
    } finally {
      setBusy(false);
    }
  }

  const activeMembers = room.members.filter((m) => m.status === "ACTIVE" || m.status === "MUTED");
  const allReady = activeMembers.length > 0 && activeMembers.every((m) => m.ready);
  const secondsLeft = room.activeSession
    ? Math.max(0, Math.round((new Date(room.activeSession.endsAt).getTime() - nowTick) / 1000))
    : 0;

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[var(--BeaconVie-ink)] sm:text-2xl">{room.name}</h1>
            <BeaconVieBadge>{STATUS_LABEL[room.status] ?? room.status}</BeaconVieBadge>
          </div>
          {room.topic && <p className="mt-1 text-sm font-semibold text-[var(--BeaconVie-muted)]">{room.topic}</p>}
          {room.inviteCode && (
            <p className="mt-1 text-xs font-bold text-[var(--BeaconVie-muted)]">MÃ£ má»i: {room.inviteCode}</p>
          )}
        </div>
        <BeaconVieButton
          tone="ghost"
          onClick={() =>
            withBusy(async () => {
              await leaveStudyRoom(room.id);
              router.push("/study-rooms");
            })
          }
        >
          <LogOut aria-hidden className="h-4 w-4" />
          Rá»i phÃ²ng
        </BeaconVieButton>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {actionError}
        </div>
      )}

      {room.activeSession && (
        <BeaconVieCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">Buá»•i há»c Ä‘ang diá»…n ra</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-[var(--BeaconVie-primary)]">
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </p>
            </div>
            {viewerIsHost && (
              <BeaconVieButton
                tone="danger"
                loading={busy}
                onClick={() => withBusy(async () => { await endStudySession(room.id); })}
              >
                <Square aria-hidden className="h-4 w-4" />
                Káº¿t thÃºc buá»•i há»c
              </BeaconVieButton>
            )}
          </div>
        </BeaconVieCard>
      )}

      {!room.activeSession && room.status === "WAITING" && myMembership && (
        <BeaconVieCard className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-[var(--BeaconVie-ink)]">Sáºµn sÃ ng báº¯t Ä‘áº§u?</p>
            <p className="text-sm font-semibold text-[var(--BeaconVie-muted)]">
              Má»i thÃ nh viÃªn cáº§n báº¥m &quot;Sáºµn sÃ ng&quot; trÆ°á»›c khi chá»§ phÃ²ng cÃ³ thá»ƒ báº¯t Ä‘áº§u buá»•i há»c {room.goalMinutes} phÃºt.
            </p>
          </div>
          <div className="flex gap-2">
            <ReadyToggle roomId={room.id} initialReady={myMembership.ready} onChanged={reload} />
            {viewerIsHost && (
              <BeaconVieButton
                disabled={!allReady}
                loading={busy}
                onClick={() => withBusy(async () => { await startStudySession(room.id); })}
              >
                <Play aria-hidden className="h-4 w-4" />
                Báº¯t Ä‘áº§u
              </BeaconVieButton>
            )}
          </div>
        </BeaconVieCard>
      )}

      <BeaconVieCard className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--BeaconVie-ink)]">
          <Users aria-hidden className="h-4 w-4" />
          ThÃ nh viÃªn ({activeMembers.length}/{room.maxMembers})
        </div>
        <ul className="space-y-2">
          {room.members
            .filter((m) => m.status !== "LEFT")
            .map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                online={onlineUserIds.has(member.userId)}
                showModeration={viewerIsHost && member.userId !== room.hostId}
                onKick={() => withBusy(async () => { await kickStudyRoomMember(room.id, member.userId); })}
                onBan={() => withBusy(async () => { await banStudyRoomMember(room.id, member.userId); })}
              />
            ))}
        </ul>
      </BeaconVieCard>

      {history.length > 0 && (
        <BeaconVieCard className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--BeaconVie-ink)]">
            <History aria-hidden className="h-4 w-4" />
            Lá»‹ch sá»­ buá»•i há»c
          </div>
          <ul className="space-y-2 text-sm font-semibold text-[var(--BeaconVie-muted)]">
            {history.map((session) => (
              <li key={session.id} className="flex items-center justify-between border-b border-[var(--BeaconVie-border)] py-2 last:border-0">
                <span>{new Date(session.startedAt).toLocaleString()}</span>
                <span>{session.summary ?? `${session.participantCount} thÃ nh viÃªn`}</span>
              </li>
            ))}
          </ul>
        </BeaconVieCard>
      )}
    </div>
  );
}

function MemberRow({
  member,
  online,
  showModeration,
  onKick,
  onBan,
}: {
  member: StudyRoomMember;
  online: boolean;
  showModeration: boolean;
  onKick: () => void;
  onBan: () => void;
}) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-[var(--BeaconVie-border)] px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-[var(--BeaconVie-border)]"}`}
          aria-label={online ? "Äang online" : "Ngoáº¡i tuyáº¿n"}
        />
        <span className="font-bold text-[var(--BeaconVie-ink)]">
          {member.user?.fullname || member.user?.username || "Há»c viÃªn"}
        </span>
        {member.role === "HOST" && <Crown aria-hidden className="h-4 w-4 text-amber-500" />}
        {member.ready && member.status === "ACTIVE" && (
          <BeaconVieBadge className="text-[10px]">Sáºµn sÃ ng</BeaconVieBadge>
        )}
        {member.status === "MUTED" && <BeaconVieBadge className="text-[10px]">ÄÃ£ táº¯t tiáº¿ng</BeaconVieBadge>}
      </div>
      {showModeration && (
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs font-black text-[var(--BeaconVie-muted)] hover:text-[var(--BeaconVie-danger)]"
            onClick={onKick}
          >
            Äuá»•i
          </button>
          <button type="button" className="text-xs font-black text-[var(--BeaconVie-danger)]" onClick={onBan}>
            Cáº¥m
          </button>
        </div>
      )}
    </li>
  );
}

function ReadyToggle({
  roomId,
  initialReady,
  onChanged,
}: {
  roomId: string;
  initialReady: boolean;
  onChanged: () => void;
}) {
  const [ready, setReady] = useState(initialReady);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(initialReady);
  }, [initialReady]);

  return (
    <BeaconVieButton
      tone="soft"
      loading={pending}
      onClick={async () => {
        setPending(true);
        const next = !ready;
        const result = await setStudyRoomReady(roomId, next);
        if (result.updated) {
          setReady(next);
          onChanged();
        }
        setPending(false);
      }}
    >
      {ready ? "ÄÃ£ sáºµn sÃ ng" : "Sáºµn sÃ ng"}
    </BeaconVieButton>
  );
}

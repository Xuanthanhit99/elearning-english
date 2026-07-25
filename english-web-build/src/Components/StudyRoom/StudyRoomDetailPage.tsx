"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Crown, LogOut, Play, Square, Users, History } from "lucide-react";
import { useAuthStore } from "@/src/store/authStore";
import {
  LumiverseButton,
  LumiverseBadge,
  LumiverseCard,
  LumiverseLoadingState,
  LumiverseState,
} from "@/src/Components/UI/Lumiverse";
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
  WAITING: "Đang chờ",
  IN_SESSION: "Đang học",
  ENDED: "Đã kết thúc",
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
      .catch(() => setState({ status: "error", message: "Không thể tải phòng học này." }));
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
    // unmount (mirrors arena-socket.ts's lifecycle) — only this room's
    // listeners and socket-room membership are torn down.
  }, [roomId, loadRoom, router, currentUserId]);

  // 1s tick just for the countdown display — no network calls.
  useEffect(() => {
    if (!room?.activeSession) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [room?.activeSession]);

  if (state.status === "loading") {
    return (
      <div className="px-4 py-10">
        <LumiverseLoadingState label="Đang tải phòng học..." />
      </div>
    );
  }
  if (state.status === "error" || !room) {
    return (
      <div className="px-4 py-10">
        <LumiverseState
          title="Không tìm thấy phòng học"
          description={state.status === "error" ? state.message : undefined}
          actionLabel="Về danh sách phòng"
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
      setActionError("Thao tác thất bại. Vui lòng thử lại.");
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
            <h1 className="text-xl font-black text-[var(--lumiverse-ink)] sm:text-2xl">{room.name}</h1>
            <LumiverseBadge>{STATUS_LABEL[room.status] ?? room.status}</LumiverseBadge>
          </div>
          {room.topic && <p className="mt-1 text-sm font-semibold text-[var(--lumiverse-muted)]">{room.topic}</p>}
          {room.inviteCode && (
            <p className="mt-1 text-xs font-bold text-[var(--lumiverse-muted)]">Mã mời: {room.inviteCode}</p>
          )}
        </div>
        <LumiverseButton
          tone="ghost"
          onClick={() =>
            withBusy(async () => {
              await leaveStudyRoom(room.id);
              router.push("/study-rooms");
            })
          }
        >
          <LogOut aria-hidden className="h-4 w-4" />
          Rời phòng
        </LumiverseButton>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {actionError}
        </div>
      )}

      {room.activeSession && (
        <LumiverseCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--lumiverse-muted)]">Buổi học đang diễn ra</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-[var(--lumiverse-primary)]">
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </p>
            </div>
            {viewerIsHost && (
              <LumiverseButton
                tone="danger"
                loading={busy}
                onClick={() => withBusy(async () => { await endStudySession(room.id); })}
              >
                <Square aria-hidden className="h-4 w-4" />
                Kết thúc buổi học
              </LumiverseButton>
            )}
          </div>
        </LumiverseCard>
      )}

      {!room.activeSession && room.status === "WAITING" && myMembership && (
        <LumiverseCard className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-[var(--lumiverse-ink)]">Sẵn sàng bắt đầu?</p>
            <p className="text-sm font-semibold text-[var(--lumiverse-muted)]">
              Mọi thành viên cần bấm &quot;Sẵn sàng&quot; trước khi chủ phòng có thể bắt đầu buổi học {room.goalMinutes} phút.
            </p>
          </div>
          <div className="flex gap-2">
            <ReadyToggle roomId={room.id} initialReady={myMembership.ready} onChanged={reload} />
            {viewerIsHost && (
              <LumiverseButton
                disabled={!allReady}
                loading={busy}
                onClick={() => withBusy(async () => { await startStudySession(room.id); })}
              >
                <Play aria-hidden className="h-4 w-4" />
                Bắt đầu
              </LumiverseButton>
            )}
          </div>
        </LumiverseCard>
      )}

      <LumiverseCard className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--lumiverse-ink)]">
          <Users aria-hidden className="h-4 w-4" />
          Thành viên ({activeMembers.length}/{room.maxMembers})
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
      </LumiverseCard>

      {history.length > 0 && (
        <LumiverseCard className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--lumiverse-ink)]">
            <History aria-hidden className="h-4 w-4" />
            Lịch sử buổi học
          </div>
          <ul className="space-y-2 text-sm font-semibold text-[var(--lumiverse-muted)]">
            {history.map((session) => (
              <li key={session.id} className="flex items-center justify-between border-b border-[var(--lumiverse-border)] py-2 last:border-0">
                <span>{new Date(session.startedAt).toLocaleString()}</span>
                <span>{session.summary ?? `${session.participantCount} thành viên`}</span>
              </li>
            ))}
          </ul>
        </LumiverseCard>
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
    <li className="flex items-center justify-between rounded-xl border border-[var(--lumiverse-border)] px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-[var(--lumiverse-border)]"}`}
          aria-label={online ? "Đang online" : "Ngoại tuyến"}
        />
        <span className="font-bold text-[var(--lumiverse-ink)]">
          {member.user?.fullname || member.user?.username || "Học viên"}
        </span>
        {member.role === "HOST" && <Crown aria-hidden className="h-4 w-4 text-amber-500" />}
        {member.ready && member.status === "ACTIVE" && (
          <LumiverseBadge className="text-[10px]">Sẵn sàng</LumiverseBadge>
        )}
        {member.status === "MUTED" && <LumiverseBadge className="text-[10px]">Đã tắt tiếng</LumiverseBadge>}
      </div>
      {showModeration && (
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs font-black text-[var(--lumiverse-muted)] hover:text-[var(--lumiverse-danger)]"
            onClick={onKick}
          >
            Đuổi
          </button>
          <button type="button" className="text-xs font-black text-[var(--lumiverse-danger)]" onClick={onBan}>
            Cấm
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
    <LumiverseButton
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
      {ready ? "Đã sẵn sàng" : "Sẵn sàng"}
    </LumiverseButton>
  );
}

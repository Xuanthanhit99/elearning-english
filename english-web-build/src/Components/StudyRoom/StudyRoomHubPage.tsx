"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, KeyRound } from "lucide-react";
import {
  LumiverseButton,
  LumiverseCard,
  LumiverseSectionHeader,
  LumiverseSkeleton,
  LumiverseState,
  LumiverseBadge,
  LumiverseDialog,
} from "@/src/Components/UI/Lumiverse";
import {
  StudyRoomSummary,
  StudyRoomVisibility,
  createStudyRoom,
  joinStudyRoom,
  joinStudyRoomByCode,
  listStudyRooms,
  myStudyRooms,
} from "@/src/lib/study-room-api";

const STATUS_LABEL: Record<string, string> = {
  WAITING: "Đang chờ",
  IN_SESSION: "Đang học",
  ENDED: "Đã kết thúc",
};

export default function StudyRoomHubPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"BROWSE" | "MINE">("BROWSE");
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; data: StudyRoomSummary[] }
  >({ status: "loading" });
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);

  function load() {
    setState({ status: "loading" });
    const request = tab === "BROWSE" ? listStudyRooms() : myStudyRooms();
    Promise.resolve(request)
      .then((data) => setState({ status: "ready", data: Array.isArray(data) ? data : data.items }))
      .catch(() => setState({ status: "error" }));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleJoin(roomId: string) {
    setError(null);
    setJoiningId(roomId);
    try {
      await joinStudyRoom(roomId);
      router.push(`/study-rooms/${roomId}`);
    } catch {
      setError("Không thể tham gia phòng này. Vui lòng thử lại.");
      setJoiningId(null);
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <LumiverseSectionHeader
        eyebrow="Study Together"
        title="Học nhóm cùng nhau, theo thời gian thực"
        description="Tạo hoặc tham gia một phòng học nhóm, đặt mục tiêu thời gian chung, và nhận XP nhóm khi hoàn thành buổi học."
        action={
          <div className="flex gap-2">
            <LumiverseButton tone="soft" onClick={() => setShowJoinCode(true)}>
              <KeyRound aria-hidden className="h-4 w-4" />
              Nhập mã mời
            </LumiverseButton>
            <LumiverseButton onClick={() => setShowCreate(true)}>
              <Plus aria-hidden className="h-4 w-4" />
              Tạo phòng học
            </LumiverseButton>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {(["BROWSE", "MINE"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              tab === key
                ? "bg-[var(--lumiverse-primary)] text-white"
                : "border border-[var(--lumiverse-border)] text-[var(--lumiverse-muted)] hover:bg-[var(--lumiverse-hover-tint)]"
            }`}
          >
            {key === "BROWSE" ? "Khám phá" : "Phòng của tôi"}
          </button>
        ))}
      </div>

      {state.status === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LumiverseSkeleton key={i} className="h-44" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <LumiverseState
          title="Không thể tải danh sách phòng học"
          description="Đã có lỗi xảy ra khi tải danh sách."
          actionLabel="Thử lại"
          onAction={load}
          tone="error"
        />
      )}

      {state.status === "ready" && state.data.length === 0 && (
        <LumiverseState
          title={tab === "BROWSE" ? "Chưa có phòng học công khai nào" : "Bạn chưa tham gia phòng nào"}
          description="Hãy tạo một phòng học mới để bắt đầu."
          actionLabel="Tạo phòng học"
          onAction={() => setShowCreate(true)}
        />
      )}

      {state.status === "ready" && state.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.data.map((room) => (
            <LumiverseCard key={room.id} className="flex flex-col p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
                  <Users aria-hidden className="h-5 w-5" />
                </span>
                <LumiverseBadge>{STATUS_LABEL[room.status] ?? room.status}</LumiverseBadge>
              </div>
              <h3 className="text-lg font-black text-[var(--lumiverse-ink)]">{room.name}</h3>
              {room.topic && (
                <p className="mt-1 text-sm font-semibold text-[var(--lumiverse-muted)]">{room.topic}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[var(--lumiverse-muted)]">
                <span>{room.memberCount}/{room.maxMembers} thành viên</span>
                <span>{room.goalMinutes} phút/buổi</span>
              </div>
              <LumiverseButton
                className="mt-4 w-full"
                tone="soft"
                loading={joiningId === room.id}
                onClick={() => handleJoin(room.id)}
              >
                Tham gia
              </LumiverseButton>
            </LumiverseCard>
          ))}
        </div>
      )}

      <CreateRoomDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(roomId) => router.push(`/study-rooms/${roomId}`)}
      />
      <JoinByCodeDialog open={showJoinCode} onClose={() => setShowJoinCode(false)} onJoined={(roomId) => router.push(`/study-rooms/${roomId}`)} />
    </div>
  );
}

function CreateRoomDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [goalMinutes, setGoalMinutes] = useState(25);
  const [maxMembers, setMaxMembers] = useState(8);
  const [visibility, setVisibility] = useState<StudyRoomVisibility>("PUBLIC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Vui lòng nhập tên phòng học.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const room = await createStudyRoom({ name, topic: topic || undefined, goalMinutes, maxMembers, visibility });
      onCreated(room.id);
    } catch {
      setError("Không thể tạo phòng học. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LumiverseDialog open={open} onClose={onClose} titleId="create-study-room-title" labelledBy="create-study-room-title">
      <h2 id="create-study-room-title" className="text-lg font-black text-[var(--lumiverse-ink)]">
        Tạo phòng học nhóm
      </h2>
      <div className="mt-4 space-y-3">
        <input
          className="w-full rounded-xl border border-[var(--lumiverse-border)] bg-transparent px-3 py-2 text-sm font-semibold"
          placeholder="Tên phòng học"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-[var(--lumiverse-border)] bg-transparent px-3 py-2 text-sm font-semibold"
          placeholder="Chủ đề (không bắt buộc)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <div className="flex gap-3">
          <label className="flex-1 text-xs font-bold text-[var(--lumiverse-muted)]">
            Mục tiêu (phút)
            <input
              type="number"
              min={5}
              max={180}
              className="mt-1 w-full rounded-xl border border-[var(--lumiverse-border)] bg-transparent px-3 py-2 text-sm font-semibold"
              value={goalMinutes}
              onChange={(e) => setGoalMinutes(Number(e.target.value))}
            />
          </label>
          <label className="flex-1 text-xs font-bold text-[var(--lumiverse-muted)]">
            Số thành viên tối đa
            <input
              type="number"
              min={2}
              max={30}
              className="mt-1 w-full rounded-xl border border-[var(--lumiverse-border)] bg-transparent px-3 py-2 text-sm font-semibold"
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
            />
          </label>
        </div>
        <label className="block text-xs font-bold text-[var(--lumiverse-muted)]">
          Quyền riêng tư
          <select
            className="mt-1 w-full rounded-xl border border-[var(--lumiverse-border)] bg-transparent px-3 py-2 text-sm font-semibold"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as StudyRoomVisibility)}
          >
            <option value="PUBLIC">Công khai</option>
            <option value="PRIVATE">Riêng tư</option>
            <option value="INVITE_ONLY">Chỉ mời</option>
          </select>
        </label>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <LumiverseButton className="w-full" loading={submitting} onClick={submit}>
          Tạo phòng
        </LumiverseButton>
      </div>
    </LumiverseDialog>
  );
}

function JoinByCodeDialog({
  open,
  onClose,
  onJoined,
}: {
  open: boolean;
  onClose: () => void;
  onJoined: (roomId: string) => void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const room = await joinStudyRoomByCode(code.trim());
      onJoined(room.id);
    } catch {
      setError("Mã mời không hợp lệ hoặc đã hết hạn.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LumiverseDialog open={open} onClose={onClose} titleId="join-by-code-title" labelledBy="join-by-code-title">
      <h2 id="join-by-code-title" className="text-lg font-black text-[var(--lumiverse-ink)]">
        Tham gia bằng mã mời
      </h2>
      <div className="mt-4 space-y-3">
        <input
          className="w-full rounded-xl border border-[var(--lumiverse-border)] bg-transparent px-3 py-2 text-sm font-semibold uppercase"
          placeholder="Nhập mã mời"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <LumiverseButton className="w-full" loading={submitting} onClick={submit}>
          Tham gia
        </LumiverseButton>
      </div>
    </LumiverseDialog>
  );
}

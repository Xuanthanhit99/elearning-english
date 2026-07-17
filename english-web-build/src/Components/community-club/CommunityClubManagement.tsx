"use client";

import {
  Check,
  Crown,
  Loader2,
  Search,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  approveClubJoinRequest,
  deleteClubSafely,
  getClubManagement,
  inviteClubMember,
  kickClubMember,
  rejectClubJoinRequest,
  transferClubOwnership,
  updateClubMemberRole,
} from "@/src/lib/community-club-permission-api";
import { searchCommunityUsers } from "@/src/lib/community-social-api";

export function CommunityClubManagement({
  clubId,
  onDeleted,
}: {
  clubId: string;
  onDeleted?: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setData(await getClubManagement(clubId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải quản lý Club");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [clubId]);

  async function searchUsers() {
    const q = inviteSearch.trim();
    if (!q) return setInviteResults([]);
    setInviteResults(await searchCommunityUsers(q));
  }

  async function invite(userId: string) {
    try {
      setBusy(userId);
      await inviteClubMember(clubId, userId, "Mời bạn tham gia câu lạc bộ");
      setInviteResults((current) =>
        current.map((item) =>
          item.id === userId ? { ...item, invited: true } : item,
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  async function approve(requestId: string) {
    await approveClubJoinRequest(clubId, requestId);
    await load();
  }

  async function reject(requestId: string) {
    await rejectClubJoinRequest(clubId, requestId);
    await load();
  }

  async function changeRole(
    memberId: string,
    role: "ADMIN" | "MODERATOR" | "MEMBER",
  ) {
    await updateClubMemberRole(clubId, memberId, role);
    await load();
  }

  async function transfer(userId: string) {
    if (!window.confirm("Bạn chắc chắn muốn chuyển quyền chủ câu lạc bộ?")) {
      return;
    }

    await transferClubOwnership(clubId, userId);
    await load();
  }

  async function kick(memberId: string) {
    if (!window.confirm("Bạn chắc chắn muốn đuổi thành viên này?")) {
      return;
    }

    await kickClubMember(clubId, memberId);
    await load();
  }

  async function removeClub() {
    if (
      !window.confirm(
        "Xóa câu lạc bộ sẽ xóa toàn bộ dữ liệu liên quan. Bạn chắc chắn?",
      )
    ) {
      return;
    }

    await deleteClubSafely(clubId);
    onDeleted?.();
  }

  if (loading) {
    return (
      <div className="rounded-3xl border bg-white p-10 text-center">
        <Loader2 className="mx-auto animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data.permissions.canInvite && (
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-indigo-600" />
            <h3 className="font-extrabold">Mời thành viên</h3>
            {data.permissions.canDeleteClub && (
              <section className="rounded-3xl border-2 border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-800">Xóa câu lạc bộ</h3>

                {data.members.length === 1 ? (
                  <p className="mt-2 text-sm leading-6 text-red-700">
                    Bạn là thành viên duy nhất. Bạn có thể xóa câu lạc bộ này.
                    Toàn bộ bài viết, tin nhắn, sự kiện và tài liệu sẽ bị xóa.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-red-700">
                    Câu lạc bộ hiện còn {data.members.length} thành viên. Bạn
                    phải chuyển quyền cho người khác hoặc xử lý thành viên trước
                    khi xóa.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void removeClub()}
                  disabled={data.members.length > 1}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  <Trash2 size={17} />
                  Xóa câu lạc bộ
                </button>
              </section>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={inviteSearch}
                onChange={(event) => setInviteSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void searchUsers();
                }}
                placeholder="Tìm người dùng theo tên, username hoặc email..."
                className="w-full rounded-xl border-2 py-3 pl-10 pr-4"
              />
            </div>

            <button
              type="button"
              onClick={() => void searchUsers()}
              className="rounded-xl bg-indigo-600 px-5 font-bold text-white"
            >
              Tìm
            </button>
          </div>

          {inviteResults.length > 0 && (
            <div className="mt-4 divide-y">
              {inviteResults.map((user) => (
                <div key={user.id} className="flex items-center gap-3 py-3">
                  <img
                    src={user.avatar || "/cat-home.jpg"}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">{user.fullname}</strong>
                    <span className="text-xs text-slate-500">
                      {user.username ? `@${user.username}` : ""}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void invite(user.id)}
                    disabled={busy === user.id || user.invited}
                    className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 disabled:opacity-50"
                  >
                    {user.invited ? "Đã mời" : "Mời"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {data.permissions.canApproveJoinRequests &&
        data.pendingRequests.length > 0 && (
          <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-extrabold">Yêu cầu xin gia nhập</h3>

            <div className="mt-3 divide-y">
              {data.pendingRequests.map((request: any) => (
                <div key={request.id} className="flex items-center gap-3 py-3">
                  <img
                    src={request.user.avatar || "/cat-home.jpg"}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />

                  <div className="flex-1">
                    <strong>{request.user.fullname}</strong>
                    <p className="text-sm text-slate-500">
                      {request.message || "Muốn tham gia câu lạc bộ"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void approve(request.id)}
                    className="rounded-xl bg-emerald-600 p-2 text-white"
                  >
                    <Check size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => void reject(request.id)}
                    className="rounded-xl bg-red-50 p-2 text-red-600"
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

      <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-extrabold">Quản lý thành viên</h3>

        <div className="mt-3 divide-y">
          {data.members.map((member: any) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <img
                src={member.user.avatar || "/cat-home.jpg"}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />

              <div className="min-w-0 flex-1">
                <strong className="block truncate">
                  {member.user.fullname}
                </strong>
                <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  {member.role === "OWNER" && (
                    <Crown size={13} className="text-amber-500" />
                  )}
                  {member.role === "ADMIN" && (
                    <Shield size={13} className="text-indigo-600" />
                  )}
                  {member.role}
                </div>
              </div>

              {data.permissions.canChangeRoles && member.role !== "OWNER" && (
                <select
                  value={member.role}
                  onChange={(event) =>
                    void changeRole(
                      member.id,
                      event.target.value as "ADMIN" | "MODERATOR" | "MEMBER",
                    )
                  }
                  className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="MODERATOR">Điều hành viên</option>
                  <option value="MEMBER">Thành viên</option>
                </select>
              )}

              {data.permissions.canTransferOwnership &&
                member.role !== "OWNER" && (
                  <button
                    type="button"
                    onClick={() => void transfer(member.user.id)}
                    className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700"
                  >
                    Chuyển quyền
                  </button>
                )}

              {data.permissions.canKickMembers && member.role !== "OWNER" && (
                <button
                  type="button"
                  onClick={() => void kick(member.id)}
                  className="rounded-xl bg-red-50 p-2 text-red-600"
                >
                  <UserMinus size={17} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {data.permissions.canDeleteClub && (
        <section className="rounded-3xl border-2 border-red-200 bg-red-50 p-5">
          <h3 className="font-extrabold text-red-800">Khu vực nguy hiểm</h3>

          <p className="mt-2 text-sm leading-6 text-red-700">
            Chỉ có thể xóa Club khi Club chỉ còn một mình chủ phòng. Nếu còn
            thành viên khác, hãy chuyển quyền hoặc xử lý thành viên trước.
          </p>

          <button
            type="button"
            onClick={() => void removeClub()}
            className="mt-4 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white"
          >
            <Trash2 size={17} />
            Xóa câu lạc bộ
          </button>
        </section>
      )}
    </div>
  );
}

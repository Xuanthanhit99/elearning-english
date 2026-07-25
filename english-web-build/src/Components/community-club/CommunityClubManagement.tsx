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
      setError(e instanceof Error ? e.message : "KhÃ´ng thá»ƒ táº£i quáº£n lÃ½ Club");
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
      await inviteClubMember(clubId, userId, "Má»i báº¡n tham gia cÃ¢u láº¡c bá»™");
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
    if (!window.confirm("Báº¡n cháº¯c cháº¯n muá»‘n chuyá»ƒn quyá»n chá»§ cÃ¢u láº¡c bá»™?")) {
      return;
    }

    await transferClubOwnership(clubId, userId);
    await load();
  }

  async function kick(memberId: string) {
    if (!window.confirm("Báº¡n cháº¯c cháº¯n muá»‘n Ä‘uá»•i thÃ nh viÃªn nÃ y?")) {
      return;
    }

    await kickClubMember(clubId, memberId);
    await load();
  }

  async function removeClub() {
    if (
      !window.confirm(
        "XÃ³a cÃ¢u láº¡c bá»™ sáº½ xÃ³a toÃ n bá»™ dá»¯ liá»‡u liÃªn quan. Báº¡n cháº¯c cháº¯n?",
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
            <h3 className="font-extrabold">Má»i thÃ nh viÃªn</h3>
            {data.permissions.canDeleteClub && (
              <section className="rounded-3xl border-2 border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-800">XÃ³a cÃ¢u láº¡c bá»™</h3>

                {data.members.length === 1 ? (
                  <p className="mt-2 text-sm leading-6 text-red-700">
                    Báº¡n lÃ  thÃ nh viÃªn duy nháº¥t. Báº¡n cÃ³ thá»ƒ xÃ³a cÃ¢u láº¡c bá»™ nÃ y.
                    ToÃ n bá»™ bÃ i viáº¿t, tin nháº¯n, sá»± kiá»‡n vÃ  tÃ i liá»‡u sáº½ bá»‹ xÃ³a.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-red-700">
                    CÃ¢u láº¡c bá»™ hiá»‡n cÃ²n {data.members.length} thÃ nh viÃªn. Báº¡n
                    pháº£i chuyá»ƒn quyá»n cho ngÆ°á»i khÃ¡c hoáº·c xá»­ lÃ½ thÃ nh viÃªn trÆ°á»›c
                    khi xÃ³a.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void removeClub()}
                  disabled={data.members.length > 1}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  <Trash2 size={17} />
                  XÃ³a cÃ¢u láº¡c bá»™
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
                placeholder="TÃ¬m ngÆ°á»i dÃ¹ng theo tÃªn, username hoáº·c email..."
                className="w-full rounded-xl border-2 py-3 pl-10 pr-4"
              />
            </div>

            <button
              type="button"
              onClick={() => void searchUsers()}
              className="rounded-xl bg-indigo-600 px-5 font-bold text-white"
            >
              TÃ¬m
            </button>
          </div>

          {inviteResults.length > 0 && (
            <div className="mt-4 divide-y">
              {inviteResults.map((user) => (
                <div key={user.id} className="flex items-center gap-3 py-3">
                  <img
                    src={user.avatar || "/brand/beaconvie-ai-mascot.png"}
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
                    {user.invited ? "ÄÃ£ má»i" : "Má»i"}
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
            <h3 className="font-extrabold">YÃªu cáº§u xin gia nháº­p</h3>

            <div className="mt-3 divide-y">
              {data.pendingRequests.map((request: any) => (
                <div key={request.id} className="flex items-center gap-3 py-3">
                  <img
                    src={request.user.avatar || "/brand/beaconvie-ai-mascot.png"}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />

                  <div className="flex-1">
                    <strong>{request.user.fullname}</strong>
                    <p className="text-sm text-slate-500">
                      {request.message || "Muá»‘n tham gia cÃ¢u láº¡c bá»™"}
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
        <h3 className="font-extrabold">Quáº£n lÃ½ thÃ nh viÃªn</h3>

        <div className="mt-3 divide-y">
          {data.members.map((member: any) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <img
                src={member.user.avatar || "/brand/beaconvie-ai-mascot.png"}
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
                  <option value="ADMIN">Quáº£n trá»‹ viÃªn</option>
                  <option value="MODERATOR">Äiá»u hÃ nh viÃªn</option>
                  <option value="MEMBER">ThÃ nh viÃªn</option>
                </select>
              )}

              {data.permissions.canTransferOwnership &&
                member.role !== "OWNER" && (
                  <button
                    type="button"
                    onClick={() => void transfer(member.user.id)}
                    className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700"
                  >
                    Chuyá»ƒn quyá»n
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
          <h3 className="font-extrabold text-red-800">Khu vá»±c nguy hiá»ƒm</h3>

          <p className="mt-2 text-sm leading-6 text-red-700">
            Chá»‰ cÃ³ thá»ƒ xÃ³a Club khi Club chá»‰ cÃ²n má»™t mÃ¬nh chá»§ phÃ²ng. Náº¿u cÃ²n
            thÃ nh viÃªn khÃ¡c, hÃ£y chuyá»ƒn quyá»n hoáº·c xá»­ lÃ½ thÃ nh viÃªn trÆ°á»›c.
          </p>

          <button
            type="button"
            onClick={() => void removeClub()}
            className="mt-4 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white"
          >
            <Trash2 size={17} />
            XÃ³a cÃ¢u láº¡c bá»™
          </button>
        </section>
      )}
    </div>
  );
}

"use client";

import { Loader2, ShieldCheck, UserMinus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getClubMembers,
  removeClubMember,
  updateClubMemberRole,
} from "@/src/lib/community-club-api";
import type { ClubMember, ClubRole } from "@/src/types/community-club";

export function CommunityClubMembers({
  clubId,
  myRole,
}: {
  clubId: string;
  myRole?: ClubRole | null;
}) {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  async function loadMembers() {
    try {
      setLoading(true);
      setMembers(await getClubMembers(clubId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, [clubId]);

  async function changeRole(memberId: string, role: ClubRole) {
    const updated = await updateClubMemberRole(
      clubId,
      memberId,
      role as "ADMIN" | "MODERATOR" | "MEMBER",
    );
    setMembers((current) =>
      current.map((member) => (member.id === memberId ? updated : member)),
    );
  }

  async function removeMember(memberId: string) {
    await removeClubMember(clubId, memberId);
    setMembers((current) => current.filter((member) => member.id !== memberId));
  }

  if (loading) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-10 text-center font-semibold text-slate-600">
        <Loader2 className="mx-auto mb-3 animate-spin text-indigo-600" />
        Đang tải thành viên...
      </div>
    );
  }

  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Thành viên</h2>
          <p className="text-sm font-semibold text-slate-500">
            {members.length} người đang tham gia câu lạc bộ
          </p>
        </div>
        <Users className="text-indigo-600" />
      </div>

      {members.length ? (
        <div className="divide-y divide-slate-100">
          {members.map((member) => (
            <div key={member.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-indigo-100 font-extrabold text-indigo-700">
                  {member.user.avatar ? (
                    <img src={member.user.avatar} alt={member.user.fullname} className="h-full w-full object-cover" />
                  ) : (
                    member.user.fullname.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-slate-950">{member.user.fullname}</p>
                  <p className="text-sm font-semibold text-slate-500">
                    Level {member.user.level} - {member.user.englishLevel ?? "English"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManage && member.role !== "OWNER" ? (
                  <select
                    value={member.role}
                    onChange={(event) => void changeRole(member.id, event.target.value as ClubRole)}
                    className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
                    <ShieldCheck size={14} />
                    {member.role}
                  </span>
                )}

                {canManage && member.role !== "OWNER" && (
                  <button
                    type="button"
                    onClick={() => void removeMember(member.id)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-red-100 text-red-600 hover:bg-red-50"
                    aria-label="Xóa thành viên"
                  >
                    <UserMinus size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center font-semibold text-slate-500">
          Chưa có thành viên nào.
        </div>
      )}
    </section>
  );
}

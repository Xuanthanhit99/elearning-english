'use client';

import { Crown, Shield, UserMinus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getClubMembers,
  removeClubMember,
  updateClubMemberRole,
} from '@/src/lib/community-club-api';
import type {
  ClubMember,
  ClubRole,
} from '@/src/types/community-club';

const CLUB_ROLE_LABEL = {
  OWNER: 'Chủ câu lạc bộ',
  ADMIN: 'Quản trị viên',
  MODERATOR: 'Điều hành viên',
  MEMBER: 'Thành viên',
};

export function CommunityClubMembers({
  clubId,
  myRole,
}: {
  clubId: string;
  myRole?: ClubRole | null;
}) {
  const [members, setMembers] = useState<ClubMember[]>([]);

  useEffect(() => {
    void getClubMembers(clubId).then(setMembers);
  }, [clubId]);

  const canManage =
    myRole === 'OWNER' || myRole === 'ADMIN';

  async function changeRole(
    member: ClubMember,
    role: 'ADMIN' | 'MODERATOR' | 'MEMBER',
  ) {
    const updated = await updateClubMemberRole(
      clubId,
      member.id,
      role,
    );

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id ? updated : item,
      ),
    );
  }

  async function remove(member: ClubMember) {
    await removeClubMember(clubId, member.id);
    setMembers((current) =>
      current.filter((item) => item.id !== member.id),
    );
  }

  return (
    <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-extrabold text-slate-950">
        Thành viên
      </h3>

      <div className="mt-4 divide-y divide-slate-100">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 py-3"
          >
            <img
              src={
                member.user.avatar ||
                '/cat-home.jpg'
              }
              alt={member.user.fullname}
              className="h-11 w-11 rounded-full object-cover"
            />

            <div className="min-w-0 flex-1">
              <strong className="block truncate text-slate-950">
                {member.user.fullname}
              </strong>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                {member.role === 'OWNER' && (
                  <Crown size={13} className="text-amber-500" />
                )}
                {member.role === 'ADMIN' && (
                  <Shield size={13} className="text-indigo-600" />
                )}
                {member.role}
              </div>
            </div>

            {myRole === 'OWNER' &&
              member.role !== 'OWNER' && (
                <select
                  value={member.role}
                  onChange={(event) =>
                    void changeRole(
                      member,
                      event.target.value as
                        | 'ADMIN'
                        | 'MODERATOR'
                        | 'MEMBER',
                    )
                  }
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="MEMBER">MEMBER</option>
                </select>
              )}

            {canManage && member.role !== 'OWNER' && (
              <button
                type="button"
                onClick={() => void remove(member)}
                className="rounded-xl bg-red-50 p-2 text-red-600"
              >
                <UserMinus size={17} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

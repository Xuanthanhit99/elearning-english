'use client';

import { UserCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import {
  followCommunityUser,
  unfollowCommunityUser,
} from '@/src/lib/community-club-api';

export function CommunityFollowButton({
  userId,
  initialFollowing = false,
}: {
  userId: string;
  initialFollowing?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    try {
      setLoading(true);

      const result = following
        ? await unfollowCommunityUser(userId)
        : await followCommunityUser(userId);

      setFollowing(result.following);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition disabled:opacity-50 ${
        following
          ? 'border border-[var(--lumiverse-primary)]/25 bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]'
          : 'bg-[var(--lumiverse-primary)] text-white hover:brightness-110'
      }`}
    >
      {following ? <UserCheck size={17} /> : <UserPlus size={17} />}
      {following ? 'Đang theo dõi' : 'Theo dõi'}
    </button>
  );
}

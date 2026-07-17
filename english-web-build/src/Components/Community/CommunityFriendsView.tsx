'use client';

import {
  Check,
  MessageCircle,
  Search,
  UserPlus,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  acceptCommunityFriendRequest,
  getCommunityFriendRequests,
  getCommunityFriends,
  openCommunityDirectConversation,
  rejectCommunityFriendRequest,
  searchCommunityUsers,
  sendCommunityFriendRequest,
} from '@/src/lib/community-social-api';
import type {
  CommunityFriendRequestItem,
  CommunityUserCard,
  CommunityUserSearchItem,
} from '@/src/types/community-social';

export function CommunityFriendsView({
  onOpenConversation,
}: {
  onOpenConversation?: (conversationId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommunityUserSearchItem[]>([]);
  const [friends, setFriends] = useState<CommunityUserCard[]>([]);
  const [requests, setRequests] = useState<CommunityFriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBase() {
    try {
      setLoading(true);
      const [friendData, requestData] = await Promise.all([
        getCommunityFriends(),
        getCommunityFriendRequests(),
      ]);
      setFriends(friendData);
      setRequests(requestData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBase();
  }, []);

  async function search() {
    const value = query.trim();
    if (!value) {
      setResults([]);
      return;
    }
    setResults(await searchCommunityUsers(value));
  }

  async function sendRequest(userId: string) {
    await sendCommunityFriendRequest(userId);
    setResults((current) =>
      current.map((user) =>
        user.id === userId
          ? { ...user, relationship: 'REQUEST_SENT' }
          : user,
      ),
    );
  }

  async function accept(requestId: string) {
    await acceptCommunityFriendRequest(requestId);
    await loadBase();
  }

  async function reject(requestId: string) {
    await rejectCommunityFriendRequest(requestId);
    setRequests((current) =>
      current.filter((item) => item.id !== requestId),
    );
  }

  async function message(userId: string) {
    const conversation =
      await openCommunityDirectConversation(userId);
    onOpenConversation?.(conversation.id);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Tìm bạn học</h2>
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void search();
              }}
              placeholder="Tìm theo tên, username hoặc email..."
              className="w-full rounded-xl border py-3 pl-10 pr-4 outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={search}
            className="rounded-xl bg-indigo-600 px-5 font-semibold text-white"
          >
            Tìm
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-4 divide-y">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 py-3"
              >
                <img
                  src={user.avatar || '/cat-home.jpg'}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">
                    {user.fullname}
                  </strong>
                  <span className="text-sm text-slate-500">
                    {user.username ? `@${user.username} · ` : ''}
                    Level {user.level}
                  </span>
                </div>

                {user.relationship === 'NONE' && (
                  <button
                    type="button"
                    onClick={() => void sendRequest(user.id)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600"
                  >
                    <UserPlus size={17} />
                    Kết bạn
                  </button>
                )}

                {user.relationship === 'REQUEST_SENT' && (
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
                    Đã gửi lời mời
                  </span>
                )}

                {user.relationship === 'FRIEND' && (
                  <button
                    type="button"
                    onClick={() => void message(user.id)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    <MessageCircle size={17} />
                    Nhắn tin
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {requests.length > 0 && (
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h3 className="font-bold">Lời mời kết bạn</h3>
          <div className="mt-3 divide-y">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 py-3"
              >
                <img
                  src={
                    request.requester.avatar ||
                    '/cat-home.jpg'
                  }
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <strong>{request.requester.fullname}</strong>
                  <p className="text-sm text-slate-500">
                    Muốn kết bạn với bạn
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void accept(request.id)}
                  className="rounded-xl bg-indigo-600 p-2 text-white"
                >
                  <Check size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => void reject(request.id)}
                  className="rounded-xl bg-slate-100 p-2 text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <UserRoundCheck size={20} className="text-indigo-600" />
          <h3 className="font-bold">Bạn bè của tôi</h3>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">
            Đang tải...
          </p>
        ) : friends.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Bạn chưa có bạn bè trong cộng đồng.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 rounded-2xl border p-3"
              >
                <img
                  src={friend.avatar || '/cat-home.jpg'}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">
                    {friend.fullname}
                  </strong>
                  <span className="text-xs text-slate-500">
                    Level {friend.level}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void message(friend.id)}
                  className="rounded-xl bg-indigo-50 p-2 text-indigo-600"
                >
                  <MessageCircle size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

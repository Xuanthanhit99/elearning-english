'use client';

import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Newspaper,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCommunityClub,
  joinCommunityClub,
} from '@/src/lib/community-club-api';
import type { CommunityClubDetail } from '@/src/types/community-club';
import { CommunityClubChat } from './CommunityClubChat';
import { CommunityClubMembers } from './CommunityClubMembers';
import { CommunityClubOverview } from './CommunityClubOverview';
import { CommunityClubPosts } from './CommunityClubPosts';
import { CommunityClubChallenges } from './CommunityClubChallenges';
import { CommunityClubEvents } from './CommunityClubEvents';
import { CommunityClubResources } from './CommunityClubResources';
import { CommunityClubManagement } from '../community-club/CommunityClubManagement';
import { leaveClubSafely } from '../community-club-permission-api';

type ClubTab =
  | 'OVERVIEW'
  | 'POSTS'
  | 'CHAT'
  | 'MEMBERS'
  | 'CHALLENGES'
  | 'EVENTS'
  | 'RESOURCES'
  | 'MANAGEMENT';

const baseTabs: Array<{
  key: ClubTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: 'OVERVIEW', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'POSTS', label: 'Bài viết', icon: Newspaper },
  { key: 'CHAT', label: 'Chat nhóm', icon: MessageCircle },
  { key: 'MEMBERS', label: 'Thành viên', icon: Users },
  { key: 'CHALLENGES', label: 'Thử thách', icon: Trophy },
  { key: 'EVENTS', label: 'Sự kiện', icon: CalendarDays },
  { key: 'RESOURCES', label: 'Tài liệu', icon: FileText },
  { key: 'MANAGEMENT', label: 'xóa nhóm', icon: FileText },
];

const API_ORIGIN = (() => {
  const configured =
    process.env.NEXT_PUBLIC_API_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001';

  try {
    return new URL(configured).origin;
  } catch {
    return configured.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  }
})();

function resolveMediaUrl(value?: string | null): string {
  const mediaUrl = value?.trim();

  if (!mediaUrl) return '';

  if (
    mediaUrl.startsWith('http://') ||
    mediaUrl.startsWith('https://') ||
    mediaUrl.startsWith('blob:') ||
    mediaUrl.startsWith('data:')
  ) {
    return mediaUrl;
  }

  return `${API_ORIGIN}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
}

export function CommunityClubDetailPage({
  clubId,
}: {
  clubId: string;
}) {
  const router = useRouter();
  const [club, setClub] = useState<CommunityClubDetail | null>(null);
  const [tab, setTab] = useState<ClubTab>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState('');

  const canManageClub =
    club?.myRole === 'OWNER' || club?.myRole === 'ADMIN';

  const tabs = useMemo(() => {
    console.log("canManageClub", canManageClub);
    if (!canManageClub) return baseTabs;
console.log("canManageClub", canManageClub);
    return [
      ...baseTabs,
      {
        key: 'MANAGEMENT' as ClubTab,
        label: 'Quản lý',
        icon: Settings,
      },
    ];
  }, [canManageClub]);

  async function loadClub() {
    try {
      setLoading(true);
      setError('');
      setClub(await getCommunityClub(clubId));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Không thể tải câu lạc bộ',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClub();
  }, [clubId]);

  async function toggleJoin() {
    if (!club || joinLoading) return;

    try {
      setJoinLoading(true);
      setError('');

      if (club.joined) {
        await leaveClubSafely(club.id);

        setClub((current) =>
          current
            ? {
                ...current,
                joined: false,
                myRole: null,
                memberCount: Math.max(current.memberCount - 1, 0),
              }
            : current,
        );

        setTab('OVERVIEW');
        return;
      }

      const result = await joinCommunityClub(club.id);

      if (result.status === 'ACTIVE') {
        setClub((current) =>
          current
            ? {
                ...current,
                joined: true,
                myRole: 'MEMBER',
                memberCount: current.memberCount + 1,
              }
            : current,
        );
      } else {
        setError(
          'Yêu cầu tham gia đã được gửi và đang chờ quản trị viên duyệt.',
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không thể cập nhật trạng thái tham gia',
      );
    } finally {
      setJoinLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-12 text-center font-semibold text-slate-600 shadow-sm">
        Đang tải câu lạc bộ...
      </div>
    );
  }

  if (!club) {
    return (
      <div className="rounded-3xl border-2 border-red-200 bg-red-50 p-12 text-center">
        <h2 className="font-extrabold text-red-700">
          Không thể mở câu lạc bộ
        </h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const activeClub = club;

  function renderTab() {
    switch (tab) {
      case 'OVERVIEW':
        return (
          <CommunityClubOverview
            club={activeClub}
            onChangeTab={setTab}
          />
        );

      case 'POSTS':
        return (
          <CommunityClubPosts
            clubId={activeClub.id}
            canPost={activeClub.joined}
          />
        );

      case 'CHAT':
        return activeClub.joined ? (
          <CommunityClubChat clubId={activeClub.id} />
        ) : (
          <JoinRequiredPanel
            title="Chat nhóm chỉ dành cho thành viên"
            description="Tham gia câu lạc bộ để trò chuyện realtime với các thành viên khác."
            onJoin={toggleJoin}
          />
        );

      case 'MEMBERS':
        return (
          <CommunityClubMembers
            clubId={activeClub.id}
            myRole={activeClub.myRole}
          />
        );

      case 'CHALLENGES':
        return (
          <CommunityClubChallenges
            clubId={activeClub.id}
            canManage={['OWNER', 'ADMIN', 'MODERATOR'].includes(
              activeClub.myRole ?? '',
            )}
            joined={activeClub.joined}
          />
        );

      case 'EVENTS':
        return (
          <CommunityClubEvents
            clubId={activeClub.id}
            canManage={['OWNER', 'ADMIN', 'MODERATOR'].includes(
              activeClub.myRole ?? '',
            )}
            joined={activeClub.joined}
          />
        );

      case 'RESOURCES':
        return (
          <CommunityClubResources
            clubId={activeClub.id}
            canUpload={activeClub.joined}
          />
        );

      case 'MANAGEMENT':
        return canManageClub ? (
          <CommunityClubManagement
            clubId={activeClub.id}
            onDeleted={() => router.push('/community')}
          />
        ) : (
          <div className="rounded-3xl border-2 border-red-200 bg-red-50 px-6 py-12 text-center">
            <h3 className="font-extrabold text-red-700">
              Bạn không có quyền quản lý câu lạc bộ
            </h3>
          </div>
        );
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-md">
        <div className="relative h-52 bg-gradient-to-br from-indigo-600 to-violet-700">
          {club.coverUrl && (
            <img
              src={resolveMediaUrl(club.coverUrl)}
              alt={`Ảnh bìa ${club.name}`}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              className="h-full w-full object-cover"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
        </div>

        <div className="relative p-6">
          <div className="-mt-16 flex flex-wrap items-end gap-4">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-indigo-100 text-indigo-700 shadow-lg">
              {club.iconUrl ? (
                <img
                  src={resolveMediaUrl(club.iconUrl)}
                  alt={`Biểu tượng ${club.name}`}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Users size={40} />
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <h1 className="text-2xl font-extrabold text-slate-950">
                {club.name}
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
                <span>{club.memberCount} thành viên</span>
                <span>{club.postCount} bài viết</span>
                <span>
                  {club.privacy === 'PUBLIC'
                    ? 'Câu lạc bộ công khai'
                    : 'Câu lạc bộ riêng tư'}
                </span>

                {club.myRole && (
                  <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">
                    <ShieldCheck size={13} />
                    {club.myRole}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (club.myRole === 'OWNER') {
                  setTab('MANAGEMENT');
                  return;
                }

                void toggleJoin();
              }}
              disabled={joinLoading}
              className={`rounded-xl px-5 py-3 font-extrabold transition disabled:opacity-50 ${
                club.joined
                  ? 'border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {joinLoading
                ? 'Đang xử lý...'
                : club.myRole === 'OWNER'
                  ? 'Quản lý câu lạc bộ'
                  : club.joined
                    ? 'Rời câu lạc bộ'
                    : club.privacy === 'PRIVATE'
                      ? 'Xin gia nhập'
                      : 'Tham gia câu lạc bộ'}
            </button>
          </div>

          <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-700">
            {club.description || 'Câu lạc bộ chưa có mô tả.'}
          </p>

          {club.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {club.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {error}
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                tab === item.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {renderTab()}
    </div>
  );
}

function JoinRequiredPanel({
  title,
  description,
  onJoin,
}: {
  title: string;
  description: string;
  onJoin: () => Promise<void>;
}) {
  return (
    <div className="rounded-3xl border-2 border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <Users size={34} className="mx-auto text-indigo-600" />
      <h3 className="mt-4 text-lg font-extrabold text-slate-950">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        {description}
      </p>
      <button
        type="button"
        onClick={() => void onJoin()}
        className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"
      >
        Tham gia câu lạc bộ
      </button>
    </div>
  );
}
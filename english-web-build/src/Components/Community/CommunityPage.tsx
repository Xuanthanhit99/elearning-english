'use client';

import {
  Bookmark,
  Compass,
  Flame,
  Home,
  Medal,
  MessageSquareText,
  Plus,
  Search,
  Sparkles,
  Trophy,
  UserRound,
  UserRoundSearch,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCommunityFeed } from '@/src/lib/community-api';
import { communitySocket } from '@/src/lib/community-socket';
import type { CommunityPost } from '@/src/types/community';
import { CommunityPostCard } from './CommunityPostCard';
import { CreatePostModal } from './CreatePostModal';
import { CommunityChallengesView } from './CommunityChallengesView';
import { CommunityClubsView } from './CommunityClubsView';
import { CommunityFriendsView } from './CommunityFriendsView';
import { CommunityLeaderboardView } from './CommunityLeaderboardView';
import { CommunityMessagesView } from './CommunityMessagesView';
import SocialLeaderboardPanel from '../leaderboard/SocialLeaderboardPanel';

type CommunityView =
  | 'HOME'
  | 'EXPLORE'
  | 'MY_POSTS'
  | 'FOLLOWING'
  | 'FRIENDS'
  | 'CLUBS'
  | 'CHALLENGES'
  | 'LEADERBOARD'
  | 'MESSAGES';

const sidebarItems: Array<{
  key: CommunityView;
  label: string;
  icon: typeof Home;
}> = [
  { key: 'HOME', label: 'Trang chủ', icon: Home },
  { key: 'EXPLORE', label: 'Khám phá', icon: Compass },
  { key: 'MY_POSTS', label: 'Bài viết của tôi', icon: UserRound },
  { key: 'FOLLOWING', label: 'Đang theo dõi', icon: UsersRound },
  { key: 'FRIENDS', label: 'Bạn bè', icon: UserRoundSearch },
  { key: 'CLUBS', label: 'Câu lạc bộ', icon: Sparkles },
  { key: 'CHALLENGES', label: 'Thử thách', icon: Trophy },
  { key: 'LEADERBOARD', label: 'Bảng xếp hạng', icon: Medal },
  { key: 'MESSAGES', label: 'Tin nhắn', icon: MessageSquareText },
];

const feedTabs = [
  { key: 'FOR_YOU', label: 'Dành cho bạn' },
  { key: 'FOLLOWING', label: 'Đang theo dõi' },
  { key: 'LATEST', label: 'Mới nhất' },
  { key: 'POPULAR', label: 'Phổ biến' },
];

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] px-6 py-14 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
        <Sparkles size={26} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--lumiverse-muted)]">
        {description}
      </p>
    </div>
  );
}

export function CommunityPage() {
  const [view, setView] = useState<CommunityView>('HOME');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [tab, setTab] = useState('FOR_YOU');
  const [cursor, setCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  const [openedConversationId, setOpenedConversationId] = useState<
    string | null
  >(null);

  const activeFeedTab = useMemo(() => {
    if (view === 'FOLLOWING') return 'FOLLOWING';
    return tab;
  }, [tab, view]);

  const loadFeed = useCallback(
    async (reset: boolean) => {
      reset ? setLoading(true) : setLoadingMore(true);

      try {
        setError('');

        const result = await getCommunityFeed({
          tab: activeFeedTab,
          cursor: reset ? undefined : cursor ?? undefined,
          limit: 10,
          search: search || undefined,
        });

        setPosts((current) => {
          if (reset) return result.items;

          const ids = new Set(current.map((post) => post.id));
          return [
            ...current,
            ...result.items.filter((post) => !ids.has(post.id)),
          ];
        });

        setCursor(result.nextCursor);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Không thể tải bảng tin cộng đồng',
        );

        if (reset) {
          setPosts([]);
          setCursor(null);
        }
      } finally {
        reset ? setLoading(false) : setLoadingMore(false);
      }
    },
    [activeFeedTab, cursor, search],
  );

  useEffect(() => {
    if (!['HOME', 'EXPLORE', 'FOLLOWING', 'MY_POSTS'].includes(view)) {
      return;
    }

    setCursor(null);
    void loadFeed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeFeedTab, search]);

  useEffect(() => {
    communitySocket.connect();

    const onCreated = (post: CommunityPost) => {
      setPosts((current) =>
        current.some((item) => item.id === post.id)
          ? current
          : [post, ...current],
      );
    };

    const onUpdated = (post: CommunityPost) => {
      setPosts((current) =>
        current.map((item) => (item.id === post.id ? post : item)),
      );
    };

    const onDeleted = ({ postId }: { postId: string }) => {
      setPosts((current) =>
        current.filter((item) => item.id !== postId),
      );
    };

    communitySocket.on('community:post-created', onCreated);
    communitySocket.on('community:post-updated', onUpdated);
    communitySocket.on('community:post-deleted', onDeleted);

    return () => {
      communitySocket.off('community:post-created', onCreated);
      communitySocket.off('community:post-updated', onUpdated);
      communitySocket.off('community:post-deleted', onDeleted);
      communitySocket.disconnect();
    };
  }, []);

  function submitSearch() {
    setSearch(searchInput.trim());
    setView('EXPLORE');
  }

  function renderMainContent() {
    if (view === 'FRIENDS') {
      return (
        <CommunityFriendsView
          onOpenConversation={(conversationId) => {
            setOpenedConversationId(conversationId);
            setView('MESSAGES');
          }}
        />
      );
    }

    if (view === 'CLUBS') {
      return <CommunityClubsView />;
    }

    if (view === 'CHALLENGES') {
      return <CommunityChallengesView />;
    }

   {view === 'LEADERBOARD' && (
  <SocialLeaderboardPanel />
)}

    if (view === 'MESSAGES') {
      return (
        <CommunityMessagesView
          initialConversationId={openedConversationId}
        />
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="flex w-full items-center gap-3 rounded-3xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-4 text-left shadow-sm transition hover:border-[var(--lumiverse-primary)]/40 hover:shadow-md"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--lumiverse-primary)] text-white">
            <Plus size={23} />
          </span>

          <span className="min-w-0">
            <strong className="block text-slate-900">
              Bạn muốn chia sẻ điều gì?
            </strong>
            <small className="block text-[var(--lumiverse-muted)]">
              Chia sẻ kiến thức, đặt câu hỏi, bài nói hoặc bài viết.
            </small>
          </span>
        </button>

        {view === 'EXPLORE' && (
          <div className="flex gap-2 rounded-2xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-3 shadow-sm">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitSearch();
                }}
                placeholder="Tìm bài viết, hashtag hoặc nội dung..."
                className="w-full rounded-xl border border-[var(--lumiverse-border)] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--lumiverse-primary)]"
              />
            </div>
            <button
              type="button"
              onClick={submitSearch}
              className="rounded-xl bg-[var(--lumiverse-primary)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Tìm
            </button>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-2 shadow-sm">
          {feedTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                if (item.key === 'FOLLOWING') {
                  setView('FOLLOWING');
                } else if (view === 'FOLLOWING') {
                  setView('HOME');
                }
              }}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeFeedTab === item.key
                  ? 'bg-[var(--lumiverse-primary)] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-[var(--lumiverse-danger)]/25 bg-[var(--lumiverse-danger-soft)] p-4">
            <p className="text-sm text-[var(--lumiverse-danger)]">{error}</p>
            <button
              type="button"
              onClick={() => void loadFeed(true)}
              className="mt-3 rounded-xl bg-[var(--lumiverse-card)] px-4 py-2 text-sm font-semibold text-[var(--lumiverse-danger)] shadow-sm"
            >
              Thử lại
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] py-12 text-center text-[var(--lumiverse-muted)]">
            Đang tải bảng tin...
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] px-5 py-12 text-center">
            <h3 className="font-bold text-slate-900">
              Chưa có bài viết nào
            </h3>
            <p className="mt-2 text-sm text-[var(--lumiverse-muted)]">
              Hãy trở thành người đầu tiên chia sẻ với cộng đồng.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <CommunityPostCard key={post.id} initialPost={post} />
          ))
        )}

        {!loading && cursor && (
          <button
            type="button"
            onClick={() => void loadFeed(false)}
            disabled={loadingMore}
            className="w-full rounded-2xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] py-3 font-semibold text-[var(--lumiverse-primary)] transition hover:bg-[var(--lumiverse-hover-tint)] disabled:opacity-50"
          >
            {loadingMore ? 'Đang tải...' : 'Xem thêm'}
          </button>
        )}
      </>
    );
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
      <aside className="hidden lg:block">
        <div className="sticky top-6 rounded-3xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-4 shadow-sm">
          <h2 className="mb-4 px-3 text-lg font-bold text-slate-900">
            Cộng đồng
          </h2>

          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setView(item.key);

                    if (item.key === 'FOLLOWING') {
                      setTab('FOLLOWING');
                    }

                    if (item.key === 'HOME') {
                      setTab('FOR_YOU');
                      setSearch('');
                      setSearchInput('');
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? 'bg-[var(--lumiverse-primary)] text-white shadow-sm'
                      : 'text-[var(--lumiverse-muted)] hover:bg-[var(--lumiverse-hover-tint)] hover:text-[var(--lumiverse-primary)]'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <section className="min-w-0 space-y-4">{renderMainContent()}</section>

      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <div className="rounded-3xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-orange-500" />
              <h3 className="font-bold text-slate-900">Chủ đề nổi bật</h3>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[var(--lumiverse-primary)]">
              {[
                '#DailyConversation',
                '#IELTSPreparation',
                '#EnglishIdioms',
                '#BookLovers',
                '#StudyAbroad',
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    const value = item.replace('#', '');
                    setSearchInput(value);
                    setSearch(value);
                    setView('EXPLORE');
                  }}
                  className="block text-left hover:underline"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">
              Nguyên tắc cộng đồng
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Tôn trọng, không spam, không công kích cá nhân và ưu tiên
              nội dung hữu ích cho việc học tiếng Anh.
            </p>
          </div>
        </div>
      </aside>

      <CreatePostModal
        open={modal}
        onClose={() => setModal(false)}
        onCreated={(post) =>
          setPosts((current) =>
            current.some((item) => item.id === post.id)
              ? current
              : [post, ...current],
          )
        }
      />
    </main>
  );
}
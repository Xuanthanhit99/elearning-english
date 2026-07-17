'use client';

import {
  ArrowRight,
  CalendarDays,
  FileText,
  MessageCircle,
  Newspaper,
  Trophy,
  Users,
} from 'lucide-react';
import type { CommunityClubDetail } from '@/src/types/community-club';

type ClubTab =
  | 'OVERVIEW'
  | 'POSTS'
  | 'CHAT'
  | 'MEMBERS'
  | 'CHALLENGES'
  | 'EVENTS'
  | 'RESOURCES'
  | 'MANAGEMENT';

export function CommunityClubOverview({
  club,
  onChangeTab,
}: {
  club: CommunityClubDetail;
  onChangeTab: (tab: ClubTab) => void;
}) {
  const cards = [
    {
      label: 'Bài viết',
      value: club._count.posts,
      icon: Newspaper,
      tab: 'POSTS' as ClubTab,
      description: 'Chia sẻ kiến thức và thảo luận',
    },
    {
      label: 'Thành viên',
      value: club._count.members,
      icon: Users,
      tab: 'MEMBERS' as ClubTab,
      description: 'Những người đang tham gia',
    },
    {
      label: 'Tin nhắn nhóm',
      value: club._count.messages,
      icon: MessageCircle,
      tab: 'CHAT' as ClubTab,
      description: 'Trò chuyện realtime trong Club',
    },
    {
      label: 'Sự kiện',
      value: club._count.events,
      icon: CalendarDays,
      tab: 'EVENTS' as ClubTab,
      description: 'Hoạt động và phòng học sắp tới',
    },
    {
      label: 'Tài liệu',
      value: club._count.resources,
      icon: FileText,
      tab: 'RESOURCES' as ClubTab,
      description: 'PDF, audio, video và đường dẫn',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onChangeTab(card.tab)}
              className="group rounded-3xl border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <Icon size={21} />
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600"
                />
              </div>

              <strong className="mt-4 block text-2xl font-extrabold text-slate-950">
                {card.value}
              </strong>
              <span className="mt-1 block font-bold text-slate-800">
                {card.label}
              </span>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-950">
            Giới thiệu câu lạc bộ
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {club.description || 'Câu lạc bộ chưa có phần giới thiệu.'}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <span className="text-xs font-bold uppercase text-slate-500">
                Chủ câu lạc bộ
              </span>
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={club.owner.avatar || '/cat-home.jpg'}
                  alt={club.owner.fullname}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <strong className="block text-sm text-slate-950">
                    {club.owner.fullname}
                  </strong>
                  <span className="text-xs text-slate-500">
                    Level {club.owner.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <span className="text-xs font-bold uppercase text-slate-500">
                Loại câu lạc bộ
              </span>
              <strong className="mt-3 block text-sm text-slate-950">
                {club.privacy === 'PUBLIC'
                  ? 'Công khai'
                  : 'Riêng tư'}
              </strong>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {club.privacy === 'PUBLIC'
                  ? 'Mọi người có thể xem và tham gia ngay.'
                  : 'Người dùng cần được quản trị viên phê duyệt.'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            <h3 className="font-extrabold text-slate-950">
              Hoạt động gợi ý
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {[
              'Đăng một nội dung hữu ích cho thành viên.',
              'Tham gia chat nhóm và làm quen với mọi người.',
              'Tham gia thử thách đang diễn ra.',
              'Đăng ký sự kiện hoặc phòng học gần nhất.',
              'Chia sẻ một tài liệu học tập.',
            ].map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-700">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

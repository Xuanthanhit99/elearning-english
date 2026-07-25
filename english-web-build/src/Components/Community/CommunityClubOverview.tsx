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
      label: 'BÃ i viáº¿t',
      value: club._count.posts,
      icon: Newspaper,
      tab: 'POSTS' as ClubTab,
      description: 'Chia sáº» kiáº¿n thá»©c vÃ  tháº£o luáº­n',
    },
    {
      label: 'ThÃ nh viÃªn',
      value: club._count.members,
      icon: Users,
      tab: 'MEMBERS' as ClubTab,
      description: 'Nhá»¯ng ngÆ°á»i Ä‘ang tham gia',
    },
    {
      label: 'Tin nháº¯n nhÃ³m',
      value: club._count.messages,
      icon: MessageCircle,
      tab: 'CHAT' as ClubTab,
      description: 'TrÃ² chuyá»‡n realtime trong Club',
    },
    {
      label: 'Sá»± kiá»‡n',
      value: club._count.events,
      icon: CalendarDays,
      tab: 'EVENTS' as ClubTab,
      description: 'Hoáº¡t Ä‘á»™ng vÃ  phÃ²ng há»c sáº¯p tá»›i',
    },
    {
      label: 'TÃ i liá»‡u',
      value: club._count.resources,
      icon: FileText,
      tab: 'RESOURCES' as ClubTab,
      description: 'PDF, audio, video vÃ  Ä‘Æ°á»ng dáº«n',
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
            Giá»›i thiá»‡u cÃ¢u láº¡c bá»™
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {club.description || 'CÃ¢u láº¡c bá»™ chÆ°a cÃ³ pháº§n giá»›i thiá»‡u.'}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <span className="text-xs font-bold uppercase text-slate-500">
                Chá»§ cÃ¢u láº¡c bá»™
              </span>
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={club.owner.avatar || '/brand/beaconvie-ai-mascot.png'}
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
                Loáº¡i cÃ¢u láº¡c bá»™
              </span>
              <strong className="mt-3 block text-sm text-slate-950">
                {club.privacy === 'PUBLIC'
                  ? 'CÃ´ng khai'
                  : 'RiÃªng tÆ°'}
              </strong>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {club.privacy === 'PUBLIC'
                  ? 'Má»i ngÆ°á»i cÃ³ thá»ƒ xem vÃ  tham gia ngay.'
                  : 'NgÆ°á»i dÃ¹ng cáº§n Ä‘Æ°á»£c quáº£n trá»‹ viÃªn phÃª duyá»‡t.'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            <h3 className="font-extrabold text-slate-950">
              Hoáº¡t Ä‘á»™ng gá»£i Ã½
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {[
              'ÄÄƒng má»™t ná»™i dung há»¯u Ã­ch cho thÃ nh viÃªn.',
              'Tham gia chat nhÃ³m vÃ  lÃ m quen vá»›i má»i ngÆ°á»i.',
              'Tham gia thá»­ thÃ¡ch Ä‘ang diá»…n ra.',
              'ÄÄƒng kÃ½ sá»± kiá»‡n hoáº·c phÃ²ng há»c gáº§n nháº¥t.',
              'Chia sáº» má»™t tÃ i liá»‡u há»c táº­p.',
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

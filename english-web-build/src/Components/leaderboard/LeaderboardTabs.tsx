'use client';

import type { LeaderboardScope } from '@/src/types/leaderboard';

const tabs: Array<{
  value: LeaderboardScope;
  label: string;
  icon: string;
}> = [
  {
    value: 'GLOBAL',
    label: 'Toàn cầu',
    icon: '🌍',
  },
  {
    value: 'FRIENDS',
    label: 'Bạn bè',
    icon: '👥',
  },
  {
    value: 'CLUB',
    label: 'Câu lạc bộ',
    icon: '🏫',
  },
];

export function LeaderboardTabs({
  value,
  onChange,
}: {
  value: LeaderboardScope;
  onChange: (value: LeaderboardScope) => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow-sm">
      {tabs.map((tab) => {
        const active = tab.value === value;

        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={[
              'rounded-xl px-3 py-3 text-sm font-black transition',
              active
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-500 hover:bg-slate-100',
            ].join(' ')}
          >
            <span className="mr-1 hidden sm:inline">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

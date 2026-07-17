'use client';

import type { ClubSummary } from '@/src/types/leaderboard';

export function ClubPicker({
  clubs,
  value,
  onChange,
}: {
  clubs: ClubSummary[];
  value?: string;
  onChange: (clubId: string) => void;
}) {
  if (!clubs.length) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed bg-white p-6 text-center">
        <p className="font-black">
          Bạn chưa tham gia câu lạc bộ nào
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Tham gia Club để thi đua cùng các thành viên.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-3">
        {clubs.map((club) => {
          const selected = club.id === value;

          return (
            <button
              key={club.id}
              onClick={() => onChange(club.id)}
              className={[
                'flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition',
                selected
                  ? 'border-violet-500 ring-2 ring-violet-100'
                  : 'border-slate-200',
              ].join(' ')}
            >
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-violet-100 text-xl">
                {club.iconUrl ? (
                  <img
                    src={club.iconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  '🏫'
                )}
              </div>

              <div>
                <p className="max-w-40 truncate font-black">
                  {club.name}
                </p>
                <p className="text-xs text-slate-500">
                  {club.memberCount} thành viên
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

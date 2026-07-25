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
          Báº¡n chÆ°a tham gia cÃ¢u láº¡c bá»™ nÃ o
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Tham gia Club Ä‘á»ƒ thi Ä‘ua cÃ¹ng cÃ¡c thÃ nh viÃªn.
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
                  'ðŸ«'
                )}
              </div>

              <div>
                <p className="max-w-40 truncate font-black">
                  {club.name}
                </p>
                <p className="text-xs text-slate-500">
                  {club.memberCount} thÃ nh viÃªn
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

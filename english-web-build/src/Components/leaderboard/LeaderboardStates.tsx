export function LeaderboardLoading() {
  return (
    <div className="mt-6 space-y-3">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-2xl bg-white"
        />
      ))}
    </div>
  );
}

export function LeaderboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
      <p className="text-lg font-black text-rose-700">
        Không thể tải bảng xếp hạng
      </p>
      <p className="mt-2 text-sm text-rose-600">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="mt-5 rounded-xl bg-rose-600 px-4 py-2 font-black text-white"
      >
        Thử lại
      </button>
    </div>
  );
}

export function LeaderboardEmpty({
  scope,
}: {
  scope: 'GLOBAL' | 'FRIENDS' | 'CLUB';
}) {
  const message =
    scope === 'FRIENDS'
      ? 'Hãy kết bạn để bắt đầu thi đua cùng nhau.'
      : scope === 'CLUB'
        ? 'Club chưa có hoạt động XP trong tuần này.'
        : 'Chưa có dữ liệu bảng xếp hạng.';

  return (
    <div className="mt-6 rounded-3xl border border-dashed bg-white p-10 text-center">
      <div className="text-5xl">🏁</div>
      <p className="mt-4 text-lg font-black">
        Chưa có thứ hạng
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}

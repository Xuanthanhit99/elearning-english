export function AuthErrorModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl dark:bg-red-500/10">
          âš ï¸
        </div>

        <h2 className="mt-5 text-2xl font-extrabold text-[var(--BeaconVie-ink)]">
          Đăng nhập không thành công
        </h2>

        <p className="mt-3 leading-7 text-[var(--BeaconVie-muted)]">
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[var(--BeaconVie-primary)] to-[var(--BeaconVie-violet)] py-4 font-extrabold text-white shadow-lg shadow-blue-200/40 transition hover:opacity-95 dark:shadow-black/20"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}

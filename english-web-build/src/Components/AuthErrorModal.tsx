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
      <div className="w-full max-w-md rounded-[28px] bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
          ⚠️
        </div>

        <h2 className="mt-5 text-2xl font-extrabold text-[#1f2a44]">
          Đăng nhập không thành công
        </h2>

        <p className="mt-3 leading-7 text-[#5b6b85]">
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-[#ff6b00] py-4 font-extrabold text-white"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
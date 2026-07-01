"use client";

import Link from "next/link";

type PetSelectionPromptProps = {
  open: boolean;
  fullname?: string;
  daysLeft?: number;
  onClose: () => void;
};

export default function PetSelectionPrompt({
  open,
  fullname = "bạn",
  daysLeft = 7,
  onClose,
}: PetSelectionPromptProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[34px] bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-xl font-black text-[#1f2a44] shadow-sm hover:bg-white"
          aria-label="Đóng thông báo chọn thú cưng"
        >
          ×
        </button>

        <div className="bg-gradient-to-br from-[#fff0dc] via-white to-[#eef6ff] p-7 sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[30px] bg-white text-6xl shadow-xl ring-4 ring-[#ff6b00]/20">
              🐾
            </div>

            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#ff6b00]">
                Chọn bạn đồng hành đầu tiên
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-[#1f2a44]">
                Chào {fullname}, bạn chưa chọn thú cưng học tập
              </h2>
              <p className="mt-3 font-bold leading-7 text-[#5b6b85]">
                Bạn chỉ được chọn một loại thú cưng. Nếu sau {daysLeft} ngày bạn chưa chọn, PoppyLingo sẽ chọn ngẫu nhiên và khóa thú cưng đó cho tài khoản của bạn.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 rounded-[24px] border border-[#ead8c2] bg-white/75 p-4 sm:grid-cols-3">
            <MiniStep icon="🐱" title="Chọn thú" text="Mèo, chó, gấu trúc..." />
            <MiniStep icon="✏️" title="Đặt tên" text="Tạo kết nối riêng" />
            <MiniStep icon="🔥" title="Học & chăm" text="Nhận XP, coin, food" />
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/pet"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl bg-[#ff6b00] px-7 py-4 font-extrabold text-white shadow-lg shadow-orange-200 transition hover:scale-[1.02]"
            >
              Chọn thú cưng ngay
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-[#fff0dc] px-7 py-4 font-extrabold text-[#92400e]"
            >
              Để sau
            </button>

            <span className="text-sm font-bold text-[#5b6b85] sm:ml-auto">
              Còn {daysLeft} ngày để tự chọn
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStep({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-[#fffaf5] p-4">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-2 font-black text-[#1f2a44]">{title}</h3>
      <p className="mt-1 text-sm font-bold text-[#5b6b85]">{text}</p>
    </div>
  );
}

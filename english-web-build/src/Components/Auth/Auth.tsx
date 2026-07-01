"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/src/lib/axios";
import { AuthErrorModal } from "../AuthErrorModal";

type Mode = "login" | "register";

export default function Auth({ mode = "login" }: { mode?: Mode }) {
  const [currentMode, setCurrentMode] = useState<Mode>(mode);

  return (
    <main className="min-h-screen bg-[#fff4e8] p-3 sm:p-4">
      <section className="min-h-[calc(100vh-24px)] rounded-[24px] bg-gradient-to-br from-[#fffaf5] via-white to-[#f8f5ff] px-4 py-6 sm:min-h-[calc(100vh-32px)] sm:rounded-[28px] sm:px-6 sm:py-10">
        <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl items-center gap-8 lg:min-h-[calc(100vh-112px)] lg:grid-cols-2 lg:gap-12">
          <div className="hidden lg:block">
            <LeftContent />
          </div>

          <div>
            <MobileLogo />

            <motion.div
              layout
              transition={{
                layout: {
                  duration: 0.25,
                  ease: "easeOut",
                },
              }}
              className="mx-auto w-full max-w-xl rounded-[28px] border border-[#ead8c2] bg-white p-5 shadow-[0_30px_90px_rgba(31,42,68,0.12)] sm:rounded-[32px] sm:p-7"
            >
              <div className="mb-8 grid grid-cols-2 rounded-full bg-slate-100 p-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentMode("login")}
                  className={`rounded-full py-3 text-center font-extrabold transition-all duration-300 ${
                    currentMode === "login"
                      ? "bg-white text-[#1f2a44] shadow"
                      : "text-[#5b6b85]"
                  }`}
                >
                  Đăng nhập
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentMode("register")}
                  className={`rounded-full py-3 text-center font-extrabold transition-all duration-300 ${
                    currentMode === "register"
                      ? "bg-white text-[#1f2a44] shadow"
                      : "text-[#5b6b85]"
                  }`}
                >
                  Đăng ký
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {currentMode === "register" ? (
                    <RegisterForm onSwitch={() => setCurrentMode("login")} />
                  ) : (
                    <LoginForm onSwitch={() => setCurrentMode("register")} />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MobileLogo() {
  return (
    <Link
      href="/"
      className="mb-6 flex items-center justify-center gap-3 lg:hidden"
    >
      <Image
        src="/cat-home.jpg"
        alt="Miu mascot"
        width={52}
        height={52}
        className="rounded-full object-cover"
      />

      <div>
        <h1 className="text-2xl font-extrabold leading-none">
          <span className="text-[#5b6b85]">Miu</span>
          <span className="text-[#ff6b00]">Lingo</span>
        </h1>
        <p className="mt-1 text-sm font-bold text-[#5b6b85]">
          Học ngôn ngữ cùng Miu
        </p>
      </div>
    </Link>
  );
}

function LeftContent() {
  return (
    <div>
      <Link href="/" className="mb-10 flex items-center gap-4">
        <Image
          src="/cat-home.jpg"
          alt="Miu mascot"
          width={64}
          height={64}
          className="rounded-full object-cover"
        />

        <div>
          <h1 className="text-2xl font-extrabold leading-none">
            <span className="text-[#5b6b85]">Miu</span>
            <span className="text-[#ff6b00]">Lingo</span>
          </h1>
          <p className="mt-2 font-bold text-[#5b6b85]">Học ngôn ngữ cùng Miu</p>
        </div>
      </Link>

      <div className="mb-8 inline-flex rounded-full border border-[#ffd4ad] bg-white px-5 py-3 font-extrabold text-[#ff6b00] shadow-sm">
        🐱 Miu đồng hành cùng bạn
      </div>

      <h2 className="max-w-2xl text-5xl font-extrabold leading-tight text-[#1f2a44] lg:text-6xl">
        Đăng nhập để tiếp tục hành trình học
      </h2>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5b6b85]">
        Học miễn phí, check từ, check bài và lưu tiến độ mỗi ngày. Giao diện nhẹ
        nhàng, dễ gần và phù hợp cho người mới bắt đầu.
      </p>

      <div className="mt-8 space-y-4">
        {[
          "Học miễn phí các bài cơ bản",
          "Check bài viết và nhận góp ý",
          "Check từ, IPA và ví dụ theo ngữ cảnh",
        ].map((item) => (
          <div key={item} className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 font-extrabold text-emerald-500">
              ✓
            </span>
            <span className="font-extrabold text-[#1f2a44]">{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex max-w-md items-center gap-5 rounded-[26px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
        <Image
          src="/cat-home.jpg"
          alt="Meow Mentor"
          width={90}
          height={90}
          className="rounded-2xl object-cover"
        />

        <div>
          <h3 className="text-xl font-extrabold text-[#1f2a44]">Meow Mentor</h3>
          <p className="mt-2 leading-7 text-[#5b6b85]">
            Miu sẽ gợi ý nhiệm vụ học phù hợp với trình độ và mục tiêu của bạn.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const handleLogin = async (e: React.FormEvent) => {
    try {
      e.preventDefault();

      const res = await api.post("/auth/login", { email, password, rememberMe });

      if (res.data.user.status !== "ACTIVE") {
        setErrorModal({
          open: true,
          message:
            res.data.data?.message || "Email hoặc mật khẩu không chính xác.",
        });
        return;
      }

      window.location.href = "/";
    } catch {
      setErrorModal({
        open: true,
        message: "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
      });
    }
  };
  return (
    <div>
      <h2 className="text-3xl font-extrabold text-[#1f2a44]">
        Chào mừng trở lại
      </h2>

      <p className="mt-3 text-[#5b6b85]">
        Đăng nhập để tiếp tục học và xem tiến độ của bạn.
      </p>

      <SocialButtons label="hoặc đăng nhập bằng email" />

      <form className="mt-6 space-y-5" onSubmit={handleLogin}>
        <Input
          label="Email"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={setEmail}
        />
        <Input
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          type="password"
          value={password}
          onChange={setPassword}
        />

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 font-bold text-[#5b6b85]">
            <input type="checkbox" onChange={(e) => setRememberMe(e.target.checked)} checked={rememberMe}/>
            Ghi nhớ đăng nhập
          </label>

          <Link
            href="/forgot-password"
            className="font-extrabold text-[#ff6b00]"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-[#ff961c] to-[#ff6b00] py-4 font-extrabold text-white shadow-xl shadow-orange-200"
        >
          Đăng nhập
        </button>
      </form>

      <p className="mt-6 text-center font-bold text-[#5b6b85]">
        Chưa có tài khoản?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-extrabold text-[#ff6b00]"
        >
          Đăng ký miễn phí
        </button>
      </p>

      <AuthErrorModal
        open={errorModal.open}
        message={errorModal.message}
        onClose={() => setErrorModal({ open: false, message: "" })}
      />
    </div>
  );
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const [fullName, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorModal, setErrorModal] = useState({
    open: false,
    message: "",
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/register", {
        fullName,
        email,
        password,
      });

      if (!res.data?.success && res.status !== 201) {
        setErrorModal({
          open: true,
          message: res.data?.message || "Đăng ký không thành công.",
        });
        return;
      }

      setShowSuccessModal(true);
    } catch (error: any) {
      setErrorModal({
        open: true,
        message:
          error?.response?.data?.message ||
          "Không thể đăng ký. Vui lòng thử lại.",
      });
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setFullname("");
    setEmail("");
    setPassword("");
    onSwitch();
  };

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-[#1f2a44]">
        Tạo tài khoản miễn phí
      </h2>

      <p className="mt-3 text-[#5b6b85]">
        Bắt đầu học miễn phí, check từ và check bài ngay hôm nay.
      </p>

      <SocialButtons label="hoặc đăng ký bằng email" />

      <form className="mt-6 space-y-5" onSubmit={handleRegister}>
        <Input
          label="Họ tên"
          placeholder="Nguyễn Văn A"
          value={fullName}
          onChange={setFullname}
        />

        <Input
          label="Email"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={setEmail}
        />

        <Input
          label="Mật khẩu"
          placeholder="Tối thiểu 8 ký tự"
          type="password"
          value={password}
          onChange={setPassword}
        />

        <label className="flex items-center gap-2 text-sm font-bold text-[#5b6b85]">
          <input type="checkbox" />
          Tôi đồng ý với điều khoản sử dụng
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-[#ff961c] to-[#ff6b00] py-4 font-extrabold text-white shadow-xl shadow-orange-200"
        >
          Đăng ký miễn phí
        </button>
      </form>

      <p className="mt-6 text-center font-bold text-[#5b6b85]">
        Đã có tài khoản?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-extrabold text-[#ff6b00]"
        >
          Đăng nhập
        </button>
      </p>

      <RegisterSuccessModal
        open={showSuccessModal}
        onClose={handleSuccessClose}
      />

      <AuthErrorModal
        open={errorModal.open}
        message={errorModal.message}
        onClose={() => setErrorModal({ open: false, message: "" })}
      />
    </div>
  );
}

function SocialButtons({ label }: { label: string }) {
  return (
    <>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            window.location.href = "http://localhost:3002/auth/google";
          }}
          className="rounded-2xl border border-[#ead8c2] py-3 font-extrabold text-[#1f2a44] transition hover:bg-[#fff4e8]"
        >
          Google
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href = "http://localhost:3002/auth/facebook";
          }}
          className="rounded-2xl border border-[#ead8c2] py-3 font-extrabold text-[#1f2a44] transition hover:bg-[#fff4e8]"
        >
          Facebook
        </button>
      </div>

      <div className="mt-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-sm font-extrabold text-slate-400">{label}</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
    </>
  );
}

function Input({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="font-extrabold text-[#334155]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          mt-2 w-full rounded-2xl border border-slate-200
          bg-slate-50 px-5 py-4
          font-bold text-[#1f2a44]
          outline-none transition
          placeholder:text-slate-300
          focus:border-[#ff6b00] focus:bg-white
        "
      />
    </label>
  );
}

function RegisterSuccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ff961c] to-[#ff6b00] p-8 text-center text-white">
          <div className="animate-bounce text-6xl">🎉</div>

          <h2 className="mt-4 text-3xl font-extrabold">
            Đăng ký thành công!
          </h2>

          <p className="mt-2 text-white/90">
            Chào mừng bạn đến với PoppyLingo
          </p>
        </div>

        {/* Body */}
        <div className="p-7 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl">
            ✅
          </div>

          <p className="mt-5 leading-7 text-[#5b6b85]">
            Tài khoản của bạn đã được tạo thành công.
            Hãy đăng nhập để bắt đầu hành trình học tiếng Anh.
          </p>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-2xl bg-[#ff6b00] py-4 font-extrabold text-white"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  );
}

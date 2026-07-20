"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/src/lib/axios";
import { normalizeRedirectPath } from "@/src/lib/auth-redirect";
import { useTranslation } from "@/src/hooks/useTranslation";
import { AuthErrorModal } from "../AuthErrorModal";
import AppLogo from "../UI/AppLogo";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

type Mode = "login" | "register";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = error.response.data as { message?: unknown };
    if (typeof data.message === "string") return data.message;
  }

  return fallback;
}

export default function Auth({ mode = "login" }: { mode?: Mode }) {
  const { t } = useTranslation();
  const [currentMode, setCurrentMode] = useState<Mode>(mode);

  return (
    <main className="min-h-screen bg-[var(--background)] p-3 sm:p-4">
      <section className="min-h-[calc(100vh-24px)] rounded-[24px] bg-gradient-to-br from-white via-white to-blue-50/60 px-4 py-6 sm:min-h-[calc(100vh-32px)] sm:rounded-[28px] sm:px-6 sm:py-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
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
              className="mx-auto w-full max-w-xl rounded-[28px] border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-5 shadow-[0_30px_90px_rgba(31,42,68,0.12)] sm:rounded-[32px] sm:p-7 dark:shadow-black/30"
            >
              <div className="mb-8 grid grid-cols-2 rounded-full bg-[var(--lumiverse-card-soft)] p-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentMode("login")}
                  className={`rounded-full py-3 text-center font-extrabold transition-all duration-300 ${
                    currentMode === "login"
                      ? "bg-[var(--lumiverse-card)] text-[var(--lumiverse-ink)] shadow"
                      : "text-[var(--lumiverse-muted)]"
                  }`}
                >
                  {t("auth.loginTab")}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentMode("register")}
                  className={`rounded-full py-3 text-center font-extrabold transition-all duration-300 ${
                    currentMode === "register"
                      ? "bg-[var(--lumiverse-card)] text-[var(--lumiverse-ink)] shadow"
                      : "text-[var(--lumiverse-muted)]"
                  }`}
                >
                  {t("auth.registerTab")}
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
    <div className="mb-6 flex justify-center lg:hidden">
      <AppLogo href="/" />
    </div>
  );
}

function LeftContent() {
  const { t } = useTranslation();
  const benefits = [
    t("auth.benefitFreeLessons"),
    t("auth.benefitWritingFeedback"),
    t("auth.benefitWordCheck"),
  ];

  return (
    <div>
      <div className="mb-10">
        <AppLogo href="/" />
      </div>

      <div className="mb-8 inline-flex rounded-full border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] px-5 py-3 font-extrabold text-[var(--lumiverse-primary)] shadow-sm">
        {t("auth.companionBadge")}
      </div>

      <h2 className="max-w-2xl text-5xl font-extrabold leading-tight text-[var(--lumiverse-ink)] lg:text-6xl">
        {t("auth.headline")}
      </h2>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--lumiverse-muted)]">
        {t("auth.description")}
      </p>

      <div className="mt-8 space-y-4">
        {benefits.map((item) => (
          <div key={item} className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 font-extrabold text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300">
              ✓
            </span>
            <span className="font-extrabold text-[var(--lumiverse-ink)]">{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex max-w-md items-center gap-5 rounded-[26px] border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-6 shadow-[0_24px_70px_rgba(31,42,68,0.06)] dark:shadow-black/20">
        <Image
          src="/cat-home.jpg"
          alt="Lumi Mentor"
          width={90}
          height={90}
          className="rounded-2xl object-cover"
        />

        <div>
          <h3 className="text-xl font-extrabold text-[var(--lumiverse-ink)]">
            {t("auth.mentorTitle")}
          </h3>
          <p className="mt-2 leading-7 text-[var(--lumiverse-muted)]">
            {t("auth.mentorDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const handleLogin = async (e: React.FormEvent) => {
    try {
      e.preventDefault();

      const res = await api.post("/auth/login", {
        email,
        password,
        rememberMe,
        ...(twoFactorRequired && otp.trim() ? { otp: otp.trim() } : {}),
        ...(twoFactorRequired && recoveryCode.trim()
          ? { recoveryCode: recoveryCode.trim() }
          : {}),
      });

      if (res.data?.twoFactorRequired) {
        setTwoFactorRequired(true);
        setErrorModal({
          open: true,
          message:
            res.data?.message ||
            t("auth.twoFactorRequired"),
        });
        return;
      }

      if (res.data.user.status !== "ACTIVE") {
        setErrorModal({
          open: true,
          message:
            res.data.data?.message || t("auth.invalidCredentials"),
        });
        return;
      }

      router.replace(normalizeRedirectPath(searchParams.get("redirect")));
    } catch (error: unknown) {
      setErrorModal({
        open: true,
        message:
          getErrorMessage(error, "") ||
          t("auth.loginConnectionError"),
      });
    }
  };
  return (
    <div>
      <h2 className="text-3xl font-extrabold text-[var(--lumiverse-ink)]">
        {t("auth.loginTitle")}
      </h2>

      <p className="mt-3 text-[var(--lumiverse-muted)]">
        {t("auth.loginDescription")}
      </p>

      <SocialButtons label={t("auth.loginSocialLabel")} />

      <form className="mt-6 space-y-5" onSubmit={handleLogin}>
        <Input
          label={t("auth.emailLabel")}
          placeholder={t("auth.emailPlaceholder")}
          type="email"
          value={email}
          onChange={setEmail}
        />
        <Input
          label={t("auth.passwordLabel")}
          placeholder={t("auth.passwordPlaceholder")}
          type="password"
          value={password}
          onChange={setPassword}
        />

        {twoFactorRequired && (
          <div className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-400/30 dark:bg-orange-500/10">
            <Input
              label={t("auth.twoFactorCodeLabel")}
              placeholder={t("auth.twoFactorCodePlaceholder")}
              value={otp}
              onChange={setOtp}
            />
            <Input
              label={t("auth.recoveryCodeLabel")}
              placeholder={t("auth.recoveryCodePlaceholder")}
              value={recoveryCode}
              onChange={setRecoveryCode}
            />
            <p className="text-xs font-bold text-[var(--lumiverse-ink)]">
              {t("auth.twoFactorHint")}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 font-bold text-[var(--lumiverse-muted)]">
            <input
              type="checkbox"
              onChange={(e) => setRememberMe(e.target.checked)}
              checked={rememberMe}
            />
            {t("auth.rememberMe")}
          </label>

          <Link
            href="/forgot-password"
            className="font-extrabold text-[var(--lumiverse-primary)]"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] py-4 font-extrabold text-white shadow-xl shadow-blue-200/70 transition hover:opacity-95 dark:shadow-black/20"
        >
          {t("auth.loginButton")}
        </button>
      </form>

      <p className="mt-6 text-center font-bold text-[var(--lumiverse-muted)]">
        {t("auth.noAccount")}{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-extrabold text-[var(--lumiverse-primary)]"
        >
          {t("auth.registerButton")}
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
  const { t } = useTranslation();
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
          message: res.data?.message || t("auth.registerFailed"),
        });
        return;
      }

      setShowSuccessModal(true);
    } catch (error: unknown) {
      setErrorModal({
        open: true,
        message:
          getErrorMessage(error, "") ||
          t("auth.registerConnectionError"),
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
      <h2 className="text-3xl font-extrabold text-[var(--lumiverse-ink)]">
        {t("auth.registerTitle")}
      </h2>

      <p className="mt-3 text-[var(--lumiverse-muted)]">
        {t("auth.registerDescription")}
      </p>

      <SocialButtons label={t("auth.registerSocialLabel")} />

      <form className="mt-6 space-y-5" onSubmit={handleRegister}>
        <Input
          label={t("auth.fullNameLabel")}
          placeholder={t("auth.fullNamePlaceholder")}
          value={fullName}
          onChange={setFullname}
        />

        <Input
          label={t("auth.emailLabel")}
          placeholder={t("auth.emailPlaceholder")}
          type="email"
          value={email}
          onChange={setEmail}
        />

        <Input
          label={t("auth.passwordLabel")}
          placeholder={t("auth.passwordRegisterPlaceholder")}
          type="password"
          value={password}
          onChange={setPassword}
        />

        <label className="flex items-center gap-2 text-sm font-bold text-[var(--lumiverse-muted)]">
          <input type="checkbox" />
          {t("auth.termsAgree")}
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] py-4 font-extrabold text-white shadow-xl shadow-blue-200/70 transition hover:opacity-95 dark:shadow-black/20"
        >
          {t("auth.registerButton")}
        </button>
      </form>

      <p className="mt-6 text-center font-bold text-[var(--lumiverse-muted)]">
        {t("auth.haveAccount")}{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-extrabold text-[var(--lumiverse-primary)]"
        >
          {t("auth.loginButton")}
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
  const searchParams = useSearchParams();

  function rememberRedirect() {
    const redirect = normalizeRedirectPath(searchParams.get("redirect"));
    sessionStorage.setItem("auth_redirect", redirect);
  }

  return (
    <>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            rememberRedirect();
            window.location.href = `${API_BASE_URL}/auth/google`;
          }}
          className="rounded-2xl border border-[var(--lumiverse-border)] py-3 font-extrabold text-[var(--lumiverse-ink)] transition hover:bg-[var(--lumiverse-card)]"
        >
          Google
        </button>

        <button
          type="button"
          onClick={() => {
            rememberRedirect();
            window.location.href = `${API_BASE_URL}/auth/facebook`;
          }}
          className="rounded-2xl border border-[var(--lumiverse-border)] py-3 font-extrabold text-[var(--lumiverse-ink)] transition hover:bg-[var(--lumiverse-card)]"
        >
          Facebook
        </button>
      </div>

      <div className="mt-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--lumiverse-border)]" />
        <span className="text-sm font-extrabold text-[var(--lumiverse-muted)]">{label}</span>
        <div className="h-px flex-1 bg-[var(--lumiverse-border)]" />
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
      <span className="font-extrabold text-[var(--lumiverse-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          mt-2 w-full rounded-2xl border border-[var(--lumiverse-border)]
          bg-[var(--lumiverse-card-soft)] px-5 py-4
          font-bold text-[var(--lumiverse-ink)]
          outline-none transition
          placeholder:text-[var(--lumiverse-muted)]
          focus:border-[var(--lumiverse-primary)] focus:bg-[var(--lumiverse-card)]
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
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] p-8 text-center text-white">
          <div className="animate-bounce text-6xl">🎉</div>

          <h2 className="mt-4 text-3xl font-extrabold">{t("auth.successTitle")}</h2>

          <p className="mt-2 text-white/90">{t("auth.successWelcome")}</p>
        </div>

        {/* Body */}
        <div className="p-7 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl dark:bg-emerald-500/10">
            ✅
          </div>

          <p className="mt-5 leading-7 text-[var(--lumiverse-muted)]">
            {t("auth.successDescription")}
          </p>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] py-4 font-extrabold text-white transition hover:opacity-95"
          >
            {t("auth.successLoginNow")}
          </button>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import AppLogo from "@/src/Components/UI/AppLogo";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--lumiverse-bg)] p-4">
      <section className="w-full max-w-lg rounded-[28px] border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-6 shadow-[0_30px_90px_rgba(31,42,68,0.12)] dark:shadow-black/30 sm:p-8">
        <div className="mb-8 flex justify-center">
          <AppLogo href="/" />
        </div>

        <h1 className="text-3xl font-black text-[var(--lumiverse-ink)]">
          Reset your password
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
          Password recovery is being connected to the account service. For now,
          return to login and use your existing Lumiverse account credentials.
        </p>

        <div className="mt-7 rounded-3xl border border-dashed border-[var(--lumiverse-border)] bg-[var(--lumiverse-card-soft)] p-4 text-sm font-bold leading-6 text-[var(--lumiverse-muted)]">
          No password reset request has been sent from this page, so your account
          and current session remain unchanged.
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="lumiverse-button-primary flex-1">
            Back to login
          </Link>
          <Link href="/" className="lumiverse-button-soft flex-1">
            Public homepage
          </Link>
        </div>
      </section>
    </main>
  );
}

"use client";

import { Loader2, RefreshCcw, Sparkles, X } from "lucide-react";
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type Tone = "primary" | "soft" | "ghost" | "danger";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function LumiverseCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("lumiverse-card", className)} {...props}>
      {children}
    </div>
  );
}

export function LumiverseSectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <LumiverseBadge>{eyebrow}</LumiverseBadge> : null}
        <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--lumiverse-ink)] sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function LumiverseStatCard({
  icon,
  label,
  value,
  detail,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail?: string;
  className?: string;
}) {
  return (
    <LumiverseCard className={cx("p-4", className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]">
        {icon}
      </div>
      <p className="text-2xl font-black text-[var(--lumiverse-ink)]">{value}</p>
      <p className="mt-1 text-sm font-bold text-[var(--lumiverse-muted)]">{label}</p>
      {detail ? <p className="mt-2 text-xs font-bold text-[var(--lumiverse-muted)]">{detail}</p> : null}
    </LumiverseCard>
  );
}

export function LumiverseButton({
  className,
  tone = "primary",
  loading = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  loading?: boolean;
}) {
  const toneClass =
    tone === "primary"
      ? "lumiverse-button-primary"
      : tone === "danger"
        ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--lumiverse-danger)] px-4 py-3 font-black text-white shadow-[0_16px_34px_rgba(225,29,72,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        : tone === "ghost"
          ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-[var(--lumiverse-muted)] transition hover:bg-[var(--lumiverse-hover-tint)] hover:text-[var(--lumiverse-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          : "lumiverse-button-soft";

  return (
    <button
      className={cx(toneClass, disabled || loading ? "cursor-not-allowed opacity-60" : "", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function LumiverseBadge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--lumiverse-border)] bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--lumiverse-primary)] dark:bg-white/8",
        className,
      )}
    >
      <Sparkles aria-hidden className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export function LumiverseProgress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cx("lumiverse-progress h-3", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="h-full" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

/**
 * Spinner + status text for a full-section loading state (page still
 * waiting on its first response). Distinct from LumiverseSkeleton (a
 * placeholder shape with no text) and LumiverseState (empty/error, with a
 * retry action) — this is the "Loading lesson...", "Generating...",
 * "Saving...", "Retrying..." case.
 */
export function LumiverseLoadingState({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cx(
        "lumiverse-card flex items-center justify-center gap-3 p-10 text-[var(--lumiverse-primary)]",
        className,
      )}
    >
      <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
      <span className="font-black text-[var(--lumiverse-ink)]">{label}</span>
    </div>
  );
}

export function LumiverseSkeleton({
  className,
}: {
  className?: string;
}) {
  return <div className={cx("lumiverse-card lumiverse-shimmer", className)} />;
}

export function LumiverseState({
  title,
  description,
  actionLabel,
  onAction,
  tone = "soft",
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "soft" | "error" | "empty";
}) {
  return (
    <section className="lumiverse-card p-6 text-center">
      <div
        className={cx(
          "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl",
          tone === "error" ? "bg-[var(--lumiverse-danger-soft)] text-[var(--lumiverse-danger)]" : "bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]",
        )}
      >
        <RefreshCcw aria-hidden className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-black text-[var(--lumiverse-ink)]">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <LumiverseButton className="mt-5" tone={tone === "error" ? "danger" : "primary"} onClick={onAction}>
          {actionLabel}
        </LumiverseButton>
      ) : null}
    </section>
  );
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function LumiverseDialog({
  open,
  onClose,
  titleId,
  labelledBy,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** id applied to the dialog's title element, wired to aria-labelledby */
  titleId: string;
  /** overrides aria-labelledby when the title lives outside this dialog */
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? panel)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--lumiverse-overlay)] p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        tabIndex={-1}
        className={cx(
          "lumiverse-card w-full max-w-lg p-7 outline-none",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function LumiverseDialogCloseButton({
  onClose,
  label = "Close",
}: {
  onClose: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="rounded-full p-2 text-[var(--lumiverse-muted)] transition hover:bg-[var(--lumiverse-hover-tint)] hover:text-[var(--lumiverse-primary)]"
    >
      <X aria-hidden className="h-5 w-5" />
    </button>
  );
}

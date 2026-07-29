"use client";

// Shared table/panel/status primitives for the admin Document Library
// pages. Mirrors the local Panel/ResponsiveTable/StatusPill helpers in
// app/(main)/admin/page.tsx (the de facto admin table template — there is
// no shared component library yet) but extracted here since three separate
// pages (documents list, moderation queue, generator) all need them.
import { Database, Lock } from "lucide-react";
import type React from "react";
import { ReactNode } from "react";
import { useAuthStore } from "@/src/store/authStore";

export function AdminDocumentsAccessGate({ children }: { children: ReactNode }) {
  const currentUser = useAuthStore((s) => s.user);

  // Backend RolesGuard on every /admin/documents/* route only accepts
  // ADMIN (not MODERATOR) — this check is purely a UX convenience so a
  // non-admin gets a clear message instead of a page erroring out one
  // failed request at a time. The backend is the real enforcement.
  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950">
            <Lock size={26} />
          </div>
          <h1 className="mt-4 text-xl font-black">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Khu vực Thư viện tài liệu chỉ dành cho quản trị viên (ADMIN). Tài khoản của bạn không
            có quyền truy cập.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

export function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          {description && <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ResponsiveTable({
  columns,
  rows,
  emptyTitle = "Chưa có dữ liệu",
  emptyDescription = "Thử đổi bộ lọc hoặc làm mới trang.",
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!rows.length) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center rounded-3xl bg-slate-50 p-6 text-center dark:bg-slate-950">
        <Database className="text-slate-300" size={36} />
        <p className="mt-3 font-black">{emptyTitle}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-black">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="rounded-2xl bg-slate-50 align-top dark:bg-slate-950">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3 align-middle font-bold">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  PROCESSING: "Đang xử lý",
  GENERATING: "Đang tạo",
  PENDING_ADMIN_REVIEW: "Chờ duyệt",
  READY_FOR_REVIEW: "Sẵn sàng duyệt",
  NEEDS_CHANGES: "Cần chỉnh sửa",
  REJECTED: "Đã từ chối",
  APPROVED: "Đã duyệt",
  PUBLISHED: "Đã xuất bản",
  HIDDEN: "Đã ẩn",
  REMOVED: "Đã gỡ",
  ARCHIVED: "Lưu trữ",
  FAILED: "Thất bại",
  COMPLETED: "Hoàn thành",
  PENDING: "Chờ xử lý",
  NEEDS_ADMIN_ACTION: "Cần can thiệp",
  RESOLVED: "Đã xử lý",
  DISMISSED: "Đã bỏ qua",
};

const POSITIVE_STATUSES = new Set(["PUBLISHED", "APPROVED", "COMPLETED", "RESOLVED", "ACTIVE"]);
const WARNING_STATUSES = new Set([
  "PENDING_ADMIN_REVIEW",
  "READY_FOR_REVIEW",
  "NEEDS_CHANGES",
  "PENDING",
  "GENERATING",
  "PROCESSING",
  "NEEDS_ADMIN_ACTION",
]);
const NEGATIVE_STATUSES = new Set([
  "REJECTED",
  "FAILED",
  "HIDDEN",
  "REMOVED",
  "ARCHIVED",
  "DISMISSED",
]);

export function StatusPill({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-400">-</span>;
  const upper = value.toUpperCase();
  const tone = POSITIVE_STATUSES.has(upper)
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
    : NEGATIVE_STATUSES.has(upper)
      ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
      : WARNING_STATUSES.has(upper)
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300";

  return (
    <span className={["inline-flex rounded-full px-2.5 py-1 text-xs font-black", tone].join(" ")}>
      {STATUS_LABELS[upper] ?? value}
    </span>
  );
}

export function RiskBadge({ label, level }: { label: string; level?: string | null }) {
  if (!level) return null;
  const upper = level.toUpperCase();
  const tone =
    upper === "HIGH"
      ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
      : upper === "MEDIUM"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : upper === "LOW"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black", tone].join(" ")}>
      {label}: {upper}
    </span>
  );
}

export function SmallAction({
  label,
  loading,
  disabled,
  tone = "default",
  onClick,
}: {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading || disabled}
      onClick={onClick}
      className={[
        "inline-flex min-h-9 items-center gap-1 rounded-xl border px-3 text-xs font-black disabled:opacity-50",
        tone === "danger"
          ? "border-rose-200 text-rose-700"
          : "border-violet-200 text-violet-700",
      ].join(" ")}
    >
      {loading ? "..." : label}
    </button>
  );
}

export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-black disabled:opacity-40 dark:border-slate-700"
      >
        Trước
      </button>
      <span className="text-xs font-black text-slate-500">
        Trang {page}/{totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-black disabled:opacity-40 dark:border-slate-700"
      >
        Sau
      </button>
    </div>
  );
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/** Humanizes camelCase/SNAKE_CASE object keys for generic detail rendering. */
export function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

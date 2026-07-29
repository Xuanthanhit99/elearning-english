"use client";

// Full admin document detail: metadata + edit, versions (with review
// download / rollback), the Gemini moderation report rendered in full,
// moderation history timeline, processing events timeline, reports, and
// the full moderation/publication action set. Shared between
// AdminDocumentsPage (row -> "Xem chi tiết") and AdminModerationQueuePage
// (queue item -> detail drawer) so this large piece of logic lives once.
import { useCallback, useEffect, useState } from "react";
import {
  AdminDocumentDetail,
  AdminDocumentModeration,
  DOCUMENT_LEVELS,
  getAdminDocumentDetail,
  getAdminDocumentReviewDownload,
  approveAdminDocument,
  hideAdminDocument,
  publishAdminDocument,
  rejectAdminDocument,
  removeAdminDocument,
  requestChangesAdminDocument,
  resolveAdminDocumentReport,
  restoreAdminDocument,
  retryAdminDocument,
  rollbackAdminDocument,
  unpublishAdminDocument,
  updateAdminDocument,
} from "@/src/lib/admin-documents-api";
import {
  connectDocumentSocket,
  onDocumentEvent,
  releaseDocumentSocket,
  subscribeToDocument,
  unsubscribeFromDocument,
} from "@/src/lib/admin-documents-socket";
import { getApiErrorMessage } from "@/src/lib/api-error";
import {
  BeaconVieButton,
  BeaconVieLoadingState,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";
import { formatBytes, formatDate, humanizeKey, RiskBadge, StatusPill } from "./shared";

function analyzeModeration(mod: AdminDocumentModeration) {
  const scores: Array<[string, number]> = [];
  const risks: Array<[string, string]> = [];
  const suggestions: Array<[string, string]> = [];
  const detections: Array<[string, string]> = [];
  const rest: Array<[string, string | number | boolean]> = [];
  const consumedKeys = new Set([
    "id",
    "documentId",
    "versionId",
    "decision",
    "createdAt",
    "updatedAt",
    "warnings",
    "rejectionReasons",
    "requiredChanges",
  ]);

  Object.entries(mod).forEach(([key, value]) => {
    if (consumedKeys.has(key) || value === null || value === undefined) return;
    const lower = key.toLowerCase();
    if (lower.includes("risk") && typeof value === "string") {
      risks.push([key, value]);
    } else if (lower.includes("score") && typeof value === "number") {
      scores.push([key, value]);
    } else if (lower.startsWith("suggested")) {
      suggestions.push([key, Array.isArray(value) ? value.join(", ") : String(value)]);
    } else if (lower.startsWith("detected") && typeof value === "string") {
      detections.push([key, value]);
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      rest.push([key, value]);
    }
  });

  return { scores, risks, suggestions, detections, rest };
}

export function DocumentDetailPanel({
  documentId,
  onChanged,
  onClose,
  titleId,
}: {
  documentId: string;
  onChanged?: () => void;
  onClose?: () => void;
  /** id applied to the heading, wired up by the caller's BeaconVieDialog aria-labelledby */
  titleId?: string;
}) {
  const [detail, setDetail] = useState<AdminDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    category: string;
    level: string;
    skills: string;
    allowDownload: boolean;
    isFeatured: boolean;
    hasAnswerKey: boolean;
    hasAudio: boolean;
  } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectForm, setRejectForm] = useState({ userFacingReason: "", internalReason: "", allowResubmission: true });
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesForm, setChangesForm] = useState({ userFacingReason: "", requiredChanges: [""] });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDocumentDetail(documentId);
      setDetail(data);
      setEditForm({
        title: data.title ?? "",
        description: data.description ?? "",
        category: data.category ?? "",
        level: data.level ?? "",
        skills: (data.skills ?? []).join(", "),
        allowDownload: Boolean(data.allowDownload),
        isFeatured: Boolean(data.isFeatured),
        hasAnswerKey: Boolean(data.hasAnswerKey),
        hasAudio: Boolean(data.hasAudio),
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tải được chi tiết tài liệu."));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  // Live updates: subscribe to this document's room while the panel is
  // open so a processing/moderation change (e.g. background retry
  // finishing) reflects here without polling.
  useEffect(() => {
    connectDocumentSocket();
    subscribeToDocument(documentId);
    const offProgress = onDocumentEvent("document.processing.progress", (payload) => {
      if (payload.documentId === documentId) void load();
    });
    const offFailed = onDocumentEvent("document.processing.failed", (payload) => {
      if (payload.documentId === documentId) void load();
    });
    const offModeration = onDocumentEvent("document.moderation.updated", (payload) => {
      if (payload.documentId === documentId) void load();
    });
    const offPublished = onDocumentEvent("document.published", (payload) => {
      if (payload.documentId === documentId) void load();
    });
    return () => {
      offProgress();
      offFailed();
      offModeration();
      offPublished();
      unsubscribeFromDocument(documentId);
      releaseDocumentSocket();
    };
  }, [documentId, load]);

  async function runAction(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setActionError(null);
    try {
      await action();
      await load();
      onChanged?.();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Thao tác thất bại."));
    } finally {
      setBusy(null);
    }
  }

  async function handleReviewDownload(versionId: string) {
    setBusy(`review-${versionId}`);
    setActionError(null);
    try {
      const { url } = await getAdminDocumentReviewDownload(documentId, versionId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Không tạo được liên kết xem file."));
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveMetadata() {
    if (!editForm) return;
    await runAction("save-metadata", () =>
      updateAdminDocument(documentId, {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        level: editForm.level || undefined,
        skills: editForm.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        allowDownload: editForm.allowDownload,
        isFeatured: editForm.isFeatured,
        hasAnswerKey: editForm.hasAnswerKey,
        hasAudio: editForm.hasAudio,
      }),
    );
    setEditing(false);
  }

  if (loading) return <BeaconVieLoadingState label="Đang tải chi tiết tài liệu..." />;
  if (error || !detail) {
    return (
      <BeaconVieState
        title="Không tải được tài liệu"
        description={error ?? undefined}
        tone="error"
        actionLabel="Thử lại"
        onAction={() => void load()}
      />
    );
  }

  const status = detail.status?.toUpperCase();
  const canModerate = status === "PENDING_ADMIN_REVIEW" || status === "READY_FOR_REVIEW";
  const canPublish = status === "APPROVED";
  const canUnpublishOrHide = status === "PUBLISHED";
  const canRestore = status === "REMOVED" || status === "HIDDEN" || status === "ARCHIVED";
  const canRemove = status !== "REMOVED";
  const canRetry = status === "FAILED";
  const unresolvedReports = detail.reports.filter((r) => r.status?.toUpperCase() === "PENDING" || r.status?.toUpperCase() === "OPEN");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={titleId} className="text-lg font-black">{detail.title}</h3>
            <StatusPill value={detail.status} />
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            /{detail.slug} · {detail.category} {detail.level ? `· ${detail.level}` : ""} · nguồn {detail.source} ·{" "}
            {detail.creationType}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Tác giả: {detail.author?.fullname} ({detail.author?.email})
          </p>
        </div>
        {onClose && (
          <BeaconVieButton tone="ghost" onClick={onClose} className="shrink-0">
            Đóng
          </BeaconVieButton>
        )}
      </div>

      {actionError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950">
          {actionError}
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
        {canModerate && (
          <>
            <BeaconVieButton
              tone="primary"
              loading={busy === "approve-publish"}
              onClick={() => runAction("approve-publish", () => approveAdminDocument(documentId, true))}
            >
              Duyệt &amp; Xuất bản
            </BeaconVieButton>
            <BeaconVieButton
              tone="soft"
              loading={busy === "approve-only"}
              onClick={() => runAction("approve-only", () => approveAdminDocument(documentId, false))}
            >
              Chỉ duyệt (chưa xuất bản)
            </BeaconVieButton>
            <BeaconVieButton tone="danger" onClick={() => setRejectOpen((v) => !v)}>
              Từ chối
            </BeaconVieButton>
            <BeaconVieButton tone="soft" onClick={() => setChangesOpen((v) => !v)}>
              Yêu cầu chỉnh sửa
            </BeaconVieButton>
          </>
        )}
        {canPublish && (
          <BeaconVieButton
            tone="primary"
            loading={busy === "publish"}
            onClick={() => runAction("publish", () => publishAdminDocument(documentId))}
          >
            Xuất bản
          </BeaconVieButton>
        )}
        {canUnpublishOrHide && (
          <>
            <BeaconVieButton
              tone="soft"
              loading={busy === "unpublish"}
              onClick={() => runAction("unpublish", () => unpublishAdminDocument(documentId))}
            >
              Gỡ xuất bản
            </BeaconVieButton>
            <BeaconVieButton
              tone="soft"
              loading={busy === "hide"}
              onClick={() => runAction("hide", () => hideAdminDocument(documentId))}
            >
              Ẩn
            </BeaconVieButton>
          </>
        )}
        {canRestore && (
          <BeaconVieButton
            tone="soft"
            loading={busy === "restore"}
            onClick={() => runAction("restore", () => restoreAdminDocument(documentId))}
          >
            Khôi phục
          </BeaconVieButton>
        )}
        {canRemove && (
          <BeaconVieButton
            tone="danger"
            loading={busy === "remove"}
            onClick={() => {
              if (window.confirm("Gỡ tài liệu này khỏi thư viện?")) {
                void runAction("remove", () => removeAdminDocument(documentId));
              }
            }}
          >
            Gỡ
          </BeaconVieButton>
        )}
        {canRetry && (
          <BeaconVieButton
            tone="soft"
            loading={busy === "retry"}
            onClick={() => runAction("retry", () => retryAdminDocument(documentId))}
          >
            Retry pipeline
          </BeaconVieButton>
        )}
        <BeaconVieButton tone="ghost" onClick={() => setEditing((v) => !v)}>
          {editing ? "Đóng sửa" : "Sửa metadata"}
        </BeaconVieButton>
      </div>

      {rejectOpen && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="mb-2 text-sm font-black text-rose-700 dark:text-rose-300">Từ chối tài liệu</p>
          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
            Lý do gửi cho người upload (bắt buộc)
            <textarea
              value={rejectForm.userFacingReason}
              onChange={(e) => setRejectForm((f) => ({ ...f, userFacingReason: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
              rows={2}
            />
          </label>
          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
            Ghi chú nội bộ (không hiển thị cho người dùng)
            <textarea
              value={rejectForm.internalReason}
              onChange={(e) => setRejectForm((f) => ({ ...f, internalReason: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
              rows={2}
            />
          </label>
          <label className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={rejectForm.allowResubmission}
              onChange={(e) => setRejectForm((f) => ({ ...f, allowResubmission: e.target.checked }))}
            />
            Cho phép người dùng nộp lại
          </label>
          <div className="flex gap-2">
            <BeaconVieButton
              tone="danger"
              loading={busy === "reject"}
              disabled={!rejectForm.userFacingReason.trim()}
              onClick={() =>
                runAction("reject", () =>
                  rejectAdminDocument(documentId, rejectForm),
                ).then(() => setRejectOpen(false))
              }
            >
              Xác nhận từ chối
            </BeaconVieButton>
            <BeaconVieButton tone="ghost" onClick={() => setRejectOpen(false)}>
              Huỷ
            </BeaconVieButton>
          </div>
        </div>
      )}

      {changesOpen && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="mb-2 text-sm font-black text-amber-700 dark:text-amber-300">Yêu cầu chỉnh sửa</p>
          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
            Lời nhắn cho người upload (tuỳ chọn)
            <textarea
              value={changesForm.userFacingReason}
              onChange={(e) => setChangesForm((f) => ({ ...f, userFacingReason: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
              rows={2}
            />
          </label>
          <p className="mb-1 text-xs font-bold text-slate-600 dark:text-slate-300">
            Danh sách yêu cầu chỉnh sửa (ít nhất 1 mục)
          </p>
          <div className="space-y-2">
            {changesForm.requiredChanges.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={item}
                  onChange={(e) =>
                    setChangesForm((f) => ({
                      ...f,
                      requiredChanges: f.requiredChanges.map((v, i) => (i === index ? e.target.value : v)),
                    }))
                  }
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
                  placeholder={`Yêu cầu #${index + 1}`}
                />
                {changesForm.requiredChanges.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setChangesForm((f) => ({
                        ...f,
                        requiredChanges: f.requiredChanges.filter((_, i) => i !== index),
                      }))
                    }
                    className="rounded-xl border border-slate-200 px-3 text-xs font-black dark:border-slate-700"
                  >
                    Xoá
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setChangesForm((f) => ({ ...f, requiredChanges: [...f.requiredChanges, ""] }))}
            className="mt-2 text-xs font-black text-violet-700"
          >
            + Thêm yêu cầu
          </button>
          <div className="mt-3 flex gap-2">
            <BeaconVieButton
              tone="primary"
              loading={busy === "request-changes"}
              disabled={!changesForm.requiredChanges.some((c) => c.trim())}
              onClick={() =>
                runAction("request-changes", () =>
                  requestChangesAdminDocument(documentId, {
                    userFacingReason: changesForm.userFacingReason || undefined,
                    requiredChanges: changesForm.requiredChanges.map((c) => c.trim()).filter(Boolean),
                  }),
                ).then(() => setChangesOpen(false))
              }
            >
              Gửi yêu cầu
            </BeaconVieButton>
            <BeaconVieButton tone="ghost" onClick={() => setChangesOpen(false)}>
              Huỷ
            </BeaconVieButton>
          </div>
        </div>
      )}

      {editing && editForm && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="mb-3 text-sm font-black">Sửa metadata</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">
              Tiêu đề
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((f) => (f ? { ...f, title: e.target.value } : f))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">
              Mô tả
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => (f ? { ...f, description: e.target.value } : f))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
                rows={2}
              />
            </label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Danh mục
              <input
                value={editForm.category}
                onChange={(e) => setEditForm((f) => (f ? { ...f, category: e.target.value } : f))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Trình độ
              <select
                value={editForm.level}
                onChange={(e) => setEditForm((f) => (f ? { ...f, level: e.target.value } : f))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">-</option>
                {DOCUMENT_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">
              Kỹ năng (phân cách bằng dấu phẩy)
              <input
                value={editForm.skills}
                onChange={(e) => setEditForm((f) => (f ? { ...f, skills: e.target.value } : f))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
                placeholder="reading, listening"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={editForm.allowDownload}
                onChange={(e) => setEditForm((f) => (f ? { ...f, allowDownload: e.target.checked } : f))}
              />
              Cho phép tải xuống
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={editForm.isFeatured}
                onChange={(e) => setEditForm((f) => (f ? { ...f, isFeatured: e.target.checked } : f))}
              />
              Nổi bật
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={editForm.hasAnswerKey}
                onChange={(e) => setEditForm((f) => (f ? { ...f, hasAnswerKey: e.target.checked } : f))}
              />
              Có đáp án
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={editForm.hasAudio}
                onChange={(e) => setEditForm((f) => (f ? { ...f, hasAudio: e.target.checked } : f))}
              />
              Có audio
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <BeaconVieButton tone="primary" loading={busy === "save-metadata"} onClick={() => void handleSaveMetadata()}>
              Lưu thay đổi
            </BeaconVieButton>
            <BeaconVieButton tone="ghost" onClick={() => setEditing(false)}>
              Huỷ
            </BeaconVieButton>
          </div>
        </div>
      )}

      {/* Versions */}
      <div>
        <p className="mb-2 text-sm font-black">Các phiên bản</p>
        <div className="space-y-2">
          {detail.versions.map((version) => (
            <div
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-950"
            >
              <div>
                <span className="font-black">v{version.versionNumber}</span>{" "}
                <StatusPill value={version.status} />
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {formatDate(version.createdAt)} · {formatBytes(version.fileSize)}
                  {version.pageCount ? ` · ${version.pageCount} trang` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <BeaconVieButton
                  tone="soft"
                  className="min-h-9! px-3! py-1.5! text-xs"
                  loading={busy === `review-${version.id}`}
                  onClick={() => void handleReviewDownload(version.id)}
                >
                  Xem file gốc
                </BeaconVieButton>
                {detail.activeVersion?.id !== version.id && (
                  <BeaconVieButton
                    tone="ghost"
                    className="min-h-9! px-3! py-1.5! text-xs"
                    loading={busy === `rollback-${version.id}`}
                    onClick={() =>
                      window.confirm(`Khôi phục về phiên bản v${version.versionNumber}?`) &&
                      runAction(`rollback-${version.id}`, () => rollbackAdminDocument(documentId, version.id))
                    }
                  >
                    Khôi phục phiên bản
                  </BeaconVieButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moderation report */}
      {detail.moderation && (
        <div>
          <p className="mb-2 text-sm font-black">Báo cáo kiểm duyệt AI</p>
          <ModerationReport moderation={detail.moderation} />
        </div>
      )}

      {/* Moderation history */}
      {detail.moderationHistory?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-black">Lịch sử kiểm duyệt</p>
          <div className="space-y-2">
            {detail.moderationHistory.map((h, i) => (
              <div key={h.id ?? i} className="rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                <p className="font-black">
                  {h.action}: {h.fromStatus} → {h.toStatus}
                </p>
                {h.userFacingReason && <p className="mt-1 font-semibold text-slate-600 dark:text-slate-300">Lý do: {h.userFacingReason}</p>}
                {h.internalReason && <p className="mt-1 font-semibold text-slate-500">Nội bộ: {h.internalReason}</p>}
                {h.requiredChanges?.length ? (
                  <ul className="mt-1 list-disc pl-4 font-semibold text-slate-600 dark:text-slate-300">
                    {h.requiredChanges.map((c, ci) => (
                      <li key={ci}>{c}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-1 text-slate-400">{formatDate(h.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing events */}
      {detail.processingEvents?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-black">Nhật ký xử lý</p>
          <div className="space-y-1.5">
            {detail.processingEvents.map((e, i) => (
              <div key={e.id ?? i} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold dark:bg-slate-950">
                <span>
                  {e.step} — {e.message ?? e.status}
                </span>
                <span className="text-slate-400">{formatDate(e.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports */}
      {detail.reports?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-black">
            Báo cáo vi phạm {unresolvedReports.length > 0 && `(${unresolvedReports.length} chưa xử lý)`}
          </p>
          <div className="space-y-2">
            {detail.reports.map((r) => (
              <div key={r.id} className="rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black">
                    {r.reason} · <StatusPill value={r.status} />
                  </p>
                  <span className="text-slate-400">{formatDate(r.createdAt)}</span>
                </div>
                {r.description && <p className="mt-1 font-semibold text-slate-600 dark:text-slate-300">{r.description}</p>}
                <p className="mt-1 text-slate-500">Người báo cáo: {r.reporter?.fullname}</p>
                {(r.status?.toUpperCase() === "PENDING" || r.status?.toUpperCase() === "OPEN") && (
                  <div className="mt-2 flex gap-2">
                    <BeaconVieButton
                      tone="soft"
                      className="min-h-8! px-3! py-1! text-xs"
                      loading={busy === `resolve-${r.id}`}
                      onClick={() => runAction(`resolve-${r.id}`, () => resolveAdminDocumentReport(r.id, { status: "RESOLVED" }))}
                    >
                      Đánh dấu đã xử lý
                    </BeaconVieButton>
                    <BeaconVieButton
                      tone="ghost"
                      className="min-h-8! px-3! py-1! text-xs"
                      loading={busy === `dismiss-${r.id}`}
                      onClick={() => runAction(`dismiss-${r.id}`, () => resolveAdminDocumentReport(r.id, { status: "DISMISSED" }))}
                    >
                      Bỏ qua
                    </BeaconVieButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModerationReport({ moderation }: { moderation: AdminDocumentModeration }) {
  const { scores, risks, suggestions, detections, rest } = analyzeModeration(moderation);

  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-black">Quyết định:</span>
        <StatusPill value={moderation.decision} />
      </div>

      {risks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {risks.map(([key, value]) => (
            <RiskBadge key={key} label={humanizeKey(key)} level={value} />
          ))}
        </div>
      )}

      {scores.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {scores.map(([key, value]) => (
            <div key={key} className="rounded-xl bg-white p-2 text-center dark:bg-slate-900">
              <p className="text-[10px] font-black uppercase text-slate-400">{humanizeKey(key)}</p>
              <p className="text-lg font-black">{value}</p>
            </div>
          ))}
        </div>
      )}

      {detections.length > 0 && (
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {detections.map(([key, value]) => (
            <p key={key}>
              {humanizeKey(key)}: <span className="font-black">{value}</span>
            </p>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          <p className="mb-1 font-black text-slate-700 dark:text-slate-200">Gợi ý từ AI</p>
          {suggestions.map(([key, value]) => (
            <p key={key}>
              {humanizeKey(key)}: {value}
            </p>
          ))}
        </div>
      )}

      {moderation.warnings && moderation.warnings.length > 0 && (
        <div className="text-xs font-semibold">
          <p className="mb-1 font-black text-amber-700 dark:text-amber-300">Cảnh báo</p>
          <ul className="list-disc space-y-0.5 pl-4 text-slate-600 dark:text-slate-300">
            {moderation.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {moderation.rejectionReasons && moderation.rejectionReasons.length > 0 && (
        <div className="text-xs font-semibold">
          <p className="mb-1 font-black text-rose-700 dark:text-rose-300">Lý do từ chối (đề xuất)</p>
          <ul className="list-disc space-y-0.5 pl-4 text-slate-600 dark:text-slate-300">
            {moderation.rejectionReasons.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {moderation.requiredChanges && moderation.requiredChanges.length > 0 && (
        <div className="text-xs font-semibold">
          <p className="mb-1 font-black text-violet-700 dark:text-violet-300">Yêu cầu chỉnh sửa (đề xuất)</p>
          <ul className="list-disc space-y-0.5 pl-4 text-slate-600 dark:text-slate-300">
            {moderation.requiredChanges.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 sm:grid-cols-3">
          {rest.map(([key, value]) => (
            <p key={key}>
              {humanizeKey(key)}: <span className="font-bold text-slate-700 dark:text-slate-200">{String(value)}</span>
            </p>
          ))}
        </div>
      )}

      {moderation.createdAt && (
        <p className="text-[11px] font-semibold text-slate-400">Đánh giá lúc {formatDate(moderation.createdAt)}</p>
      )}
    </div>
  );
}

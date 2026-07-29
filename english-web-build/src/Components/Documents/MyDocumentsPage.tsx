"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileUp,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BeaconVieButton,
  BeaconVieCard,
  BeaconVieDialog,
  BeaconVieDialogCloseButton,
  BeaconVieProgress,
  BeaconVieSectionHeader,
  BeaconVieSkeleton,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { formatDate, formatNumber } from "@/src/lib/locale-format";
import {
  DocumentLevel,
  LearningDocumentStatus,
  MyDocumentDetail,
  MyDocumentSummary,
  deleteMyDocument,
  getMyDocument,
  listMyDocuments,
  resubmitDocument,
  updateMyDocument,
} from "@/src/lib/documents-api";
import {
  connectDocumentsSocket,
  subscribeToDocument,
  unsubscribeFromDocument,
  type DocumentProcessingFailedEvent,
  type DocumentProcessingProgressEvent,
  type DocumentPublishedEvent,
} from "@/src/lib/documents-socket";
import {
  DOCUMENT_LEVELS,
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_STATUS_TONE,
  STATUS_TONE_CLASSNAME,
  stepLabel,
} from "./documents-labels";

const ACTIVE_STATUSES: LearningDocumentStatus[] = [
  "UPLOADING",
  "PROCESSING",
  "AI_REVIEWING",
  "PENDING_ADMIN_REVIEW",
  "CHANGES_REQUESTED",
];
const EDITABLE_STATUSES: LearningDocumentStatus[] = ["DRAFT", "CHANGES_REQUESTED", "REJECTED", "FAILED"];
const DELETABLE_STATUSES: LearningDocumentStatus[] = ["DRAFT", "FAILED", "REJECTED"];
const RESUBMITTABLE_STATUSES: LearningDocumentStatus[] = ["CHANGES_REQUESTED", "REJECTED", "FAILED"];

const STATUS_FILTERS: Array<{ value: "ALL" | LearningDocumentStatus; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "PENDING_ADMIN_REVIEW", label: "Chờ duyệt" },
  { value: "CHANGES_REQUESTED", label: "Cần chỉnh sửa" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
  { value: "REJECTED", label: "Bị từ chối" },
];

export default function MyDocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [items, setItems] = useState<MyDocumentSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | LearningDocumentStatus>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(highlightId);
  const [details, setDetails] = useState<Record<string, MyDocumentDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<MyDocumentSummary | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const expandedIdRef = useRef<string | null>(expandedId);

  useEffect(() => {
    expandedIdRef.current = expandedId;
  }, [expandedId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listMyDocuments({ limit: 50 });
      setItems(response.items);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, "Không tải được danh sách tài liệu của bạn."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, items]);

  const activeDocumentIds = useMemo(
    () => (items ?? []).filter((item) => ACTIVE_STATUSES.includes(item.status)).map((item) => item.id),
    [items],
  );

  useEffect(() => {
    if (activeDocumentIds.length === 0) return undefined;
    const socket = connectDocumentsSocket();
    activeDocumentIds.forEach((id) => subscribeToDocument(id));

    function applyStatusUpdate(documentId: string, patch: Partial<MyDocumentSummary>) {
      setItems((current) =>
        current ? current.map((item) => (item.id === documentId ? { ...item, ...patch } : item)) : current,
      );
    }

    function onProgress(payload: DocumentProcessingProgressEvent) {
      applyStatusUpdate(payload.documentId, {
        status: (payload.status as LearningDocumentStatus) ?? undefined,
      });
      if (expandedIdRef.current === payload.documentId) refreshDetail(payload.documentId);
    }
    function onFailed(payload: DocumentProcessingFailedEvent) {
      applyStatusUpdate(payload.documentId, { status: "FAILED" });
    }
    function onPublished(payload: DocumentPublishedEvent) {
      applyStatusUpdate(payload.documentId, { status: "PUBLISHED" });
      if (expandedIdRef.current === payload.documentId) refreshDetail(payload.documentId);
    }

    socket?.on("document.processing.progress", onProgress);
    socket?.on("document.processing.failed", onFailed);
    socket?.on("document.published", onPublished);

    return () => {
      activeDocumentIds.forEach((id) => unsubscribeFromDocument(id));
      socket?.off("document.processing.progress", onProgress);
      socket?.off("document.processing.failed", onFailed);
      socket?.off("document.published", onPublished);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocumentIds.join(",")]);

  async function refreshDetail(documentId: string) {
    try {
      const detail = await getMyDocument(documentId);
      setDetails((current) => ({ ...current, [documentId]: detail }));
    } catch {
      // best effort — keep previously loaded detail if refresh fails
    }
  }

  async function toggleExpand(documentId: string) {
    const next = expandedId === documentId ? null : documentId;
    setExpandedId(next);
    if (next && !details[next]) {
      setDetailLoading(next);
      try {
        const detail = await getMyDocument(next);
        setDetails((current) => ({ ...current, [next]: detail }));
      } catch (caughtError) {
        setError(getApiErrorMessage(caughtError, "Không tải được chi tiết tài liệu."));
      } finally {
        setDetailLoading(null);
      }
    }
  }

  async function handleDelete(document: MyDocumentSummary) {
    if (!window.confirm(`Xoá tài liệu "${document.title}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await deleteMyDocument(document.id);
      setItems((current) => (current ? current.filter((item) => item.id !== document.id) : current));
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, "Không thể xoá tài liệu."));
    }
  }

  const filteredItems = useMemo(() => {
    if (!items) return null;
    if (statusFilter === "ALL") return items;
    if (statusFilter === "PROCESSING") {
      return items.filter((item) =>
        ["DRAFT", "UPLOADING", "PROCESSING", "AI_REVIEWING"].includes(item.status),
      );
    }
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <BeaconVieSectionHeader
        eyebrow="Thư viện tài liệu"
        title="Tài liệu của tôi"
        description="Theo dõi trạng thái kiểm duyệt, chỉnh sửa hoặc gửi lại tài liệu bạn đã đăng."
        action={
          <Link href="/documents/upload">
            <BeaconVieButton>
              <Upload aria-hidden className="h-4 w-4" />
              Đăng tài liệu mới
            </BeaconVieButton>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              statusFilter === option.value
                ? "bg-[var(--BeaconVie-primary)] text-white"
                : "border border-[var(--BeaconVie-border)] text-[var(--BeaconVie-muted)] hover:bg-[var(--BeaconVie-hover-tint)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <BeaconVieSkeleton key={index} className="h-32" />
          ))}
        </div>
      )}

      {!loading && filteredItems && filteredItems.length === 0 && (
        <BeaconVieState
          title={items && items.length > 0 ? "Không có tài liệu ở trạng thái này" : "Bạn chưa đăng tài liệu nào"}
          description="Chia sẻ tài liệu học tiếng Anh đầu tiên của bạn với cộng đồng BeaconVie."
          actionLabel="Đăng tài liệu"
          onAction={() => router.push("/documents/upload")}
        />
      )}

      {!loading && filteredItems && filteredItems.length > 0 && (
        <div className="space-y-4">
          {filteredItems.map((document) => (
            <div key={document.id} ref={document.id === highlightId ? highlightRef : undefined}>
              <MyDocumentRow
                document={document}
                highlighted={document.id === highlightId}
                expanded={expandedId === document.id}
                detail={details[document.id] ?? null}
                detailLoading={detailLoading === document.id}
                onToggleExpand={() => toggleExpand(document.id)}
                onEdit={() => setEditTarget(document)}
                onDelete={() => handleDelete(document)}
                onResubmitted={() => {
                  load();
                  refreshDetail(document.id);
                }}
              />
            </div>
          ))}
        </div>
      )}

      <EditDocumentDialog
        document={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          setItems((current) =>
            current ? current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)) : current,
          );
          setEditTarget(null);
        }}
      />
    </div>
  );
}

function MyDocumentRow({
  document,
  highlighted,
  expanded,
  detail,
  detailLoading,
  onToggleExpand,
  onEdit,
  onDelete,
  onResubmitted,
}: {
  document: MyDocumentSummary;
  highlighted: boolean;
  expanded: boolean;
  detail: MyDocumentDetail | null;
  detailLoading: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResubmitted: () => void;
}) {
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tone = DOCUMENT_STATUS_TONE[document.status];
  const canEdit = EDITABLE_STATUSES.includes(document.status);
  const canDelete = DELETABLE_STATUSES.includes(document.status);
  const canResubmit = RESUBMITTABLE_STATUSES.includes(document.status);
  const latestDecision = detail?.moderationHistory?.[0];

  async function handleResubmitFile(file: File) {
    setResubmitting(true);
    setResubmitError("");
    try {
      await resubmitDocument(document.id, file);
      onResubmitted();
    } catch (caughtError) {
      setResubmitError(getApiErrorMessage(caughtError, "Không thể gửi lại tài liệu."));
    } finally {
      setResubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <BeaconVieCard className={`p-5 ${highlighted ? "ring-2 ring-[var(--BeaconVie-primary)]" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_TONE_CLASSNAME[tone]}`}
            >
              {DOCUMENT_STATUS_LABEL[document.status]}
            </span>
            {document.activeVersion?.versionNumber ? (
              <span className="text-xs font-bold text-[var(--BeaconVie-muted)]">
                v{document.activeVersion.versionNumber}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 truncate text-lg font-black text-[var(--BeaconVie-ink)]">{document.title}</h3>
          <p className="mt-1 text-xs font-semibold text-[var(--BeaconVie-muted)]">
            {document.category}
            {document.level ? ` · ${document.level}` : ""} · Cập nhật {formatDate(document.updatedAt, "vi")}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="shrink-0 rounded-xl border border-[var(--BeaconVie-border)] p-2 text-[var(--BeaconVie-muted)] transition hover:bg-[var(--BeaconVie-hover-tint)]"
          aria-label={expanded ? "Thu gọn" : "Xem chi tiết"}
        >
          {expanded ? <ChevronUp aria-hidden className="h-4 w-4" /> : <ChevronDown aria-hidden className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-[var(--BeaconVie-muted)]">
        <span className="flex items-center gap-1">
          <Eye aria-hidden className="h-3.5 w-3.5" />
          {formatNumber(document.viewCount, "vi")} lượt xem
        </span>
        <span className="flex items-center gap-1">
          <Download aria-hidden className="h-3.5 w-3.5" />
          {formatNumber(document.downloadCount, "vi")} lượt tải
        </span>
        {document.ratingCount > 0 && (
          <span>
            {document.ratingAverage.toFixed(1)} sao ({formatNumber(document.ratingCount, "vi")})
          </span>
        )}
      </div>

      {(document.status === "CHANGES_REQUESTED" || document.status === "REJECTED") &&
        document.moderation && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="flex items-center gap-1 font-black">
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              {document.status === "REJECTED" ? "Lý do từ chối" : "Cần chỉnh sửa"}
            </p>
            {document.moderation.rejectionReasons && document.moderation.rejectionReasons.length > 0 && (
              <ul className="mt-1 list-inside list-disc">
                {document.moderation.rejectionReasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            )}
            {document.moderation.requiredChanges && document.moderation.requiredChanges.length > 0 && (
              <ul className="mt-1 list-inside list-disc">
                {document.moderation.requiredChanges.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            )}
          </div>
        )}

      <div className="mt-4 flex flex-wrap gap-2">
        {document.status === "PUBLISHED" && (
          <Link href={`/documents/${document.slug}`}>
            <BeaconVieButton tone="soft">
              <Eye aria-hidden className="h-4 w-4" />
              Xem trang công khai
            </BeaconVieButton>
          </Link>
        )}
        {canEdit && (
          <BeaconVieButton tone="soft" onClick={onEdit}>
            <Pencil aria-hidden className="h-4 w-4" />
            Sửa
          </BeaconVieButton>
        )}
        {canResubmit && (
          <>
            <BeaconVieButton
              tone="soft"
              loading={resubmitting}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp aria-hidden className="h-4 w-4" />
              Gửi lại
            </BeaconVieButton>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".pdf,.docx,.pptx,.txt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleResubmitFile(file);
              }}
            />
          </>
        )}
        {canDelete && (
          <BeaconVieButton tone="danger" onClick={onDelete}>
            <Trash2 aria-hidden className="h-4 w-4" />
            Xoá
          </BeaconVieButton>
        )}
      </div>

      {resubmitError && <p className="mt-2 text-sm font-bold text-rose-600">{resubmitError}</p>}

      {expanded && (
        <div className="mt-4 border-t border-[var(--BeaconVie-border)] pt-4">
          {detailLoading && !detail && (
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--BeaconVie-muted)]">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Đang tải chi tiết...
            </div>
          )}

          {detail && (
            <div className="space-y-5">
              {detail.description && (
                <p className="text-sm font-semibold text-[var(--BeaconVie-muted)]">{detail.description}</p>
              )}

              {latestDecision && !latestDecision.allowResubmission && canResubmit && (
                <p className="text-xs font-bold text-[var(--BeaconVie-danger)]">
                  Tài liệu này không được phép gửi lại theo quyết định kiểm duyệt gần nhất.
                </p>
              )}

              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">
                  Tiến trình xử lý
                </h4>
                <ol className="mt-2 space-y-2">
                  {detail.processingEvents.length === 0 && (
                    <li className="text-sm font-semibold text-[var(--BeaconVie-muted)]">Chưa có sự kiện xử lý.</li>
                  )}
                  {detail.processingEvents.map((eventItem) => (
                    <li key={eventItem.id} className="rounded-xl border border-[var(--BeaconVie-border)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-[var(--BeaconVie-ink)]">
                          {stepLabel(eventItem.step)}
                        </span>
                        <span className="text-xs font-bold text-[var(--BeaconVie-muted)]">
                          {formatDate(eventItem.createdAt, "vi", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {eventItem.message && (
                        <p className="mt-1 text-xs font-semibold text-[var(--BeaconVie-muted)]">{eventItem.message}</p>
                      )}
                      <BeaconVieProgress value={eventItem.progress} className="mt-2 h-2" />
                    </li>
                  ))}
                </ol>
              </div>

              {detail.moderationHistory.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">
                    Lịch sử kiểm duyệt
                  </h4>
                  <ol className="mt-2 space-y-2">
                    {detail.moderationHistory.map((historyItem) => (
                      <li key={historyItem.id} className="rounded-xl border border-[var(--BeaconVie-border)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-[var(--BeaconVie-ink)]">{historyItem.action}</span>
                          <span className="text-xs font-bold text-[var(--BeaconVie-muted)]">
                            {formatDate(historyItem.createdAt, "vi", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {historyItem.userFacingReason && (
                          <p className="mt-1 text-xs font-semibold text-[var(--BeaconVie-muted)]">
                            {historyItem.userFacingReason}
                          </p>
                        )}
                        {historyItem.requiredChanges && historyItem.requiredChanges.length > 0 && (
                          <ul className="mt-1 list-inside list-disc text-xs font-semibold text-[var(--BeaconVie-muted)]">
                            {historyItem.requiredChanges.map((change, index) => (
                              <li key={index}>{change}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </BeaconVieCard>
  );
}

function EditDocumentDialog({
  document,
  onClose,
  onSaved,
}: {
  document: MyDocumentSummary | null;
  onClose: () => void;
  onSaved: (updated: MyDocumentSummary) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<DocumentLevel | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setDescription(document.description ?? "");
      setCategory(document.category);
      setLevel((document.level as DocumentLevel) ?? "");
      setError("");
    }
  }, [document]);

  async function save() {
    if (!document) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateMyDocument(document.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim(),
        level: level || undefined,
      });
      onSaved(updated);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, "Không thể lưu thay đổi."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BeaconVieDialog open={Boolean(document)} onClose={onClose} titleId="edit-document-title">
      <div className="flex items-start justify-between gap-4">
        <h2 id="edit-document-title" className="text-lg font-black text-[var(--BeaconVie-ink)]">
          Chỉnh sửa tài liệu
        </h2>
        <BeaconVieDialogCloseButton onClose={onClose} />
      </div>

      <div className="mt-4 space-y-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tiêu đề"
          className="BeaconVie-input w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Mô tả"
          rows={3}
          className="BeaconVie-input w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
        />
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Danh mục"
          className="BeaconVie-input w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
        />
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as DocumentLevel | "")}
          className="BeaconVie-input w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
        >
          <option value="">Không xác định</option>
          {DOCUMENT_LEVELS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <BeaconVieButton className="w-full" loading={saving} onClick={save}>
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          Lưu thay đổi
        </BeaconVieButton>
      </div>
    </BeaconVieDialog>
  );
}

"use client";

// Progress/detail view for a single Gemini generation
// (/admin/documents/generator/[id]) — overall pipeline progress, current
// step, a per-section checklist with retry-section support, and once the
// version reaches PENDING_ADMIN_REVIEW/READY_FOR_REVIEW a CTA into the
// moderation queue. Live-updates via the /documents socket room instead
// of polling.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  AdminDocumentGenerationDetail,
  AdminDocumentGenerationVersion,
  DocumentGenerationSection,
  cancelAdminDocumentGeneration,
  getAdminDocumentGeneration,
  retryAdminDocumentGeneration,
  retryAdminDocumentGenerationSection,
} from "@/src/lib/admin-documents-api";
import {
  connectDocumentSocket,
  onDocumentEvent,
  releaseDocumentSocket,
  subscribeToDocument,
  unsubscribeFromDocument,
} from "@/src/lib/admin-documents-socket";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { BeaconVieButton, BeaconVieLoadingState, BeaconVieProgress, BeaconVieState } from "@/src/Components/UI/BeaconVie";
import { AdminDocumentsAccessGate, formatDate, Panel, StatusPill } from "./shared";

function describeStep(step?: string | null): string {
  if (!step) return "Đang xử lý";
  const lessonMatch = step.match(/lesson[-_]?(\d+)/i);
  if (lessonMatch) return `Đang tạo bài ${lessonMatch[1]}`;
  if (/final[-_]?test/i.test(step)) return "Đang tạo bài kiểm tra cuối";
  if (/study[-_]?plan/i.test(step)) return "Đang tạo lộ trình học";
  if (/outline/i.test(step)) return "Đang tạo dàn ý";
  if (/render/i.test(step)) return "Đang render PDF";
  if (/valid/i.test(step)) return "Đang kiểm tra PDF";
  if (/scan/i.test(step)) return "Đang quét nội dung";
  if (/moderat/i.test(step)) return "Đang kiểm duyệt AI";
  return step;
}

const SECTION_STATUS_ICON: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  NEEDS_ADMIN_ACTION: XCircle,
};

export default function AdminDocumentGenerationDetailPage({ documentId }: { documentId: string }) {
  return (
    <AdminDocumentsAccessGate>
      <AdminDocumentGenerationDetailContent documentId={documentId} />
    </AdminDocumentsAccessGate>
  );
}

function AdminDocumentGenerationDetailContent({ documentId }: { documentId: string }) {
  const [detail, setDetail] = useState<AdminDocumentGenerationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getAdminDocumentGeneration(documentId);
      setDetail(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tải được tiến trình tạo tài liệu."));
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

  const latestVersion: AdminDocumentGenerationVersion | undefined = useMemo(() => {
    if (!detail?.versions?.length) return undefined;
    return [...detail.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
  }, [detail]);

  const latestEvent = useMemo(() => {
    if (!detail?.processingEvents?.length) return undefined;
    return [...detail.processingEvents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [detail]);

  const overallProgress = useMemo(() => {
    if (typeof latestEvent?.progress === "number") return Math.max(0, Math.min(100, latestEvent.progress));
    const sections = latestVersion?.sections ?? [];
    if (sections.length === 0) return 0;
    const completed = sections.filter((s) => s.status?.toUpperCase() === "COMPLETED").length;
    return Math.round((completed / sections.length) * 100);
  }, [latestEvent, latestVersion]);

  async function runAction(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setActionError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Thao tác thất bại."));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl">
          <BeaconVieLoadingState label="Đang tải tiến trình tạo tài liệu..." />
        </div>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl">
          <BeaconVieState title="Không tải được tài liệu" description={error ?? undefined} tone="error" actionLabel="Thử lại" onAction={() => void load()} />
        </div>
      </main>
    );
  }

  const status = detail.status?.toUpperCase();
  const isRunning = status === "GENERATING" || status === "PROCESSING";
  const isFailed = status === "FAILED";
  const readyForModeration = status === "PENDING_ADMIN_REVIEW" || status === "READY_FOR_REVIEW";
  const sections = (latestVersion?.sections ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Link href="/admin/documents/generator" className="inline-flex items-center gap-1 text-sm font-black text-violet-700">
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>

        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black">{detail.title}</h1>
            <StatusPill value={detail.status} />
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {detail.category} {detail.level ? `· ${detail.level}` : ""} · phiên bản v{latestVersion?.versionNumber ?? "-"}
          </p>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs font-black text-slate-500">
              <span className="flex items-center gap-1.5">
                {isRunning && <Loader2 size={14} className="animate-spin" />}
                {describeStep(latestEvent?.step)}
              </span>
              <span>{overallProgress}%</span>
            </div>
            <BeaconVieProgress value={overallProgress} />
          </div>

          {actionError && (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
              {actionError}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {isRunning && (
              <BeaconVieButton
                tone="danger"
                loading={busy === "cancel"}
                onClick={() => runAction("cancel", () => cancelAdminDocumentGeneration(documentId))}
              >
                Huỷ tạo tài liệu
              </BeaconVieButton>
            )}
            {isFailed && (
              <BeaconVieButton
                tone="soft"
                loading={busy === "retry"}
                onClick={() => runAction("retry", () => retryAdminDocumentGeneration(documentId))}
              >
                Retry toàn bộ pipeline
              </BeaconVieButton>
            )}
            {readyForModeration && (
              // Styled as a link, not <BeaconVieButton><Link> — nesting a
              // <button> inside an <a> is invalid HTML. Matches the
              // Link+BeaconVie-button-primary pattern used in AppSidebar.
              <Link
                href={`/admin/documents/moderation?documentId=${documentId}`}
                className="BeaconVie-button-primary"
              >
                Đi tới hàng chờ duyệt
              </Link>
            )}
          </div>
        </header>

        <Panel title="Danh sách bài học / phần" description="Trạng thái từng phần trong tài liệu.">
          {sections.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">Chưa có dữ liệu phần nào.</p>
          ) : (
            <div className="space-y-2">
              {sections.map((section) => (
                <SectionRow
                  key={section.sectionKey}
                  section={section}
                  busy={busy === `section-${section.sectionKey}`}
                  onRetry={() =>
                    runAction(`section-${section.sectionKey}`, () =>
                      retryAdminDocumentGenerationSection(documentId, section.sectionKey),
                    )
                  }
                />
              ))}
            </div>
          )}
        </Panel>

        {detail.processingEvents?.length > 0 && (
          <Panel title="Nhật ký xử lý">
            <div className="space-y-1.5">
              {[...detail.processingEvents]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((e, i) => (
                  <div
                    key={e.id ?? i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold dark:bg-slate-950"
                  >
                    <span>
                      {describeStep(e.step)} {e.message ? `— ${e.message}` : ""}
                    </span>
                    <span className="text-slate-400">{formatDate(e.createdAt)}</span>
                  </div>
                ))}
            </div>
          </Panel>
        )}
      </div>
    </main>
  );
}

function SectionRow({
  section,
  busy,
  onRetry,
}: {
  section: DocumentGenerationSection;
  busy: boolean;
  onRetry: () => void;
}) {
  const status = section.status?.toUpperCase() ?? "";
  const Icon = SECTION_STATUS_ICON[status] ?? Loader2;
  const canRetry = status === "FAILED" || status === "NEEDS_ADMIN_ACTION";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <Icon
          size={18}
          className={
            status === "COMPLETED"
              ? "text-emerald-600"
              : status === "FAILED" || status === "NEEDS_ADMIN_ACTION"
                ? "text-rose-600"
                : "animate-spin text-violet-600"
          }
        />
        <div>
          <p className="font-black">{section.title}</p>
          <p className="text-xs font-semibold text-slate-500">
            {section.sectionType} {section.required ? "· bắt buộc" : "· tuỳ chọn"}
            {section.attemptCount ? ` · lần thử ${section.attemptCount}` : ""}
          </p>
          {section.failureMessage && (
            <p className="mt-1 text-xs font-bold text-rose-600">{section.failureMessage}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill value={section.status} />
        {canRetry && (
          <BeaconVieButton tone="soft" className="min-h-9! px-3! py-1.5! text-xs" loading={busy} onClick={onRetry}>
            Retry phần này
          </BeaconVieButton>
        )}
      </div>
    </div>
  );
}

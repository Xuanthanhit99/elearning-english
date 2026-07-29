"use client";

// Admin moderation queue: documents awaiting admin review
// (PENDING_ADMIN_REVIEW), prioritizing community submissions, plus a
// standalone "unresolved reports" section pulled from document detail
// reports[] across the currently loaded queue.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  AdminDocumentSummary,
  getAdminDocumentDetail,
  listAdminDocuments,
} from "@/src/lib/admin-documents-api";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { BeaconVieDialog } from "@/src/Components/UI/BeaconVie";
import {
  AdminDocumentsAccessGate,
  formatDate,
  Pager,
  Panel,
  SmallAction,
  StatusPill,
} from "./shared";
import { DocumentDetailPanel } from "./DocumentDetailPanel";

const PAGE_SIZE = 20;

export default function AdminModerationQueuePage() {
  return (
    <AdminDocumentsAccessGate>
      <AdminModerationQueueContent />
    </AdminDocumentsAccessGate>
  );
}

function AdminModerationQueueContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminDocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"" | "community" | "beaconvie">("");
  // Deep-link continuity: the generator's "Đi tới hàng chờ duyệt" CTA
  // passes ?documentId=... so the just-generated document opens directly
  // instead of making the admin hunt for it in the queue.
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("documentId"));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminDocuments({
        status: "PENDING_ADMIN_REVIEW",
        source: sourceFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(data.items);
      setTotal(data.meta.total);
      setTotalPages(data.meta.totalPages || 1);
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tải được hàng chờ kiểm duyệt."));
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, page]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  // Prioritize community submissions: they carry more risk (unknown
  // authors, no institutional trust) than BeaconVie's own official
  // uploads/generations, so surface them first within the same page.
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aCommunity = a.source?.toLowerCase() === "community" ? 0 : 1;
      const bCommunity = b.source?.toLowerCase() === "community" ? 0 : 1;
      if (aCommunity !== bCommunity) return aCommunity - bCommunity;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [items]);

  // Memoized so UnresolvedReportsPanel's effect (keyed on this array)
  // doesn't re-fire on every render — `items.map(...)` inline would
  // produce a new array reference each time and loop.
  const documentIds = useMemo(() => items.map((i) => i.id), [items]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-black md:text-3xl">Kiểm duyệt tài liệu</h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
            Hàng chờ tài liệu đang chờ duyệt (PENDING_ADMIN_REVIEW), ưu tiên tài liệu cộng đồng.
            {total > 0 && ` Hiện có ${total} tài liệu chờ xử lý.`}
          </p>
          <div className="mt-3 flex gap-2">
            {[
              ["", "Tất cả"],
              ["community", "Cộng đồng"],
              ["beaconvie", "BeaconVie"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPage(1);
                  setSourceFilter(value as typeof sourceFilter);
                }}
                className={[
                  "rounded-2xl px-4 py-2 text-sm font-black transition",
                  sourceFilter === value
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        <Panel title="Hàng chờ duyệt" description="Bấm vào một mục để mở chi tiết và thao tác duyệt.">
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-3xl bg-slate-50 p-6 text-center dark:bg-slate-950">
              <p className="font-black">Hàng chờ trống</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Không có tài liệu nào đang chờ duyệt.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {sortedItems.map((item) => (
                  // A plain div (not <button>) since it wraps the SmallAction
                  // button below — nesting <button> inside <button> is
                  // invalid HTML. The whole row is still clickable via
                  // onClick; SmallAction remains the keyboard-accessible
                  // control.
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className="flex w-full cursor-pointer flex-col gap-2 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-violet-50 dark:bg-slate-950 dark:hover:bg-violet-950/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">{item.title}</p>
                        {item.source?.toLowerCase() === "community" && (
                          <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Cộng đồng
                          </span>
                        )}
                        <StatusPill value={item.status} />
                        {item.moderation?.decision && (
                          <span className="text-xs font-bold text-slate-500">
                            AI: {item.moderation.decision}
                            {typeof item.moderation.qualityScore === "number"
                              ? ` (${item.moderation.qualityScore})`
                              : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {item.author?.fullname} ({item.author?.email}) · {item.category}
                        {item.level ? ` · ${item.level}` : ""} · nộp lúc {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <SmallAction label="Xem & duyệt" onClick={() => setSelectedId(item.id)} />
                  </div>
                ))}
              </div>
              <Pager page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </Panel>

        <UnresolvedReportsPanel documentIds={documentIds} onOpenDocument={setSelectedId} />
      </div>

      <BeaconVieDialog
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        titleId="admin-moderation-detail-title"
        className="max-w-3xl max-h-[85vh] overflow-y-auto"
      >
        {selectedId && (
          <DocumentDetailPanel
            documentId={selectedId}
            titleId="admin-moderation-detail-title"
            onChanged={() => void load()}
            onClose={() => setSelectedId(null)}
          />
        )}
      </BeaconVieDialog>
    </main>
  );
}

/**
 * There is no dedicated "list all unresolved reports" endpoint — reports
 * live on each document's detail payload (`reports[]`). This section
 * fetches detail for the documents currently in view and surfaces any
 * with a pending report, so admins don't have to open every item to spot
 * one. It intentionally scopes to the current queue page rather than the
 * whole catalogue, since a global reports endpoint doesn't exist.
 */
function UnresolvedReportsPanel({
  documentIds,
  onOpenDocument,
}: {
  documentIds: string[];
  onOpenDocument: (id: string) => void;
}) {
  const [flagged, setFlagged] = useState<Array<{ id: string; title: string; reportCount: number }>>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Deferred via setTimeout so no setState call happens synchronously
    // in the effect body itself (react-hooks/set-state-in-effect).
    const handle = window.setTimeout(() => {
      if (documentIds.length === 0) {
        setFlagged([]);
        return;
      }
      setChecking(true);
      void (async () => {
        const results = await Promise.all(
          documentIds.map(async (id) => {
            try {
              const detail = await getAdminDocumentDetail(id);
              const pending = detail.reports.filter(
                (r) => r.status?.toUpperCase() === "PENDING" || r.status?.toUpperCase() === "OPEN",
              );
              return pending.length > 0 ? { id, title: detail.title, reportCount: pending.length } : null;
            } catch {
              return null;
            }
          }),
        );
        if (!cancelled) {
          setFlagged(results.filter((r): r is { id: string; title: string; reportCount: number } => r !== null));
          setChecking(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [documentIds]);

  if (!checking && flagged.length === 0) return null;

  return (
    <Panel
      title="Báo cáo chưa xử lý"
      description="Tài liệu trong hàng chờ hiện tại có báo cáo vi phạm từ người dùng chưa được xử lý."
    >
      {checking ? (
        <p className="text-sm font-semibold text-slate-500">Đang kiểm tra báo cáo...</p>
      ) : (
        <div className="space-y-2">
          {flagged.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onOpenDocument(f.id)}
              className="flex w-full items-center justify-between gap-2 rounded-2xl bg-rose-50 p-3 text-left text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} />
                {f.title}
              </span>
              <span>{f.reportCount} báo cáo</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

"use client";

// Admin Document Library — full catalogue with filters, an "official
// upload" flow (POST /admin/documents, source=BEACONVIE), and per-row
// moderation/publication actions via the shared DocumentDetailPanel.
import { useEffect, useMemo, useState } from "react";
import { UploadCloud } from "lucide-react";
import {
  AdminDocumentSummary,
  DOCUMENT_CREATION_TYPES,
  DOCUMENT_LEVELS,
  DOCUMENT_SOURCES,
  DOCUMENT_STATUSES,
  ListAdminDocumentsParams,
  listAdminDocuments,
  uploadAdminDocument,
} from "@/src/lib/admin-documents-api";
import { getApiErrorMessage } from "@/src/lib/api-error";
import {
  BeaconVieButton,
  BeaconVieDialog,
  BeaconVieDialogCloseButton,
} from "@/src/Components/UI/BeaconVie";
import {
  AdminDocumentsAccessGate,
  formatDate,
  Pager,
  Panel,
  ResponsiveTable,
  SmallAction,
  StatusPill,
} from "./shared";
import { DocumentDetailPanel } from "./DocumentDetailPanel";

const PAGE_SIZE = 20;

type UploadFormState = {
  title: string;
  description: string;
  category: string;
  level: string;
  skills: string;
  hasAnswerKey: boolean;
  hasAudio: boolean;
  allowDownload: boolean;
  file: File | null;
};

const emptyUploadForm: UploadFormState = {
  title: "",
  description: "",
  category: "",
  level: "",
  skills: "",
  hasAnswerKey: false,
  hasAudio: false,
  allowDownload: true,
  file: null,
};

export default function AdminDocumentsPage() {
  return (
    <AdminDocumentsAccessGate>
      <AdminDocumentsPageContent />
    </AdminDocumentsAccessGate>
  );
}

function AdminDocumentsPageContent() {
  const [items, setItems] = useState<AdminDocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [creationType, setCreationType] = useState("");
  const [category, setCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(emptyUploadForm);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const params = useMemo<ListAdminDocumentsParams>(
    () => ({
      status: status || undefined,
      source: (source as ListAdminDocumentsParams["source"]) || undefined,
      creationType: creationType || undefined,
      category: category || undefined,
      keyword: keyword || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, source, creationType, category, keyword, page],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminDocuments(params);
      setItems(data.items);
      setTotal(data.meta.total);
      setTotalPages(data.meta.totalPages || 1);
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tải được danh sách tài liệu."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Deferred via setTimeout (not called synchronously in the effect
    // body) to match the react-hooks/set-state-in-effect rule — see the
    // same pattern in app/(main)/admin/page.tsx.
    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Derived counts by status — computed from the currently loaded page
  // only (there is no dedicated admin document stats endpoint), so this
  // is labelled as "trên trang này" rather than implying a global total.
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const key = item.status?.toUpperCase() ?? "UNKNOWN";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [items]);

  async function handleUpload() {
    if (!uploadForm.file || !uploadForm.title || !uploadForm.category) return;
    setUploadBusy(true);
    setUploadError(null);
    try {
      await uploadAdminDocument({
        file: uploadForm.file,
        title: uploadForm.title,
        description: uploadForm.description || undefined,
        category: uploadForm.category,
        level: uploadForm.level || undefined,
        skills: uploadForm.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        hasAnswerKey: uploadForm.hasAnswerKey,
        hasAudio: uploadForm.hasAudio,
        allowDownload: uploadForm.allowDownload,
      });
      setUploadOpen(false);
      setUploadForm(emptyUploadForm);
      setPage(1);
      await load();
    } catch (err) {
      setUploadError(getApiErrorMessage(err, "Tải lên thất bại."));
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">Thư viện tài liệu</h1>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
              Quản lý toàn bộ tài liệu BeaconVie chính thức và tài liệu cộng đồng — duyệt, xuất
              bản, chỉnh sửa metadata, khôi phục phiên bản.
            </p>
          </div>
          <BeaconVieButton onClick={() => setUploadOpen(true)} className="shrink-0">
            <UploadCloud size={18} />
            Tải tài liệu chính thức
          </BeaconVieButton>
        </header>

        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Trang này" value={items.length} />
          <StatTile label="Tổng số" value={total} />
          <StatTile label="Chờ duyệt" value={statusCounts.get("PENDING_ADMIN_REVIEW") ?? 0} tone="warning" />
          <StatTile label="Đã xuất bản" value={statusCounts.get("PUBLISHED") ?? 0} tone="positive" />
          <StatTile label="Thất bại" value={statusCounts.get("FAILED") ?? 0} tone="negative" />
          <StatTile label="Đã ẩn/gỡ" value={(statusCounts.get("HIDDEN") ?? 0) + (statusCounts.get("REMOVED") ?? 0)} />
        </section>

        <Panel
          title="Bộ lọc"
          description="Lọc theo trạng thái, nguồn, loại tạo, danh mục hoặc từ khoá."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Tất cả trạng thái</option>
              {DOCUMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={source}
              onChange={(e) => {
                setPage(1);
                setSource(e.target.value);
              }}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Tất cả nguồn</option>
              {DOCUMENT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={creationType}
              onChange={(e) => {
                setPage(1);
                setCreationType(e.target.value);
              }}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Tất cả loại tạo</option>
              {DOCUMENT_CREATION_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              value={category}
              onChange={(e) => {
                setPage(1);
                setCategory(e.target.value);
              }}
              placeholder="Danh mục"
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
            />
            <div className="flex gap-2">
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setKeyword(keywordInput);
                  }
                }}
                placeholder="Tìm tiêu đề, slug..."
                className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setKeyword(keywordInput);
                }}
                className="min-h-11 rounded-2xl border border-violet-200 px-4 text-sm font-black text-violet-700"
              >
                Tìm
              </button>
            </div>
          </div>
        </Panel>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        <Panel title="Danh sách tài liệu" description={`${total} tài liệu phù hợp bộ lọc.`}>
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : (
            <>
              <ResponsiveTable
                columns={["Tài liệu", "Tác giả", "Nguồn / Loại", "Phiên bản", "Trạng thái", "Cập nhật", "Hành động"]}
                rows={items.map((item) => [
                  <div key="title" className="max-w-xs">
                    <p className="font-black">{item.title}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {item.category} {item.level ? `· ${item.level}` : ""}
                    </p>
                  </div>,
                  <div key="author">
                    <p className="font-black">{item.author?.fullname ?? "-"}</p>
                    <p className="text-xs font-semibold text-slate-500">{item.author?.email}</p>
                  </div>,
                  <div key="source" className="text-xs font-bold text-slate-500">
                    <p>{item.source}</p>
                    <p>{item.creationType}</p>
                  </div>,
                  item.activeVersion ? `v${item.activeVersion.versionNumber}` : "-",
                  <StatusPill key="status" value={item.status} />,
                  formatDate(item.updatedAt),
                  <SmallAction key="view" label="Xem chi tiết" onClick={() => setSelectedId(item.id)} />,
                ])}
              />
              <Pager page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </Panel>
      </div>

      <BeaconVieDialog
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        titleId="admin-document-detail-title"
        className="max-w-3xl max-h-[85vh] overflow-y-auto"
      >
        {selectedId && (
          <DocumentDetailPanel
            documentId={selectedId}
            titleId="admin-document-detail-title"
            onChanged={() => void load()}
            onClose={() => setSelectedId(null)}
          />
        )}
      </BeaconVieDialog>

      <BeaconVieDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        titleId="admin-document-upload-title"
        className="max-w-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="admin-document-upload-title" className="text-lg font-black">
              Tải tài liệu chính thức BeaconVie
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Tài liệu sẽ ở trạng thái chờ duyệt (PENDING_ADMIN_REVIEW) — vẫn cần bấm Duyệt &amp;
              Xuất bản sau khi tải lên.
            </p>
          </div>
          <BeaconVieDialogCloseButton onClose={() => setUploadOpen(false)} />
        </div>

        {uploadError && (
          <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
            {uploadError}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            File tài liệu (bắt buộc)
            <input
              type="file"
              onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Tiêu đề (bắt buộc)
            <input
              value={uploadForm.title}
              onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Mô tả
            <textarea
              value={uploadForm.description}
              onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
              rows={2}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Danh mục (bắt buộc)
              <input
                value={uploadForm.category}
                onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Trình độ
              <select
                value={uploadForm.level}
                onChange={(e) => setUploadForm((f) => ({ ...f, level: e.target.value }))}
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
          </div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Kỹ năng (phân cách bằng dấu phẩy)
            <input
              value={uploadForm.skills}
              onChange={(e) => setUploadForm((f) => ({ ...f, skills: e.target.value }))}
              placeholder="reading, listening"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={uploadForm.hasAnswerKey}
                onChange={(e) => setUploadForm((f) => ({ ...f, hasAnswerKey: e.target.checked }))}
              />
              Có đáp án
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={uploadForm.hasAudio}
                onChange={(e) => setUploadForm((f) => ({ ...f, hasAudio: e.target.checked }))}
              />
              Có audio
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={uploadForm.allowDownload}
                onChange={(e) => setUploadForm((f) => ({ ...f, allowDownload: e.target.checked }))}
              />
              Cho phép tải xuống
            </label>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <BeaconVieButton
            tone="primary"
            loading={uploadBusy}
            disabled={!uploadForm.file || !uploadForm.title || !uploadForm.category}
            onClick={() => void handleUpload()}
          >
            Tải lên
          </BeaconVieButton>
          <BeaconVieButton tone="ghost" onClick={() => setUploadOpen(false)}>
            Huỷ
          </BeaconVieButton>
        </div>
      </BeaconVieDialog>
    </main>
  );
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "warning" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "negative"
          ? "text-rose-600"
          : "text-slate-950 dark:text-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

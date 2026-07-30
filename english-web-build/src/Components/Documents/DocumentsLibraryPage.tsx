"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Upload, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BeaconVieButton,
  BeaconVieCard,
  BeaconVieSectionHeader,
  BeaconVieSkeleton,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";
import { useAuthStore } from "@/src/store/authStore";
import { buildLoginUrl } from "@/src/lib/auth-redirect";
import { useCommunityUploadAccess } from "@/src/lib/use-community-upload-access";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { formatNumber } from "@/src/lib/locale-format";
import {
  bookmarkDocument,
  DocumentCard,
  DocumentListParams,
  DocumentSourceFilter,
  listDocuments,
  requestDocumentDownload,
  unbookmarkDocument,
} from "@/src/lib/documents-api";
import { DocumentCardItem } from "./DocumentCardItem";
import {
  DOCUMENT_EXPLANATION_LANGUAGE_OPTIONS,
  DOCUMENT_FORMAT_OPTIONS,
  DOCUMENT_LEVELS,
  DOCUMENT_SKILL_OPTIONS,
  DOCUMENT_SORT_OPTIONS,
} from "./documents-labels";

const PAGE_LIMIT = 12;
const TRI_STATE_OPTIONS: Array<{ value: "" | "true" | "false"; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "true", label: "Có" },
  { value: "false", label: "Không" },
];

function triFromParam(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseFiltersFromSearchParams(searchParams: URLSearchParams): DocumentListParams & {
  page: number;
} {
  const source = searchParams.get("source");
  return {
    source: source === "community" ? "community" : "beaconvie",
    category: searchParams.get("category") || undefined,
    level: searchParams.get("level") || undefined,
    skill: searchParams.get("skill") || undefined,
    documentType: searchParams.get("documentType") || undefined,
    format: searchParams.get("format") || undefined,
    hasAnswerKey: triFromParam(searchParams.get("hasAnswerKey")),
    hasAudio: triFromParam(searchParams.get("hasAudio")),
    allowDownload: triFromParam(searchParams.get("allowDownload")),
    explanationLanguage: searchParams.get("explanationLanguage") || undefined,
    sort: (searchParams.get("sort") as DocumentListParams["sort"]) || "newest",
    keyword: searchParams.get("keyword") || undefined,
    page: Math.max(1, Number(searchParams.get("page")) || 1),
    limit: PAGE_LIMIT,
  };
}

export default function DocumentsLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const filters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams]);
  const [searchInput, setSearchInput] = useState(filters.keyword ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<DocumentCard[] | null>(null);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookmarkBusyId, setBookmarkBusyId] = useState<string | null>(null);
  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(filters.keyword ?? "");
  }, [filters.keyword]);

  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listDocuments(filters);
      setItems(response.items);
      setMeta(response.meta);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, "Không tải được danh sách tài liệu."));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    load();
  }, [load]);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>, options?: { resetPage?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      if (options?.resetPage !== false) {
        params.delete("page");
      }
      router.push(`/documents?${params.toString()}`);
    },
    [router, searchParams],
  );

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateParams({ keyword: searchInput.trim() || undefined });
  }

  function resetFilters() {
    router.push(`/documents?source=${filters.source}`);
  }

  const uploadHref = user ? "/documents/upload" : buildLoginUrl("/documents/upload");
  // UX only — backend (CommunityDocumentUploadGuard) is the real gate.
  // Guests still see the CTA (it routes to login, then the upload page
  // itself checks access); only hide it for a logged-in user we know is
  // denied.
  const { canUpload } = useCommunityUploadAccess();
  const showUploadCta = !user || canUpload !== false;

  async function toggleBookmark(document: DocumentCard) {
    if (!user) {
      router.push(buildLoginUrl(window.location.pathname + window.location.search));
      return;
    }
    setBookmarkBusyId(document.id);
    try {
      const result = document.isBookmarked
        ? await unbookmarkDocument(document.id)
        : await bookmarkDocument(document.id);
      setItems((current) =>
        current
          ? current.map((item) =>
              item.id === document.id ? { ...item, isBookmarked: result.bookmarked } : item,
            )
          : current,
      );
    } catch {
      // best-effort — leave state untouched, user can retry
    } finally {
      setBookmarkBusyId(null);
    }
  }

  async function download(document: DocumentCard) {
    if (!user) {
      router.push(buildLoginUrl(window.location.pathname + window.location.search));
      return;
    }
    setDownloadBusyId(document.id);
    try {
      const { url } = await requestDocumentDownload(document.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // best-effort — no destructive state to roll back
    } finally {
      setDownloadBusyId(null);
    }
  }

  const activeFilterCount = [
    filters.category,
    filters.level,
    filters.skill,
    filters.documentType,
    filters.format,
    filters.hasAnswerKey !== undefined ? "1" : undefined,
    filters.hasAudio !== undefined ? "1" : undefined,
    filters.allowDownload !== undefined ? "1" : undefined,
    filters.explanationLanguage,
  ].filter(Boolean).length;

  const pageNumbers = useMemo(() => {
    const total = meta?.totalPages ?? 1;
    const current = filters.page;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [meta?.totalPages, filters.page]);

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <BeaconVieSectionHeader
        eyebrow="Thư viện tài liệu"
        title="Thư viện tài liệu học tiếng Anh"
        description="Khám phá tài liệu chính thức từ BeaconVie và tài liệu do cộng đồng chia sẻ — tải về, lưu lại và đánh giá."
        action={
          showUploadCta ? (
            <Link href={uploadHref}>
              <BeaconVieButton>
                <Upload aria-hidden className="h-4 w-4" />
                Đăng tài liệu
              </BeaconVieButton>
            </Link>
          ) : undefined
        }
      />

      <form onSubmit={submitSearch} className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--BeaconVie-muted)]"
        />
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Tìm kiếm tài liệu theo tên, mô tả, chủ đề..."
          className="BeaconVie-input h-14 w-full rounded-2xl pl-12 pr-28 text-sm font-semibold outline-none"
        />
        <button
          type="submit"
          className="BeaconVie-button-primary absolute right-2 top-1/2 -translate-y-1/2 !min-h-10 !py-2"
        >
          Tìm kiếm
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {(["beaconvie", "community"] as DocumentSourceFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => updateParams({ source: key })}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              filters.source === key
                ? "bg-[var(--BeaconVie-primary)] text-white"
                : "border border-[var(--BeaconVie-border)] text-[var(--BeaconVie-muted)] hover:bg-[var(--BeaconVie-hover-tint)]"
            }`}
          >
            {key === "beaconvie" ? "Tài liệu BeaconVie" : "Cộng đồng chia sẻ"}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          className="ml-auto rounded-full border border-[var(--BeaconVie-border)] px-4 py-2 text-sm font-black text-[var(--BeaconVie-ink)] transition hover:bg-[var(--BeaconVie-hover-tint)]"
        >
          Bộ lọc {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
        </button>

        <select
          value={filters.sort}
          onChange={(event) => updateParams({ sort: event.target.value })}
          className="BeaconVie-input rounded-xl px-3 py-2 text-sm font-bold"
        >
          {DOCUMENT_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {showFilters && (
        <BeaconVieCard className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-bold text-[var(--BeaconVie-muted)]">
              Danh mục
              <input
                defaultValue={filters.category ?? ""}
                key={filters.category}
                onBlur={(event) => updateParams({ category: event.target.value.trim() || undefined })}
                placeholder="vd: Ngữ pháp, Từ vựng..."
                className="BeaconVie-input mt-1 w-full rounded-xl px-3 py-2 text-sm font-semibold"
              />
            </label>

            <label className="text-xs font-bold text-[var(--BeaconVie-muted)]">
              Loại tài liệu
              <input
                defaultValue={filters.documentType ?? ""}
                key={filters.documentType}
                onBlur={(event) => updateParams({ documentType: event.target.value.trim() || undefined })}
                placeholder="vd: Bài tập, Đề thi..."
                className="BeaconVie-input mt-1 w-full rounded-xl px-3 py-2 text-sm font-semibold"
              />
            </label>

            <label className="text-xs font-bold text-[var(--BeaconVie-muted)]">
              Kỹ năng
              <select
                value={filters.skill ?? ""}
                onChange={(event) => updateParams({ skill: event.target.value || undefined })}
                className="BeaconVie-input mt-1 w-full rounded-xl px-3 py-2 text-sm font-semibold"
              >
                <option value="">Tất cả</option>
                {DOCUMENT_SKILL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-[var(--BeaconVie-muted)]">
              Định dạng
              <select
                value={filters.format ?? ""}
                onChange={(event) => updateParams({ format: event.target.value || undefined })}
                className="BeaconVie-input mt-1 w-full rounded-xl px-3 py-2 text-sm font-semibold"
              >
                <option value="">Tất cả</option>
                {DOCUMENT_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-[var(--BeaconVie-muted)]">
              Ngôn ngữ giải thích
              <select
                value={filters.explanationLanguage ?? ""}
                onChange={(event) => updateParams({ explanationLanguage: event.target.value || undefined })}
                className="BeaconVie-input mt-1 w-full rounded-xl px-3 py-2 text-sm font-semibold"
              >
                <option value="">Tất cả</option>
                {DOCUMENT_EXPLANATION_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-xs font-bold text-[var(--BeaconVie-muted)]">
              Trình độ
              <div className="mt-1 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => updateParams({ level: undefined })}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${
                    !filters.level
                      ? "bg-[var(--BeaconVie-primary)] text-white"
                      : "border border-[var(--BeaconVie-border)]"
                  }`}
                >
                  Tất cả
                </button>
                {DOCUMENT_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateParams({ level })}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${
                      filters.level === level
                        ? "bg-[var(--BeaconVie-primary)] text-white"
                        : "border border-[var(--BeaconVie-border)]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-[var(--BeaconVie-border)] pt-4 sm:grid-cols-3">
            <TriStateFilter
              label="Có đáp án"
              value={filters.hasAnswerKey}
              onChange={(value) => updateParams({ hasAnswerKey: value })}
            />
            <TriStateFilter
              label="Có audio"
              value={filters.hasAudio}
              onChange={(value) => updateParams({ hasAudio: value })}
            />
            <TriStateFilter
              label="Cho phép tải xuống"
              value={filters.allowDownload}
              onChange={(value) => updateParams({ allowDownload: value })}
            />
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-sm font-bold text-[var(--BeaconVie-primary)]"
            >
              <X aria-hidden className="h-4 w-4" />
              Xoá tất cả bộ lọc
            </button>
          )}
        </BeaconVieCard>
      )}

      {meta && !loading && (
        <p className="text-sm font-bold text-[var(--BeaconVie-muted)]">
          {formatNumber(meta.total, "vi")} tài liệu phù hợp
        </p>
      )}

      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <BeaconVieSkeleton key={index} className="h-80" />
          ))}
        </div>
      )}

      {!loading && error && (
        <BeaconVieState
          title="Không thể tải danh sách tài liệu"
          description={error}
          actionLabel="Thử lại"
          onAction={load}
          tone="error"
        />
      )}

      {!loading && !error && items && items.length === 0 && (
        <BeaconVieState
          title="Không tìm thấy tài liệu phù hợp"
          description="Hãy thử điều chỉnh bộ lọc hoặc từ khoá tìm kiếm."
          actionLabel={activeFilterCount > 0 || filters.keyword ? "Xoá bộ lọc" : undefined}
          onAction={activeFilterCount > 0 || filters.keyword ? resetFilters : undefined}
        />
      )}

      {!loading && !error && items && items.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((document) => (
            <DocumentCardItem
              key={document.id}
              document={document}
              bookmarkBusy={bookmarkBusyId === document.id}
              downloadBusy={downloadBusyId === document.id}
              onToggleBookmark={() => toggleBookmark(document)}
              onDownload={() => download(document)}
            />
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() => updateParams({ page: String(filters.page - 1) }, { resetPage: false })}
            className="rounded-xl border border-[var(--BeaconVie-border)] p-3 disabled:opacity-40"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => updateParams({ page: String(pageNumber) }, { resetPage: false })}
              className={`h-11 min-w-11 rounded-xl font-black ${
                pageNumber === filters.page
                  ? "bg-[var(--BeaconVie-primary)] text-white"
                  : "border border-[var(--BeaconVie-border)]"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            disabled={filters.page >= meta.totalPages}
            onClick={() => updateParams({ page: String(filters.page + 1) }, { resetPage: false })}
            className="rounded-xl border border-[var(--BeaconVie-border)] p-3 disabled:opacity-40"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function TriStateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const current = value === undefined ? "" : value ? "true" : "false";
  return (
    <label className="text-xs font-bold text-[var(--BeaconVie-muted)]">
      {label}
      <div className="mt-1 flex overflow-hidden rounded-xl border border-[var(--BeaconVie-border)]">
        {TRI_STATE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value || undefined)}
            className={`flex-1 px-2 py-2 text-xs font-black transition ${
              current === option.value
                ? "bg-[var(--BeaconVie-primary)] text-white"
                : "text-[var(--BeaconVie-ink)] hover:bg-[var(--BeaconVie-hover-tint)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </label>
  );
}

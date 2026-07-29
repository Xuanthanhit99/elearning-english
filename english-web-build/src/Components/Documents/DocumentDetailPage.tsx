"use client";

import { useRouter } from "next/navigation";
import {
  BookmarkCheck,
  Bookmark,
  CheckCircle2,
  Download,
  Eye,
  Flag,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BeaconVieBadge,
  BeaconVieButton,
  BeaconVieCard,
  BeaconVieDialog,
  BeaconVieDialogCloseButton,
  BeaconVieLoadingState,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";
import { useAuthStore } from "@/src/store/authStore";
import { buildLoginUrl } from "@/src/lib/auth-redirect";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { formatDate, formatNumber } from "@/src/lib/locale-format";
import {
  DocumentCard,
  DocumentDetail,
  DocumentReportReason,
  bookmarkDocument,
  getDocumentBySlug,
  getRelatedDocuments,
  rateDocument,
  recordDocumentView,
  reportDocument,
  requestDocumentDownload,
  unbookmarkDocument,
} from "@/src/lib/documents-api";
import { DocumentCardItem } from "./DocumentCardItem";
import {
  DOCUMENT_REPORT_REASON_OPTIONS,
  documentTypeLabelFromMime,
  formatFileSize,
} from "./documents-labels";

export default function DocumentDetailPage({ slug }: { slug: string }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [related, setRelated] = useState<DocumentCard[]>([]);

  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const viewedRef = useRef<string | null>(null);

  const currentPath = `/documents/${slug}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const detail = await getDocumentBySlug(slug);
      setDocument(detail);
      getRelatedDocuments(detail.id)
        .then(setRelated)
        .catch(() => setRelated([]));
    } catch (caughtError: unknown) {
      const status = (caughtError as { normalized?: { status?: number } })?.normalized?.status;
      if (status === 404) {
        setNotFound(true);
      } else {
        setError(getApiErrorMessage(caughtError, "Không tải được tài liệu."));
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!document || viewedRef.current === document.id) return;
    viewedRef.current = document.id;
    recordDocumentView(document.id).catch(() => undefined);
  }, [document]);

  function requireLogin() {
    router.push(buildLoginUrl(currentPath));
  }

  async function toggleBookmark() {
    if (!document) return;
    if (!user) return requireLogin();
    setBookmarkBusy(true);
    try {
      const result = document.isBookmarked
        ? await unbookmarkDocument(document.id)
        : await bookmarkDocument(document.id);
      setDocument((current) => (current ? { ...current, isBookmarked: result.bookmarked } : current));
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, "Không thể cập nhật lưu tài liệu."));
    } finally {
      setBookmarkBusy(false);
    }
  }

  async function download() {
    if (!document) return;
    if (!user) return requireLogin();
    setDownloadBusy(true);
    try {
      const { url } = await requestDocumentDownload(document.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, "Không thể tải xuống tài liệu."));
    } finally {
      setDownloadBusy(false);
    }
  }

  async function submitRating(value: number, comment: string) {
    if (!document) return;
    if (!user) return requireLogin();
    const previous = document.myRating;
    setDocument((current) => (current ? { ...current, myRating: { value, comment } } : current));
    try {
      await rateDocument(document.id, value, comment || undefined);
      load();
    } catch (caughtError) {
      setDocument((current) => (current ? { ...current, myRating: previous } : current));
      setError(getApiErrorMessage(caughtError, "Không thể gửi đánh giá."));
    }
  }

  function openReport() {
    if (!user) return requireLogin();
    setReportOpen(true);
  }

  if (loading && !document) {
    return <BeaconVieLoadingState label="Đang tải tài liệu..." />;
  }

  if (notFound) {
    return (
      <div className="px-4 py-10 lg:px-8">
        <BeaconVieState
          title="Không tìm thấy tài liệu"
          description="Tài liệu này có thể đã bị gỡ, ẩn hoặc chưa được xuất bản."
          actionLabel="Về Thư viện tài liệu"
          onAction={() => router.push("/documents")}
          tone="empty"
        />
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="px-4 py-10 lg:px-8">
        <BeaconVieState title="Không thể tải tài liệu" description={error} actionLabel="Thử lại" onAction={load} tone="error" />
      </div>
    );
  }

  if (!document) return null;

  const formatLabel = documentTypeLabelFromMime(document.activeVersion?.mimeType);
  const sizeLabel = formatFileSize(document.activeVersion?.fileSize ?? null);

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <BeaconVieCard className="overflow-hidden p-0">
            <div className="relative flex h-56 w-full items-center justify-center overflow-hidden bg-[var(--BeaconVie-primary-soft)] sm:h-72">
              {document.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={document.coverUrl} alt={document.title} className="h-full w-full object-cover" />
              ) : (
                <Sparkles aria-hidden className="h-14 w-14 text-[var(--BeaconVie-primary)]" />
              )}
            </div>

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <BeaconVieBadge>{document.source === "BEACONVIE" ? "Chính thức BeaconVie" : "Cộng đồng chia sẻ"}</BeaconVieBadge>
                {document.isFeatured && <span className="rounded-full bg-[var(--BeaconVie-gold)] px-3 py-1 text-xs font-black text-white">Nổi bật</span>}
                {document.aiAssisted && (
                  <span className="rounded-full bg-[var(--BeaconVie-violet)]/10 px-3 py-1 text-xs font-black text-[var(--BeaconVie-violet)]">
                    AI hỗ trợ tạo nội dung
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-2xl font-black text-[var(--BeaconVie-ink)] sm:text-3xl">{document.title}</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                {document.description || "Chưa có mô tả."}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold text-[var(--BeaconVie-muted)]">
                <span className="flex items-center gap-1">
                  <Star aria-hidden className="h-4 w-4 fill-[var(--BeaconVie-gold)] text-[var(--BeaconVie-gold)]" />
                  {document.ratingAverage.toFixed(1)} ({formatNumber(document.ratingCount, "vi")} đánh giá)
                </span>
                <span className="flex items-center gap-1">
                  <Eye aria-hidden className="h-4 w-4" />
                  {formatNumber(document.viewCount, "vi")} lượt xem
                </span>
                <span className="flex items-center gap-1">
                  <Download aria-hidden className="h-4 w-4" />
                  {formatNumber(document.downloadCount, "vi")} lượt tải
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-[var(--BeaconVie-border)] pt-4">
                {document.author?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={document.author.avatar} alt={document.author.fullname} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--BeaconVie-primary-soft)] font-black text-[var(--BeaconVie-primary)]">
                    {(document.author?.fullname ?? "B")[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--BeaconVie-ink)]">
                    {document.author?.fullname ?? "BeaconVie"}
                  </p>
                  <p className="text-xs font-semibold text-[var(--BeaconVie-muted)]">
                    {document.publishedAt ? `Xuất bản ${formatDate(document.publishedAt, "vi")}` : "Chưa xuất bản"}
                    {document.updatedAt ? ` · Cập nhật ${formatDate(document.updatedAt, "vi")}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <BeaconVieButton onClick={toggleBookmark} loading={bookmarkBusy} tone={document.isBookmarked ? "soft" : "primary"}>
                  {document.isBookmarked ? <BookmarkCheck aria-hidden className="h-4 w-4" /> : <Bookmark aria-hidden className="h-4 w-4" />}
                  {document.isBookmarked ? "Đã lưu" : "Lưu tài liệu"}
                </BeaconVieButton>
                {document.allowDownload && (
                  <BeaconVieButton tone="soft" onClick={download} loading={downloadBusy}>
                    <Download aria-hidden className="h-4 w-4" />
                    Tải xuống
                  </BeaconVieButton>
                )}
                <BeaconVieButton tone="ghost" onClick={openReport}>
                  <Flag aria-hidden className="h-4 w-4" />
                  Báo cáo
                </BeaconVieButton>
              </div>
            </div>
          </BeaconVieCard>

          {document.summary && (
            <BeaconVieCard className="p-6">
              <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">Tóm tắt</h2>
              <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-[var(--BeaconVie-muted)]">
                {document.summary}
              </p>
            </BeaconVieCard>
          )}

          {document.learningObjectives && document.learningObjectives.length > 0 && (
            <BeaconVieCard className="p-6">
              <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">Mục tiêu học tập</h2>
              <ul className="mt-3 space-y-2">
                {document.learningObjectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm font-semibold text-[var(--BeaconVie-muted)]">
                    <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--BeaconVie-success)]" />
                    {objective}
                  </li>
                ))}
              </ul>
            </BeaconVieCard>
          )}

          <TableOfContentsCard tableOfContents={document.tableOfContents} />

          <RatingCard
            myRating={document.myRating}
            isLoggedIn={Boolean(user)}
            onSubmit={submitRating}
            onRequireLogin={requireLogin}
          />

          {related.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-black text-[var(--BeaconVie-ink)]">Tài liệu liên quan</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {related.map((item) => (
                  <DocumentCardItem key={item.id} document={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <BeaconVieCard className="space-y-3 p-5">
            <h2 className="text-sm font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">Thông tin tài liệu</h2>
            <InfoRow label="Danh mục" value={document.category} />
            {document.level && <InfoRow label="Trình độ" value={document.level} />}
            {document.documentType && <InfoRow label="Loại tài liệu" value={document.documentType} />}
            {formatLabel && <InfoRow label="Định dạng" value={formatLabel} />}
            {sizeLabel && <InfoRow label="Dung lượng" value={sizeLabel} />}
            {document.activeVersion?.pageCount ? (
              <InfoRow label="Số trang" value={String(document.activeVersion.pageCount)} />
            ) : null}
            {document.activeVersion?.versionNumber ? (
              <InfoRow label="Phiên bản" value={`v${document.activeVersion.versionNumber}`} />
            ) : null}
            <InfoRow label="Ngôn ngữ" value={document.language === "vi" ? "Tiếng Việt" : document.language} />
            {document.explanationLanguage && (
              <InfoRow
                label="Ngôn ngữ giải thích"
                value={document.explanationLanguage === "vi" ? "Tiếng Việt" : document.explanationLanguage === "en" ? "Tiếng Anh" : document.explanationLanguage}
              />
            )}
            <InfoRow label="Cho phép tải xuống" value={document.allowDownload ? "Có" : "Không"} />
            <InfoRow label="Có đáp án" value={document.hasAnswerKey ? "Có" : "Không"} />
            <InfoRow label="Có audio" value={document.hasAudio ? "Có" : "Không"} />
            {document.hasAudio && (
              <p className="flex items-center gap-1 text-xs font-bold text-[var(--BeaconVie-muted)]">
                <Volume2 aria-hidden className="h-3.5 w-3.5" />
                Tài liệu có kèm audio
              </p>
            )}
          </BeaconVieCard>

          {document.skills && document.skills.length > 0 && (
            <BeaconVieCard className="space-y-2 p-5">
              <h2 className="text-sm font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">Kỹ năng</h2>
              <div className="flex flex-wrap gap-1.5">
                {document.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-[var(--BeaconVie-border)] px-2.5 py-1 text-xs font-bold text-[var(--BeaconVie-muted)]">
                    {skill}
                  </span>
                ))}
              </div>
            </BeaconVieCard>
          )}
        </aside>
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={async (reason, description) => {
          await reportDocument(document.id, reason, description || undefined);
          setReportOpen(false);
        }}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-[var(--BeaconVie-muted)]">{label}</span>
      <span className="font-black text-[var(--BeaconVie-ink)]">{value}</span>
    </div>
  );
}

function TableOfContentsCard({ tableOfContents }: { tableOfContents: unknown }) {
  const entries = Array.isArray(tableOfContents) ? tableOfContents : null;
  if (!entries || entries.length === 0) return null;

  return (
    <BeaconVieCard className="p-6">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">Mục lục</h2>
      <ol className="mt-3 space-y-2">
        {entries.map((entry, index) => {
          const label =
            typeof entry === "string"
              ? entry
              : typeof entry === "object" && entry !== null
                ? String((entry as Record<string, unknown>).title ?? (entry as Record<string, unknown>).name ?? JSON.stringify(entry))
                : String(entry);
          return (
            <li key={index} className="flex items-start gap-3 text-sm font-semibold text-[var(--BeaconVie-muted)]">
              <span className="font-black text-[var(--BeaconVie-primary)]">{index + 1}.</span>
              {label}
            </li>
          );
        })}
      </ol>
    </BeaconVieCard>
  );
}

function RatingCard({
  myRating,
  isLoggedIn,
  onSubmit,
  onRequireLogin,
}: {
  myRating: DocumentDetail["myRating"];
  isLoggedIn: boolean;
  onSubmit: (value: number, comment: string) => Promise<void>;
  onRequireLogin: () => void;
}) {
  const [value, setValue] = useState(myRating?.value ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(myRating?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValue(myRating?.value ?? 0);
    setComment(myRating?.comment ?? "");
  }, [myRating]);

  async function submit() {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    if (value < 1) return;
    setSubmitting(true);
    try {
      await onSubmit(value, comment);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BeaconVieCard className="p-6">
      <h2 className="text-lg font-black text-[var(--BeaconVie-ink)]">
        {myRating ? "Đánh giá của bạn" : "Đánh giá tài liệu này"}
      </h2>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} sao`}
            onClick={() => (isLoggedIn ? setValue(star) : onRequireLogin())}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
          >
            <Star
              aria-hidden
              className={`h-7 w-7 ${
                (hover || value) >= star
                  ? "fill-[var(--BeaconVie-gold)] text-[var(--BeaconVie-gold)]"
                  : "text-[var(--BeaconVie-border)]"
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Chia sẻ cảm nhận của bạn về tài liệu (không bắt buộc)"
        rows={3}
        className="BeaconVie-input mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold"
      />
      <BeaconVieButton className="mt-3" onClick={submit} loading={submitting} disabled={value < 1}>
        {myRating ? "Cập nhật đánh giá" : "Gửi đánh giá"}
      </BeaconVieButton>
    </BeaconVieCard>
  );
}

function ReportDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: DocumentReportReason, description: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<DocumentReportReason>("OTHER");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("OTHER");
      setDescription("");
      setError("");
      setDone(false);
    }
  }, [open]);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(reason, description);
      setDone(true);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, "Không thể gửi báo cáo."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BeaconVieDialog open={open} onClose={onClose} titleId="report-document-title">
      <div className="flex items-start justify-between gap-4">
        <h2 id="report-document-title" className="text-lg font-black text-[var(--BeaconVie-ink)]">
          Báo cáo tài liệu
        </h2>
        <BeaconVieDialogCloseButton onClose={onClose} />
      </div>

      {done ? (
        <p className="mt-4 text-sm font-semibold text-[var(--BeaconVie-success)]">
          Cảm ơn bạn đã báo cáo. Đội ngũ BeaconVie sẽ xem xét tài liệu này sớm nhất có thể.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-bold text-[var(--BeaconVie-muted)]">
            Lý do báo cáo
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as DocumentReportReason)}
              className="BeaconVie-input mt-1 w-full rounded-xl px-3 py-2 text-sm font-semibold"
            >
              {DOCUMENT_REPORT_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-[var(--BeaconVie-muted)]">
            Mô tả thêm (không bắt buộc)
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="BeaconVie-input mt-1 w-full rounded-xl px-3 py-2 text-sm font-semibold"
            />
          </label>
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          <BeaconVieButton className="w-full" onClick={submit} loading={submitting}>
            Gửi báo cáo
          </BeaconVieButton>
        </div>
      )}
    </BeaconVieDialog>
  );
}

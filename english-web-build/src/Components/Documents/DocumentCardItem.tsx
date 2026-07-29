"use client";

import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react";
import { BeaconVieBadge, BeaconVieButton, BeaconVieCard } from "@/src/Components/UI/BeaconVie";
import { formatDate, formatNumber } from "@/src/lib/locale-format";
import type { DocumentCard } from "@/src/lib/documents-api";
import { documentTypeLabelFromMime, formatFileSize } from "./documents-labels";

export function DocumentCardItem({
  document,
  bookmarkBusy,
  downloadBusy,
  onToggleBookmark,
  onDownload,
}: {
  document: DocumentCard;
  bookmarkBusy?: boolean;
  downloadBusy?: boolean;
  onToggleBookmark?: () => void;
  onDownload?: () => void;
}) {
  const formatLabel = documentTypeLabelFromMime(document.activeVersion?.mimeType);
  const sizeLabel = formatFileSize(document.activeVersion?.fileSize ?? null);

  return (
    <BeaconVieCard className="flex flex-col overflow-hidden p-0">
      <Link href={`/documents/${document.slug}`} className="block">
        <div className="relative flex h-36 w-full items-center justify-center overflow-hidden bg-[var(--BeaconVie-primary-soft)]">
          {document.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={document.coverUrl} alt={document.title} className="h-full w-full object-cover" />
          ) : (
            <FileText aria-hidden className="h-12 w-12 text-[var(--BeaconVie-primary)]" />
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            <BeaconVieBadge className="!bg-white/90 dark:!bg-black/60">
              {document.source === "BEACONVIE" ? "Chính thức" : "Cộng đồng"}
            </BeaconVieBadge>
            {document.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--BeaconVie-gold)] px-3 py-1 text-xs font-black text-white">
                <Sparkles aria-hidden className="h-3 w-3" />
                Nổi bật
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--BeaconVie-muted)]">
          <span className="rounded-full bg-[var(--BeaconVie-hover-tint)] px-2.5 py-1">{document.category}</span>
          {document.level && (
            <span className="rounded-full bg-[var(--BeaconVie-hover-tint)] px-2.5 py-1">{document.level}</span>
          )}
          {formatLabel && (
            <span className="rounded-full bg-[var(--BeaconVie-hover-tint)] px-2.5 py-1">{formatLabel}</span>
          )}
          {document.aiAssisted && (
            <span className="rounded-full bg-[var(--BeaconVie-violet)]/10 px-2.5 py-1 text-[var(--BeaconVie-violet)]">
              AI hỗ trợ
            </span>
          )}
        </div>

        <Link href={`/documents/${document.slug}`}>
          <h3 className="mt-2 line-clamp-2 text-base font-black text-[var(--BeaconVie-ink)]">
            {document.title}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
          {document.description || "Chưa có mô tả."}
        </p>

        {document.skills && document.skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {document.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-[var(--BeaconVie-border)] px-2 py-0.5 text-[11px] font-bold text-[var(--BeaconVie-muted)]"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-[var(--BeaconVie-muted)]">
          <span className="flex items-center gap-1">
            <Star aria-hidden className="h-3.5 w-3.5 fill-[var(--BeaconVie-gold)] text-[var(--BeaconVie-gold)]" />
            {document.ratingAverage.toFixed(1)} ({formatNumber(document.ratingCount, "vi")})
          </span>
          <span className="flex items-center gap-1">
            <Eye aria-hidden className="h-3.5 w-3.5" />
            {formatNumber(document.viewCount, "vi")}
          </span>
          <span className="flex items-center gap-1">
            <Download aria-hidden className="h-3.5 w-3.5" />
            {formatNumber(document.downloadCount, "vi")}
          </span>
          {document.hasAnswerKey && (
            <span className="flex items-center gap-1 text-[var(--BeaconVie-success)]">
              <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
              Đáp án
            </span>
          )}
          {document.hasAudio && (
            <span className="flex items-center gap-1">
              <Volume2 aria-hidden className="h-3.5 w-3.5" />
              Audio
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-bold text-[var(--BeaconVie-muted)]">
          <span className="truncate">
            {document.author?.fullname ?? "BeaconVie"}
            {document.publishedAt ? ` · ${formatDate(document.publishedAt, "vi")}` : ""}
          </span>
          {sizeLabel && <span className="shrink-0">{sizeLabel}</span>}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link href={`/documents/${document.slug}`} className="flex-1">
            <BeaconVieButton tone="soft" className="w-full">
              Xem chi tiết
            </BeaconVieButton>
          </Link>
          {onToggleBookmark && (
            <button
              type="button"
              aria-label={document.isBookmarked ? "Bỏ lưu tài liệu" : "Lưu tài liệu"}
              disabled={bookmarkBusy}
              onClick={onToggleBookmark}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--BeaconVie-border)] text-[var(--BeaconVie-primary)] transition hover:bg-[var(--BeaconVie-hover-tint)] disabled:opacity-50"
            >
              {document.isBookmarked ? (
                <BookmarkCheck aria-hidden className="h-4 w-4" />
              ) : (
                <Bookmark aria-hidden className="h-4 w-4" />
              )}
            </button>
          )}
          {document.allowDownload && onDownload && (
            <button
              type="button"
              aria-label="Tải xuống"
              disabled={downloadBusy}
              onClick={onDownload}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--BeaconVie-border)] text-[var(--BeaconVie-primary)] transition hover:bg-[var(--BeaconVie-hover-tint)] disabled:opacity-50"
            >
              <Download aria-hidden className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </BeaconVieCard>
  );
}

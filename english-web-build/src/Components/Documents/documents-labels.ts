import type {
  DocumentReportReason,
  DocumentSort,
  LearningDocumentStatus,
} from "@/src/lib/documents-api";

export const DOCUMENT_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** No fixed enum exists on the backend for skills — these mirror the
 * platform's own practice-skill areas as sensible suggestions; users can
 * still type a custom tag when uploading. */
export const DOCUMENT_SKILL_OPTIONS = [
  { value: "reading", label: "Đọc hiểu" },
  { value: "listening", label: "Nghe" },
  { value: "speaking", label: "Nói" },
  { value: "writing", label: "Viết" },
  { value: "vocabulary", label: "Từ vựng" },
  { value: "grammar", label: "Ngữ pháp" },
];

/** `format` is matched server-side as `mimeType contains <value>` — these
 * values are chosen so they appear as a literal substring of the stored
 * MIME type (see file-validation.service.ts / documents.service.ts). */
export const DOCUMENT_FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word (DOCX)" },
  { value: "presentation", label: "PowerPoint (PPTX)" },
  { value: "text", label: "Văn bản (TXT)" },
];

export const DOCUMENT_EXPLANATION_LANGUAGE_OPTIONS = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "Tiếng Anh" },
];

export const DOCUMENT_SORT_OPTIONS: Array<{ value: DocumentSort; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Phổ biến nhất" },
  { value: "most_downloaded", label: "Tải nhiều nhất" },
  { value: "top_rated", label: "Đánh giá cao nhất" },
  { value: "featured", label: "Nổi bật" },
];

export const DOCUMENT_REPORT_REASON_OPTIONS: Array<{ value: DocumentReportReason; label: string }> = [
  { value: "COPYRIGHT", label: "Vi phạm bản quyền" },
  { value: "INAPPROPRIATE_CONTENT", label: "Nội dung không phù hợp" },
  { value: "WRONG_INFORMATION", label: "Thông tin sai lệch" },
  { value: "SPAM", label: "Spam" },
  { value: "MALICIOUS_FILE", label: "File độc hại" },
  { value: "PERSONAL_INFORMATION", label: "Lộ thông tin cá nhân" },
  { value: "BROKEN_FILE", label: "File lỗi, không mở được" },
  { value: "OTHER", label: "Lý do khác" },
];

export type StatusTone = "muted" | "info" | "warning" | "success" | "danger";

export const DOCUMENT_STATUS_LABEL: Record<LearningDocumentStatus, string> = {
  DRAFT: "Bản nháp",
  UPLOADING: "Đang tải lên",
  PROCESSING: "Đang xử lý",
  AI_REVIEWING: "AI đang kiểm duyệt",
  PENDING_ADMIN_REVIEW: "Chờ admin duyệt",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
  APPROVED: "Đã duyệt, chờ xuất bản",
  PUBLISHED: "Đã xuất bản",
  REJECTED: "Bị từ chối",
  HIDDEN: "Đã ẩn",
  REMOVED: "Đã xoá",
  FAILED: "Xử lý thất bại",
};

export const DOCUMENT_STATUS_TONE: Record<LearningDocumentStatus, StatusTone> = {
  DRAFT: "muted",
  UPLOADING: "info",
  PROCESSING: "info",
  AI_REVIEWING: "info",
  PENDING_ADMIN_REVIEW: "warning",
  CHANGES_REQUESTED: "warning",
  APPROVED: "success",
  PUBLISHED: "success",
  REJECTED: "danger",
  HIDDEN: "muted",
  REMOVED: "muted",
  FAILED: "danger",
};

export const STATUS_TONE_CLASSNAME: Record<StatusTone, string> = {
  muted:
    "bg-[var(--BeaconVie-hover-tint)] text-[var(--BeaconVie-muted)] border border-[var(--BeaconVie-border)]",
  info: "bg-sky-500/10 text-sky-600 border border-sky-500/30 dark:text-sky-300",
  warning:
    "bg-[var(--BeaconVie-warning-soft)] text-[var(--BeaconVie-warning)] border border-[var(--BeaconVie-warning)]/30",
  success:
    "bg-[var(--BeaconVie-success-soft)] text-[var(--BeaconVie-success)] border border-[var(--BeaconVie-success)]/30",
  danger:
    "bg-[var(--BeaconVie-danger-soft)] text-[var(--BeaconVie-danger)] border border-[var(--BeaconVie-danger)]/30",
};

/** Ordered pipeline of `currentStep` values reported by the community
 * upload processor (community-document.processor.ts) — used to render a
 * step-by-step progress UI on the upload flow and my-documents timeline. */
export const DOCUMENT_PROCESSING_STEPS = [
  "UPLOAD_RECEIVED",
  "FILE_SCANNING",
  "CONTENT_EXTRACTING",
  "DUPLICATE_CHECKING",
  "AI_MODERATING",
  "PREVIEW_GENERATING",
  "PENDING_ADMIN_REVIEW",
] as const;

export const DOCUMENT_STEP_LABEL: Record<string, string> = {
  UPLOAD_RECEIVED: "Đang tải lên",
  FILE_SCANNING: "Đang kiểm tra file",
  CONTENT_EXTRACTING: "Đang trích xuất nội dung",
  DUPLICATE_CHECKING: "Đang kiểm tra trùng lặp",
  AI_MODERATING: "AI đang kiểm duyệt",
  PREVIEW_GENERATING: "Đang tạo bản xem trước",
  PENDING_ADMIN_REVIEW: "Đang chờ Admin duyệt",
  PUBLISHED: "Đã xuất bản",
  REJECTED: "Bị từ chối",
};

export function stepLabel(step: string | null | undefined) {
  if (!step) return null;
  return DOCUMENT_STEP_LABEL[step] ?? step;
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function documentTypeLabelFromMime(mimeType: string | null | undefined) {
  if (!mimeType) return null;
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word")) return "DOCX";
  if (mimeType.includes("presentation")) return "PPTX";
  if (mimeType.includes("text")) return "TXT";
  return mimeType;
}

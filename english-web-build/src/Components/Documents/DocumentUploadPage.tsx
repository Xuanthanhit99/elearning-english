"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, Plus, UploadCloud, X } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  BeaconVieButton,
  BeaconVieCard,
  BeaconVieProgress,
  BeaconVieSectionHeader,
} from "@/src/Components/UI/BeaconVie";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { DocumentLevel, uploadDocument } from "@/src/lib/documents-api";
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
  DOCUMENT_PROCESSING_STEPS,
  DOCUMENT_SKILL_OPTIONS,
  stepLabel,
} from "./documents-labels";

const ALLOWED_EXTENSIONS = ["pdf", "docx", "pptx", "txt"];
const SOFT_MAX_SIZE_MB = 25;

type FormState = {
  title: string;
  description: string;
  category: string;
  level: DocumentLevel | "";
  skills: string[];
  explanationLanguage: string;
  hasAnswerKey: boolean;
  hasAudio: boolean;
  allowDownload: boolean;
  tags: string[];
  confirmOwnership: boolean;
  agreeToTerms: boolean;
};

const INITIAL_STATE: FormState = {
  title: "",
  description: "",
  category: "",
  level: "",
  skills: [],
  explanationLanguage: "",
  hasAnswerKey: false,
  hasAudio: false,
  allowDownload: true,
  tags: [],
  confirmOwnership: false,
  agreeToTerms: false,
};

export default function DocumentUploadPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [file, setFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [result, setResult] = useState<{ documentId: string } | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSkill(value: string) {
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(value)
        ? current.skills.filter((skill) => skill !== value)
        : [...current.skills, value],
    }));
  }

  function addTag() {
    const value = tagInput.trim();
    if (!value || form.tags.includes(value)) {
      setTagInput("");
      return;
    }
    setForm((current) => ({ ...current, tags: [...current.tags, value] }));
    setTagInput("");
  }

  function removeTag(value: string) {
    setForm((current) => ({ ...current, tags: current.tags.filter((tag) => tag !== value) }));
  }

  const fileExtension = useMemo(() => file?.name.split(".").pop()?.toLowerCase() ?? "", [file]);
  const fileSizeWarning =
    file && file.size > SOFT_MAX_SIZE_MB * 1024 * 1024
      ? `File khá lớn (~${(file.size / 1024 / 1024).toFixed(1)}MB). Giới hạn mặc định là ${SOFT_MAX_SIZE_MB}MB, hệ thống có thể từ chối nếu vượt quá.`
      : null;

  function validate(): string | null {
    if (form.title.trim().length < 3) return "Tiêu đề phải có ít nhất 3 ký tự.";
    if (!form.category.trim()) return "Vui lòng nhập danh mục tài liệu.";
    if (!file) return "Vui lòng chọn file tài liệu (.pdf, .docx, .pptx, .txt).";
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return "Định dạng file không được hỗ trợ. Chỉ chấp nhận PDF, DOCX, PPTX hoặc TXT.";
    }
    if (!form.confirmOwnership) return "Bạn phải xác nhận quyền sở hữu tài liệu trước khi tải lên.";
    if (!form.agreeToTerms) return "Bạn phải đồng ý điều khoản cộng đồng trước khi tải lên.";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate();
    setFieldError(validationError);
    if (validationError || !file) return;

    setSubmitting(true);
    setError("");
    setUploadPercent(0);
    try {
      const response = await uploadDocument(
        {
          file,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          category: form.category.trim(),
          level: (form.level || undefined) as DocumentLevel | undefined,
          skills: form.skills.length ? form.skills : undefined,
          explanationLanguage: form.explanationLanguage || undefined,
          hasAnswerKey: form.hasAnswerKey,
          hasAudio: form.hasAudio,
          allowDownload: form.allowDownload,
          tags: form.tags.length ? form.tags : undefined,
          confirmOwnership: true,
          agreeToTerms: true,
        },
        setUploadPercent,
      );
      setResult({ documentId: response.documentId });
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, "Không thể tải lên tài liệu. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <UploadProgressView documentId={result.documentId} onDone={() => router.push(`/my-documents?highlight=${result.documentId}`)} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <BeaconVieSectionHeader
        eyebrow="Thư viện tài liệu"
        title="Đăng tài liệu lên Thư viện tài liệu"
        description="Chia sẻ tài liệu học tiếng Anh của bạn với cộng đồng BeaconVie. Tài liệu sẽ được kiểm duyệt trước khi xuất bản."
      />

      <form onSubmit={submit} className="space-y-5">
        <BeaconVieCard className="space-y-4 p-6">
          <Field label="Tiêu đề" required>
            <input
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="vd: Bộ đề luyện đọc hiểu B1"
              className="BeaconVie-input w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
              maxLength={200}
            />
          </Field>

          <Field label="Mô tả">
            <textarea
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              rows={4}
              placeholder="Mô tả ngắn gọn nội dung, mục đích sử dụng của tài liệu..."
              className="BeaconVie-input w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
              maxLength={2000}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Danh mục" required>
              <input
                value={form.category}
                onChange={(event) => set("category", event.target.value)}
                placeholder="vd: Ngữ pháp, Từ vựng, Luyện thi..."
                className="BeaconVie-input w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
                maxLength={100}
              />
            </Field>

            <Field label="Trình độ">
              <select
                value={form.level}
                onChange={(event) => set("level", event.target.value as DocumentLevel | "")}
                className="BeaconVie-input w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
              >
                <option value="">Không xác định</option>
                {DOCUMENT_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Kỹ năng liên quan">
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_SKILL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSkill(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                    form.skills.includes(option.value)
                      ? "bg-[var(--BeaconVie-primary)] text-white"
                      : "border border-[var(--BeaconVie-border)] text-[var(--BeaconVie-muted)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Ngôn ngữ giải thích">
            <select
              value={form.explanationLanguage}
              onChange={(event) => set("explanationLanguage", event.target.value)}
              className="BeaconVie-input w-full rounded-xl px-3 py-2.5 text-sm font-semibold sm:w-64"
            >
              <option value="">Không xác định</option>
              <option value="vi">Tiếng Việt</option>
              <option value="en">Tiếng Anh</option>
            </select>
          </Field>

          <Field label="Thẻ (tags)">
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Nhập thẻ rồi nhấn Enter"
                className="BeaconVie-input flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold"
              />
              <BeaconVieButton type="button" tone="soft" onClick={addTag}>
                <Plus aria-hidden className="h-4 w-4" />
              </BeaconVieButton>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--BeaconVie-border)] px-2.5 py-1 text-xs font-bold text-[var(--BeaconVie-muted)]"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} aria-label={`Xoá thẻ ${tag}`}>
                      <X aria-hidden className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </BeaconVieCard>

        <BeaconVieCard className="space-y-4 p-6">
          <h2 className="text-sm font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">File tài liệu</h2>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--BeaconVie-border)] px-4 py-10 text-center transition hover:border-[var(--BeaconVie-primary)]">
            <UploadCloud aria-hidden className="h-8 w-8 text-[var(--BeaconVie-primary)]" />
            <span className="font-black text-[var(--BeaconVie-ink)]">
              {file ? file.name : "Chọn file từ máy của bạn"}
            </span>
            <span className="text-xs font-semibold text-[var(--BeaconVie-muted)]">
              Hỗ trợ PDF, DOCX, PPTX, TXT — tối đa khoảng {SOFT_MAX_SIZE_MB}MB
            </span>
            <input
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              hidden
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {fileSizeWarning && <p className="text-xs font-bold text-[var(--BeaconVie-warning)]">{fileSizeWarning}</p>}

          <div className="grid gap-3 sm:grid-cols-3">
            <Checkbox
              label="Có đáp án đi kèm"
              checked={form.hasAnswerKey}
              onChange={(checked) => set("hasAnswerKey", checked)}
            />
            <Checkbox label="Có audio đi kèm" checked={form.hasAudio} onChange={(checked) => set("hasAudio", checked)} />
            <Checkbox
              label="Cho phép người khác tải xuống"
              checked={form.allowDownload}
              onChange={(checked) => set("allowDownload", checked)}
            />
          </div>

          <p className="rounded-xl bg-sky-500/10 p-3 text-xs font-semibold text-sky-700 dark:text-sky-300">
            Lưu ý: hình ảnh bìa (cover) cho tài liệu do người dùng đăng chưa được hỗ trợ — tính năng này sẽ có trong bản
            cập nhật sau.
          </p>
        </BeaconVieCard>

        <BeaconVieCard className="space-y-3 p-6">
          <Checkbox
            label="Tôi xác nhận mình có quyền chia sẻ tài liệu này và tài liệu không vi phạm bản quyền, quyền riêng tư hoặc điều khoản của BeaconVie."
            checked={form.confirmOwnership}
            onChange={(checked) => set("confirmOwnership", checked)}
          />
          <Checkbox
            label="Tôi đồng ý điều khoản cộng đồng."
            checked={form.agreeToTerms}
            onChange={(checked) => set("agreeToTerms", checked)}
          />
        </BeaconVieCard>

        {fieldError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {fieldError}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        )}

        {submitting && (
          <div className="space-y-2">
            <BeaconVieProgress value={uploadPercent} />
            <p className="text-center text-xs font-bold text-[var(--BeaconVie-muted)]">
              Đang tải file lên... {uploadPercent}%
            </p>
          </div>
        )}

        <BeaconVieButton type="submit" className="w-full" loading={submitting}>
          <FileUp aria-hidden className="h-4 w-4" />
          Gửi tài liệu
        </BeaconVieButton>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block text-xs font-bold text-[var(--BeaconVie-muted)]">
      {label}
      {required && <span className="text-[var(--BeaconVie-danger)]"> *</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm font-semibold text-[var(--BeaconVie-ink)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--BeaconVie-border)] text-[var(--BeaconVie-primary)]"
      />
      {label}
    </label>
  );
}

function UploadProgressView({ documentId, onDone }: { documentId: string; onDone: () => void }) {
  const [progress, setProgress] = useState<DocumentProcessingProgressEvent | null>(null);
  const [failed, setFailed] = useState<DocumentProcessingFailedEvent | null>(null);
  const [published, setPublished] = useState<DocumentPublishedEvent | null>(null);
  const listenersAttached = useRef(false);

  useEffect(() => {
    const socket = connectDocumentsSocket();
    subscribeToDocument(documentId);

    function onProgress(payload: DocumentProcessingProgressEvent) {
      if (payload.documentId === documentId) setProgress(payload);
    }
    function onFailed(payload: DocumentProcessingFailedEvent) {
      if (payload.documentId === documentId) setFailed(payload);
    }
    function onPublished(payload: DocumentPublishedEvent) {
      if (payload.documentId === documentId) setPublished(payload);
    }

    if (socket && !listenersAttached.current) {
      socket.on("document.processing.progress", onProgress);
      socket.on("document.processing.failed", onFailed);
      socket.on("document.published", onPublished);
      listenersAttached.current = true;
    }

    return () => {
      unsubscribeFromDocument(documentId);
      socket?.off("document.processing.progress", onProgress);
      socket?.off("document.processing.failed", onFailed);
      socket?.off("document.published", onPublished);
      listenersAttached.current = false;
    };
  }, [documentId]);

  const percent = published ? 100 : progress?.progress ?? 5;
  const currentStep = published ? "PUBLISHED" : progress?.currentStep ?? "UPLOAD_RECEIVED";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 lg:px-8">
      <BeaconVieCard className="space-y-5 p-8 text-center">
        {failed ? (
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--BeaconVie-danger-soft)] text-[var(--BeaconVie-danger)]">
            <X aria-hidden className="h-7 w-7" />
          </div>
        ) : published ? (
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--BeaconVie-success-soft)] text-[var(--BeaconVie-success)]">
            <CheckCircle2 aria-hidden className="h-7 w-7" />
          </div>
        ) : (
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]">
            <Loader2 aria-hidden className="h-7 w-7 animate-spin" />
          </div>
        )}

        <div>
          <h1 className="text-xl font-black text-[var(--BeaconVie-ink)]">
            {failed ? "Xử lý thất bại" : published ? "Tài liệu đã được xử lý!" : "Đã gửi tài liệu thành công"}
          </h1>
          <p className="mt-2 text-sm font-semibold text-[var(--BeaconVie-muted)]">
            {failed
              ? failed.message
              : published
                ? "Tài liệu của bạn đang chờ Admin duyệt trước khi xuất bản chính thức."
                : "Tài liệu đang được xử lý tự động. Bạn có thể theo dõi tiến trình bên dưới hoặc rời khỏi trang — quá trình vẫn tiếp tục."}
          </p>
        </div>

        {!failed && (
          <div className="space-y-2 text-left">
            <BeaconVieProgress value={percent} />
            <p className="text-center text-sm font-bold text-[var(--BeaconVie-primary)]">
              {stepLabel(currentStep)} · {percent}%
            </p>
          </div>
        )}

        {!failed && (
          <ol className="space-y-2 text-left">
            {DOCUMENT_PROCESSING_STEPS.map((step) => {
              const stepIndex = DOCUMENT_PROCESSING_STEPS.indexOf(step);
              const currentIndex = DOCUMENT_PROCESSING_STEPS.indexOf(
                currentStep as (typeof DOCUMENT_PROCESSING_STEPS)[number],
              );
              const isDone = published || (currentIndex >= 0 && stepIndex < currentIndex);
              const isCurrent = !published && stepIndex === currentIndex;
              return (
                <li key={step} className="flex items-center gap-2 text-sm font-semibold">
                  {isDone ? (
                    <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-[var(--BeaconVie-success)]" />
                  ) : isCurrent ? (
                    <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin text-[var(--BeaconVie-primary)]" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--BeaconVie-border)]" />
                  )}
                  <span
                    className={
                      isDone || isCurrent
                        ? "text-[var(--BeaconVie-ink)]"
                        : "text-[var(--BeaconVie-muted)]"
                    }
                  >
                    {stepLabel(step)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <BeaconVieButton onClick={onDone}>Xem trong &quot;Tài liệu của tôi&quot;</BeaconVieButton>
          <Link href="/documents">
            <BeaconVieButton tone="ghost">Về Thư viện tài liệu</BeaconVieButton>
          </Link>
        </div>
      </BeaconVieCard>
    </div>
  );
}

"use client";

// Official Gemini-powered document generator — this is the real
// content-creation tool for the "Tài liệu BeaconVie" tab, not a demo.
// Submitting kicks off a generation pipeline on the backend; this page
// then lists past generations and links into a progress/detail view for
// each one at /admin/documents/generator/[id].
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  AdminDocumentGenerationSummary,
  CreateDocumentGenerationPayload,
  DOCUMENT_LEVELS,
  GenerateDocumentPublishMode,
  cancelAdminDocumentGeneration,
  generateAdminDocument,
  listAdminDocumentGenerations,
  retryAdminDocumentGeneration,
} from "@/src/lib/admin-documents-api";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { BeaconVieButton } from "@/src/Components/UI/BeaconVie";
import { AdminDocumentsAccessGate, formatDate, Pager, Panel, SmallAction, StatusPill } from "./shared";

const PAGE_SIZE = 10;

type FormState = {
  title: string;
  englishTitle: string;
  topic: string;
  description: string;
  category: string;
  level: string;
  skills: string;
  targetAudience: string;
  explanationLanguage: string;
  lessonCount: number;
  vocabularyPerLesson: number;
  estimatedPageCount: string;
  includeIpa: boolean;
  includeTranslation: boolean;
  includeDialogues: boolean;
  includeGrammar: boolean;
  includeExercises: boolean;
  includeAnswerKey: boolean;
  includeFinalTest: boolean;
  includeStudyPlan: boolean;
  allowDownload: boolean;
  featured: boolean;
  publishMode: GenerateDocumentPublishMode;
};

const defaultForm: FormState = {
  title: "",
  englishTitle: "",
  topic: "",
  description: "",
  category: "",
  level: "B1",
  skills: "",
  targetAudience: "",
  explanationLanguage: "vi",
  lessonCount: 5,
  vocabularyPerLesson: 10,
  estimatedPageCount: "",
  includeIpa: true,
  includeTranslation: true,
  includeDialogues: true,
  includeGrammar: true,
  includeExercises: true,
  includeAnswerKey: true,
  includeFinalTest: true,
  includeStudyPlan: false,
  allowDownload: true,
  featured: false,
  publishMode: "REQUIRE_ADMIN_REVIEW",
};

const PUBLISH_MODE_LABELS: Record<GenerateDocumentPublishMode, string> = {
  SAVE_AS_DRAFT: "Lưu nháp — chưa gửi duyệt",
  REQUIRE_ADMIN_REVIEW: "Cần duyệt thủ công sau khi tạo xong",
  PUBLISH_AFTER_APPROVAL: "Sẽ tự động sẵn sàng để bạn duyệt nhanh sau khi tạo xong",
};

export default function AdminDocumentGeneratorPage() {
  return (
    <AdminDocumentsAccessGate>
      <AdminDocumentGeneratorContent />
    </AdminDocumentsAccessGate>
  );
}

function AdminDocumentGeneratorContent() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [items, setItems] = useState<AdminDocumentGenerationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadList() {
    setLoading(true);
    setListError(null);
    try {
      const data = await listAdminDocumentGenerations({ page, limit: PAGE_SIZE });
      setItems(data.items);
      setTotal(data.meta.total);
      setTotalPages(data.meta.totalPages || 1);
    } catch (err) {
      setListError(getApiErrorMessage(err, "Không tải được danh sách tài liệu đã tạo."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadList();
    }, 0);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isValid =
    form.title.trim() &&
    form.topic.trim() &&
    form.category.trim() &&
    form.level &&
    form.lessonCount >= 1 &&
    form.lessonCount <= 30 &&
    form.vocabularyPerLesson >= 1 &&
    form.vocabularyPerLesson <= 50;

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateDocumentGenerationPayload = {
        title: form.title,
        englishTitle: form.englishTitle || undefined,
        topic: form.topic,
        description: form.description || undefined,
        category: form.category,
        level: form.level as CreateDocumentGenerationPayload["level"],
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        targetAudience: form.targetAudience || undefined,
        explanationLanguage: form.explanationLanguage || "vi",
        lessonCount: Number(form.lessonCount),
        vocabularyPerLesson: Number(form.vocabularyPerLesson),
        estimatedPageCount: form.estimatedPageCount ? Number(form.estimatedPageCount) : undefined,
        includeIpa: form.includeIpa,
        includeTranslation: form.includeTranslation,
        includeDialogues: form.includeDialogues,
        includeGrammar: form.includeGrammar,
        includeExercises: form.includeExercises,
        includeAnswerKey: form.includeAnswerKey,
        includeFinalTest: form.includeFinalTest,
        includeStudyPlan: form.includeStudyPlan,
        allowDownload: form.allowDownload,
        featured: form.featured,
        publishMode: form.publishMode,
      };
      const result = await generateAdminDocument(payload);
      router.push(`/admin/documents/generator/${result.documentId}`);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Không tạo được tài liệu."));
    } finally {
      setSubmitting(false);
    }
  }

  async function runRowAction(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await action();
      await loadList();
    } catch (err) {
      setListError(getApiErrorMessage(err, "Thao tác thất bại."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-950">
            <Sparkles size={15} />
            Tạo tài liệu BeaconVie bằng AI
          </div>
          <h1 className="mt-3 text-2xl font-black md:text-3xl">Trình tạo tài liệu AI</h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
            Công cụ tạo nội dung chính thức cho Thư viện tài liệu — dùng Gemini để soạn giáo trình
            nhiều bài học kèm từ vựng, ngữ pháp, hội thoại, bài tập và đáp án.
          </p>
        </header>

        <Panel title="Thông tin tài liệu" description="Điền đầy đủ để AI tạo giáo trình chất lượng cao.">
          {submitError && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
              {submitError}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Tiêu đề (bắt buộc)">
              <input value={form.title} onChange={(e) => update("title", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Tiêu đề tiếng Anh">
              <input
                value={form.englishTitle}
                onChange={(e) => update("englishTitle", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Chủ đề / Topic (bắt buộc)">
              <input value={form.topic} onChange={(e) => update("topic", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Danh mục (bắt buộc)">
              <input
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Trình độ (bắt buộc)">
              <select value={form.level} onChange={(e) => update("level", e.target.value)} className={inputClass}>
                {DOCUMENT_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kỹ năng (phân cách bằng dấu phẩy)">
              <input
                value={form.skills}
                onChange={(e) => update("skills", e.target.value)}
                placeholder="reading, listening, vocabulary"
                className={inputClass}
              />
            </Field>
            <Field label="Đối tượng học (tuỳ chọn)">
              <input
                value={form.targetAudience}
                onChange={(e) => update("targetAudience", e.target.value)}
                placeholder="vd. Học sinh THPT ôn thi..."
                className={inputClass}
              />
            </Field>
            <Field label="Ngôn ngữ giải thích">
              <select
                value={form.explanationLanguage}
                onChange={(e) => update("explanationLanguage", e.target.value)}
                className={inputClass}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">Tiếng Anh</option>
              </select>
            </Field>
            <Field label="Số bài học (1-30, bắt buộc)">
              <input
                type="number"
                min={1}
                max={30}
                value={form.lessonCount}
                onChange={(e) => update("lessonCount", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Số từ vựng / bài (1-50, bắt buộc)">
              <input
                type="number"
                min={1}
                max={50}
                value={form.vocabularyPerLesson}
                onChange={(e) => update("vocabularyPerLesson", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Ước tính số trang (tuỳ chọn)">
              <input
                type="number"
                min={1}
                value={form.estimatedPageCount}
                onChange={(e) => update("estimatedPageCount", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Chế độ xuất bản (bắt buộc)">
              <select
                value={form.publishMode}
                onChange={(e) => update("publishMode", e.target.value as GenerateDocumentPublishMode)}
                className={inputClass}
              >
                {(Object.keys(PUBLISH_MODE_LABELS) as GenerateDocumentPublishMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {PUBLISH_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Mô tả (tuỳ chọn)" className="mt-4">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Toggle label="Phiên âm IPA" checked={form.includeIpa} onChange={(v) => update("includeIpa", v)} />
            <Toggle label="Bản dịch" checked={form.includeTranslation} onChange={(v) => update("includeTranslation", v)} />
            <Toggle label="Hội thoại mẫu" checked={form.includeDialogues} onChange={(v) => update("includeDialogues", v)} />
            <Toggle label="Ngữ pháp" checked={form.includeGrammar} onChange={(v) => update("includeGrammar", v)} />
            <Toggle label="Bài tập" checked={form.includeExercises} onChange={(v) => update("includeExercises", v)} />
            <Toggle label="Đáp án" checked={form.includeAnswerKey} onChange={(v) => update("includeAnswerKey", v)} />
            <Toggle label="Bài kiểm tra cuối" checked={form.includeFinalTest} onChange={(v) => update("includeFinalTest", v)} />
            <Toggle label="Lộ trình học kèm theo" checked={form.includeStudyPlan} onChange={(v) => update("includeStudyPlan", v)} />
            <Toggle label="Cho phép tải xuống" checked={form.allowDownload} onChange={(v) => update("allowDownload", v)} />
            <Toggle label="Đánh dấu nổi bật" checked={form.featured} onChange={(v) => update("featured", v)} />
          </div>

          <BeaconVieButton
            tone="primary"
            className="mt-5"
            loading={submitting}
            disabled={!isValid}
            onClick={() => void handleSubmit()}
          >
            <Sparkles size={18} />
            Bắt đầu tạo tài liệu
          </BeaconVieButton>
        </Panel>

        {listError && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {listError}
          </div>
        )}

        <Panel title="Lịch sử tạo tài liệu" description={`${total} tài liệu đã tạo bằng AI.`}>
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-3xl bg-slate-50 p-6 text-center dark:bg-slate-950">
              <p className="font-black">Chưa có tài liệu nào được tạo</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {items.map((item) => {
                  const status = item.status?.toUpperCase();
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-black">{item.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {item.category} {item.level ? `· ${item.level}` : ""} · cập nhật{" "}
                          {formatDate(item.updatedAt)} · <StatusPill value={item.status} />
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <SmallAction
                          label="Xem tiến trình"
                          onClick={() => router.push(`/admin/documents/generator/${item.id}`)}
                        />
                        {(status === "GENERATING" || status === "PROCESSING") && (
                          <SmallAction
                            label="Huỷ"
                            tone="danger"
                            loading={busyId === item.id}
                            onClick={() => runRowAction(item.id, () => cancelAdminDocumentGeneration(item.id))}
                          />
                        )}
                        {status === "FAILED" && (
                          <SmallAction
                            label="Retry"
                            loading={busyId === item.id}
                            onClick={() => runRowAction(item.id, () => retryAdminDocumentGeneration(item.id))}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pager page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </Panel>
      </div>
    </main>
  );
}

const inputClass =
  "min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs font-bold text-slate-600 dark:text-slate-300 ${className ?? ""}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
